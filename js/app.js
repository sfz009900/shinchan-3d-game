// ============ 游戏控制 ============
function startGame() {
    const config = CONFIG.DIFFICULTY[GameState.difficulty];

    GameState.isPlaying = true;
    GameState.isPaused = false;
    GameState.score = 0;
    GameState.lives = CONFIG.INITIAL_LIVES;
    GameState.timeLeft = config.gameTime;
    GameState.combo = 0;
    GameState.maxCombo = 0;
    GameState.isInvincible = false;
    GameState.speedBoost = false;
    GameState.noCatchUntil = 0;
    GameState.playerVelY = 0;
    GameState.playerBaseY = 0;
    GameState.playerOnGround = true;
    GameState.jumpBufferedUntil = 0;
    GameState.dashUntil = 0;
    GameState.dashCooldownUntil = 0;
    GameState.forcedMoveUntil = 0;
    GameState.controlLockedUntil = 0;
    GameState.hiddenUntil = 0;
    GameState.playerStunnedUntil = 0;
    GameState.enemyStunnedUntil = 0;
    GameState.enemyDistractedUntil = 0;
    GameState.enemySearchUntil = 0;
    GameState.enemyPhaseUntil = 0;
    GameState.enemyPhaseCooldownUntil = 0;
    GameState.enemyStuckSince = 0;
    GameState.enemyWasPhasing = false;
    GameState.shiroTripCooldownUntil = 0;
    GameState.gameStartTime = Date.now();
    GameState.cookiesCollected = 0;
    GameState.enemyRageLevel = config.enemyRageMultiplier || 1.0;
    GameState.nearMissCount = 0;
    GameState.perfectDodgeCount = 0;
    GameState.lastDangerSoundTime = 0;
    setEnemyPhaseVisual(false);
    if (GameState.cameraShakeOffset && GameState.camera) {
        GameState.camera.position.sub(GameState.cameraShakeOffset);
        GameState.cameraShakeOffset.set(0, 0, 0);
    }
    clearEnemyDistraction();

    // 清空陷阱
    GameState.traps.forEach(t => GameState.scene.remove(t.mesh));
    GameState.traps = [];

    // 清空旧世界并重新生成
    if (GameState.worldGroup) {
        GameState.worldGroup.clear(); // 清除所有环境物体
    }
    createWorld(); // 重新生成布局和物体

    // 重置位置 (使用新生成的布局)
    if (GameState.mapLayout) {
        if (GameState.mapLayout.spawn) GameState.player.position.set(GameState.mapLayout.spawn.x, 0, GameState.mapLayout.spawn.z);
        if (GameState.mapLayout.enemySpawn) GameState.enemy.position.set(GameState.mapLayout.enemySpawn.x, 0, GameState.mapLayout.enemySpawn.z);
        if (GameState.mapLayout.shiroSpawn) GameState.shiro.position.set(GameState.mapLayout.shiroSpawn.x, 0, GameState.mapLayout.shiroSpawn.z);
    } else {
        // Fallback
        GameState.player.position.set(0, 0, 8);
        GameState.enemy.position.set(-12, 0, -15);
        GameState.shiro.position.set(5, 0, 5);
    }

    GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);

    // 重新生成饼干
    GameState.cookies.forEach(c => GameState.scene.remove(c));
    GameState.cookies = [];
    createCookies();

    // 重新生成道具
    GameState.powerups.forEach(p => GameState.scene.remove(p));
    // createPowerups clears the array, so we don't need to manually clear it if we trust it, but being safe:
    GameState.powerups = [];
    createPowerups();

    // 更新UI
    updateScoreDisplay();
    updateTimeDisplay();
    updateLivesDisplay();
    updateComboDisplay();
    updateHighscoreDisplay();
    hidePowerupIndicator();

    // 切换界面
    DOM.startScreen.classList.add('hidden');
    DOM.gameOverScreen.classList.add('hidden');
    DOM.pauseScreen.classList.add('hidden');
    DOM.gameUI.classList.remove('hidden');

    if (GameState.isMobile) {
        DOM.mobileControls.classList.remove('hidden');
    }

    // 启动计时器
    startGameTimer();

    // 开始音频上下文
    if (AudioManager.context && AudioManager.context.state === 'suspended') {
        AudioManager.context.resume();
    }
    AudioManager.playBGM();
}

