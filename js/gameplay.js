// ============ 玩家更新 ============
function updatePlayer() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.player) return;

    const now = Date.now();
    const delta = Math.min(GameState.delta || 1 / CONFIG.PHYSICS.FIXED_FPS, 1 / 20);
    const scale = GameState.frameScale ?? 1;

    const locked = now < GameState.controlLockedUntil || now < GameState.hiddenUntil;

    const input = getMoveInputNormalized();
    let inputDirX = locked ? 0 : input.dx;
    let inputDirZ = locked ? 0 : input.dz;
    const wantToMove = !locked && input.moving;

    // 修复：恢复跳跃逻辑
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

    // 基础速度参数
    let maxSpeed = CONFIG.PLAYER_SPEED;
    if (GameState.speedBoost) maxSpeed *= 1.5;
    maxSpeed *= getZoneSpeedFactor(GameState.player.position.x, GameState.player.position.z, 'player');

    // 状态判定
    const forced = !locked && now < GameState.forcedMoveUntil;
    const dashing = !forced && !locked && now < GameState.dashUntil;

    // 1. 计算目标速度 (Target Velocity)
    let targetVelX = 0;
    let targetVelZ = 0;

    if (forced) {
        inputDirX = GameState.forcedMoveDir.x;
        inputDirZ = GameState.forcedMoveDir.z;
        maxSpeed *= GameState.forcedMoveMultiplier;
        targetVelX = inputDirX * maxSpeed;
        targetVelZ = inputDirZ * maxSpeed;
        // 强制移动：瞬间获得速度
        GameState.playerVelocity.x = targetVelX;
        GameState.playerVelocity.z = targetVelZ;
    } else if (dashing) {
        inputDirX = GameState.dashDir.x;
        inputDirZ = GameState.dashDir.z;
        maxSpeed *= CONFIG.DASH.SPEED_MULTIPLIER;
        targetVelX = inputDirX * maxSpeed;
        targetVelZ = inputDirZ * maxSpeed;
        // 冲刺：瞬间获得速度
        GameState.playerVelocity.x = targetVelX;
        GameState.playerVelocity.z = targetVelZ;
    } else {
        // 正常移动：应用加速度/摩擦力
        if (wantToMove) {
            targetVelX = inputDirX * maxSpeed;
            targetVelZ = inputDirZ * maxSpeed;

            // 简单的“朝目标移动”算法 (Linear Acceleration)
            const accel = CONFIG.PHYSICS.ACCELERATION * scale;

            const diffX = targetVelX - GameState.playerVelocity.x;
            const diffZ = targetVelZ - GameState.playerVelocity.z;
            const dist = Math.sqrt(diffX * diffX + diffZ * diffZ);

            if (dist <= accel) {
                GameState.playerVelocity.x = targetVelX;
                GameState.playerVelocity.z = targetVelZ;
            } else {
                GameState.playerVelocity.x += (diffX / dist) * accel;
                GameState.playerVelocity.z += (diffZ / dist) * accel;
            }
        } else {
            // 摩擦力 (Deceleration)
            const friction = CONFIG.PHYSICS.FRICTION * scale;
            const currentSpeed = Math.sqrt(GameState.playerVelocity.x * GameState.playerVelocity.x + GameState.playerVelocity.z * GameState.playerVelocity.z);

            if (currentSpeed <= friction) {
                GameState.playerVelocity.x = 0;
                GameState.playerVelocity.z = 0;
            } else {
                GameState.playerVelocity.x -= (GameState.playerVelocity.x / currentSpeed) * friction;
                GameState.playerVelocity.z -= (GameState.playerVelocity.z / currentSpeed) * friction;
            }
        }
    }

    // 2. 应用位移 (Apply Velocity)
    if (Math.abs(GameState.playerVelocity.x) > 0.0001 || Math.abs(GameState.playerVelocity.z) > 0.0001) {
        moveWithCollisions(
            GameState.player,
            GameState.playerVelocity.x * scale,
            GameState.playerVelocity.z * scale,
            CONFIG.PLAYER_RADIUS,
            Math.max(0, GameState.playerBaseY)
        );
    }

    // 3. 平滑转向 (Smooth Rotation)
    // 强制/冲刺时瞬间转向，跑步时平滑转向
    let targetRotation = null;
    if ((forced || dashing) && (inputDirX !== 0 || inputDirZ !== 0)) {
        targetRotation = Math.atan2(inputDirX, inputDirZ);
        GameState.player.rotation.y = targetRotation;
    } else if (wantToMove) {
        // 有输入时，转向输入方向
        targetRotation = Math.atan2(inputDirX, inputDirZ);

        let currentRotation = GameState.player.rotation.y;
        let diff = targetRotation - currentRotation;
        // 角度归一化 (-PI ~ PI)
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const turnStep = CONFIG.PHYSICS.TURN_SPEED * scale;
        if (Math.abs(diff) < turnStep) {
            GameState.player.rotation.y = targetRotation;
        } else {
            GameState.player.rotation.y += Math.sign(diff) * turnStep;
        }
    }

    // 为了兼容后续代码
    // 如果没有输入但有速度（滑行中），使用速度方向作为移动方向
    let dirX = inputDirX;
    let dirZ = inputDirZ;
    const speedSq = GameState.playerVelocity.lengthSq();
    if (dirX === 0 && dirZ === 0 && speedSq > 0.0001) {
        const vLen = Math.sqrt(speedSq);
        dirX = GameState.playerVelocity.x / vLen;
        dirZ = GameState.playerVelocity.z / vLen;
    }

    let moving = wantToMove || forced || dashing || speedSq > 0.0001;


    // 小白绊倒：跑动时踩到会眩晕（跳起来可越过）
    if (!locked && moving && GameState.shiro && now >= GameState.shiroTripCooldownUntil) {
        const airborne = !GameState.playerOnGround || GameState.playerBaseY > CONFIG.SHIRO_TRIP.AVOID_JUMP_HEIGHT;
        const protectedMove = dashing || forced;
        if (!airborne && !protectedMove) {
            const px = GameState.player.position.x;
            const pz = GameState.player.position.z;
            const sx = GameState.shiro.position.x;
            const sz = GameState.shiro.position.z;
            const dx = sx - px;
            const dz = sz - pz;
            const trigger = CONFIG.SHIRO_TRIP.TRIGGER_DISTANCE;
            const dist2 = dx * dx + dz * dz;
            if (dist2 < trigger * trigger) {
                const dist = Math.sqrt(dist2);
                const md = Math.hypot(dirX, dirZ);
                // 只在“正面撞上”时触发，减少烦躁感
                let dot = 1;
                if (dist > 1e-6 && md > 1e-6) {
                    dot = (dx * (dirX / md) + dz * (dirZ / md)) / dist;
                }
                if (dot > 0.15) {
                    GameState.shiroTripCooldownUntil = now + CONFIG.SHIRO_TRIP.COOLDOWN_MS;
                    GameState.playerStunnedUntil = now + CONFIG.SHIRO_TRIP.STUN_MS;
                    GameState.controlLockedUntil = Math.max(GameState.controlLockedUntil, GameState.playerStunnedUntil);
                    GameState.noCatchUntil = Math.max(GameState.noCatchUntil, now + CONFIG.SHIRO_TRIP.NO_CATCH_GRACE_MS);
                    GameState.jumpBufferedUntil = 0;
                    GameState.dashUntil = 0;
                    GameState.forcedMoveUntil = 0;
                    GameState.playerVelY = 0;
                    GameState.playerBaseY = 0;
                    GameState.playerOnGround = true;

                    const backX = -dirX;
                    const backZ = -dirZ;
                    const backLen = Math.hypot(backX, backZ);
                    if (backLen > 1e-6) {
                        moveWithCollisions(
                            GameState.player,
                            (backX / backLen) * 0.85,
                            (backZ / backLen) * 0.85,
                            CONFIG.PLAYER_RADIUS,
                            0
                        );
                    }

                    particleSystem.emit(new THREE.Vector3(GameState.player.position.x, 0.2, GameState.player.position.z), 0xFFFFFF, 8);
                    AudioManager.playTone(160, 0.06, 'square');
                    showCollectPopup('🐾 被小白绊倒!');
                    moving = false;
                }
            }
        }
    }

    // 走路起伏（仅落地时）
    const time = GameState.clock.getElapsedTime();
    const walkBob = (GameState.playerOnGround && moving && !dashing && !forced) ? Math.abs(Math.sin(time * 12)) * 0.12 : 0;
    GameState.player.position.y = GameState.playerBaseY + walkBob;

    // 眩晕动画
    if (now < GameState.playerStunnedUntil) {
        GameState.player.rotation.z = Math.sin(time * 18) * 0.22;
    } else {
        GameState.player.rotation.z = 0;
    }

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

    // 相机跟随 (Advanced)
    // 1. 计算理想相机位置
    const targetCamX = GameState.player.position.x * CONFIG.CAMERA.OFFSET_X_RATIO;
    const targetCamZ = GameState.player.position.z + CONFIG.CAMERA.OFFSET_Z;

    // 2. 移除上一帧抖动 (反向操作，确保基础位置平滑)
    if (GameState.cameraShakeOffset) {
        GameState.camera.position.sub(GameState.cameraShakeOffset);
        GameState.cameraShakeOffset.set(0, 0, 0);
    }

    // 3. 平滑移动相机
    const camSmooth = CONFIG.CAMERA.SMOOTHNESS * scale;
    GameState.camera.position.x += (targetCamX - GameState.camera.position.x) * camSmooth;
    GameState.camera.position.z += (targetCamZ - GameState.camera.position.z) * camSmooth;

    // 4. 计算理想视角中心 (LookAt Target)
    // 基础看玩家，但可以稍微预测一点移动方向?
    let lookX = GameState.player.position.x;
    let lookZ = GameState.player.position.z;

    // 简单的 Lookahead
    if (Math.abs(GameState.playerVelocity.x) > 0.1) lookX += GameState.playerVelocity.x * 0.5;

    // 5. 平滑视角中心
    const lookSmooth = CONFIG.CAMERA.LOOK_SMOOTHNESS * scale;
    GameState.cameraLookAtTarget.x += (lookX - GameState.cameraLookAtTarget.x) * lookSmooth;
    GameState.cameraLookAtTarget.z += (lookZ - GameState.cameraLookAtTarget.z) * lookSmooth;

    // 6. 应用相机抖动 (Screen Shake)
    // 妈妈贴脸时镜头轻微抖动，增加压迫感（躲藏时关闭）
    if (GameState.enemy && now >= GameState.hiddenUntil) {
        const dist = Math.hypot(
            GameState.enemy.position.x - GameState.player.position.x,
            GameState.enemy.position.z - GameState.player.position.z
        );
        const maxDist = 4.2;
        if (dist < maxDist) {
            const intensity = (maxDist - dist) / maxDist;
            const t = GameState.clock.getElapsedTime();
            GameState.cameraShakeOffset.set(
                Math.sin(t * 22.3) * 0.18 * intensity,
                Math.sin(t * 28.1) * 0.08 * intensity,
                Math.cos(t * 18.7) * 0.14 * intensity
            );
            GameState.camera.position.add(GameState.cameraShakeOffset);
            // 抖动时 LookAt 也要抖吗？通常不需要，只抖相机本身更像“手持不稳”
        }
    }

    GameState.camera.lookAt(GameState.cameraLookAtTarget.x, 0, GameState.cameraLookAtTarget.z);

    updateActionPrompt();
}

