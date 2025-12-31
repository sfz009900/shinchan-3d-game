// ============ 玩家更新 ============
function updatePlayer() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.player) return;

    const now = Date.now();
    const delta = Math.min(GameState.delta || 1 / CONFIG.PHYSICS.FIXED_FPS, 1 / 20);
    const scale = GameState.frameScale ?? 1;

    const locked = now < GameState.controlLockedUntil || now < GameState.hiddenUntil;

    const input = getMoveInputNormalized();
    let dirX = locked ? 0 : input.dx;
    let dirZ = locked ? 0 : input.dz;
    let moving = !locked && input.moving;

    // 跳跃缓冲（空格）
    if (!locked && now < GameState.jumpBufferedUntil && GameState.playerOnGround) {
        GameState.playerOnGround = false;
        GameState.playerVelY = CONFIG.PHYSICS.JUMP_VELOCITY;
        GameState.jumpBufferedUntil = 0;
        AudioManager.playTone(740, 0.06);
    }

    // 竖直物理
    if (!GameState.playerOnGround) {
        GameState.playerVelY -= CONFIG.PHYSICS.GRAVITY * delta;
        GameState.playerBaseY += GameState.playerVelY * delta;
        if (GameState.playerBaseY <= 0) {
            GameState.playerBaseY = 0;
            GameState.playerVelY = 0;
            GameState.playerOnGround = true;
        }
    } else {
        GameState.playerBaseY = 0;
        GameState.playerVelY = 0;
    }

    // 场景强制移动（滑梯/秋千等） > 冲刺（Shift）
    const forced = !locked && now < GameState.forcedMoveUntil;
    const dashing = !forced && !locked && now < GameState.dashUntil;
    if (forced) {
        dirX = GameState.forcedMoveDir.x;
        dirZ = GameState.forcedMoveDir.z;
        moving = true;
    } else if (dashing) {
        dirX = GameState.dashDir.x;
        dirZ = GameState.dashDir.z;
        moving = true;
    }

    // 速度（带地形/道具/冲刺加成）
    let speed = CONFIG.PLAYER_SPEED;
    if (GameState.speedBoost) speed *= 1.5;
    speed *= getZoneSpeedFactor(GameState.player.position.x, GameState.player.position.z, 'player');
    if (forced) speed *= GameState.forcedMoveMultiplier;
    else if (dashing) speed *= CONFIG.DASH.SPEED_MULTIPLIER;

    if (dirX !== 0 || dirZ !== 0) {
        moveWithCollisions(
            GameState.player,
            dirX * speed * scale,
            dirZ * speed * scale,
            CONFIG.PLAYER_RADIUS,
            Math.max(0, GameState.playerBaseY)
        );
    }

    // 面向移动/冲刺方向
    if (moving) {
        GameState.player.rotation.y = Math.atan2(dirX, dirZ);
    }

    // 走路起伏（仅落地时）
    const time = GameState.clock.getElapsedTime();
    const walkBob = (GameState.playerOnGround && moving && !dashing && !forced) ? Math.abs(Math.sin(time * 12)) * 0.12 : 0;
    GameState.player.position.y = GameState.playerBaseY + walkBob;

    // 冲刺尾迹
    if ((dashing || forced) && Math.random() < 0.45) {
        particleSystem.emit(
            new THREE.Vector3(GameState.player.position.x, 0.2 + GameState.playerBaseY, GameState.player.position.z),
            forced ? 0xFFD700 : 0x00CED1,
            2
        );
    }

    // 无敌/冲刺保护闪烁 + 躲藏隐藏
    if (now < GameState.hiddenUntil) {
        GameState.player.visible = false;
    } else {
        const flashing = GameState.isInvincible || now < GameState.noCatchUntil;
        if (flashing) GameState.player.visible = Math.floor(now / 100) % 2 === 0;
        else GameState.player.visible = true;
    }

    // 相机跟随
    const targetCamX = GameState.player.position.x * 0.7;
    const targetCamZ = GameState.player.position.z + 18;
    GameState.camera.position.x += (targetCamX - GameState.camera.position.x) * 0.05;
    GameState.camera.position.z += (targetCamZ - GameState.camera.position.z) * 0.05;
    GameState.camera.lookAt(GameState.player.position.x, 0, GameState.player.position.z);

    updateActionPrompt();
}

