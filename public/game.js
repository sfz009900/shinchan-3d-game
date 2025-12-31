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
    INITIAL_LIVES: 3,
    WORLD_SIZE: 28,
    CATCH_DISTANCE: 1.5,
    POWERUP_DURATION: 5000,
    COMBO_TIMEOUT: 2000
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
    DOM.mobileControls = document.getElementById('mobile-controls');
    DOM.joystickBase = document.getElementById('joystick-base');
    DOM.joystickStick = document.getElementById('joystick-stick');
    DOM.mobilePauseBtn = document.getElementById('mobile-pause-btn');
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
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2.5, CONFIG.WORLD_SIZE * 2.5, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7CCD7C,
        roughness: 0.9,
        metalness: 0
    });

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

    // 幼稚园
    const kindergarten = createKindergarten();
    kindergarten.position.set(18, 0, -18);
    kindergarten.rotation.y = -Math.PI / 4;
    GameState.scene.add(kindergarten);

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
    }

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

    // 沙坑
    const sandboxGeometry = new THREE.CylinderGeometry(3, 3, 0.3, 6);
    const sandboxMaterial = new THREE.MeshStandardMaterial({ color: 0xF4D03F });
    const sandbox = new THREE.Mesh(sandboxGeometry, sandboxMaterial);
    sandbox.position.set(0, 0.15, 0);
    sandbox.receiveShadow = true;
    GameState.scene.add(sandbox);
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

    character.position.set(-15, 0, -15);
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
function spawnAtRandomPosition(obj) {
    const margin = 5;
    obj.position.set(
        (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2,
        0.5,
        (Math.random() - 0.5) * (CONFIG.WORLD_SIZE - margin) * 2
    );
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

    // 归一化
    const mag = Math.sqrt(dx * dx + dz * dz);
    if (mag > 1) {
        dx /= mag;
        dz /= mag;
    }

    // 速度加成
    let speed = CONFIG.PLAYER_SPEED;
    if (GameState.speedBoost) speed *= 1.5;

    // 应用移动
    const newX = GameState.player.position.x + dx * speed;
    const newZ = GameState.player.position.z + dz * speed;

    const boundary = CONFIG.WORLD_SIZE - 1;
    GameState.player.position.x = Math.max(-boundary, Math.min(boundary, newX));
    GameState.player.position.z = Math.max(-boundary, Math.min(boundary, newZ));

    // 面向移动方向和走路动画
    if (dx !== 0 || dz !== 0) {
        GameState.player.rotation.y = Math.atan2(dx, dz);
        const time = GameState.clock.getElapsedTime();
        GameState.player.position.y = Math.abs(Math.sin(time * 12)) * 0.12;
    } else {
        GameState.player.position.y = 0;
    }

    // 无敌闪烁效果
    if (GameState.isInvincible) {
        GameState.player.visible = Math.floor(Date.now() / 100) % 2 === 0;
    } else {
        GameState.player.visible = true;
    }

    // 相机跟随
    const targetCamX = GameState.player.position.x * 0.7;
    const targetCamZ = GameState.player.position.z + 18;
    GameState.camera.position.x += (targetCamX - GameState.camera.position.x) * 0.05;
    GameState.camera.position.z += (targetCamZ - GameState.camera.position.z) * 0.05;
    GameState.camera.lookAt(GameState.player.position.x, 0, GameState.player.position.z);
}

// ============ 敌人AI ============
function updateEnemy() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.enemy || !GameState.player) return;

    const config = CONFIG.DIFFICULTY[GameState.difficulty];
    let target = GameState.player;

    // 有几率追小白
    if (GameState.shiro && Math.random() < 0.01) {
        const distToShiro = GameState.enemy.position.distanceTo(GameState.shiro.position);
        const distToPlayer = GameState.enemy.position.distanceTo(GameState.player.position);
        if (distToShiro < distToPlayer * 0.7) {
            target = GameState.shiro;
        }
    }

    const dx = target.position.x - GameState.enemy.position.x;
    const dz = target.position.z - GameState.enemy.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > 0.1) {
        GameState.enemy.position.x += (dx / distance) * config.enemySpeed;
        GameState.enemy.position.z += (dz / distance) * config.enemySpeed;
        GameState.enemy.rotation.y = Math.atan2(dx, dz);

        const time = GameState.clock.getElapsedTime();
        GameState.enemy.position.y = Math.abs(Math.sin(time * 10)) * 0.1;
    }

    // 检查抓住玩家
    const playerDist = GameState.enemy.position.distanceTo(GameState.player.position);
    if (playerDist < CONFIG.CATCH_DISTANCE && !GameState.isInvincible) {
        playerCaught();
    }
}

// ============ 小白AI ============
function updateShiro() {
    if (!GameState.isPlaying || GameState.isPaused || !GameState.shiro) return;

    const time = GameState.clock.getElapsedTime();

    // 跟随玩家但保持距离
    const toPlayer = new THREE.Vector3().subVectors(GameState.player.position, GameState.shiro.position);
    const dist = toPlayer.length();

    if (dist > 5) {
        toPlayer.normalize().multiplyScalar(0.1);
        GameState.shiro.position.add(toPlayer);
    } else if (dist < 3) {
        toPlayer.normalize().multiplyScalar(-0.05);
        GameState.shiro.position.add(toPlayer);
    }

    // 随机走动
    GameState.shiro.position.x += Math.sin(time * 2) * 0.02;
    GameState.shiro.position.z += Math.cos(time * 1.5) * 0.02;

    // 面向移动方向
    GameState.shiro.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    // 尾巴摇晃动画
    GameState.shiro.position.y = Math.abs(Math.sin(time * 8)) * 0.05;
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
    GameState.enemy.position.set(-15, 0, -15);

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

    // 重置位置
    GameState.player.position.set(0, 0, 8);
    GameState.enemy.position.set(-15, 0, -15);
    GameState.shiro.position.set(5, 0, 5);

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

    DOM.pauseScreen.classList.add('hidden');
    DOM.gameUI.classList.add('hidden');
    DOM.mobileControls.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
}

function gameOver() {
    GameState.isPlaying = false;
    clearInterval(GameState.timerInterval);

    AudioManager.playGameOver();

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

// 启动游戏
document.addEventListener('DOMContentLoaded', init);

console.log('🖍️ 蜡笔小新 3D 饼干大作战 - 优化版 已加载!');