function setEnemyPhaseVisual(active) {
    if (!GameState.enemy) return;
    const tint = new THREE.Color(0xFF4D4D);
    GameState.enemy.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of materials) {
            if (!m) continue;
            m.userData = m.userData || {};
            if (active) {
                if (m.userData._phaseOrig) continue;
                m.userData._phaseOrig = {
                    transparent: !!m.transparent,
                    opacity: Number.isFinite(m.opacity) ? m.opacity : 1,
                    color: m.color ? m.color.getHex() : null,
                    emissive: m.emissive ? m.emissive.getHex() : null
                };
                m.transparent = true;
                m.opacity = Math.min(m.userData._phaseOrig.opacity, 0.42);
                if (m.color) m.color.lerp(tint, 0.35);
                if (m.emissive) m.emissive.setHex(0x220000);
            } else {
                const orig = m.userData._phaseOrig;
                if (!orig) continue;
                m.transparent = orig.transparent;
                m.opacity = orig.opacity;
                if (m.color && orig.color != null) m.color.setHex(orig.color);
                if (m.emissive && orig.emissive != null) m.emissive.setHex(orig.emissive);
                delete m.userData._phaseOrig;
            }
        }
    });
}

function startEnemyPhase(reason = 'hunt') {
    const now = Date.now();
    GameState.enemyPhaseUntil = now + CONFIG.ENEMY_PHASE.DURATION;
    GameState.enemyPhaseCooldownUntil = now + CONFIG.ENEMY_PHASE.COOLDOWN;
    GameState.enemyStuckSince = 0;
    // 立即切换视觉，避免一帧延迟
    setEnemyPhaseVisual(true);
    GameState.enemyWasPhasing = true;
    if (reason === 'hunt') {
        showCollectPopup('👻 妈妈穿墙追来!');
        AudioManager.playTone(92, 0.08, 'sawtooth');
    } else {
        AudioManager.playTone(82, 0.06, 'sawtooth');
    }
    if (GameState.enemy) particleSystem.emit(GameState.enemy.position, 0xFF4D4D, 10);
}

