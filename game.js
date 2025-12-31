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
    dangerBeepAt: 0,
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
    bgm: null,
    bgmLoopTimer: null,

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            // 初始化背景音乐
            this.bgm = new Audio('assets/bgm.mp3');
            this.bgm.volume = 0.3;
            // 监听播放结束，间隔2秒后重新播放
            this.bgm.addEventListener('ended', () => {
                if (GameState.isPlaying && !GameState.isPaused && GameState.soundEnabled) {
                    this.bgmLoopTimer = setTimeout(() => {
                        this.bgm.currentTime = 0;
                        this.bgm.play().catch(e => console.log('BGM replay blocked:', e));
                    }, 2000);
                }
            });
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    },

    playBGM() {
        if (this.bgm && GameState.soundEnabled) {
            if (this.bgmLoopTimer) {
                clearTimeout(this.bgmLoopTimer);
                this.bgmLoopTimer = null;
            }
            this.bgm.currentTime = 0;
            this.bgm.play().catch(e => console.log('BGM autoplay blocked:', e));
        }
    },

    pauseBGM() {
        if (this.bgm) {
            if (this.bgmLoopTimer) {
                clearTimeout(this.bgmLoopTimer);
                this.bgmLoopTimer = null;
            }
            this.bgm.pause();
        }
    },

    stopBGM() {
        if (this.bgm) {
            if (this.bgmLoopTimer) {
                clearTimeout(this.bgmLoopTimer);
                this.bgmLoopTimer = null;
            }
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
    }
};

// ============ 粒子系统 ============
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(position, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color, transparent: true });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.3
            );
            particle.life = 1.0;
            particle.decay = 0.02 + Math.random() * 0.02;

            GameState.scene.add(particle);
            this.particles.push(particle);
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.velocity);
            p.velocity.y -= 0.01;
            p.life -= p.decay;
            p.material.opacity = p.life;
            p.scale.setScalar(p.life);

            if (p.life <= 0) {
                GameState.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}

const particleSystem = new ParticleSystem();

// ============ 物理/碰撞系统 ============
let _colliderIdSeq = 1;

function getFrameScale(delta) {
    if (!Number.isFinite(delta) || delta <= 0) return 1;
    return Math.min(delta * CONFIG.PHYSICS.FIXED_FPS, CONFIG.PHYSICS.MAX_FRAME_SCALE);
}

function resetWorldSystems() {
    GameState.colliders = [];
    GameState.zones = [];
    GameState.interactables = [];
    GameState.traps = [];
    _colliderIdSeq = 1;
}

function addCircleCollider({ x, z, radius, height = Infinity, blocksLOS = true, blocksMovement = true, tag = '' }) {
    GameState.colliders.push({
        id: `c${_colliderIdSeq++}`,
        shape: 'circle',
        x, z, radius,
        height,
        blocksLOS,
        blocksMovement,
        tag
    });
}

function addBoxCollider({ minX, maxX, minZ, maxZ, height = Infinity, blocksLOS = true, blocksMovement = true, tag = '' }) {
    GameState.colliders.push({
        id: `b${_colliderIdSeq++}`,
        shape: 'box',
        minX, maxX, minZ, maxZ,
        height,
        blocksLOS,
        blocksMovement,
        tag
    });
}

function clampToWorldXZ(pos) {
    const boundary = CONFIG.WORLD_SIZE - 1;
    pos.x = Math.max(-boundary, Math.min(boundary, pos.x));
    pos.z = Math.max(-boundary, Math.min(boundary, pos.z));
    return pos;
}

function isCollidingWithColliderXZ(x, z, radius, y, collider) {
    if (collider.blocksMovement === false) return false;
    const h = Number.isFinite(collider.height) ? collider.height : Infinity;
    if (y > h + 0.05) return false;

    if (collider.shape === 'circle') {
        const dx = x - collider.x;
        const dz = z - collider.z;
        const rr = radius + collider.radius;
        return (dx * dx + dz * dz) < rr * rr;
    }

    if (collider.shape === 'box') {
        const cx = Math.max(collider.minX, Math.min(collider.maxX, x));
        const cz = Math.max(collider.minZ, Math.min(collider.maxZ, z));
        const dx = x - cx;
        const dz = z - cz;
        return (dx * dx + dz * dz) < radius * radius;
    }

    return false;
}

function isPositionBlockedXZ(x, z, radius, y = 0) {
    for (const c of GameState.colliders) {
        if (isCollidingWithColliderXZ(x, z, radius, y, c)) return true;
    }
    return false;
}

function resolveCollisionsXZ(pos, radius, y = 0) {
    const out = new THREE.Vector3(pos.x, pos.y, pos.z);

    for (let iter = 0; iter < 4; iter++) {
        let corrected = false;

        for (const c of GameState.colliders) {
            if (c.blocksMovement === false) continue;
            const h = Number.isFinite(c.height) ? c.height : Infinity;
            if (y > h + 0.05) continue;

            if (c.shape === 'circle') {
                const dx = out.x - c.x;
                const dz = out.z - c.z;
                const rr = radius + c.radius;
                const dist2 = dx * dx + dz * dz;
                if (dist2 >= rr * rr) continue;

                const dist = Math.sqrt(dist2);
                let nx, nz, overlap;
                if (dist < 1e-6) {
                    // 正好重叠：给一个随机推出方向，避免除 0
                    const a = Math.random() * Math.PI * 2;
                    nx = Math.cos(a);
                    nz = Math.sin(a);
                    overlap = rr;
                } else {
                    nx = dx / dist;
                    nz = dz / dist;
                    overlap = rr - dist;
                }
                out.x += nx * overlap;
                out.z += nz * overlap;
                corrected = true;
            } else if (c.shape === 'box') {
                const cx = Math.max(c.minX, Math.min(c.maxX, out.x));
                const cz = Math.max(c.minZ, Math.min(c.maxZ, out.z));
                let dx = out.x - cx;
                let dz = out.z - cz;
                const dist2 = dx * dx + dz * dz;
                if (dist2 >= radius * radius) continue;

                if (dist2 < 1e-10) {
                    // 在盒子内部：推到最近边界外 + 半径
                    const left = out.x - c.minX;
                    const right = c.maxX - out.x;
                    const near = out.z - c.minZ;
                    const far = c.maxZ - out.z;
                    const minEdge = Math.min(left, right, near, far);

                    if (minEdge === left) out.x = c.minX - radius;
                    else if (minEdge === right) out.x = c.maxX + radius;
                    else if (minEdge === near) out.z = c.minZ - radius;
                    else out.z = c.maxZ + radius;
                } else {
                    const dist = Math.sqrt(dist2);
                    const overlap = radius - dist;
                    out.x += (dx / dist) * overlap;
                    out.z += (dz / dist) * overlap;
                }
                corrected = true;
            }
        }

        clampToWorldXZ(out);
        if (!corrected) break;
    }

    return out;
}

