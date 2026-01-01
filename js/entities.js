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
