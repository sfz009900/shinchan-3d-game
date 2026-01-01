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

    // 小葵
    const himawari = createHimawari();
    if (GameState.mapLayout && GameState.mapLayout.himawariSpawn) {
        himawari.position.set(GameState.mapLayout.himawariSpawn.x, 0, GameState.mapLayout.himawariSpawn.z);
    } else {
        himawari.position.set(-15, 0, -15);
    }
    // 随机爬行方向
    himawari.rotation.y = Math.random() * Math.PI * 2;
    GameState.worldGroup.add(himawari);

    // 小葵互动
    addInteractable({
        type: 'tickle_himawari',
        label: '👶 逗小葵',
        x: himawari.position.x,
        z: himawari.position.z,
        radius: 2.0,
        cooldown: 4500,
        onUse: () => {
            AudioManager.playTone(600, 0.1, 'sine');
            showCollectPopup('👶 咯咯咯!');
            himawari.rotation.z = Math.PI / 2 + 0.2;
            setTimeout(() => himawari.rotation.z = Math.PI / 2, 200);

            // 简单AI: 转向
            himawari.rotation.y += Math.PI;
        }
    });

    // 实例化新角色 (如果地图里有)
    if (GameState.mapLayout.kazama) spawnCharacter('kazama', createKazama, GameState.mapLayout.kazama, '🎓 风间: 只要有萌P...', 5000);
    if (GameState.mapLayout.masao) spawnCharacter('masao', createMasao, GameState.mapLayout.masao, '🍙 正男: 哇啊啊啊!', 4000);
    if (GameState.mapLayout.bochan) spawnCharacter('bochan', createBochan, GameState.mapLayout.bochan, '💧 阿呆: 呆...', 6000);
    if (GameState.mapLayout.hiroshi) spawnCharacter('hiroshi', createHiroshi, GameState.mapLayout.hiroshi, '👞 广志: 闻闻我的袜子!', 10000);
    if (GameState.mapLayout.principal) spawnCharacter('principal', createPrincipal, GameState.mapLayout.principal, '🕶️ 园长: 我不是黑道...', 8000);


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
        shiroSpawn: { x: 5, z: 5 },
        himawariSpawn: { x: -15, z: -15 } // near house
    };

    // 简单的随机尝试算法
    const items = [
        { key: 'house', r: 7 },
        { key: 'kindergarten', r: 9 },
        { key: 'slide', r: 5 },
        { key: 'swing', r: 5 },
        { key: 'sandbox', r: 5 },
        { key: 'junglegym', r: 6 },
        { key: 'chocobi', r: 3 },
        { key: 'buriburi', r: 3 },
        { key: 'actionkamen', r: 3 },
        { key: 'quantumrobo', r: 4 },
        { key: 'chocobi', r: 3 },
        { key: 'buriburi', r: 3 },
        { key: 'actionkamen', r: 3 },
        { key: 'quantumrobo', r: 4 },
        { key: 'nenebunny', r: 2 },
        { key: 'kazama', r: 2 },
        { key: 'masao', r: 2 },
        { key: 'bochan', r: 2 },
        { key: 'hiroshi', r: 2 },
        { key: 'principal', r: 2 }
    ];

    const placedItems = [];
    const size = CONFIG.WORLD_SIZE - 4; // 留边距

    // 1. 放置主要建筑/设施
    for (const item of items) {
        let placed = false;
        // Increase attempts to find a spot
        for (let i = 0; i < 200; i++) {
            const x = (Math.random() - 0.5) * 2 * size;
            const z = (Math.random() - 0.5) * 2 * size;

            // 检查与其他项的距离
            let valid = true;
            for (const other of placedItems) {
                const dist = Math.hypot(x - other.x, z - other.z);
                // Reduce buffer from 2 to 1 to fit more items
                if (dist < (item.r + other.r + 1)) {
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

    // 5. 放置小葵 (Himawari) - 在野原家附近
    if (layout.house) {
        layout.himawariSpawn = {
            x: layout.house.x + 3 + (Math.random() - 0.5) * 4,
            z: layout.house.z + 3 + (Math.random() - 0.5) * 4
        };
    } else {
        layout.himawariSpawn = { x: -15, z: -15 };
    }

    GameState.mapLayout = layout;
    return layout;
}

// 辅助：生成角色并绑定通用互动逻辑
function spawnCharacter(key, createFn, pos, label, cooldown) {
    const char = createFn();
    char.position.set(pos.x, 0, pos.z);
    char.rotation.y = Math.random() * Math.PI * 2;
    GameState.worldGroup.add(char);
    addCircleCollider({ x: pos.x, z: pos.z, radius: 1.0, height: 1.5, blocksLOS: false, blocksMovement: true, tag: key });

    addInteractable({
        type: 'talk_' + key,
        label: label,
        x: pos.x,
        z: pos.z,
        radius: 2.2,
        cooldown: cooldown,
        onUse: () => {
            // 这里可以针对每个角色写特殊的逻辑
            handleCharacterInteraction(key, char);
        }
    });
}

function handleCharacterInteraction(key, char) {
    if (key === 'kazama') {
        showCollectPopup('💖 萌P好可爱!');
        AudioManager.playTone(550, 0.1);
        char.scale.set(1.1, 1.1, 1.1);
        setTimeout(() => char.scale.set(1, 1, 1), 200);
    } else if (key === 'masao') {
        showCollectPopup('🍙 哎呀吓死我了!');
        AudioManager.playTone(300, 0.2);
        // 掉落回血
        const heart = createPowerup({ type: 'health', color: 0xFF69B4, icon: '❤️' });
        heart.position.copy(char.position).add(new THREE.Vector3(0, 1, 1));
        GameState.scene.add(heart);
        GameState.powerups.push(heart);
    } else if (key === 'bochan') {
        showCollectPopup('💧 鼻涕风暴!');
        // 鼻涕旋转
        const snot = char.getObjectByName('snot');
        if (snot) {
            let spin = 0;
            const inter = setInterval(() => {
                snot.rotation.y += 0.5;
                spin++;
                if (spin > 20) clearInterval(inter);
            }, 50);
        }
    } else if (key === 'hiroshi') {
        showCollectPopup('🤢 好臭啊!!!', 'purple');
        // 眩晕周围敌人
        if (GameState.enemy) {
            GameState.enemyStunnedUntil = Date.now() + 4000;
        }
    } else if (key === 'principal') {
        showCollectPopup('🕶️ 别怕,我是好人');
        // 吓跑敌人 (临时移走)
        if (GameState.enemy) {
            GameState.enemy.position.add(new THREE.Vector3(20, 0, 20));
        }
    }
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

    // 小白的狗屋 (在野原家旁边)
    const shiroHouse = createShiroHouse();
    // 放在房子侧面
    const houseDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), noharaHouse.rotation.y);
    shiroHouse.position.copy(noharaHouse.position).add(houseDir.multiplyScalar(6.5));
    // 稍微随机旋转
    shiroHouse.rotation.y = noharaHouse.rotation.y + (Math.random() - 0.5) * 0.5;
    GameState.worldGroup.add(shiroHouse);
    addBoxCollider({
        minX: shiroHouse.position.x - 1, maxX: shiroHouse.position.x + 1,
        minZ: shiroHouse.position.z - 1, maxZ: shiroHouse.position.z + 1,
        height: 1.5, blocksLOS: false, blocksMovement: true, tag: 'shiro_house'
    });
    addInteractable({
        type: 'pet_shiro',
        label: '🏡 呼唤小白',
        x: shiroHouse.position.x,
        z: shiroHouse.position.z,
        radius: 2.5,
        cooldown: 5000,
        onUse: () => {
            if (GameState.shiro) {
                // 召唤小白回家
                GameState.shiro.position.copy(shiroHouse.position).add(new THREE.Vector3(0, 0, 2));
                particleSystem.emit(shiroHouse.position, 0xFFFFFF, 10);
                AudioManager.playTone(500, 0.1);
                showCollectPopup('🐶 小白回家!');
            }
        }
    });

    // 其他随机元素
    if (layout.junglegym) {
        const gym = createJungleGym();
        gym.position.set(layout.junglegym.x, 0, layout.junglegym.z);
        gym.rotation.y = Math.random() * Math.PI * 2;
        GameState.worldGroup.add(gym);
        addCircleCollider({ x: gym.position.x, z: gym.position.z, radius: 3.5, height: 3.0, blocksLOS: false, blocksMovement: true, tag: 'junglegym' });
    }

    if (layout.chocobi) {
        const chocobi = createChocobi();
        chocobi.position.set(layout.chocobi.x, 0, layout.chocobi.z);
        GameState.worldGroup.add(chocobi);
        addCircleCollider({ x: chocobi.position.x, z: chocobi.position.z, radius: 1.5, height: 4.0, blocksLOS: true, blocksMovement: true, tag: 'chocobi' });
        addInteractable({
            type: 'chocobi_snack',
            label: '🦖 吃小饼干',
            x: chocobi.position.x,
            z: chocobi.position.z,
            radius: 3.0,
            cooldown: 15000,
            onUse: () => {
                GameState.score += 50;
                updateScoreDisplay();
                showCollectPopup('🦖 美味! +50');
                AudioManager.playCollect();
            }
        });
    }

    if (layout.buriburi) {
        const buri = createBuriburiStatue();
        buri.position.set(layout.buriburi.x, 0, layout.buriburi.z);
        buri.rotation.y = Math.random() * Math.PI * 2;
        GameState.worldGroup.add(buri);
        addCircleCollider({ x: buri.position.x, z: buri.position.z, radius: 1.2, height: 2.5, blocksLOS: true, blocksMovement: true, tag: 'buriburi' });
        addInteractable({
            type: 'buriburi_trade',
            label: '🐷 拯救费',
            x: buri.position.x,
            z: buri.position.z,
            radius: 2.5,
            cooldown: 1000,
            onUse: () => {
                if (GameState.score >= 100) {
                    GameState.score -= 100;
                    updateScoreDisplay();
                    // 随机给道具
                    const types = ['invincible', 'speed', 'health'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    const powerup = createPowerup({
                        type,
                        color: type === 'invincible' ? 0xFFD700 : type === 'speed' ? 0x00CED1 : 0xFF69B4,
                        icon: '🎁'
                    });
                    powerup.position.copy(GameState.player.position).add(new THREE.Vector3(0, 2, 0));
                    GameState.scene.add(powerup);
                    GameState.powerups.push(powerup);
                    showCollectPopup('🐷 拿去吧! -100分');
                    AudioManager.playTone(200, 0.2, 'square');
                } else {
                    showCollectPopup('🐷 分数不够!', 'red');
                }
            }
        });
    }

    if (layout.actionkamen) {
        const kamen = createActionMaskStatue();
        kamen.position.set(layout.actionkamen.x, 0, layout.actionkamen.z);
        kamen.rotation.y = Math.random() * Math.PI * 2;
        GameState.worldGroup.add(kamen);
        addCircleCollider({ x: kamen.position.x, z: kamen.position.z, radius: 1.2, height: 3.0, blocksLOS: true, blocksMovement: true, tag: 'actionkamen' });
        addInteractable({
            type: 'action_beam',
            label: '⚡ 动感光波',
            x: kamen.position.x,
            z: kamen.position.z,
            radius: 3.0,
            cooldown: 30000,
            onUse: () => {
                // 震慑敌人
                if (GameState.enemy) {
                    GameState.enemyStunnedUntil = Date.now() + 5000;
                    particleSystem.emit(GameState.enemy.position, 0x00FFFF, 30);
                    showCollectPopup('⚡ 动感光波!!!');
                    AudioManager.playTone(880, 0.5, 'sawtooth');
                }
            }
        });
    }

    if (layout.quantumrobo) {
        const robo = createQuantumRobot();
        robo.position.set(layout.quantumrobo.x, 0, layout.quantumrobo.z);
        robo.rotation.y = Math.random() * Math.PI * 2;
        GameState.worldGroup.add(robo);
        addBoxCollider({
            minX: robo.position.x - 2, maxX: robo.position.x + 2,
            minZ: robo.position.z - 2, maxZ: robo.position.z + 2,
            height: 6.0, blocksLOS: true, blocksMovement: true, tag: 'quantumrobo'
        });
    }

    if (layout.nenebunny) {
        const bunny = createNeneBunny();
        bunny.position.set(layout.nenebunny.x, 0, layout.nenebunny.z);
        bunny.rotation.y = Math.random() * Math.PI * 2;
        GameState.worldGroup.add(bunny);
        addCircleCollider({ x: bunny.position.x, z: bunny.position.z, radius: 1.0, height: 1.5, blocksLOS: false, blocksMovement: true, tag: 'nenebunny' });
        addInteractable({
            type: 'punch_bunny',
            label: '🐰 揍兔子',
            x: bunny.position.x,
            z: bunny.position.z,
            radius: 2.2,
            cooldown: 500,
            onUse: () => {
                // 震动动画
                bunny.scale.set(1.2, 0.8, 1.2);
                setTimeout(() => bunny.scale.set(1, 1, 1), 100);

                AudioManager.playTone(100, 0.1, 'square');
                showCollectPopup('💢好爽!');
                particleSystem.emit(bunny.position, 0xFFFFFF, 5);
            }
        });
    }

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

    // ============ 新增：弹跳板与加速带 ============
    // 弹跳板 (Jump Pads)
    for (let i = 0; i < 6; i++) {
        const jumpPad = createJumpPad();
        let valid = false;
        let x, z;
        for (let attempt = 0; attempt < 10; attempt++) {
            x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.8;
            z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.8;
            // 简单检查不重叠
            if (Math.hypot(x, z) > 5) { valid = true; break; }
        }
        if (valid) {
            jumpPad.position.set(x, 0.05, z);
            GameState.worldGroup.add(jumpPad);
            GameState.interactables.push({
                type: 'jump_pad',
                mesh: jumpPad,
                radius: 1.5
            });
            // Sky Coins above jump pad
            createSkyCoins(x, z);
        }
    }

    // 加速带 (Speed Boosts)
    for (let i = 0; i < 8; i++) {
        const speedPad = createSpeedPad();
        let valid = false;
        let x, z;
        for (let attempt = 0; attempt < 10; attempt++) {
            x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.8;
            z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.8;
            if (Math.hypot(x, z) > 5) { valid = true; break; }
        }
        if (valid) {
            speedPad.position.set(x, 0.02, z);
            speedPad.rotation.y = Math.random() * Math.PI * 2; // Random direction
            GameState.worldGroup.add(speedPad);
            GameState.interactables.push({
                type: 'speed_pad',
                mesh: speedPad,
                radius: 1.5,
                direction: new THREE.Vector3(Math.sin(speedPad.rotation.y), 0, Math.cos(speedPad.rotation.y))
            });
        }
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
    }
}

// ============ 新增：小白狗屋 ============
function createShiroHouse() {
    const group = new THREE.Group();

    // 屋体
    const houseGeo = new THREE.BoxGeometry(2, 1.8, 2.2);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const house = new THREE.Mesh(houseGeo, houseMat);
    house.position.y = 0.9;
    house.castShadow = true;
    group.add(house);

    // 屋顶 (红色)
    const roofGeo = new THREE.ConeGeometry(1.8, 1.2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xFF4444 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 门洞
    const doorGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 0.7, 1.11);
    group.add(door);

    // 牌子
    const signGeo = new THREE.BoxGeometry(0.8, 0.3, 0.05);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.4, 1.15);
    group.add(sign);

    return group;
}

// ============ 新增：攀爬架 (Jungle Gym) ============
function createJungleGym() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ color: 0x4169E1 }); // 蓝色钢管

    // 格子结构 3x3x3
    const spacing = 1.2;
    const size = 3;
    const thickness = 0.08;

    for (let x = 0; x <= size; x++) {
        for (let y = 0; y <= size; y++) {
            for (let z = 0; z <= size; z++) {
                // 节点球
                const joint = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.5), mat);
                joint.position.set((x - size / 2) * spacing, y * spacing, (z - size / 2) * spacing);
                group.add(joint);

                // 横梁 X
                if (x < size) {
                    const bar = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, spacing), mat);
                    bar.rotation.z = Math.PI / 2;
                    bar.position.set((x - size / 2 + 0.5) * spacing, y * spacing, (z - size / 2) * spacing);
                    group.add(bar);
                }
                // 竖梁 Y
                if (y < size) {
                    const bar = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, spacing), mat);
                    bar.position.set((x - size / 2) * spacing, (y + 0.5) * spacing, (z - size / 2) * spacing);
                    group.add(bar);
                }
                // 纵梁 Z
                if (z < size) {
                    const bar = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, spacing), mat);
                    bar.rotation.x = Math.PI / 2;
                    bar.position.set((x - size / 2) * spacing, y * spacing, (z - size / 2 + 0.5) * spacing);
                    group.add(bar);
                }
            }
        }
    }

    return group;
}

