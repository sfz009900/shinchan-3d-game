/**
 * 蜡笔小新 3D 饼干大作战 - 优化版
 * Crayon Shin-chan Cookie Adventure - Enhanced Edition
 * 使用 Three.js 制作
 */

// ============ 游戏配置 ============
const CONFIG = {
    DIFFICULTY: {
        easy: { enemySpeed: 0.06, gameTime: 90, cookieCount: 15 },
        normal: { enemySpeed: 0.08, gameTime: 60, cookieCount: 12 },
        hard: { enemySpeed: 0.12, gameTime: 45, cookieCount: 10 }
    },
    PLAYER_SPEED: 0.18,
    PLAYER_RADIUS: 0.75,
    ENEMY_RADIUS: 0.85,
    SHIRO_RADIUS: 0.55,
    INITIAL_LIVES: 3,
    WORLD_SIZE: 28,
    CATCH_DISTANCE: 1.5,
    POWERUP_DURATION: 5000,
    COMBO_TIMEOUT: 2000,
    PHYSICS: {
        FIXED_FPS: 60,
        MAX_FRAME_SCALE: 2.5,
        GRAVITY: 22,          // 单位/秒^2
        JUMP_VELOCITY: 8.2,   // 单位/秒
        MAX_JUMP_HEIGHT_FOR_DODGE: 0.6
    },
    DASH: {
        DURATION: 260,        // ms
        COOLDOWN: 1400,       // ms
        SPEED_MULTIPLIER: 2.4
    },
    ENEMY_PHASE: {
        DURATION: 1100,              // ms：妈妈穿墙持续时间
        COOLDOWN: 5200,              // ms：穿墙冷却
        SPEED_MULTIPLIER: 1.18,      // 穿墙时略加速，更有压迫感
        STUCK_TRIGGER_MS: 420,       // 卡住多久后强制穿墙
        TRIGGER_DISTANCE: 12,        // 距离玩家多近才会主动穿墙
        CHANCE_PER_SECOND: 0.22      // 没视野时的“突然穿墙”概率（每秒）
    },
    SHIRO_TRIP: {
        STUN_MS: 500,                // ms：被小白绊倒眩晕
        COOLDOWN: 1400,              // ms：避免连续触发
        TRIGGER_DISTANCE: 1.18,      // 距离阈值
        AVOID_JUMP_HEIGHT: 0.25,     // 跳跃高度超过该值可跳过
        NO_CATCH_GRACE_MS: 650       // 绊倒后短暂保护，避免“无解连抓”
    },
    PANIC_BONUS: {
        DISTANCE: 5.2,               // 妈妈接近时的“紧张加成”
        MULTIPLIER: 1.15
    },
    INTERACT: {
        RANGE: 3.2
    }
};

// ============ 游戏状态 ============
const GameState = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    enemy: null,
    shiro: null,
    cookies: [],
    powerups: [],
    particles: [],
    score: 0,
    lives: CONFIG.INITIAL_LIVES,
    timeLeft: 60,
    isPlaying: false,
    isPaused: false,
    keys: {},
    clock: null,
    difficulty: 'normal',
    combo: 0,
    maxCombo: 0,
    lastCollectTime: 0,
    highScore: parseInt(localStorage.getItem('shinchan_highscore') || '0'),
    soundEnabled: true,
    isInvincible: false,
    speedBoost: false,
    noCatchUntil: 0,
    playerVelY: 0,
    playerOnGround: true,
    playerBaseY: 0,
    jumpBufferedUntil: 0,
    dashUntil: 0,
    dashCooldownUntil: 0,
    dashDir: new THREE.Vector3(0, 0, 1),
    forcedMoveUntil: 0,
    forcedMoveDir: new THREE.Vector3(0, 0, 1),
    forcedMoveMultiplier: 2.8,
    controlLockedUntil: 0,
    hiddenUntil: 0,
    playerStunnedUntil: 0,
    colliders: [],
    zones: [],
    interactables: [],
    traps: [],
    enemyStunnedUntil: 0,
    enemyDistractedUntil: 0,
    enemyDistractionPos: new THREE.Vector3(),
    enemyDistractionMesh: null,
    enemyLastKnownPlayerPos: new THREE.Vector3(),
    enemySearchUntil: 0,
    enemySearchTarget: new THREE.Vector3(),
    enemyPhaseUntil: 0,
    enemyPhaseCooldownUntil: 0,
    enemyStuckSince: 0,
    enemyWasPhasing: false,
    shiroTripCooldownUntil: 0,
    dangerBeepAt: 0,
    cameraShakeOffset: new THREE.Vector3(),
    delta: 0,
    frameScale: 1,
    joystickInput: { x: 0, y: 0 },
    isMobile: false
};