function moveWithCollisions(entity, moveX, moveZ, radius, y = 0) {
    // 分轴移动，手感更像“蹭墙滑动”
    const posX = new THREE.Vector3(entity.position.x + moveX, 0, entity.position.z);
    const resolvedX = resolveCollisionsXZ(clampToWorldXZ(posX), radius, y);
    entity.position.x = resolvedX.x;
    entity.position.z = resolvedX.z;

    const posZ = new THREE.Vector3(entity.position.x, 0, entity.position.z + moveZ);
    const resolvedZ = resolveCollisionsXZ(clampToWorldXZ(posZ), radius, y);
    entity.position.x = resolvedZ.x;
    entity.position.z = resolvedZ.z;
}

function segmentIntersectsCircle(ax, az, bx, bz, cx, cz, r) {
    const abx = bx - ax;
    const abz = bz - az;
    const acx = cx - ax;
    const acz = cz - az;
    const abLen2 = abx * abx + abz * abz;
    if (abLen2 < 1e-10) {
        const dx = ax - cx;
        const dz = az - cz;
        return (dx * dx + dz * dz) <= r * r;
    }
    let t = (acx * abx + acz * abz) / abLen2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + abx * t;
    const pz = az + abz * t;
    const dx = px - cx;
    const dz = pz - cz;
    return (dx * dx + dz * dz) <= r * r;
}

function segmentIntersectsAABB(ax, az, bx, bz, minX, maxX, minZ, maxZ) {
    let tmin = 0;
    let tmax = 1;
    const dx = bx - ax;
    const dz = bz - az;

    if (Math.abs(dx) < 1e-10) {
        if (ax < minX || ax > maxX) return false;
    } else {
        const ood = 1 / dx;
        let t1 = (minX - ax) * ood;
        let t2 = (maxX - ax) * ood;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
    }

    if (Math.abs(dz) < 1e-10) {
        if (az < minZ || az > maxZ) return false;
    } else {
        const ood = 1 / dz;
        let t1 = (minZ - az) * ood;
        let t2 = (maxZ - az) * ood;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
    }

    return true;
}

function hasLineOfSight(from, to) {
    const ax = from.x, az = from.z;
    const bx = to.x, bz = to.z;

    for (const c of GameState.colliders) {
        if (!c.blocksLOS) continue;

        if (c.shape === 'circle') {
            if (segmentIntersectsCircle(ax, az, bx, bz, c.x, c.z, c.radius)) return false;
        } else if (c.shape === 'box') {
            if (segmentIntersectsAABB(ax, az, bx, bz, c.minX, c.maxX, c.minZ, c.maxZ)) return false;
        }
    }

    return true;
}

function getZoneSpeedFactor(x, z, who = 'player') {
    let factor = 1;
    for (const zone of GameState.zones) {
        const dx = x - zone.x;
        const dz = z - zone.z;
        if (dx * dx + dz * dz <= zone.radius * zone.radius) {
            factor *= who === 'enemy' ? (zone.enemyFactor ?? 1) : (zone.playerFactor ?? 1);
        }
    }
    return factor;
}

// ============ 互动系统 ============
let _interactableIdSeq = 1;

function addInteractable({ type, label, x, z, radius = CONFIG.INTERACT.RANGE, cooldown = 5000, onUse }) {
    GameState.interactables.push({
        id: `i${_interactableIdSeq++}`,
        type,
        label,
        x,
        z,
        radius,
        cooldown,
        cooldownUntil: 0,
        onUse
    });
}

function getNearestInteractable() {
    if (!GameState.player) return null;
    const px = GameState.player.position.x;
    const pz = GameState.player.position.z;
    let best = null;
    let bestDist = Infinity;

    for (const it of GameState.interactables) {
        const dx = it.x - px;
        const dz = it.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= it.radius && dist < bestDist) {
            best = it;
            bestDist = dist;
        }
    }

    if (!best) return null;
    return { it: best, dist: bestDist };
}

function setActionPrompt(visible, keyText = 'E', message = '', disabled = false) {
    if (!DOM.actionPrompt || !DOM.actionPromptKey || !DOM.actionPromptText) return;
    if (!visible) {
        DOM.actionPrompt.classList.add('hidden');
        return;
    }
    DOM.actionPrompt.classList.remove('hidden');
    DOM.actionPrompt.classList.toggle('disabled', !!disabled);
    DOM.actionPromptKey.textContent = keyText;
    DOM.actionPromptText.textContent = message;
}

function updateActionPrompt() {
    if (!GameState.isPlaying || GameState.isPaused) {
        setActionPrompt(false);
        return;
    }

    const nearest = getNearestInteractable();
    if (!nearest) {
        setActionPrompt(false);
        return;
    }

    const now = Date.now();
    const key = GameState.isMobile ? '🤚' : 'E';
    const ready = now >= nearest.it.cooldownUntil;
    if (ready) {
        setActionPrompt(true, key, nearest.it.label, false);
    } else {
        const left = Math.ceil((nearest.it.cooldownUntil - now) / 1000);
        setActionPrompt(true, key, `${nearest.it.label}（冷却 ${left}s）`, true);
    }
}

function attemptInteract() {
    if (!GameState.isPlaying || GameState.isPaused) return;
    const now = Date.now();
    if (now < GameState.controlLockedUntil) return;
    if (now < GameState.hiddenUntil) return;

    const nearest = getNearestInteractable();
    if (!nearest) return;

    if (now < nearest.it.cooldownUntil) {
        const left = Math.ceil((nearest.it.cooldownUntil - now) / 1000);
        showCollectPopup(`⏳ 冷却 ${left}s`);
        return;
    }

    nearest.it.cooldownUntil = now + nearest.it.cooldown;
    try {
        nearest.it.onUse?.(nearest.it);
    } catch (e) {
        console.error('Interact error', e);
    }
}

