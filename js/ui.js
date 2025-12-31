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