// ============ 敌人AI (智能版) ============
function calculateAvoidanceDirection(pos, targetDir, radius) {
    // 改进的触须检测：检测更多角度 (-60 ~ +60)
    const whiskers = [0, 25, -25, 50, -50, 75, -75]; // 优先前方，然后向两侧扩散
    const lookAheadDist = 3.5; // 看得更远

    for (const angle of whiskers) {
        const rad = angle * Math.PI / 180;
        // 旋转向量
        const dir = new THREE.Vector3(targetDir.x, 0, targetDir.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rad);

        const checkPos = new THREE.Vector3(
            pos.x + dir.x * lookAheadDist,
            0,
            pos.z + dir.z * lookAheadDist
        );

        if (!isPositionBlockedXZ(checkPos.x, checkPos.z, radius)) {
            return dir; // 找到可行方向
        }
    }

    // 如果都被阻挡，尝试贴墙滑动 (返回切线? 稍微复杂，暂时返回侧向90度)
    // 或者保持原方向，依赖 moveWithCollisions 的 slide 效果
    return targetDir;
}

function updateEnemy() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.enemy || !GameState.player) return;

    const now = Date.now();
    const config = CONFIG.DIFFICULTY[GameState.difficulty];
    const dt = GameState.delta || 1 / CONFIG.PHYSICS.FIXED_FPS;

    // ----------------- 初始化/重置状态 -----------------
    if (!GameState.enemyState) GameState.enemyState = 'CHASE';
    if (!GameState.enemySkillCooldowns) GameState.enemySkillCooldowns = { rolling: 0, shout: 0, genkotsu: 0 };
    if (!GameState.genkotsuTarget) GameState.genkotsuTarget = new THREE.Vector3();

    // ----------------- 动态难度 & 愤怒值 -----------------
    if (CONFIG.DIFFICULTY_SCALING.ENABLED) {
        const elapsedTime = (now - GameState.gameStartTime) / 1000;
        const timeMultiplier = Math.min(
            1 + (Math.floor(elapsedTime / 10) * CONFIG.DIFFICULTY_SCALING.SPEED_INCREASE_PER_10S),
            CONFIG.DIFFICULTY_SCALING.MAX_SPEED_MULTIPLIER
        );
        GameState.enemyRageLevel = timeMultiplier * (config.enemyRageMultiplier || 1.0);
    }

    // ----------------- 通用检测 -----------------
    const enemyPos = GameState.enemy.position;
    const playerPos = GameState.player.position;
    const distToPlayer = enemyPos.distanceTo(playerPos);
    const playerHidden = now < GameState.hiddenUntil;
    const canSeePlayer = !playerHidden && hasLineOfSight(enemyPos, playerPos);

    if (canSeePlayer) {
        GameState.enemyLastKnownPlayerPos.copy(playerPos);
    }

    // ----------------- 状态机逻辑 -----------------

    // 0. 处理 STUNNED (最高优先级)
    if (now < GameState.enemyStunnedUntil) {
        GameState.enemyState = 'STUNNED';
        const t = GameState.clock.getElapsedTime();
        GameState.enemy.position.y = Math.abs(Math.sin(t * 10)) * 0.1;
        GameState.enemy.rotation.z = Math.sin(t * 18) * 0.12;
        updateDangerEffects(distToPlayer);
        return;
    } else if (GameState.enemyState === 'STUNNED') {
        GameState.enemyState = 'CHASE';
        GameState.enemy.rotation.z = 0;
    }

    // 1. 技能状态处理 (覆盖移动逻辑)
    if (GameState.enemyState === 'GENKOTSU_PREP') {
        // 预警阶段：原地颤抖，锁定
        if (now > GameState.enemySkillTimer) {
            GameState.enemyState = 'GENKOTSU_JUMP';
            GameState.enemySkillTimer = now + CONFIG.ENEMY_SKILLS.GENKOTSU.JUMP_DURATION;
            AudioManager.playTone(400, 0.2, 'triangle'); // Jump sound
        } else {
            GameState.enemy.rotation.y += 0.5; // Spin/Shake
            GameState.genkotsuTarget.copy(playerPos); // Track perfectly
        }
        return; // Skip normal movement
    }

    else if (GameState.enemyState === 'GENKOTSU_JUMP') {
        // 飞天追踪
        const progress = 1 - (GameState.enemySkillTimer - now) / CONFIG.ENEMY_SKILLS.GENKOTSU.JUMP_DURATION;
        // Parabolic jump: y = 4 * h * x * (1-x)
        const height = 12; // Very high
        GameState.enemy.position.y = height * Math.sin(progress * Math.PI);

        // Shadow (body XZ) tracking: Lerp fast to player
        GameState.enemy.position.x += (playerPos.x - GameState.enemy.position.x) * 0.15;
        GameState.enemy.position.z += (playerPos.z - GameState.enemy.position.z) * 0.15;
        clampToWorldXZ(GameState.enemy.position);

        if (now > GameState.enemySkillTimer) {
            GameState.enemyState = 'GENKOTSU_DROP';
            GameState.enemy.position.y = 12;
            GameState.genkotsuTarget.copy(playerPos); // Lock final target
            particleSystem.emit(GameState.genkotsuTarget, 0xFF0000, 8);
        }
        return;
    }

    else if (GameState.enemyState === 'GENKOTSU_DROP') {
        // 下落
        const dropSpeed = CONFIG.ENEMY_SKILLS.GENKOTSU.DROP_SPEED * dt * 60; // scale with dt?
        GameState.enemy.position.y -= 0.8; // Fixed fast drop

        if (GameState.enemy.position.y <= 0) {
            GameState.enemy.position.y = 0;
            GameState.enemyState = 'GENKOTSU_LAND';
            GameState.enemySkillTimer = now + 1200; // Recovery time

            // Effect
            AudioManager.playTone(100, 0.5, 'square');
            showScreenFlash('white');
            particleSystem.emit(GameState.enemy.position, 0x8B0000, 40);

            // Hit Check
            const dist = GameState.enemy.position.distanceTo(playerPos);
            if (dist < CONFIG.ENEMY_SKILLS.GENKOTSU.IMPACT_RADIUS) {
                if (!GameState.isInvincible && now > GameState.noCatchUntil) {
                    GameState.playerStunnedUntil = now + CONFIG.ENEMY_SKILLS.GENKOTSU.STUN_DURATION;
                    GameState.controlLockedUntil = GameState.playerStunnedUntil;
                    showCollectPopup('💫 铁拳制裁!');
                    AudioManager.playCaught();
                }
            }
        }
        return;
    }

    else if (GameState.enemyState === 'GENKOTSU_LAND') {
        if (now > GameState.enemySkillTimer) {
            GameState.enemyState = 'CHASE';
        }
        return;
    }

    else if (GameState.enemyState === 'SHOUT') {
        if (now > GameState.enemySkillTimer) {
            GameState.enemyState = 'CHASE';
        } else {
            GameState.enemy.position.x += (Math.random() - 0.5) * 0.1;
            GameState.enemy.position.z += (Math.random() - 0.5) * 0.1;
        }
        return;
    }

    else if (GameState.enemyState === 'ROLLING') {
        if (now > GameState.enemySkillTimer) {
            GameState.enemyState = 'CHASE';
            GameState.enemy.rotation.x = 0;
            GameState.enemy.rotation.z = 0;
        } else {
            const speed = config.enemySpeed * CONFIG.ENEMY_SKILLS.ROLLING.SPEED_MULT * GameState.enemyRageLevel;

            // 降低转向灵活性 (Bull charge)
            const toPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();
            GameState.enemyRollDir.lerp(toPlayer, 0.02); // VERY slow turn
            GameState.enemyRollDir.normalize();

            const moveX = GameState.enemyRollDir.x * speed * (GameState.frameScale || 1);
            const moveZ = GameState.enemyRollDir.z * speed * (GameState.frameScale || 1);

            moveWithCollisions(GameState.enemy, moveX, moveZ, CONFIG.ENEMY_RADIUS, 0);

            if (GameState.enemy.children.length > 0) GameState.enemy.children[0].rotation.x -= 0.5;
            GameState.enemy.rotation.y = Math.atan2(GameState.enemyRollDir.x, GameState.enemyRollDir.z);

            if (Math.random() < 0.3) {
                particleSystem.emit(new THREE.Vector3(enemyPos.x, 0, enemyPos.z), 0x8B4513, 2);
            }
        }
    }

    // === CHASE STATE & LOGIC ===
    else {
        GameState.enemyState = 'CHASE';
        let phaseActive = now < GameState.enemyPhaseUntil;

        // 技能触发 (Only in CHASE)
        if (canSeePlayer && !phaseActive) {
            // GENKOTSU (New Priority)
            if (now > (GameState.enemySkillCooldowns.genkotsu || 0) &&
                Math.random() < CONFIG.ENEMY_SKILLS.GENKOTSU.CHANCE * dt) {

                GameState.enemyState = 'GENKOTSU_PREP';
                GameState.enemySkillTimer = now + 600; // 0.6s warning
                GameState.enemySkillCooldowns.genkotsu = now + CONFIG.ENEMY_SKILLS.GENKOTSU.COOLDOWN;
                showCollectPopup('👊 铁拳警告!');
                AudioManager.playDanger();
                return;
            }

            // ROLLING
            if (now > GameState.enemySkillCooldowns.rolling &&
                distToPlayer > CONFIG.ENEMY_SKILLS.ROLLING.TRIGGER_DIST_MIN &&
                Math.random() < CONFIG.ENEMY_SKILLS.ROLLING.CHANCE * dt) {

                GameState.enemyState = 'ROLLING';
                GameState.enemySkillTimer = now + CONFIG.ENEMY_SKILLS.ROLLING.DURATION;
                GameState.enemySkillCooldowns.rolling = now + CONFIG.ENEMY_SKILLS.ROLLING.COOLDOWN;

                const toPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();
                GameState.enemyRollDir.copy(toPlayer);

                showCollectPopup('🌪️ 妈妈滚过来了!');
                AudioManager.playTone(150, 0.4, 'sawtooth');
                return;
            }

            // SHOUT
            if (now > GameState.enemySkillCooldowns.shout &&
                distToPlayer < CONFIG.ENEMY_SKILLS.SHOUT.TRIGGER_DIST_MAX &&
                Math.random() < CONFIG.ENEMY_SKILLS.SHOUT.CHANCE * dt) {

                GameState.enemyState = 'SHOUT';
                GameState.enemySkillTimer = now + CONFIG.ENEMY_SKILLS.SHOUT.DURATION;
                GameState.enemySkillCooldowns.shout = now + CONFIG.ENEMY_SKILLS.SHOUT.COOLDOWN;

                GameState.playerStunnedUntil = now + CONFIG.ENEMY_SKILLS.SHOUT.STUN_DURATION;
                GameState.controlLockedUntil = Math.max(GameState.controlLockedUntil, GameState.playerStunnedUntil);

                showCollectPopup('🤬 站住!!!');
                AudioManager.playTone(600, 0.6, 'square');
                showScreenFlash('red');
                particleSystem.emit(enemyPos, 0xFF0000, 20);
                return;
            }
        }

        // Movement Logic (Normal Chase)
        if (phaseActive !== GameState.enemyWasPhasing) {
            setEnemyPhaseVisual(phaseActive);
            if (!phaseActive) {
                const resolved = resolveCollisionsXZ(enemyPos, CONFIG.ENEMY_RADIUS, 0);
                enemyPos.x = resolved.x;
                enemyPos.z = resolved.z;
            }
            GameState.enemyWasPhasing = phaseActive;
        }

        let targetPos = null;
        let searching = false;

        if (now < GameState.enemyDistractedUntil) {
            targetPos = GameState.enemyDistractionPos;
            if (enemyPos.distanceTo(targetPos) < 1.3) {
                GameState.enemyDistractedUntil = 0;
                clearEnemyDistraction();
            }
        } else {
            if (canSeePlayer) {
                targetPos = playerPos;
            } else {
                targetPos = GameState.enemyLastKnownPlayerPos;
                if (enemyPos.distanceTo(targetPos) < 2.5) {
                    if (now >= GameState.enemySearchUntil) {
                        GameState.enemySearchUntil = now + 2000;
                        const a = Math.random() * Math.PI * 2;
                        const r = 5 + Math.random() * 5;
                        GameState.enemySearchTarget.set(targetPos.x + Math.cos(a) * r, 0, targetPos.z + Math.sin(a) * r);
                        clampToWorldXZ(GameState.enemySearchTarget);
                    }
                    targetPos = GameState.enemySearchTarget;
                    searching = true;
                }
            }
        }

        const toTarget = new THREE.Vector3().subVectors(targetPos, enemyPos);
        const distToTarget = toTarget.length();

        if (distToTarget > 0.1) {
            toTarget.normalize();

            let speed = config.enemySpeed * (GameState.frameScale || 1) * GameState.enemyRageLevel;
            speed *= getZoneSpeedFactor(enemyPos.x, enemyPos.z, 'enemy');
            if (phaseActive) speed *= CONFIG.ENEMY_PHASE.SPEED_MULTIPLIER;
            if (searching) speed *= 0.8;

            // Rubber Banding: If very far, speed up significantly
            if (!searching && distToPlayer > 18) speed *= 1.4;
            else if (!searching && distToPlayer > 28) speed *= 2.0;

            let finalDir = toTarget;

            if (!phaseActive && distToPlayer > 2.0) {
                finalDir = calculateAvoidanceDirection(enemyPos, toTarget, CONFIG.ENEMY_RADIUS);
            }

            const moveX = finalDir.x * speed;
            const moveZ = finalDir.z * speed;

            const beforePos = enemyPos.clone();

            if (phaseActive) {
                enemyPos.x += moveX;
                enemyPos.z += moveZ;
                clampToWorldXZ(enemyPos);
            } else {
                moveWithCollisions(GameState.enemy, moveX, moveZ, CONFIG.ENEMY_RADIUS, 0);
            }

            // Stuck Check
            const movedMap = enemyPos.distanceTo(beforePos);
            if (!phaseActive && movedMap < 0.001 && distToTarget > 1.0) {
                if (!GameState.enemyStuckSince) GameState.enemyStuckSince = now;
                if (now - GameState.enemyStuckSince > CONFIG.ENEMY_PHASE.STUCK_TRIGGER_MS) {
                    startEnemyPhase('stuck');
                }
            } else {
                GameState.enemyStuckSince = 0;
            }

            if (!phaseActive && !playerHidden && now > GameState.enemyPhaseCooldownUntil) {
                const chance = CONFIG.ENEMY_PHASE.CHANCE_PER_SECOND * dt;
                // Increased distance trigger for randomized phasing
                if (distToPlayer < CONFIG.ENEMY_PHASE.TRIGGER_DISTANCE && Math.random() < chance) {
                    startEnemyPhase('hunt');
                }
            }

            GameState.enemy.rotation.y = Math.atan2(finalDir.x, finalDir.z);
            const t = GameState.clock.getElapsedTime();
            GameState.enemy.position.y = Math.abs(Math.sin(t * 12)) * 0.1;
        }
    }

    updateDangerEffects(distToPlayer);

    // ----------------- 捕捉判定 -----------------
    if (GameState.enemyState !== 'STUNNED' && GameState.enemyState !== 'GENKOTSU_PREP' && GameState.enemyState !== 'GENKOTSU_JUMP' && GameState.enemyState !== 'GENKOTSU_LAND') {
        const jumpDodge = GameState.playerBaseY > CONFIG.PHYSICS.MAX_JUMP_HEIGHT_FOR_DODGE;
        const noCatch = GameState.isInvincible || now < GameState.noCatchUntil || now < GameState.hiddenUntil || jumpDodge;

        if (distToPlayer < CONFIG.CATCH_DISTANCE * 1.5 && !noCatch) {
            if (now - GameState.lastDangerSoundTime > 800) {
                GameState.nearMissCount++;
                AudioManager.playNearMiss();
                showScreenFlash('red');
                GameState.lastDangerSoundTime = now;
            }
        }

        if (distToPlayer < CONFIG.CATCH_DISTANCE && !noCatch) {
            playerCaught();
        }
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
    const now = Date.now();
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
    GameState.playerStunnedUntil = 0;
    GameState.enemy.position.set(-12, 0, -15);
    GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);
    GameState.enemyPhaseUntil = 0;
    GameState.enemyStuckSince = 0;
    GameState.enemyPhaseCooldownUntil = now + 1200;

    // Reset AI States
    GameState.enemyState = 'CHASE';
    GameState.enemySkillTimer = 0;
    GameState.enemySkillCooldowns = { rolling: 0, shout: 0 };
    if (GameState.enemy) {
        GameState.enemy.rotation.x = 0;
        GameState.enemy.rotation.z = 0;
    }

    if (GameState.enemyWasPhasing) setEnemyPhaseVisual(false);
    GameState.enemyWasPhasing = false;
    // 短暂无敌保护，避免连环被抓
    GameState.noCatchUntil = now + 1100;

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
    GameState.cookiesCollected++;

    // 动态难度：收集饼干增加敌人愤怒值
    if (CONFIG.DIFFICULTY_SCALING.ENABLED) {
        GameState.enemyRageLevel += CONFIG.DIFFICULTY_SCALING.RAGE_INCREASE_PER_COOKIE;
    }

    // 计算分数 (连击加成)
    const comboMultiplier = 1 + (GameState.combo - 1) * 0.15;  // 提高连击加成
    let finalPoints = Math.floor(points * comboMultiplier);
    let panicBonus = false;
    if (GameState.enemy && now >= GameState.hiddenUntil) {
        const distToEnemy = Math.hypot(
            GameState.enemy.position.x - GameState.player.position.x,
            GameState.enemy.position.z - GameState.player.position.z
        );
        if (distToEnemy < CONFIG.PANIC_BONUS.DISTANCE) {
            finalPoints = Math.floor(finalPoints * CONFIG.PANIC_BONUS.MULTIPLIER);
            panicBonus = true;
        }
    }
    GameState.score += finalPoints;

    // 显示收集动画
    showCollectPopup((panicBonus ? '🔥 ' : '') + '+' + finalPoints);
    updateScoreDisplay();
    updateComboDisplay();

    AudioManager.playCollect();
    if (panicBonus) AudioManager.playTone(1320, 0.05, 'triangle');

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