function clearEnemyDistraction() {
    if (GameState.enemyDistractionMesh) {
        GameState.scene.remove(GameState.enemyDistractionMesh);
        GameState.enemyDistractionMesh = null;
    }
}

function distractEnemyTo(x, z, duration = 3500) {
    if (!GameState.enemy || !GameState.scene) return;
    const now = Date.now();

    clearEnemyDistraction();

    // 诱饵可视化（臭袜子）
    const sock = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x6B4F2A, roughness: 0.95 })
    );
    sock.position.set(x, 0.12, z);
    sock.rotation.y = Math.random() * Math.PI * 2;
    sock.castShadow = true;
    GameState.scene.add(sock);
    GameState.enemyDistractionMesh = sock;

    GameState.enemyDistractedUntil = now + duration;
    GameState.enemyDistractionPos.set(x, 0, z);

    // 结束后自动清理（只清理当前这个）
    setTimeout(() => {
        if (GameState.enemyDistractionMesh === sock) {
            clearEnemyDistraction();
        }
    }, duration + 200);
}

function spawnBananaTrap(x, z) {
    if (!GameState.scene) return;
    const now = Date.now();

    const banana = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.1, 8, 14, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xFFD93D, roughness: 0.6, metalness: 0.05 })
    );
    banana.rotation.x = Math.PI / 2;
    banana.rotation.z = Math.random() * Math.PI * 2;
    banana.position.set(x, 0.08, z);
    banana.castShadow = true;
    GameState.scene.add(banana);

    GameState.traps.push({
        type: 'banana',
        mesh: banana,
        x,
        z,
        radius: 1.1,
        expiresAt: now + 12000
    });

    particleSystem.emit(new THREE.Vector3(x, 0.12, z), 0xFFD93D, 6);
}

function updateDangerEffects(distToPlayer) {
    if (!DOM.gameUI) return;
    const now = Date.now();
    const hidden = now < GameState.hiddenUntil;

    if (!hidden && distToPlayer < 6.2) {
        DOM.gameUI.classList.add('danger');
        const interval = distToPlayer < 3.2 ? 240 : 420;
        if (now >= GameState.dangerBeepAt) {
            AudioManager.playTone(distToPlayer < 3.2 ? 180 : 140, 0.04, 'sine');
            GameState.dangerBeepAt = now + interval;
        }
    } else {
        DOM.gameUI.classList.remove('danger');
    }
}

// ============ 加载管理 ============
async function loadGame() {
    const steps = [
        { text: '初始化Three.js...', progress: 20 },
        { text: '创建游戏世界...', progress: 40 },
        { text: '生成角色...', progress: 60 },
        { text: '配置控制...', progress: 80 },
        { text: '准备完成!', progress: 100 }
    ];

    for (const step of steps) {
        DOM.loadingText.textContent = step.text;
        DOM.loadingProgress.style.width = step.progress + '%';
        await new Promise(r => setTimeout(r, 300));
    }

    await new Promise(r => setTimeout(r, 500));
    DOM.loadingScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
}

// ============ 初始化 Three.js ============
function initThreeJS() {
    GameState.scene = new THREE.Scene();

    // 渐变天空
    const skyColor = new THREE.Color(0x87CEEB);
    GameState.scene.background = skyColor;
    GameState.scene.fog = new THREE.Fog(skyColor, 30, 60);

    // 相机
    GameState.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    GameState.camera.position.set(0, 22, 18);
    GameState.camera.lookAt(0, 0, 0);

    // 渲染器
    GameState.renderer = new THREE.WebGLRenderer({ antialias: true });
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
    GameState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    GameState.renderer.shadowMap.enabled = true;
    GameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    DOM.gameContainer.appendChild(GameState.renderer.domElement);

    addLights();
    createWorld();

    GameState.player = createShinnosuke();
    GameState.scene.add(GameState.player);

    GameState.enemy = createMisae();
    GameState.scene.add(GameState.enemy);

    GameState.shiro = createShiro();
    GameState.scene.add(GameState.shiro);

    createCookies();
    createPowerups();

    GameState.clock = new THREE.Clock();

    window.addEventListener('resize', onWindowResize);
    animate();
}

// ============ 添加光源 ============
function addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    GameState.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffcc, 0.9);
    sunLight.position.set(15, 30, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    GameState.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.4);
    GameState.scene.add(hemiLight);
}