// ============ DOM 元素 ============
const DOM = {};

function initDOM() {
    DOM.loadingScreen = document.getElementById('loading-screen');
    DOM.loadingProgress = document.getElementById('loading-progress');
    DOM.loadingText = document.getElementById('loading-text');
    DOM.startScreen = document.getElementById('start-screen');
    DOM.howToPlayScreen = document.getElementById('how-to-play-screen');
    DOM.gameUI = document.getElementById('game-ui');
    DOM.pauseScreen = document.getElementById('pause-screen');
    DOM.gameOverScreen = document.getElementById('game-over-screen');
    DOM.caughtMessage = document.getElementById('caught-message');
    DOM.collectPopup = document.getElementById('collect-popup');
    DOM.startBtn = document.getElementById('start-btn');
    DOM.howToPlayBtn = document.getElementById('how-to-play-btn');
    DOM.closeInstructionsBtn = document.getElementById('close-instructions-btn');
    DOM.pauseBtn = document.getElementById('pause-btn');
    DOM.resumeBtn = document.getElementById('resume-btn');
    DOM.restartFromPauseBtn = document.getElementById('restart-from-pause-btn');
    DOM.quitBtn = document.getElementById('quit-btn');
    DOM.restartBtn = document.getElementById('restart-btn');
    DOM.backToMenuBtn = document.getElementById('back-to-menu-btn');
    DOM.copyScoreBtn = document.getElementById('copy-score-btn');
    DOM.soundToggle = document.getElementById('sound-toggle');
    DOM.scoreDisplay = document.getElementById('score');
    DOM.timeDisplay = document.getElementById('time');
    DOM.livesDisplay = document.getElementById('lives');
    DOM.highscoreDisplay = document.getElementById('highscore');
    DOM.pauseScore = document.getElementById('pause-score');
    DOM.pauseTime = document.getElementById('pause-time');
    DOM.finalScore = document.getElementById('final-score');
    DOM.maxComboDisplay = document.getElementById('max-combo');
    DOM.resultGrade = document.getElementById('result-grade');
    DOM.newRecord = document.getElementById('new-record');
    DOM.comboDisplay = document.getElementById('combo-display');
    DOM.comboCount = document.getElementById('combo-count');
    DOM.powerupIndicator = document.getElementById('powerup-indicator');
    DOM.actionPrompt = document.getElementById('action-prompt');
    DOM.actionPromptKey = document.getElementById('action-prompt-key');
    DOM.actionPromptText = document.getElementById('action-prompt-text');
    DOM.mobileControls = document.getElementById('mobile-controls');
    DOM.joystickBase = document.getElementById('joystick-base');
    DOM.joystickStick = document.getElementById('joystick-stick');
    DOM.mobilePauseBtn = document.getElementById('mobile-pause-btn');
    DOM.mobileJumpBtn = document.getElementById('mobile-jump-btn');
    DOM.mobileDashBtn = document.getElementById('mobile-dash-btn');
    DOM.mobileInteractBtn = document.getElementById('mobile-interact-btn');
    DOM.gameContainer = document.getElementById('game-container');
    DOM.difficultyBtns = document.querySelectorAll('.diff-btn');
}

// ============ 音效系统 ============
const AudioManager = {
    context: null,
    sounds: {},

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    },

    playTone(frequency, duration, type = 'sine') {
        if (!this.context || !GameState.soundEnabled) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    },

    playCollect() {
        this.playTone(880, 0.1);
        setTimeout(() => this.playTone(1100, 0.1), 50);
    },

    playCaught() {
        this.playTone(200, 0.3, 'sawtooth');
    },

    playPowerup() {
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
        setTimeout(() => this.playTone(784, 0.1), 200);
    },

    playGameOver() {
        this.playTone(400, 0.2);
        setTimeout(() => this.playTone(300, 0.2), 200);
        setTimeout(() => this.playTone(200, 0.4), 400);
    },

    playCombo() {
        const freq = 600 + GameState.combo * 50;
        this.playTone(Math.min(freq, 1200), 0.15);
    }
};
