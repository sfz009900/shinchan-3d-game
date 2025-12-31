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