// ============ 新增：巧克比 (Chocobi) ============
function createChocobi() {
    const group = new THREE.Group();

    // 六边形盒子
    const boxGeo = new THREE.CylinderGeometry(1.5, 1.5, 4, 6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xFF69B4 }); // 粉色
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 2;
    box.castShadow = true;
    group.add(box);

    // 简单的星星装饰
    const starGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });

    for (let i = 0; i < 8; i++) {
        const star = new THREE.Mesh(starGeo, starMat);
        const angle = Math.random() * Math.PI * 2;
        const h = Math.random() * 3.5 + 0.2;
        star.position.set(Math.cos(angle) * 1.55, h, Math.sin(angle) * 1.55);
        star.lookAt(0, h, 0);
        star.rotation.x = Math.PI / 2;
        group.add(star);
    }

    return group;
}

// ============ 新增：不理不理左卫门 (Buriburi Zaemon) ============
function createBuriburiStatue() {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA });

    // 身体
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), stoneMat);
    body.position.y = 1.2;
    group.add(body);

    // 头
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), stoneMat);
    head.position.y = 2.0;
    group.add(head);

    // 猪鼻子
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8), stoneMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 2.0, 0.5);
    group.add(snout);

    // 剑
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.05), stoneMat);
    sword.position.set(0.6, 1.5, 0.3);
    sword.rotation.z = -0.2;
    sword.rotation.x = 0.5;
    group.add(sword);

    // 底座
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16), stoneMat);
    base.position.y = 0.3;
    group.add(base);

    return group;
}