// ============ 创建游戏世界 ============
function createWorld() {
    resetWorldSystems();

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2.5, CONFIG.WORLD_SIZE * 2.5, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7CCD7C,
        roughness: 0.9,
        metalness: 0
    });

    // 贴图（更精美）
    try {
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('assets/grass-texture.jpg');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(18, 18);
        groundMaterial.map = grassTexture;
        groundMaterial.needsUpdate = true;
    } catch (e) {
        // 忽略贴图失败（不影响玩法）
    }

    // 添加地面起伏
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] += Math.random() * 0.1;
    }
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    GameState.scene.add(ground);

    // 装饰草丛
    for (let i = 0; i < 150; i++) {
        const grass = createGrassClump();
        grass.position.set(
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 2,
            0,
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 2
        );
        GameState.scene.add(grass);
    }

    // 野原家
    const noharaHouse = createHouse(0xFF6B35, true);
    noharaHouse.position.set(-18, 0, -18);
    noharaHouse.rotation.y = Math.PI / 4;
    GameState.scene.add(noharaHouse);
    addCircleCollider({ x: noharaHouse.position.x, z: noharaHouse.position.z, radius: 4.9, height: 3.2, blocksLOS: true, blocksMovement: true, tag: 'house' });
    addInteractable({
        type: 'hide_house',
        label: '🏠 躲进野原家',
        x: noharaHouse.position.x,
        z: noharaHouse.position.z,
        radius: 6.4,
        cooldown: 9500,
        onUse: () => {
            const now = Date.now();
            const duration = 1900;
            GameState.hiddenUntil = now + duration;
            GameState.controlLockedUntil = now + duration;
            GameState.noCatchUntil = Math.max(GameState.noCatchUntil, now + duration + 120);
            GameState.playerVelY = 0;
            GameState.playerBaseY = 0;
            GameState.playerOnGround = true;
            GameState.dashUntil = 0;
            GameState.forcedMoveUntil = 0;
            GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);
            showCollectPopup('🏠 躲起来!');
            AudioManager.playTone(330, 0.08);
        }
    });

    // 幼稚园
    const kindergarten = createKindergarten();
    kindergarten.position.set(18, 0, -18);
    kindergarten.rotation.y = -Math.PI / 4;
    GameState.scene.add(kindergarten);
    addCircleCollider({ x: kindergarten.position.x, z: kindergarten.position.z, radius: 6.8, height: 3.5, blocksLOS: true, blocksMovement: true, tag: 'kindergarten' });
    addInteractable({
        type: 'hide_kindergarten',
        label: '🏫 躲进幼稚园',
        x: kindergarten.position.x,
        z: kindergarten.position.z,
        radius: 8.4,
        cooldown: 11000,
        onUse: () => {
            const now = Date.now();
            const duration = 2100;
            GameState.hiddenUntil = now + duration;
            GameState.controlLockedUntil = now + duration;
            GameState.noCatchUntil = Math.max(GameState.noCatchUntil, now + duration + 150);
            GameState.playerVelY = 0;
            GameState.playerBaseY = 0;
            GameState.playerOnGround = true;
            GameState.dashUntil = 0;
            GameState.forcedMoveUntil = 0;
            GameState.enemyLastKnownPlayerPos.copy(GameState.player.position);
            showCollectPopup('🏫 快藏好!');
            AudioManager.playTone(360, 0.08);
        }
    });

    // 公园设施
    createParkFeatures();

    // 树木
    for (let i = 0; i < 12; i++) {
        const tree = createTree();
        const angle = (i / 12) * Math.PI * 2;
        const radius = 22 + Math.random() * 5;
        tree.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        GameState.scene.add(tree);
        addCircleCollider({ x: tree.position.x, z: tree.position.z, radius: 1.0, height: 2.6, blocksLOS: true, blocksMovement: true, tag: 'tree' });
    }

    // 灌木迷宫（可跳跃越过，让玩法更丰富）
    createBushObstacles();

    // 围栏
    createFence();

    // 云朵
    for (let i = 0; i < 8; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 60,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 60
        );
        GameState.scene.add(cloud);
    }
}

// ============ 创建草丛 ============
function createGrassClump() {
    const group = new THREE.Group();
    const colors = [0x228B22, 0x32CD32, 0x2E8B57];

    for (let i = 0; i < 6; i++) {
        const height = 0.2 + Math.random() * 0.3;
        const geometry = new THREE.ConeGeometry(0.04, height, 4);
        const material = new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        const blade = new THREE.Mesh(geometry, material);
        blade.position.set(
            (Math.random() - 0.5) * 0.4,
            height / 2,
            (Math.random() - 0.5) * 0.4
        );
        blade.rotation.set(
            (Math.random() - 0.5) * 0.4,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.4
        );
        group.add(blade);
    }

    return group;
}

// ============ 创建房子 ============
function createHouse(roofColor, isNohara = false) {
    const house = new THREE.Group();

    // 主体
    const bodyGeometry = new THREE.BoxGeometry(7, 5, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFF8DC });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    // 屋顶
    const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 6.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // 门
    const doorGeometry = new THREE.BoxGeometry(1.4, 2.5, 0.15);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.25, 3.05);
    house.add(door);

    // 门把手
    const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.4, 1.2, 3.15);
    house.add(handle);

    // 窗户
    const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.15);
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.7
    });

    const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });

    [-1.8, 1.8].forEach(x => {
        const win = new THREE.Mesh(windowGeometry, windowMaterial);
        win.position.set(x, 3, 3.05);
        house.add(win);

        // 窗框
        const frameH = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.2), windowFrameMaterial);
        frameH.position.set(x, 3, 3.1);
        house.add(frameH);

        const frameV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.2), windowFrameMaterial);
        frameV.position.set(x, 3, 3.1);
        house.add(frameV);
    });

    // 野原家特有的招牌
    if (isNohara) {
        const signGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.1);
        const signMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(2.5, 1.5, 3.1);
        house.add(sign);
    }

    return house;
}

// ============ 创建幼稚园 ============
function createKindergarten() {
    const building = new THREE.Group();

    // 主楼
    const mainGeometry = new THREE.BoxGeometry(10, 4, 8);
    const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4B5 });
    const main = new THREE.Mesh(mainGeometry, mainMaterial);
    main.position.y = 2;
    main.castShadow = true;
    main.receiveShadow = true;
    building.add(main);

    // 彩色屋顶
    const roofGeometry = new THREE.BoxGeometry(11, 0.8, 9);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4.4;
    roof.castShadow = true;
    building.add(roof);

    // 入口
    const entranceGeometry = new THREE.BoxGeometry(3, 3, 2);
    const entranceMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, 1.5, 5);
    building.add(entrance);

    // 彩色装饰
    const decorColors = [0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF];
    for (let i = 0; i < 4; i++) {
        const decor = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: decorColors[i] })
        );
        decor.position.set(-4 + i * 2.5, 4.8, 0);
        building.add(decor);
    }

    return building;
}

