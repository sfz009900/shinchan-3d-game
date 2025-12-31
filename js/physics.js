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