// ============ 敌人AI ============
function updateEnemy() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.enemy || !GameState.player) return;

    const now = Date.now();
    const config = CONFIG.DIFFICULTY[GameState.difficulty];

    // 清理过期诱饵
    if (now >= GameState.enemyDistractedUntil && GameState.enemyDistractionMesh) {
        clearEnemyDistraction();
    }

    // 处理陷阱（香蕉皮）
    for (let i = GameState.traps.length - 1; i >= 0; i--) {
        const trap = GameState.traps[i];
        if (now >= trap.expiresAt) {
            GameState.scene.remove(trap.mesh);
            GameState.traps.splice(i, 1);
            continue;
        }
        const dx = GameState.enemy.position.x - trap.x;
        const dz = GameState.enemy.position.z - trap.z;
        const rr = (trap.radius ?? 1) + CONFIG.ENEMY_RADIUS;
        if (dx * dx + dz * dz <= rr * rr) {
            GameState.scene.remove(trap.mesh);
            GameState.traps.splice(i, 1);
            GameState.enemyStunnedUntil = now + 1200;
            particleSystem.emit(GameState.enemy.position, 0xFFD93D, 12);
            AudioManager.playTone(110, 0.12, 'square');
            showCollectPopup('💥 妈妈滑倒!');
        }
    }

    // 眩晕：原地打滑
    if (now < GameState.enemyStunnedUntil) {
        const time = GameState.clock.getElapsedTime();
        GameState.enemy.position.y = Math.abs(Math.sin(time * 10)) * 0.1;
        GameState.enemy.rotation.z = Math.sin(time * 18) * 0.12;

        const distXZ = Math.hypot(
            GameState.enemy.position.x - GameState.player.position.x,
            GameState.enemy.position.z - GameState.player.position.z
        );
        updateDangerEffects(distXZ);
        return;
    } else {
        GameState.enemy.rotation.z = 0;
    }

    // 目标选择：诱饵 > 视野追踪玩家 > 最后已知位置/搜寻
    const enemyPos = GameState.enemy.position;
    const playerPos = GameState.player.position;
    const playerHidden = now < GameState.hiddenUntil;
    const canSeePlayer = !playerHidden && hasLineOfSight(enemyPos, playerPos);

    if (canSeePlayer) {
        GameState.enemyLastKnownPlayerPos.copy(playerPos);
    }

    let targetPos = null;
    let searching = false;

    if (now < GameState.enemyDistractedUntil) {
        targetPos = GameState.enemyDistractionPos;
        const d = Math.hypot(enemyPos.x - targetPos.x, enemyPos.z - targetPos.z);
        if (d < 1.3) {
            GameState.enemyDistractedUntil = 0;
            clearEnemyDistraction();
        }
    } else {
        // 有几率追小白（更混乱、更刺激）
        if (canSeePlayer && GameState.shiro && Math.random() < 0.012) {
            const losToShiro = hasLineOfSight(enemyPos, GameState.shiro.position);
            if (losToShiro) {
                const distToShiro = enemyPos.distanceTo(GameState.shiro.position);
                const distToPlayer = enemyPos.distanceTo(playerPos);
                if (distToShiro < distToPlayer * 0.75) {
                    targetPos = GameState.shiro.position;
                }
            }
        }

        if (!targetPos) {
            targetPos = canSeePlayer ? playerPos : GameState.enemyLastKnownPlayerPos;
        }

        // 丢失视野：到达最后位置后进行搜寻
        if (!canSeePlayer) {
            const d = Math.hypot(enemyPos.x - targetPos.x, enemyPos.z - targetPos.z);
            if (d < 2.5) {
                if (now >= GameState.enemySearchUntil) {
                    GameState.enemySearchUntil = now + 1700;
                    const a = Math.random() * Math.PI * 2;
                    const r = 4 + Math.random() * 5;
                    GameState.enemySearchTarget.set(
                        targetPos.x + Math.cos(a) * r,
                        0,
                        targetPos.z + Math.sin(a) * r
                    );
                    clampToWorldXZ(GameState.enemySearchTarget);
                }
            }
            if (now < GameState.enemySearchUntil) {
                targetPos = GameState.enemySearchTarget;
                searching = true;
            }
        } else {
            GameState.enemySearchUntil = 0;
        }
    }

    // 追击移动（带地形/紧张度加成）
    const toX = targetPos.x - enemyPos.x;
    const toZ = targetPos.z - enemyPos.z;
    const distance = Math.hypot(toX, toZ);

    const distToPlayerXZ = Math.hypot(enemyPos.x - playerPos.x, enemyPos.z - playerPos.z);
    updateDangerEffects(distToPlayerXZ);

    if (distance > 0.12) {
        const scale = GameState.frameScale ?? 1;
        const zoneFactor = getZoneSpeedFactor(enemyPos.x, enemyPos.z, 'enemy');
        let rage = 1;
        if (GameState.timeLeft <= 12) rage *= 1.22;
        if (GameState.combo >= 6) rage *= 1.12;
        if (distToPlayerXZ < 6) rage *= 1.15;
        if (searching) rage *= 0.9;
        if (now < GameState.enemyDistractedUntil) rage *= 0.92;

        const step = config.enemySpeed * scale * zoneFactor * rage;
        const moveX = (toX / distance) * step;
        const moveZ = (toZ / distance) * step;

        const before = enemyPos.clone();
        moveWithCollisions(GameState.enemy, moveX, moveZ, CONFIG.ENEMY_RADIUS, Math.max(0, enemyPos.y));
        const moved = enemyPos.distanceTo(before);

        // 简单“绕障”防卡死：如果完全没动，尝试横向挪一下
        if (moved < 0.001) {
            const sideX = -(toZ / distance) * (step * 0.9);
            const sideZ = (toX / distance) * (step * 0.9);
            moveWithCollisions(GameState.enemy, sideX, sideZ, CONFIG.ENEMY_RADIUS, Math.max(0, enemyPos.y));
        }

        GameState.enemy.rotation.y = Math.atan2(toX, toZ);

        const time = GameState.clock.getElapsedTime();
        GameState.enemy.position.y = Math.abs(Math.sin(time * 10)) * 0.1;
    }

    // 检查抓住玩家
    const playerDist = GameState.enemy.position.distanceTo(GameState.player.position);
    const jumpDodge = GameState.playerBaseY > CONFIG.PHYSICS.MAX_JUMP_HEIGHT_FOR_DODGE;
    const noCatch = GameState.isInvincible || now < GameState.noCatchUntil || now < GameState.hiddenUntil || jumpDodge;
    if (playerDist < CONFIG.CATCH_DISTANCE && !noCatch) {
        playerCaught();
    }
}