// ============ 创建公园设施 ============
function createParkFeatures() {
    // 滑梯
    const slide = new THREE.Group();

    const ladderGeometry = new THREE.BoxGeometry(0.8, 3, 0.1);
    const ladderMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4444 });
    const ladder = new THREE.Mesh(ladderGeometry, ladderMaterial);
    ladder.position.set(0, 1.5, -1);
    slide.add(ladder);

    const slideGeometry = new THREE.BoxGeometry(1.2, 0.1, 4);
    const slideMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const slideBoard = new THREE.Mesh(slideGeometry, slideMaterial);
    slideBoard.position.set(0, 1.5, 1);
    slideBoard.rotation.x = 0.4;
    slide.add(slideBoard);

    slide.position.set(10, 0, 10);
    GameState.scene.add(slide);
    addCircleCollider({ x: slide.position.x, z: slide.position.z, radius: 2.2, height: 1.6, blocksLOS: false, blocksMovement: true, tag: 'slide' });
    addInteractable({
        type: 'slide_boost',
        label: '🛝 滑梯冲刺',
        x: slide.position.x,
        z: slide.position.z,
        radius: 3.7,
        cooldown: 5200,
        onUse: () => {
            if (!GameState.player) return;
            const now = Date.now();
            const dir = new THREE.Vector3(
                GameState.player.position.x - slide.position.x,
                0,
                GameState.player.position.z - slide.position.z
            );
            if (dir.length() < 0.01) {
                dir.set(Math.sin(GameState.player.rotation.y), 0, Math.cos(GameState.player.rotation.y));
            }
            dir.normalize();
            GameState.forcedMoveDir.copy(dir);
            GameState.forcedMoveMultiplier = 3.35;
            GameState.forcedMoveUntil = now + 700;
            GameState.noCatchUntil = Math.max(GameState.noCatchUntil, now + 750);
            showCollectPopup('🛝 冲刺!');
            AudioManager.playTone(880, 0.07, 'square');
        }
    });

    // 秋千
    const swing = new THREE.Group();

    const frameGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });

    const post1 = new THREE.Mesh(frameGeometry, frameMaterial);
    post1.position.set(-1.5, 2, 0);
    post1.rotation.z = 0.15;
    swing.add(post1);

    const post2 = new THREE.Mesh(frameGeometry, frameMaterial);
    post2.position.set(1.5, 2, 0);
    post2.rotation.z = -0.15;
    swing.add(post2);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8), frameMaterial);
    bar.position.set(0, 3.8, 0);
    bar.rotation.z = Math.PI / 2;
    swing.add(bar);

    const seatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.4);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
    seat.position.set(0, 1, 0);
    swing.add(seat);

    swing.position.set(-10, 0, 10);
    GameState.scene.add(swing);
    addCircleCollider({ x: swing.position.x, z: swing.position.z, radius: 2.4, height: 2.2, blocksLOS: false, blocksMovement: true, tag: 'swing' });
    addInteractable({
        type: 'swing_launch',
        label: '🎠 秋千弹射',
        x: swing.position.x,
        z: swing.position.z,
        radius: 3.8,
        cooldown: 6200,
        onUse: () => {
            if (!GameState.player) return;
            const now = Date.now();

            // 向外弹射 + 高跳
            const dir = new THREE.Vector3(
                GameState.player.position.x - swing.position.x,
                0,
                GameState.player.position.z - swing.position.z
            );
            if (dir.length() < 0.01) {
                dir.set(Math.sin(GameState.player.rotation.y), 0, Math.cos(GameState.player.rotation.y));
            }
            dir.normalize();

            GameState.playerOnGround = false;
            GameState.playerVelY = Math.max(GameState.playerVelY, CONFIG.PHYSICS.JUMP_VELOCITY * 1.25);

            GameState.forcedMoveDir.copy(dir);
            GameState.forcedMoveMultiplier = 2.1;
            GameState.forcedMoveUntil = now + 420;
            GameState.noCatchUntil = Math.max(GameState.noCatchUntil, now + 950);

            showCollectPopup('🎠 弹射!');
            AudioManager.playTone(660, 0.07, 'triangle');
        }
    });

    // 沙坑
    const sandboxGeometry = new THREE.CylinderGeometry(3, 3, 0.3, 6);
    const sandboxMaterial = new THREE.MeshStandardMaterial({ color: 0xF4D03F });
    const sandbox = new THREE.Mesh(sandboxGeometry, sandboxMaterial);
    sandbox.position.set(0, 0.15, 0);
    sandbox.receiveShadow = true;
    GameState.scene.add(sandbox);

    // 沙坑区域：踩进去会变慢（更刺激）
    GameState.zones.push({
        type: 'sand',
        x: sandbox.position.x,
        z: sandbox.position.z,
        radius: 3.2,
        playerFactor: 0.62,
        enemyFactor: 0.88
    });

    addInteractable({
        type: 'sandbox_dig',
        label: '⛏️ 沙坑挖宝',
        x: sandbox.position.x,
        z: sandbox.position.z,
        radius: 3.4,
        cooldown: 7800,
        onUse: () => {
            const now = Date.now();
            const digTime = 1100;
            GameState.controlLockedUntil = Math.max(GameState.controlLockedUntil, now + digTime);
            GameState.dashUntil = 0;
            GameState.forcedMoveUntil = 0;
            showCollectPopup('⛏️ 挖呀挖...');
            AudioManager.playTone(220, 0.08, 'sawtooth');

            setTimeout(() => {
                if (!GameState.isPlaying) return;
                // 如果期间被抓/隐藏，就不给奖励（风险）
                if (Date.now() < GameState.hiddenUntil) return;

                const roll = Math.random();
                if (roll < 0.45) {
                    const bonus = 45 + Math.floor(Math.random() * 35);
                    GameState.score += bonus;
                    updateScoreDisplay();
                    showCollectPopup(`🎁 +${bonus}`);
                    particleSystem.emit(GameState.player.position, 0xFFD700, 10);
                } else if (roll < 0.68) {
                    if (GameState.lives < CONFIG.INITIAL_LIVES) {
                        GameState.lives++;
                        updateLivesDisplay();
                        showCollectPopup('❤️ +1');
                    } else {
                        const bonus = 20;
                        GameState.score += bonus;
                        updateScoreDisplay();
                        showCollectPopup(`❤️ 变分数 +${bonus}`);
                    }
                } else if (roll < 0.86) {
                    showCollectPopup('🧦 臭袜子诱饵!');
                    distractEnemyTo(GameState.player.position.x, GameState.player.position.z, 3600);
                } else {
                    showCollectPopup('🍌 香蕉皮!');
                    spawnBananaTrap(GameState.player.position.x, GameState.player.position.z);
                }
            }, digTime);
        }
    });
}

// ============ 创建树 ============
function createTree() {
    const tree = new THREE.Group();
    const scale = 0.8 + Math.random() * 0.4;

    // 树干
    const trunkGeometry = new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 2.5 * scale, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.25 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    // 多层树冠
    const foliageColors = [0x228B22, 0x2E8B57, 0x32CD32];
    const layers = [
        { y: 3, radius: 1.8 },
        { y: 4.2, radius: 1.4 },
        { y: 5.2, radius: 0.9 }
    ];

    layers.forEach((layer, i) => {
        const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(layer.radius * scale, 12, 12),
            new THREE.MeshStandardMaterial({ color: foliageColors[i % 3] })
        );
        foliage.position.y = layer.y * scale;
        foliage.castShadow = true;
        tree.add(foliage);
    });

    return tree;
}

