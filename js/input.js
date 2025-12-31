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

