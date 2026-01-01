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
    GameState.worldGroup = new THREE.Group();
    GameState.scene.add(GameState.worldGroup);

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

// ============ 地图布局生成 ============
function generateMapLayout() {
    console.log("Generating New Map Layout...");

    // 如果已经有有效布局且不是重新开始，可能不需要重新生成？
    // 但为了每次游戏都不同，我们强制生成。

    const layout = {
        house: { x: -18, z: -18 },
        kindergarten: { x: 18, z: -18 },
        slide: { x: 10, z: 10 },
        swing: { x: -10, z: 10 },
        sandbox: { x: 0, z: 0 },
        spawn: { x: 0, z: 8 },
        enemySpawn: { x: -12, z: -15 },
        shiroSpawn: { x: 5, z: 5 }
    };

    // 简单的随机尝试算法
    const items = [
        { key: 'house', r: 7 },
        { key: 'kindergarten', r: 9 },
        { key: 'slide', r: 5 },
        { key: 'swing', r: 5 },
        { key: 'sandbox', r: 5 }
    ];

    const placedItems = [];
    const size = CONFIG.WORLD_SIZE - 4; // 留边距

    // 1. 放置主要建筑/设施
    for (const item of items) {
        let placed = false;
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 2 * size;
            const z = (Math.random() - 0.5) * 2 * size;

            // 检查与其他项的距离
            let valid = true;
            for (const other of placedItems) {
                const dist = Math.hypot(x - other.x, z - other.z);
                if (dist < (item.r + other.r + 2)) {
                    valid = false;
                    break;
                }
            }

            // 避免放在正中心 (留给玩家出生?)
            if (Math.hypot(x, z) < 6) valid = false;

            if (valid) {
                layout[item.key] = { x, z };
                placedItems.push({ x, z, r: item.r, key: item.key });
                placed = true;
                break;
            }
        }
        if (!placed) console.warn("Could not place item randomly:", item.key);
    }

    // 2. 放置出生点 (Player Spawn)
    // 找一个离所有障碍物有一定距离的点，且尽量在中心区域附近
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        let valid = true;
        for (const other of placedItems) {
            if (Math.hypot(x - other.x, z - other.z) < (other.r + 3)) {
                valid = false;
                break;
            }
        }
        if (valid) {
            layout.spawn = { x, z };
            break;
        }
    }

    // 3. 放置敌人出生点 (Enemy Spawn)
    // 离玩家远一点
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 2 * size;
        const z = (Math.random() - 0.5) * 2 * size;
        const distToPlayer = Math.hypot(x - layout.spawn.x, z - layout.spawn.z);

        let valid = distToPlayer > 15; // 至少15米远
        if (valid) {
            for (const other of placedItems) {
                if (Math.hypot(x - other.x, z - other.z) < (other.r + 2)) {
                    valid = false;
                    break;
                }
            }
        }

        if (valid) {
            layout.enemySpawn = { x, z };
            break;
        }
    }

    // 4. 放置小白出生点
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 15;
        const z = (Math.random() - 0.5) * 15;
        let valid = true;
        for (const other of placedItems) {
            if (Math.hypot(x - other.x, z - other.z) < (other.r + 2)) {
                valid = false;
                break;
            }
        }
        if (valid) {
            layout.shiroSpawn = { x, z };
            break;
        }
    }

    GameState.mapLayout = layout;
    return layout;
}

// ============ 创建游戏世界 ============
function createWorld() {
    resetWorldSystems();

    // 生成地图布局
    const layout = generateMapLayout();

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
    GameState.worldGroup.add(ground);

    // 装饰草丛
    for (let i = 0; i < 150; i++) {
        const grass = createGrassClump();
        grass.position.set(
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 2,
            0,
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 2
        );
        GameState.worldGroup.add(grass);
    }

    // 野原家
    const noharaHouse = createHouse(0xFF6B35, true);
    noharaHouse.position.set(layout.house.x, 0, layout.house.z);
    noharaHouse.rotation.y = Math.random() * Math.PI * 2; // 随机朝向
    GameState.worldGroup.add(noharaHouse);
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
    kindergarten.position.set(layout.kindergarten.x, 0, layout.kindergarten.z);
    kindergarten.rotation.y = Math.random() * Math.PI * 2;
    GameState.worldGroup.add(kindergarten);
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
    createParkFeatures(layout);

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
        GameState.worldGroup.add(tree);
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
        GameState.worldGroup.add(cloud);
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
function createParkFeatures(layout) {
    if (!layout) layout = { slide: { x: 10, z: 10 }, swing: { x: -10, z: 10 }, sandbox: { x: 0, z: 0 } };

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

    slide.position.set(layout.slide.x, 0, layout.slide.z);
    slide.rotation.y = Math.random() * Math.PI * 2;
    GameState.worldGroup.add(slide);
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

    swing.position.set(layout.swing.x, 0, layout.swing.z);
    swing.rotation.y = Math.random() * Math.PI * 2;
    GameState.worldGroup.add(swing);
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
    sandbox.position.set(layout.sandbox.x, 0.15, layout.sandbox.z); // use y=0.15 check
    sandbox.receiveShadow = true;
    GameState.worldGroup.add(sandbox);

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

            // 检查是否在安全区 (出生点周围)
            if (GameState.mapLayout) {
                const distToSpawn = Math.hypot(x - GameState.mapLayout.spawn.x, z - GameState.mapLayout.spawn.z);
                if (distToSpawn < 6) continue;
            } else if (Math.abs(x) < 4.2 && Math.abs(z) < 4.2) {
                // Fallback
                continue;
            }

            // 用“半对角 + 余量”做快速避障判断
            const r = Math.sqrt((width * 0.5) ** 2 + (depth * 0.5) ** 2) + 0.9;
            if (isPositionBlockedXZ(x, z, r, 0)) continue;

            const bush = createBush(width, depth, height);
            bush.position.set(x, 0, z);
            bush.rotation.y = Math.random() * Math.PI * 2;
            GameState.worldGroup.add(bush);

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
            GameState.worldGroup.add(post);
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