// ============ 新增：动感超人 (Action Kamen) ============
function createActionMaskStatue() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4444AA }); // 蓝色制服

    // 身体
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.4, 12), mat);
    body.position.y = 1.4;
    group.add(body);

    // 头
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0xEEEEEE })); // 银色头盔
    head.position.y = 2.3;
    group.add(head);

    // 姿势：手臂高举 (动感光波!)
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
    const lArm = new THREE.Mesh(armGeo, mat);
    lArm.position.set(-0.5, 1.8, 0);
    lArm.rotation.z = 2.5;
    group.add(lArm);

    const rArm = new THREE.Mesh(armGeo, mat);
    rArm.position.set(0.5, 1.8, 0);
    rArm.rotation.z = -2.5;
    group.add(rArm);

    // 披风
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.05), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
    cape.position.set(0, 1.6, -0.3);
    cape.rotation.x = 0.2;
    group.add(cape);

    // 底座
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    base.position.y = 0.2;
    group.add(base);

    return group;
}

// ============ 新增：康达姆机器人 (Quantum Robot) ============
function createQuantumRobot() {
    const group = new THREE.Group();

    // 简单的方块堆叠
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });

    // 腿
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8), greenMat);
    legL.position.set(-0.8, 1.25, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8), greenMat);
    legR.position.set(0.8, 1.25, 0);
    group.add(legR);

    // 躯干
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 1.2), greenMat);
    body.position.set(0, 3.5, 0);
    group.add(body);

    // 胸口
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.2), goldMat);
    chest.position.set(0, 3.6, 0.6);
    group.add(chest);

    // 头
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), greenMat);
    head.position.set(0, 5.0, 0);
    group.add(head);

    // 뿔 (Antenna)
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), goldMat);
    horn.position.set(0, 5.7, 0);
    group.add(horn);

    return group;
}

