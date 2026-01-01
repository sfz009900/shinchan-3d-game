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

    if (GameState.mapLayout && GameState.mapLayout.spawn) {
        character.position.set(GameState.mapLayout.spawn.x, 0, GameState.mapLayout.spawn.z);
    } else {
        character.position.set(0, 0, 8);
    }
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
    if (GameState.mapLayout && GameState.mapLayout.enemySpawn) {
        character.position.set(GameState.mapLayout.enemySpawn.x, 0, GameState.mapLayout.enemySpawn.z);
    } else {
        character.position.set(-12, 0, -15);
    }
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

    if (GameState.mapLayout && GameState.mapLayout.shiroSpawn) {
        dog.position.set(GameState.mapLayout.shiroSpawn.x, 0, GameState.mapLayout.shiroSpawn.z);
    } else {
        dog.position.set(5, 0, 5);
    }
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
        spawnAtRandomPosition(powerup, { radius: 1.0 });
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


// ============ 创建小葵 (Himawari) ============
function createHimawari() {
    const baby = new THREE.Group();
    baby.name = 'himawari';

    // 身体 (黄色连体衣)
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.25;
    body.rotation.z = Math.PI / 2; // 爬行姿态
    body.castShadow = true;
    baby.add(body);

    // 头
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0.3, 0.4, 0);
    head.castShadow = true;
    baby.add(head);

    // 头发 (橘色卷发)
    const hairGeo = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0.3, 0.45, 0);
    hair.rotation.z = -0.2;
    baby.add(hair);

    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.5, 0.45, 0.12);
    baby.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.5, 0.45, -0.12);
    baby.add(eyeR);

    // 手脚
    const limbGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25);
    const limbMat = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });

    // 手
    const handL = new THREE.Mesh(limbGeo, limbMat);
    handL.position.set(0.3, 0.1, 0.2);
    handL.rotation.x = Math.PI / 4;
    baby.add(handL);

    const handR = new THREE.Mesh(limbGeo, limbMat);
    handR.position.set(0.3, 0.1, -0.2);
    handR.rotation.x = -Math.PI / 4;
    baby.add(handR);

    // 腿
    const LegL = new THREE.Mesh(limbGeo, limbMat);
    LegL.position.set(-0.2, 0.1, 0.15);
    LegL.rotation.z = Math.PI / 4;
    baby.add(LegL);

    const LegR = new THREE.Mesh(limbGeo, limbMat);
    LegR.position.set(-0.2, 0.1, -0.15);
    LegR.rotation.z = Math.PI / 4;
    baby.add(LegR);

    return baby;
}

// ============ 风间 (Kazama) ============
function createKazama() {
    const kid = new THREE.Group();
    kid.name = 'kazama';

    // 身体 (蓝色制服)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0x000080 })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    kid.add(body);

    // 头
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
    );
    head.position.y = 1.65;
    head.castShadow = true;
    kid.add(head);

    // 头发 (深蓝色，刘海)
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x000033 })
    );
    hair.position.y = 1.75;
    kid.add(hair);

    // 标志性刘海 (翘起来)
    const bang = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.4, 4),
        new THREE.MeshStandardMaterial({ color: 0x000033 })
    );
    bang.position.set(0, 2.1, 0.35);
    bang.rotation.x = -0.5;
    kid.add(bang);

    // 脸部细节
    addFaceFeatures(kid, 1.65);

    // 腿
    addLegs(kid, 0x000080);

    return kid;
}

// ============ 正男 (Masao) ============
function createMasao() {
    const kid = new THREE.Group();
    kid.name = 'masao';

    // 身体 (绿色毛衣)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0x98FB98 }) // PaleGreen
    );
    body.position.y = 0.7;
    body.castShadow = true;
    kid.add(body);

    // 头 (饭团头 - 稍微扁一点的球)
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
    );
    head.scale.set(1, 0.9, 1);
    head.position.y = 1.6;
    head.castShadow = true;
    kid.add(head);

    // 头发 (寸头/光头，淡灰色层)
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3),
        new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.1 })
    );
    hair.position.y = 1.6;
    kid.add(hair);

    // 脸部 (哭丧脸)
    addFaceFeatures(kid, 1.6, true);

    // 腿
    addLegs(kid, 0x000080);

    return kid;
}