// ============ 灌木（可跳跃越过的小障碍） ============
function createBush(width = 2.4, depth = 1.4, height = 0.7) {
    const bush = new THREE.Group();
    bush.name = 'bush';

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.95 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32, roughness: 0.95 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMaterial);
    base.position.y = height / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    bush.add(base);

    // 蓬松顶部
    const puffCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < puffCount; i++) {
        const r = 0.25 + Math.random() * 0.35;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), topMaterial);
        puff.position.set(
            (Math.random() - 0.5) * width * 0.8,
            height * (0.55 + Math.random() * 0.35),
            (Math.random() - 0.5) * depth * 0.8
        );
        puff.castShadow = true;
        bush.add(puff);
    }

    bush.userData = { height };
    return bush;
}

function createBushObstacles() {
    const count = 16;
    const margin = 6;

    for (let i = 0; i < count; i++) {
        let placed = false;

        for (let t = 0; t < 80; t++) {
            const width = 1.6 + Math.random() * 2.6;
            const depth = 1.0 + Math.random() * 1.8;
            const height = 0.6 + Math.random() * 0.35;

            const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2;
            const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2;

            // 给沙坑留出活动空间
            if (Math.abs(x) < 4.2 && Math.abs(z) < 4.2) continue;

            // 用“半对角 + 余量”做快速避障判断
            const r = Math.sqrt((width * 0.5) ** 2 + (depth * 0.5) ** 2) + 0.9;
            if (isPositionBlockedXZ(x, z, r, 0)) continue;

            const bush = createBush(width, depth, height);
            bush.position.set(x, 0, z);
            bush.rotation.y = Math.random() * Math.PI * 2;
            GameState.scene.add(bush);

            addBoxCollider({
                minX: x - width / 2,
                maxX: x + width / 2,
                minZ: z - depth / 2,
                maxZ: z + depth / 2,
                height: height + 0.05, // 低矮：跳起来可越过
                blocksLOS: true,
                blocksMovement: true,
                tag: 'bush'
            });

            placed = true;
            break;
        }

        if (!placed) break;
    }
}

// ============ 创建围栏 ============
function createFence() {
    const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887 });
    const postGeometry = new THREE.BoxGeometry(0.25, 1.8, 0.25);

    const size = CONFIG.WORLD_SIZE;
    for (let i = -size; i <= size; i += 2.5) {
        [[-size, i], [size, i], [i, -size], [i, size]].forEach(([x, z]) => {
            const post = new THREE.Mesh(postGeometry, fenceMaterial);
            post.position.set(x, 0.9, z);
            post.castShadow = true;
            GameState.scene.add(post);
        });
    }
}

// ============ 创建云朵 ============
function createCloud() {
    const cloud = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.9
    });

    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const size = 1 + Math.random() * 1.5;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), material);
        puff.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 2
        );
        cloud.add(puff);
    }

    cloud.userData.speed = 0.005 + Math.random() * 0.01;
    return cloud;
}

// ============ 创建小新 ============
function createShinnosuke() {
    const character = new THREE.Group();
    character.name = 'shinnosuke';

    // 身体
    const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.45, 0.9, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.7;
    body.castShadow = true;
    character.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.45, 20, 20);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    head.castShadow = true;
    character.add(head);

    // 头发
    const hairGeometry = new THREE.SphereGeometry(0.48, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.75;
    hair.castShadow = true;
    character.add(hair);

    // 刘海
    const bangsGeometry = new THREE.BoxGeometry(0.7, 0.15, 0.15);
    const bangs = new THREE.Mesh(bangsGeometry, hairMaterial);
    bangs.position.set(0, 1.95, 0.35);
    character.add(bangs);

    // 眉毛 (标志性粗眉毛)
    const eyebrowGeometry = new THREE.BoxGeometry(0.32, 0.1, 0.06);
    const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.13, 1.8, 0.38);
    character.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.13, 1.8, 0.38);
    character.add(rightEyebrow);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.13, 1.65, 0.4);
    character.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.13, 1.65, 0.4);
    character.add(rightEye);

    // 眼睛高光
    const highlightGeometry = new THREE.SphereGeometry(0.025, 8, 8);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    const leftHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    leftHighlight.position.set(-0.11, 1.67, 0.45);
    character.add(leftHighlight);

    const rightHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    rightHighlight.position.set(0.15, 1.67, 0.45);
    character.add(rightHighlight);

    // 腮红
    const blushGeometry = new THREE.CircleGeometry(0.08, 16);
    const blushMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFB6C1,
        transparent: true,
        opacity: 0.7
    });

    const leftBlush = new THREE.Mesh(blushGeometry, blushMaterial);
    leftBlush.position.set(-0.32, 1.55, 0.42);
    leftBlush.rotation.y = 0.3;
    character.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeometry, blushMaterial);
    rightBlush.position.set(0.32, 1.55, 0.42);
    rightBlush.rotation.y = -0.3;
    character.add(rightBlush);

    // 嘴巴
    const mouthGeometry = new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.5, 0.42);
    mouth.rotation.x = Math.PI;
    mouth.rotation.z = Math.PI;
    character.add(mouth);

    // 短裤
    const pantsGeometry = new THREE.CylinderGeometry(0.4, 0.32, 0.35, 16);
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
    pants.position.y = 0.27;
    pants.castShadow = true;
    character.add(pants);

    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.18, 0.05, 0);
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.18, 0.05, 0);
    character.add(rightLeg);

    character.position.set(0, 0, 8);
    return character;
}

