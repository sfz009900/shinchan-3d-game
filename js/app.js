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
    GameState.enemyStunnedUntil = 0;
    GameState.enemyDistractedUntil = 0;
    GameState.enemySearchUntil = 0;
    clearEnemyDistraction();

    // 清空陷阱
    GameState.traps.forEach(t => GameState.scene.remove(t.mesh));
    GameState.traps = [];

    // 重置位置
    GameState.player.position.set(0, 0, 8);
    GameState.enemy.position.set(-12, 0, -15);
    GameState.shiro.position.set(5, 0, 5);
    GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);

    // 重新生成饼干
    GameState.cookies.forEach(c => GameState.scene.remove(c));
    GameState.cookies = [];
    createCookies();

    // 重置道具
    GameState.powerups.forEach(p => {
        p.userData.collected = false;
        p.visible = true;
    });

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
        DOM.pauseScore.textContent = GameState.score;
        DOM.pauseTime.textContent = Math.ceil(GameState.timeLeft);
    } else {
        DOM.pauseScreen.classList.add('hidden');
    }
}

function resumeGame() {
    GameState.isPaused = false;
    DOM.pauseScreen.classList.add('hidden');
}

function quitToMenu() {
    GameState.isPlaying = false;
    GameState.isPaused = false;
    clearInterval(GameState.timerInterval);

    DOM.gameUI.classList.remove('danger');
    setActionPrompt(false);
    GameState.dangerBeepAt = 0;

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
    setActionPrompt(false);
    GameState.dangerBeepAt = 0;
    clearEnemyDistraction();

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
    DOM.resultGrade.textContent = grade;
    DOM.newRecord.style.display = isNewRecord ? 'flex' : 'none';

    // 切换界面
    DOM.gameUI.classList.add('hidden');
    DOM.mobileControls.classList.add('hidden');
    DOM.gameOverScreen.classList.remove('hidden');
}

function calculateGrade(score) {
    if (score >= 500) return 'S';
    if (score >= 400) return 'A';
    if (score >= 300) return 'B';
    if (score >= 200) return 'C';
    if (score >= 100) return 'D';
    return 'E';
}

function copyScore() {
    const text = `🖍️ 蜡笔小新饼干大作战 🍪\n` +
                 `得分: ${GameState.score}\n` +
                 `最高连击: ${GameState.maxCombo}\n` +
                 `难度: ${GameState.difficulty}`;

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