function startGameTimer() {
    if (GameState.timerInterval) clearInterval(GameState.timerInterval);

    GameState.timerInterval = setInterval(() => {
        if (GameState.isPlaying && !GameState.isPaused) {
            GameState.timeLeft -= 1;
            updateTimeDisplay();

            if (GameState.timeLeft <= 0) {
                gameOver();
            }
        }
    }, 1000);
}

function togglePause() {
    if (!GameState.isPlaying) return;

    GameState.isPaused = !GameState.isPaused;

    if (GameState.isPaused) {
        DOM.gameUI.classList.remove('danger');
        setActionPrompt(false);
        GameState.dangerBeepAt = 0;
        DOM.pauseScreen.classList.remove('hidden');
        DOM.pauseScreen.classList.remove('hidden');
        DOM.pauseScore.textContent = GameState.score;
        AudioManager.pauseBGM();
        DOM.pauseTime.textContent = Math.ceil(GameState.timeLeft);
    } else {
        DOM.pauseScreen.classList.add('hidden');
    }
}

function resumeGame() {
    GameState.isPaused = false;
    AudioManager.playBGM();
    DOM.pauseScreen.classList.add('hidden');
}

function quitToMenu() {
    GameState.isPlaying = false;
    GameState.isPaused = false;
    clearInterval(GameState.timerInterval);

    DOM.gameUI.classList.remove('danger');
    setActionPrompt(false);
    GameState.dangerBeepAt = 0;
    GameState.playerStunnedUntil = 0;
    GameState.enemyPhaseUntil = 0;
    GameState.enemyPhaseCooldownUntil = 0;
    GameState.enemyStuckSince = 0;
    if (GameState.enemyWasPhasing) setEnemyPhaseVisual(false);
    GameState.enemyWasPhasing = false;
    if (GameState.cameraShakeOffset && GameState.camera) {
        GameState.camera.position.sub(GameState.cameraShakeOffset);
        GameState.cameraShakeOffset.set(0, 0, 0);
    }


    AudioManager.stopBGM();

    DOM.pauseScreen.classList.add('hidden');
    DOM.gameUI.classList.add('hidden');
    DOM.mobileControls.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
}

function gameOver() {
    GameState.isPlaying = false;
    clearInterval(GameState.timerInterval);

    AudioManager.playGameOver();
    DOM.gameUI.classList.remove('danger');
    DOM.gameUI.classList.remove('extreme-danger');
    setActionPrompt(false);
    GameState.dangerBeepAt = 0;
    clearEnemyDistraction();
    GameState.playerStunnedUntil = 0;
    GameState.enemyPhaseUntil = 0;
    GameState.enemyPhaseCooldownUntil = 0;
    GameState.enemyStuckSince = 0;
    if (GameState.enemyWasPhasing) setEnemyPhaseVisual(false);
    GameState.enemyWasPhasing = false;
    if (GameState.cameraShakeOffset && GameState.camera) {
        GameState.camera.position.sub(GameState.cameraShakeOffset);
        GameState.cameraShakeOffset.set(0, 0, 0);
    }
    AudioManager.stopBGM();

    // 检查新纪录
    const isNewRecord = GameState.score > GameState.highScore;
    if (isNewRecord) {
        GameState.highScore = GameState.score;
        localStorage.setItem('shinchan_highscore', GameState.highScore.toString());
    }

    // 计算评级
    const grade = calculateGrade(GameState.score);

    // 更新结束界面
    DOM.finalScore.textContent = GameState.score;
    DOM.maxComboDisplay.textContent = GameState.maxCombo;
    document.getElementById('near-miss-count').textContent = GameState.nearMissCount;
    document.getElementById('perfect-dodge-count').textContent = GameState.perfectDodgeCount;
    DOM.resultGrade.textContent = grade;
    DOM.newRecord.style.display = isNewRecord ? 'flex' : 'none';

    // 切换界面
    DOM.gameUI.classList.add('hidden');
    DOM.mobileControls.classList.add('hidden');
    DOM.gameOverScreen.classList.remove('hidden');
}