// ============ 新增：妮妮的兔子 (Nene's Bunny) ============
function createNeneBunny() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ color: 0xFFEBCD }); // 浅杏色

    // 身体
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat);
    body.scale.set(1, 1.4, 0.8);
    body.position.y = 0.9;
    group.add(body);

    // 头
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
    head.position.y = 1.8;
    group.add(head);

    // 长耳朵
    const earGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.8);

    const earL = new THREE.Mesh(earGeo, mat);
    earL.position.set(-0.3, 2.4, 0);
    earL.rotation.z = 0.2;
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.position.set(0.3, 2.4, 0);
    earR.rotation.z = -0.2;
    group.add(earR);

    // 死鱼眼
    const eyeGeo = new THREE.SphereGeometry(0.06);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.2, 1.9, 0.45);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.2, 1.9, 0.45);
    group.add(eyeR);

    return group;
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

// ============ 弹跳板与加速带模型 ============

function createJumpPad() {
    const group = new THREE.Group();

    // Base
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Pad
    const padGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xFF4500, emissive: 0x331100 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.15;
    group.add(pad);

    // Rings
    const ringGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.21;
    group.add(ring);

    // Initial Animation Data
    group.userData = { isJumpPad: true, originScaleY: 1 };

    return group;
}

function createSpeedPad() {
    const group = new THREE.Group();

    // Base Plate
    const plateGeo = new THREE.BoxGeometry(2.0, 0.1, 3.0);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    group.add(plate);

    // Arrows (Animated texture effect manually via geometry?)
    // Let's use simple glowing chevrons
    const arrowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    // Draw arrow on canvas
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; // Transparent bg ideally, but simple black for contrasting
    ctx.fillRect(0, 0, 128, 128); // Actually let's make it emissive
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(110, 80);
    ctx.lineTo(90, 80);
    ctx.lineTo(64, 50);
    ctx.lineTo(38, 80);
    ctx.lineTo(18, 80);
    ctx.closePath();
    ctx.fill();

    // Second arrow below
    ctx.beginPath();
    ctx.moveTo(64, 60);
    ctx.lineTo(110, 120);
    ctx.lineTo(90, 120);
    ctx.lineTo(64, 90);
    ctx.lineTo(38, 120);
    ctx.lineTo(18, 120);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const arrowMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.position.y = 0.06;
    group.add(arrowMesh);

    group.userData = { isSpeedPad: true };
    return group;
}

function createSkyCoins(x, z) {
    // Column of coins
    for (let h = 4; h <= 12; h += 2) {
        const coin = createCookie(); // Reuse existing
        // Change type/color for sky coins?
        coin.userData.points = 50; // High value
        coin.children.forEach(c => {
            if (c.material) c.material.color.setHex(0x00BFFF); // Blue Sky Coins
        });
        coin.position.set(x, h, z);
        GameState.scene.add(coin);
        GameState.cookies.push(coin);
    }
}