// ============ 小白AI ============
function updateShiro() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.shiro) return;

    const time = GameState.clock.getElapsedTime();
    const scale = GameState.frameScale ?? 1;

    // 跟随玩家但保持距离
    const toPlayer = new THREE.Vector3().subVectors(GameState.player.position, GameState.shiro.position);
    const dist = toPlayer.length();

    if (dist > 5) {
        toPlayer.normalize().multiplyScalar(0.1 * scale);
        GameState.shiro.position.add(toPlayer);
    } else if (dist < 3) {
        toPlayer.normalize().multiplyScalar(-0.05 * scale);
        GameState.shiro.position.add(toPlayer);
    }

    // 随机走动
    GameState.shiro.position.x += Math.sin(time * 2) * 0.02 * scale;
    GameState.shiro.position.z += Math.cos(time * 1.5) * 0.02 * scale;

    // 面向移动方向
    GameState.shiro.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    // 尾巴摇晃动画
    GameState.shiro.position.y = Math.abs(Math.sin(time * 8)) * 0.05;

    // 碰撞修正（避免穿模）
    const resolved = resolveCollisionsXZ(GameState.shiro.position, CONFIG.SHIRO_RADIUS, Math.max(0, GameState.shiro.position.y));
    GameState.shiro.position.x = resolved.x;
    GameState.shiro.position.z = resolved.z;
}

// ============ 玩家被抓 ============
function playerCaught() {
    GameState.lives--;
    GameState.combo = 0;
    updateLivesDisplay();
    updateComboDisplay();

    AudioManager.playCaught();

    DOM.caughtMessage.classList.remove('hidden');
    setTimeout(() => {
        DOM.caughtMessage.classList.add('hidden');
    }, 1200);

    // 粒子效果
    particleSystem.emit(GameState.player.position, 0xFF0000, 15);

    // 重置位置
    GameState.player.position.set(0, 0, 8);
    GameState.playerVelY = 0;
    GameState.playerBaseY = 0;
    GameState.playerOnGround = true;
    GameState.jumpBufferedUntil = 0;
    GameState.dashUntil = 0;
    GameState.forcedMoveUntil = 0;
    GameState.controlLockedUntil = 0;
    GameState.hiddenUntil = 0;
    GameState.enemy.position.set(-12, 0, -15);
    GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);
    // 短暂无敌保护，避免连环被抓
    GameState.noCatchUntil = Date.now() + 1100;

    if (GameState.lives <= 0) {
        gameOver();
    }
}