// ============ 阿呆 (Bo-chan) ============
function createBochan() {
    const kid = new THREE.Group();
    kid.name = 'bochan';

    // 身体 (黄色T恤)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.46, 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    kid.add(body);

    // 头 (长脸)
    // 头 (长脸 - 使用 Cylinder 代替 Capsule 以兼容旧版 Three.js)
    const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
    );
    // 加两个半球模拟胶囊
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0xFFDBAC }));
    topCap.position.y = 0.25;
    head.add(topCap);
    const bottomCap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0xFFDBAC }));
    bottomCap.position.y = -0.25;
    head.add(bottomCap);
    head.position.y = 1.7;
    head.castShadow = true;
    kid.add(head);

    // 鼻涕 !
    const snot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.04, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.8 })
    );
    snot.position.set(0, 1.6, 0.45);
    snot.rotation.x = Math.PI / 2;
    // 动画旋转点
    snot.name = 'snot';
    kid.add(snot);

    // 腿
    addLegs(kid, 0x1a1a1a); // 深色裤子

    return kid;
}

// ============ 广志 (Hiroshi) ============
function createHiroshi() {
    const man = new THREE.Group();
    man.name = 'hiroshi';

    // 身体 (西装)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 1.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x708090 }) // SlateGray
    );
    body.position.y = 1.1;
    body.castShadow = true;
    man.add(body);

    // 头 (方脸)
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.7, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
    );
    head.position.y = 2.1;
    head.castShadow = true;
    man.add(head);

    // 胡渣
    const stubble = new THREE.Mesh(
        new THREE.BoxGeometry(0.61, 0.3, 0.61),
        new THREE.MeshStandardMaterial({ color: 0xCCAAAA }) // 略深肤色
    );
    stubble.position.y = 1.95;
    man.add(stubble);

    // 腿 (长腿)
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x708090 });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.2, 0.4, 0);
    man.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.2, 0.4, 0);
    man.add(legR);

    // 手持臭袜子 (使用 Cylinder 代替 Capsule)
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0xEEEEEE }));
    sock.position.set(0.6, 1.4, 0.4);
    sock.rotation.z = Math.PI / 2;
    sock.rotation.y = Math.PI / 4;
    man.add(sock);

    return man;
}

// ============ 园长 (Principal) ============
function createPrincipal() {
    const man = new THREE.Group();
    man.name = 'principal';

    // 身体 (黄色格子西装 - 简化为黄色)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 1.3, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    body.position.y = 1.1;
    body.castShadow = true;
    man.add(body);

    // 纹理 (格子衫效果 - 简单用几个黑色方块模拟)
    for (let i = 0; i < 4; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        stripe.position.y = 0.8 + i * 0.3;
        stripe.scale.set(1.05, 1, 1.05);
        man.add(stripe);
    }

    // 头 (黑帮老大脸)
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
    );
    head.position.y = 2.1;
    head.castShadow = true;
    man.add(head);

    // 墨镜
    const glasses = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    glasses.position.set(0, 2.15, 0.35);
    man.add(glasses);

    // 胡子
    const mustache = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    mustache.position.set(0, 2.0, 0.4);
    man.add(mustache);

    // 腿
    const legGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.22, 0.4, 0);
    man.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.22, 0.4, 0);
    man.add(legR);

    return man;
}

// 辅助：添加通用脸部
function addFaceFeatures(group, y, isSad = false) {
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const l = new THREE.Mesh(eyeGeo, mat);
    l.position.set(-0.15, y, 0.38);
    group.add(l);

    const r = new THREE.Mesh(eyeGeo, mat);
    r.position.set(0.15, y, 0.38);
    group.add(r);

    if (isSad) {
        // 哭嘴
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 8, Math.PI), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        mouth.position.set(0, y - 0.15, 0.38);
        mouth.rotation.x = Math.PI; // 倒过来
        group.add(mouth);
    }
}

function addLegs(group, color) {
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: color });

    const l = new THREE.Mesh(legGeo, legMat);
    l.position.set(-0.18, 0.05, 0);
    group.add(l);

    const r = new THREE.Mesh(legGeo, legMat);
    r.position.set(0.18, 0.05, 0);
    group.add(r);
}
