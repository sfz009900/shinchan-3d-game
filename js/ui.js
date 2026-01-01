// ============ UI 更新 ============
function showCollectPopup(text) {
    const popup = DOM.collectPopup;
    popup.querySelector('.collect-text').textContent = text;
    popup.classList.remove('hidden');

    setTimeout(() => {
        popup.classList.add('hidden');
    }, 800);
}

function showScreenFlash(type = 'red') {
    if (!DOM.screenFlash) return;
    DOM.screenFlash.classList.remove('hidden', 'flash-red', 'flash-gold');
    DOM.screenFlash.classList.add(`flash-${type}`);
    
    setTimeout(() => {
        DOM.screenFlash.classList.add('hidden');
        DOM.screenFlash.classList.remove(`flash-${type}`);
    }, 400);
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
        
        // 高连击特效
        if (GameState.combo >= 10) {
            DOM.comboDisplay.classList.add('mega-combo');
        } else {
            DOM.comboDisplay.classList.remove('mega-combo');
        }
    } else {
        DOM.comboDisplay.classList.add('hidden');
        DOM.comboDisplay.classList.remove('mega-combo');
    }
}

function updateHighscoreDisplay() {
    DOM.highscoreDisplay.textContent = GameState.highScore;
}

function updateRageMeter() {
    const rageFill = document.getElementById('rage-fill');
    const rageValue = document.getElementById('rage-value');
    
    if (!rageFill || !rageValue) return;
    
    const percentage = Math.min(Math.round(GameState.enemyRageLevel * 100), 180);
    rageFill.style.width = Math.min(percentage, 100) + '%';
    rageValue.textContent = percentage + '%';
    
    // 最大愤怒值特效
    if (percentage >= 150) {
        rageFill.classList.add('max-rage');
    } else {
        rageFill.classList.remove('max-rage');
    }
}