// ============ 收集检测 ============
function checkCollections() {
    if (!GameState.isPlaying || GameState.isPaused) return;

    const playerPos = GameState.player.position;

    // 收集饼干
    for (let i = GameState.cookies.length - 1; i >= 0; i--) {
        const cookie = GameState.cookies[i];
        const dist = cookie.position.distanceTo(playerPos);

        if (dist < 1.2) {
            collectCookie(cookie, i);
        }
    }

    // 收集道具
    for (let i = GameState.powerups.length - 1; i >= 0; i--) {
        const powerup = GameState.powerups[i];
        if (powerup.userData.collected) continue;

        const dist = powerup.position.distanceTo(playerPos);
        if (dist < 1.2) {
            collectPowerup(powerup);
        }
    }
}

function collectCookie(cookie, index) {
    const now = Date.now();
    const points = cookie.userData.points;

    // 连击系统
    if (now - GameState.lastCollectTime < CONFIG.COMBO_TIMEOUT) {
        GameState.combo++;
        if (GameState.combo > GameState.maxCombo) {
            GameState.maxCombo = GameState.combo;
        }
        AudioManager.playCombo();
    } else {
        GameState.combo = 1;
    }
    GameState.lastCollectTime = now;

    // 计算分数 (连击加成)
    const comboMultiplier = 1 + (GameState.combo - 1) * 0.1;
    const finalPoints = Math.floor(points * comboMultiplier);
    GameState.score += finalPoints;

    // 显示收集动画
    showCollectPopup('+' + finalPoints);
    updateScoreDisplay();
    updateComboDisplay();

    AudioManager.playCollect();

    // 粒子效果
    const color = cookie.userData.type === 'star' ? 0xFFD700 :
                  cookie.userData.type === 'heart' ? 0xFF69B4 : 0xD2691E;
    particleSystem.emit(cookie.position, color, 8);

    // 移除并生成新饼干
    GameState.scene.remove(cookie);
    GameState.cookies.splice(index, 1);

    const newCookie = createCookie();
    spawnAtRandomPosition(newCookie);
    GameState.scene.add(newCookie);
    GameState.cookies.push(newCookie);
}

function collectPowerup(powerup) {
    powerup.userData.collected = true;
    powerup.visible = false;

    AudioManager.playPowerup();

    switch (powerup.userData.type) {
        case 'invincible':
            activateInvincibility();
            break;
        case 'speed':
            activateSpeedBoost();
            break;
        case 'health':
            if (GameState.lives < CONFIG.INITIAL_LIVES) {
                GameState.lives++;
                updateLivesDisplay();
            }
            break;
    }

    // 重生道具
    setTimeout(() => {
        powerup.userData.collected = false;
        powerup.visible = true;
        spawnAtRandomPosition(powerup);
    }, 15000);
}

function activateInvincibility() {
    GameState.isInvincible = true;
    showPowerupIndicator('⭐', '无敌!');

    setTimeout(() => {
        GameState.isInvincible = false;
        hidePowerupIndicator();
    }, CONFIG.POWERUP_DURATION);
}

function activateSpeedBoost() {
    GameState.speedBoost = true;
    showPowerupIndicator('💨', '加速!');

    setTimeout(() => {
        GameState.speedBoost = false;
        hidePowerupIndicator();
    }, CONFIG.POWERUP_DURATION);
}

function showPowerupIndicator(icon, text) {
    DOM.powerupIndicator.innerHTML = `
        <div class="powerup-item">
            <span class="icon">${icon}</span>
            <span class="timer">${text}</span>
        </div>
    `;
}

function hidePowerupIndicator() {
    DOM.powerupIndicator.innerHTML = '';
}

// ============ 动画效果 ============
function animateCookies() {
    const time = GameState.clock.getElapsedTime();

    GameState.cookies.forEach((cookie, index) => {
        cookie.rotation.y = time * 2 + index;
        cookie.position.y = 0.5 + Math.sin(time * 3 + index) * 0.15;
    });

    GameState.powerups.forEach((powerup, index) => {
        if (!powerup.userData.collected) {
            powerup.rotation.y = time * 1.5;
            powerup.position.y = 1 + Math.sin(time * 2 + index) * 0.2;

            // 旋转光环
            const ring = powerup.children[1];
            if (ring) ring.rotation.z = time * 2;
        }
    });
}

function animateClouds() {
    GameState.scene.children.forEach(child => {
        if (child.userData && child.userData.speed) {
            child.position.x += child.userData.speed;
            if (child.position.x > 40) child.position.x = -40;
        }
    });
}