function calculateGrade(score) {
    if (score >= 800) return 'SS';
    if (score >= 600) return 'S';
    if (score >= 450) return 'A';
    if (score >= 320) return 'B';
    if (score >= 200) return 'C';
    if (score >= 100) return 'D';
    return 'E';
}

function copyScore() {
    const difficultyNames = {
        easy: '简单',
        normal: '普通',
        hard: '困难',
        nightmare: '噩梦'
    };

    const text = `🖍️ 蜡笔小新饼干大作战 🍪\n` +
        `得分: ${GameState.score}\n` +
        `最高连击: ${GameState.maxCombo}\n` +
        `险些被抓: ${GameState.nearMissCount}\n` +
        `完美躲避: ${GameState.perfectDodgeCount}\n` +
        `难度: ${difficultyNames[GameState.difficulty] || GameState.difficulty}`;

    navigator.clipboard.writeText(text).then(() => {
        DOM.copyScoreBtn.textContent = '✅ 已复制!';
        setTimeout(() => {
            DOM.copyScoreBtn.textContent = '📋 复制成绩';
        }, 2000);
    });
}

// ============ 窗口调整 ============
function onWindowResize() {
    GameState.camera.aspect = window.innerWidth / window.innerHeight;
    GameState.camera.updateProjectionMatrix();
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============ 主循环 ============
function animate() {
    requestAnimationFrame(animate);

    // 固定在“以 60fps 为基准”的时间缩放，避免不同设备速度差异
    const delta = GameState.clock ? GameState.clock.getDelta() : 1 / CONFIG.PHYSICS.FIXED_FPS;
    GameState.delta = delta;
    GameState.frameScale = getFrameScale(delta);

    if (GameState.isPlaying && !GameState.isPaused) {
        updatePlayer();
        updateEnemy();
        updateShiro();
        checkCollections();
        animateCookies();
        particleSystem.update();
        updateRageMeter();
    }

    animateClouds();

    GameState.renderer.render(GameState.scene, GameState.camera);
}

// ============ 事件绑定 ============
function bindEvents() {
    DOM.startBtn.addEventListener('click', startGame);
    DOM.howToPlayBtn.addEventListener('click', () => {
        DOM.howToPlayScreen.classList.remove('hidden');
    });
    DOM.closeInstructionsBtn.addEventListener('click', () => {
        DOM.howToPlayScreen.classList.add('hidden');
    });
    DOM.pauseBtn.addEventListener('click', togglePause);
    DOM.mobilePauseBtn?.addEventListener('click', togglePause);

    // 移动端动作按钮
    const bindMobileAction = (btn, action) => {
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            action();
        }, { passive: false });
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            action();
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            action();
        });
    };

    bindMobileAction(DOM.mobileJumpBtn, requestJump);
    bindMobileAction(DOM.mobileDashBtn, requestDash);
    bindMobileAction(DOM.mobileInteractBtn, attemptInteract);
    DOM.resumeBtn.addEventListener('click', resumeGame);
    DOM.restartFromPauseBtn.addEventListener('click', () => {
        DOM.pauseScreen.classList.add('hidden');
        startGame();
    });
    DOM.quitBtn.addEventListener('click', quitToMenu);
    DOM.restartBtn.addEventListener('click', startGame);
    DOM.backToMenuBtn.addEventListener('click', () => {
        DOM.gameOverScreen.classList.add('hidden');
        DOM.startScreen.classList.remove('hidden');
    });
    DOM.copyScoreBtn.addEventListener('click', copyScore);

    DOM.soundToggle.addEventListener('click', () => {
        GameState.soundEnabled = !GameState.soundEnabled;
        DOM.soundToggle.textContent = GameState.soundEnabled ? '🔊' : '🔇';
        DOM.soundToggle.classList.toggle('muted', !GameState.soundEnabled);

        if (GameState.isPlaying && !GameState.isPaused) {
            if (GameState.soundEnabled) {
                AudioManager.playBGM();
            } else {
                AudioManager.pauseBGM();
            }
        }
    });

    // 难度选择
    DOM.difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            GameState.difficulty = btn.dataset.difficulty;
        });
    });
}

// ============ 初始化 ============
function init() {
    initDOM();
    AudioManager.init();
    setupControls();
    initThreeJS();
    bindEvents();
    loadGame();
}