// ============ 创建美冴妈妈 ============
function createMisae() {
    const character = new THREE.Group();
    character.name = 'misae';

    // 身体 (绿色围裙)
    const dressGeometry = new THREE.CylinderGeometry(0.35, 0.6, 1.4, 16);
    const dressMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32 });
    const dress = new THREE.Mesh(dressGeometry, dressMaterial);
    dress.position.y = 0.9;
    dress.castShadow = true;
    character.add(dress);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.4, 20, 20);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    character.add(head);

    // 头发
    const hairGeometry = new THREE.SphereGeometry(0.45, 20, 20);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 2.1;
    hair.scale.set(1, 0.85, 1);
    hair.castShadow = true;
    character.add(hair);

    // 发髻
    const bunGeometry = new THREE.SphereGeometry(0.22, 12, 12);
    const bun = new THREE.Mesh(bunGeometry, hairMaterial);
    bun.position.set(0, 2.5, -0.1);
    character.add(bun);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.05, 10, 10);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 2.05, 0.35);
    character.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 2.05, 0.35);
    character.add(rightEye);

    // 生气的眉毛
    const eyebrowGeometry = new THREE.BoxGeometry(0.18, 0.04, 0.02);
    const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });

    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.1, 2.15, 0.38);
    leftEyebrow.rotation.z = 0.35;
    character.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.1, 2.15, 0.38);
    rightEyebrow.rotation.z = -0.35;
    character.add(rightEyebrow);

    // 嘴巴
    const mouthGeometry = new THREE.BoxGeometry(0.12, 0.04, 0.02);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.85, 0.38);
    character.add(mouth);

    // 愤怒符号
    const angerGroup = new THREE.Group();
    const angerMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });

    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.02), angerMaterial);
    bar1.rotation.z = Math.PI / 4;
    angerGroup.add(bar1);

    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.02), angerMaterial);
    bar2.rotation.z = -Math.PI / 4;
    angerGroup.add(bar2);

    angerGroup.position.set(0.35, 2.4, 0);
    character.add(angerGroup);

    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.05, 0);
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.05, 0);
    character.add(rightLeg);

    // 避免出生点卡进房子碰撞体
    character.position.set(-12, 0, -15);
    return character;
}

// ============ 创建小白 ============
function createShiro() {
    const dog = new THREE.Group();
    dog.name = 'shiro';

    // 身体
    const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    bodyGeometry.scale(1.2, 0.8, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    dog.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.35, 0.55, 0);
    head.castShadow = true;
    dog.add(head);

    // 耳朵
    const earGeometry = new THREE.ConeGeometry(0.12, 0.25, 8);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });

    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(0.35, 0.85, -0.15);
    leftEar.rotation.z = 0.3;
    dog.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.35, 0.85, 0.15);
    rightEar.rotation.z = 0.3;
    dog.add(rightEar);

    // 鼻子
    const noseGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0.6, 0.5, 0);
    dog.add(nose);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.5, 0.6, -0.12);
    dog.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.5, 0.6, 0.12);
    dog.add(rightEye);

    // 尾巴
    const tailGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(-0.4, 0.5, 0);
    tail.rotation.z = -0.5;
    dog.add(tail);

    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8);

    [[-0.15, -0.15], [-0.15, 0.15], [0.15, -0.15], [0.15, 0.15]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, bodyMaterial);
        leg.position.set(x, 0.12, z);
        dog.add(leg);
    });

    dog.position.set(5, 0, 5);
    return dog;
}

// ============ 创建饼干 ============
function createCookies() {
    GameState.cookies = [];
    const config = CONFIG.DIFFICULTY[GameState.difficulty];

    for (let i = 0; i < config.cookieCount; i++) {
        const cookie = createCookie();
        spawnAtRandomPosition(cookie);
        GameState.scene.add(cookie);
        GameState.cookies.push(cookie);
    }
}

function createCookie() {
    const cookie = new THREE.Group();
    cookie.name = 'cookie';

    const types = ['chocolate', 'star', 'heart'];
    const type = types[Math.floor(Math.random() * types.length)];
    cookie.userData.type = type;
    cookie.userData.points = type === 'star' ? 20 : type === 'heart' ? 15 : 10;

    let geometry, material;

    switch (type) {
        case 'star':
            geometry = createStarGeometry();
            material = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.3 });
            break;
        case 'heart':
            geometry = new THREE.SphereGeometry(0.35, 16, 16);
            material = new THREE.MeshStandardMaterial({ color: 0xFF69B4 });
            break;
        default:
            geometry = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 20);
            material = new THREE.MeshStandardMaterial({ color: 0xD2691E, roughness: 0.7 });
    }

    const main = new THREE.Mesh(geometry, material);
    if (type === 'chocolate') main.rotation.x = Math.PI / 2;
    main.castShadow = true;
    cookie.add(main);

    // 巧克力碎片
    if (type === 'chocolate') {
        const chipGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const chipMaterial = new THREE.MeshStandardMaterial({ color: 0x3D1F0D });

        for (let i = 0; i < 5; i++) {
            const chip = new THREE.Mesh(chipGeometry, chipMaterial);
            const angle = (i / 5) * Math.PI * 2;
            chip.position.set(
                Math.cos(angle) * 0.18,
                Math.sin(angle) * 0.18,
                0.07
            );
            chip.scale.z = 0.5;
            cookie.add(chip);
        }
    }

    return cookie;
}

function createStarGeometry() {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.35;
    const innerRadius = 0.15;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
}

// ============ 创建道具 ============
function createPowerups() {
    GameState.powerups = [];

    const types = [
        { type: 'invincible', color: 0xFFD700, icon: '⭐' },
        { type: 'speed', color: 0x00CED1, icon: '💨' },
        { type: 'health', color: 0xFF69B4, icon: '❤️' }
    ];

    types.forEach((config, i) => {
        const powerup = createPowerup(config);
        const angle = (i / types.length) * Math.PI * 2;
        const radius = 12;
        powerup.position.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        GameState.scene.add(powerup);
        GameState.powerups.push(powerup);
    });
}

function createPowerup(config) {
    const powerup = new THREE.Group();
    powerup.name = 'powerup';
    powerup.userData = { ...config, collected: false };

    // 发光球体
    const geometry = new THREE.SphereGeometry(0.4, 20, 20);
    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    powerup.add(sphere);

    // 外圈
    const ringGeometry = new THREE.TorusGeometry(0.55, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: config.color });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    powerup.add(ring);

    return powerup;
}

