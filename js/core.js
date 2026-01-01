/**
 * 蜡笔小新 3D 饼干大作战 - 超强优化版
 * Crayon Shin-chan Cookie Adventure - Ultra Enhanced Edition
 * 使用 Three.js 制作
 */

// ============ 游戏配置 ============
const CONFIG = {
    DIFFICULTY: {
        easy: { enemySpeed: 0.09, gameTime: 90, cookieCount: 18, enemyRageMultiplier: 1.0 },
        normal: { enemySpeed: 0.12, gameTime: 60, cookieCount: 15, enemyRageMultiplier: 1.15 },
        hard: { enemySpeed: 0.16, gameTime: 45, cookieCount: 12, enemyRageMultiplier: 1.35 },
        nightmare: { enemySpeed: 0.20, gameTime: 30, cookieCount: 10, enemyRageMultiplier: 1.6 }
    },
    PLAYER_SPEED: 0.22,              // 提速：更快节奏
    PLAYER_RADIUS: 0.75,
    ENEMY_RADIUS: 0.85,
    SHIRO_RADIUS: 0.55,
    INITIAL_LIVES: 3,
    WORLD_SIZE: 28,
    CATCH_DISTANCE: 1.6,             // 略微增加抓取距离，增加压迫感
    POWERUP_DURATION: 4000,          // 缩短道具时间，增加紧张感
    COMBO_TIMEOUT: 1500,             // 缩短连击窗口，更考验操作
    PHYSICS: {
        FIXED_FPS: 60,
        MAX_FRAME_SCALE: 2.5,
        GRAVITY: 26,                 // 增加重力：跳跃更快落地
        JUMP_VELOCITY: 9.0,          // 提高跳跃速度
        MAX_JUMP_HEIGHT_FOR_DODGE: 0.7
    },
    DASH: {
        DURATION: 220,               // 缩短冲刺时间
        COOLDOWN: 1200,              // 缩短冷却，更频繁使用
        SPEED_MULTIPLIER: 2.8        // 提高冲刺速度
    },
    ENEMY_PHASE: {
        DURATION: 1300,              // 延长穿墙时间，更危险
        COOLDOWN: 4500,              // 缩短冷却，更频繁穿墙
        SPEED_MULTIPLIER: 1.35,      // 穿墙时更快
        STUCK_TRIGGER_MS: 350,       // 更快触发穿墙
        TRIGGER_DISTANCE: 15,        // 更远距离就会穿墙
        CHANCE_PER_SECOND: 0.35      // 提高突然穿墙概率
    },
    SHIRO_TRIP: {
        STUN_MS: 400,                // 缩短眩晕时间
        COOLDOWN: 1200,              // 缩短冷却
        TRIGGER_DISTANCE: 1.18,
        AVOID_JUMP_HEIGHT: 0.25,
        NO_CATCH_GRACE_MS: 550
    },
    PANIC_BONUS: {
        DISTANCE: 6.5,               // 扩大紧张区域
        MULTIPLIER: 1.35             // 提高紧张加成
    },
    INTERACT: {
        RANGE: 3.2
    },
    DIFFICULTY_SCALING: {
        ENABLED: true,
        SPEED_INCREASE_PER_10S: 0.015,    // 每10秒增加速度
        MAX_SPEED_MULTIPLIER: 1.8,        // 最大速度倍数
        RAGE_INCREASE_PER_COOKIE: 0.02    // 每收集一个饼干增加愤怒值
    },
    ENEMY_SKILLS: {
        ROLLING: {
            TRIGGER_DIST_MIN: 10,
            DURATION: 3000,
            COOLDOWN: 10000,
            SPEED_MULT: 1.9,
            CHANCE: 0.6 // per check interval
        },
        SHOUT: {
            TRIGGER_DIST_MAX: 5.5,
            DURATION: 1800, // Mother stops for this duration
            STUN_DURATION: 1500, // Player stunned
            COOLDOWN: 15000,
            CHANCE: 0.4
        }
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
    // Enemy Skills State
    enemyState: 'CHASE', // CHASE, ROLLING, SHOUT, STUNNED
    enemySkillTimer: 0,
    enemySkillCooldowns: { rolling: 0, shout: 0 },
    enemyRollDir: new THREE.Vector3(),
    shiroTripCooldownUntil: 0,
    dangerBeepAt: 0,
    cameraShakeOffset: new THREE.Vector3(),
    delta: 0,
    frameScale: 1,
    joystickInput: { x: 0, y: 0 },
    isMobile: false,
    // 新增：动态难度系统
    gameStartTime: 0,
    cookiesCollected: 0,
    enemyRageLevel: 1.0,
    nearMissCount: 0,           // 险些被抓次数
    perfectDodgeCount: 0,       // 完美躲避次数
    lastDangerSoundTime: 0      // 上次播放危险音效的时间
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
    DOM.screenFlash = document.getElementById('screen-flash');
}

// ============ 音效系统 ============
const AudioManager = {
    context: null,
    sounds: {},

    bgm: null,

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initBGM();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    },

    initBGM() {
        if (!this.bgm) {
            this.bgm = new Audio('assets/bgm.mp3');
            this.bgm.loop = true;
            this.bgm.volume = 0.4;
        }
    },

    playBGM() {
        if (this.bgm && GameState.soundEnabled) {
            if (this.context && this.context.state === 'suspended') {
                this.context.resume();
            }
            const playPromise = this.bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("BGM Auto-play prevented:", error);
                });
            }
        }
    },

    pauseBGM() {
        if (this.bgm) {
            this.bgm.pause();
        }
    },

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
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
    },

    playNearMiss() {
        this.playTone(150, 0.08, 'sawtooth');
        setTimeout(() => this.playTone(180, 0.06, 'sawtooth'), 60);
    },

    playPerfectDodge() {
        this.playTone(880, 0.06);
        setTimeout(() => this.playTone(1100, 0.06), 50);
        setTimeout(() => this.playTone(1320, 0.08), 100);
    },

    playDanger() {
        this.playTone(120, 0.12, 'sawtooth');
    },

    playIntenseChase() {
        const freq = 100 + Math.random() * 50;
        this.playTone(freq, 0.05, 'sawtooth');
    }
};