// ============ 辅助函数 ============
function spawnAtRandomPosition(obj, opts = {}) {
    const margin = opts.margin ?? 5;
    const y = opts.y ?? 0.5;
    const radius = opts.radius ?? 0.9;
    const tries = opts.tries ?? 80;

    for (let i = 0; i < tries; i++) {
        const x = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2;
        const z = (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2;
        if (!isPositionBlockedXZ(x, z, radius, y)) {
            obj.position.set(x, y, z);
            return;
        }
    }

    // 兜底：实在找不到就随便放（极少发生）
    obj.position.set(
        (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2,
        y,
        (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2
    );
}

function getMoveInputNormalized() {
    let dx = 0, dz = 0;

    // 键盘输入
    if (GameState.keys['w'] || GameState.keys['arrowup'] || GameState.keys['ArrowUp']) dz -= 1;
    if (GameState.keys['s'] || GameState.keys['arrowdown'] || GameState.keys['ArrowDown']) dz += 1;
    if (GameState.keys['a'] || GameState.keys['arrowleft'] || GameState.keys['ArrowLeft']) dx -= 1;
    if (GameState.keys['d'] || GameState.keys['arrowright'] || GameState.keys['ArrowRight']) dx += 1;

    // 摇杆输入
    if (GameState.isMobile) {
        dx += GameState.joystickInput.x;
        dz += GameState.joystickInput.y;
    }

    const mag = Math.sqrt(dx * dx + dz * dz);
    if (mag > 1) {
        dx /= mag;
        dz /= mag;
    }

    return { dx, dz, moving: mag > 0.001 };
}

function requestJump() {
    if (!GameState.isPlaying || GameState.isPaused) return;
    const now = Date.now();
    // 短缓冲：手感更顺
    GameState.jumpBufferedUntil = now + 160;
}

function requestDash() {
    if (!GameState.isPlaying || GameState.isPaused) return;
    const now = Date.now();
    if (now < GameState.dashCooldownUntil) {
        showCollectPopup('⚡ 冷却中');
        return;
    }

    if (now < GameState.controlLockedUntil) return;
    if (now < GameState.hiddenUntil) return;

    const input = getMoveInputNormalized();
    if (input.moving) {
        GameState.dashDir.set(input.dx, 0, input.dz);
    } else if (GameState.player) {
        // 没输入就按面向方向冲刺
        GameState.dashDir.set(Math.sin(GameState.player.rotation.y), 0, Math.cos(GameState.player.rotation.y));
    } else {
        GameState.dashDir.set(0, 0, 1);
    }

    GameState.dashUntil = now + CONFIG.DASH.DURATION;
    GameState.dashCooldownUntil = now + CONFIG.DASH.COOLDOWN;
    GameState.noCatchUntil = Math.max(GameState.noCatchUntil, GameState.dashUntil + 80);
    AudioManager.playTone(520, 0.06);
}

// ============ 控制系统 ============
function setupControls() {
    // 键盘控制
    document.addEventListener('keydown', (e) => {
        GameState.keys[e.key.toLowerCase()] = true;
        GameState.keys[e.code] = true;

        if (e.key === 'Escape' && GameState.isPlaying && !GameState.isPaused) {
            togglePause();
        }

        if (!e.repeat) {
            if (e.code === 'Space') {
                requestJump();
                e.preventDefault();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                requestDash();
            }
            if (e.key.toLowerCase() === 'e') {
                attemptInteract();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        GameState.keys[e.key.toLowerCase()] = false;
        GameState.keys[e.code] = false;
    });

    // 移动端检测
    GameState.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (GameState.isMobile) {
        setupMobileControls();
    }
}

function setupMobileControls() {
    const joystickBase = DOM.joystickBase;
    const joystickStick = DOM.joystickStick;
    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
    const maxDistance = 35;

    function handleJoystickStart(e) {
        e.preventDefault();
        joystickActive = true;
        const touch = e.touches ? e.touches[0] : e;
        const rect = joystickBase.getBoundingClientRect();
        joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function handleJoystickMove(e) {
        if (!joystickActive) return;
        e.preventDefault();

        const touch = e.touches ? e.touches[0] : e;
        let dx = touch.clientX - joystickCenter.x;
        let dy = touch.clientY - joystickCenter.y;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }

        joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;

        GameState.joystickInput.x = dx / maxDistance;
        GameState.joystickInput.y = dy / maxDistance;
    }

    function handleJoystickEnd() {
        joystickActive = false;
        joystickStick.style.transform = 'translate(0, 0)';
        GameState.joystickInput.x = 0;
        GameState.joystickInput.y = 0;
    }

    joystickBase.addEventListener('touchstart', handleJoystickStart);
    joystickBase.addEventListener('mousedown', handleJoystickStart);
    document.addEventListener('touchmove', handleJoystickMove);
    document.addEventListener('mousemove', handleJoystickMove);
    document.addEventListener('touchend', handleJoystickEnd);
    document.addEventListener('mouseup', handleJoystickEnd);
}

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

// ============ UI 更新 ============
function showCollectPopup(text) {
    const popup = DOM.collectPopup;
    popup.querySelector('.collect-text').textContent = text;
    popup.classList.remove('hidden');

    setTimeout(() => {
        popup.classList.add('hidden');
    }, 800);
}

function updateScoreDisplay() {
    DOM.scoreDisplay.textContent = GameState.score;
    DOM.scoreDisplay.classList.add('score-pulse');
    setTimeout(() => DOM.scoreDisplay.classList.remove('score-pulse'), 200);
}

function updateTimeDisplay() {
    DOM.timeDisplay.textContent = Math.ceil(GameState.timeLeft);
    if (GameState.timeLeft <= 10) {
        DOM.timeDisplay.style.color = '#FF4444';
    } else {
        DOM.timeDisplay.style.color = '';
    }
}

function updateLivesDisplay() {
    DOM.livesDisplay.textContent = '❤️'.repeat(GameState.lives) + '🖤'.repeat(CONFIG.INITIAL_LIVES - GameState.lives);
}

function updateComboDisplay() {
    if (GameState.combo >= 2) {
        DOM.comboDisplay.classList.remove('hidden');
        DOM.comboCount.textContent = 'x' + GameState.combo;
    } else {
        DOM.comboDisplay.classList.add('hidden');
    }
}

function updateHighscoreDisplay() {
    DOM.highscoreDisplay.textContent = GameState.highScore;
}

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

    // 开始播放背景音乐
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
        AudioManager.pauseBGM();
        DOM.gameUI.classList.remove('danger');
        setActionPrompt(false);
        GameState.dangerBeepAt = 0;
        DOM.pauseScreen.classList.remove('hidden');
        DOM.pauseScore.textContent = GameState.score;
        DOM.pauseTime.textContent = Math.ceil(GameState.timeLeft);
    } else {
        AudioManager.playBGM();
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

    AudioManager.stopBGM();
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

    AudioManager.stopBGM();
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
        // 同步BGM状态
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

// 启动游戏
document.addEventListener('DOMContentLoaded', init);

console.log('🖍️ 蜡笔小新 3D 饼干大作战 - 优化版 已加载!');
