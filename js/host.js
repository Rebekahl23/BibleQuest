// Host Controller for BibleQuest with Grand Podium, ArrowDown Hotkey & Accurate Scoring
document.addEventListener('DOMContentLoaded', () => {
  // Enforce Admin Authentication: Regular players cannot access host screen!
  const isAdmin = sessionStorage.getItem('biblequest_admin_logged') === 'true' || localStorage.getItem('biblequest_admin_logged') === 'true';
  if (!isAdmin) {
    alert("Admin login required to host games!");
    window.location.href = 'admin.html';
    return;
  }

  // Screens
  const hostSelectQuizScreen = document.getElementById('host-select-quiz');
  const hostLobbyScreen = document.getElementById('host-lobby');
  const hostQuestionScreen = document.getElementById('host-question');
  const hostRevealScreen = document.getElementById('host-reveal');
  const hostLeaderboardScreen = document.getElementById('host-leaderboard');
  const hostPodiumScreen = document.getElementById('host-podium');

  // Lobby elements
  const lobbyPinDisplay = document.getElementById('lobby-pin-display');
  const lobbyPlayerCount = document.getElementById('lobby-player-count');
  const lobbyPlayersList = document.getElementById('lobby-players-list');
  const lobbyQuizTitle = document.getElementById('host-quiz-title');
  const btnStartGame = document.getElementById('btn-start-game');

  // Question elements
  const hostQText = document.getElementById('host-q-text');
  const hostQIndex = document.getElementById('host-q-index');
  const hostTimerDigits = document.getElementById('host-timer-digits');
  const hostTimerCircle = document.getElementById('host-timer-circle');
  const timerSvgProgress = document.getElementById('timer-svg-progress');
  const hostAnswersCount = document.getElementById('host-answers-count');
  const hostTotalPlayersCount = document.getElementById('host-total-players-count');
  const answersWidget = document.querySelector('.answers-count-widget');
  const hostAnswersGrid = document.getElementById('host-answers-grid');
  const btnSkipQuestion = document.getElementById('btn-skip-question');

  // Reveal elements
  const revealCorrectText = document.getElementById('reveal-correct-text');
  const revealBarsContainer = document.getElementById('reveal-bars-container');

  // Leaderboard elements
  const leaderboardList = document.getElementById('host-leaderboard-list');
  const fastestPlayerBadge = document.getElementById('fastest-player-badge');
  const btnNextQuestion = document.getElementById('btn-next-question');
  const btnNextQuestionBottom = document.getElementById('btn-next-question-bottom');
  const btnRevealNext = document.getElementById('btn-reveal-next');

  // Podium elements
  const podiumCol3 = document.getElementById('podium-col-3');
  const podiumCol2 = document.getElementById('podium-col-2');
  const podiumCol1 = document.getElementById('podium-col-1');
  const podiumP1Name = document.getElementById('podium-p1-name');
  const podiumP1Score = document.getElementById('podium-p1-score');
  const podiumP2Name = document.getElementById('podium-p2-name');
  const podiumP2Score = document.getElementById('podium-p2-score');
  const podiumP3Name = document.getElementById('podium-p3-name');
  const podiumP3Score = document.getElementById('podium-p3-score');
  const podiumRunnersContainer = document.getElementById('podium-runners-container');
  const podiumRunner4 = document.getElementById('podium-runner-4');
  const podiumRunner5 = document.getElementById('podium-runner-5');
  const podiumAllScoresList = document.getElementById('podium-all-scores-list');

  // Controls & Utilities
  const btnHostMute = document.getElementById('btn-host-mute');
  const btnCopyPin = document.getElementById('btn-copy-pin');
  const btnHostLogout = document.getElementById('btn-host-logout');
  const CIRCLE_CIRCUMFERENCE = 314;

  // Logout - Navigate directly to index.html
  if (btnHostLogout) {
    btnHostLogout.addEventListener('click', () => {
      sessionStorage.removeItem('biblequest_admin_logged');
      localStorage.removeItem('biblequest_admin_logged');
      window.location.href = 'index.html';
    });
  }

  // State
  let selectedQuiz = null;
  let gamePin = '';
  let activeGame = null;
  let currentQIndex = 0;
  let timerInterval = null;
  let timeRemaining = 0;
  let lastAnswersCount = 0;
  let currentScreen = 'select';
  let podiumStep = 0; // 0 = start, 1 = 3rd, 2 = 2nd, 3 = 1st, 4 = runners
  let unsubscribeGame = null;
  let isEndingQuestion = false;
  let isAdvancing = false;

  // Sound toggle
  if (btnHostMute) {
    btnHostMute.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      btnHostMute.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound';
    });
  }

  // Copy PIN feature
  if (btnCopyPin) {
    btnCopyPin.addEventListener('click', () => {
      if (!gamePin) return;
      navigator.clipboard.writeText(gamePin).then(() => {
        const originalText = btnCopyPin.innerText;
        btnCopyPin.innerText = '✅ Copied!';
        btnCopyPin.style.background = '#22c55e';
        btnCopyPin.style.color = '#ffffff';
        setTimeout(() => {
          btnCopyPin.innerText = originalText;
          btnCopyPin.style.background = '';
          btnCopyPin.style.color = '';
        }, 1500);
      }).catch(() => {});
    });
  }

  // Keyboard Navigation: Press ArrowDown to advance across all screens
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      if (currentScreen === 'lobby') {
        const playersCount = Object.keys(activeGame?.players || {}).length;
        if (playersCount >= 1 && btnStartGame) {
          btnStartGame.click();
        }
      } else if (currentScreen === 'question') {
        clearInterval(timerInterval);
        endQuestionTime();
      } else if (currentScreen === 'reveal') {
        goToLeaderboard();
      } else if (currentScreen === 'leaderboard') {
        advanceToNextQuestion();
      }
    }
  });

  function showScreen(screen, screenName) {
    currentScreen = screenName;
    [hostSelectQuizScreen, hostLobbyScreen, hostQuestionScreen, hostRevealScreen, hostLeaderboardScreen, hostPodiumScreen].forEach(s => {
      if (s) s.style.display = 'none';
    });
    if (screen) screen.style.display = 'flex';
  }

  // Load available quizzes to host
  async function loadQuizzesForHost() {
    showScreen(hostSelectQuizScreen, 'select');
    const container = document.getElementById('host-quiz-selection-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700;">Loading quizzes...</p>';

    const quizzes = await window.quizNetwork.getQuizzes();
    container.innerHTML = '';

    if (quizzes.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px;">
          <p style="font-size: 1.2rem; margin-bottom: 14px;">No quizzes found. Please create one in Admin!</p>
          <a href="admin.html" class="btn-primary" style="display:inline-block; text-decoration:none;">Go to Admin</a>
        </div>
      `;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const autoQuizId = urlParams.get('quizId');
    if (autoQuizId) {
      const target = quizzes.find(q => q.id === autoQuizId);
      if (target) {
        initGameWithQuiz(target);
        return;
      }
    }

    quizzes.forEach(quiz => {
      const card = document.createElement('div');
      card.className = 'quiz-manage-card';

      card.innerHTML = `
        <div>
          <span class="quiz-lang-badge lang-en">BibleQuest</span>
          <h3 style="font-size:1.45rem; font-weight:900; margin:12px 0 6px 0; color:var(--purple);">${quiz.title}</h3>
          <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom: 8px;">${quiz.description || ''}</p>
          <p style="font-weight:800; color:#475569; font-size:0.9rem;">📝 ${quiz.questions ? quiz.questions.length : 0} Questions</p>
        </div>
        <button class="btn-primary" style="width:100%; padding:14px; font-size:1.15rem;">
          Host This Quiz 🚀
        </button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        initGameWithQuiz(quiz);
      });

      container.appendChild(card);
    });
  }

  // Initialize and Host Selected Quiz
  async function initGameWithQuiz(quiz) {
    selectedQuiz = { ...quiz };
    // Ensure all questions are valid, non-empty, and preserve exact sequential order
    selectedQuiz.questions = (quiz.questions || [])
      .filter(q => q && (q.text || q.question))
      .map(q => ({
        ...q,
        text: q.text || q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex !== 'undefined' ? Number(q.correctIndex) : 0,
        timeLimit: Number(q.timeLimit) || 20
      }));

    if (selectedQuiz.questions.length === 0) {
      alert("This quiz has no questions! Please add questions in the Admin dashboard first.");
      window.location.href = 'admin.html';
      return;
    }

    window.soundEngine.init();
    window.soundEngine.startLobbyMusic();

    gamePin = Math.floor(100000 + Math.random() * 900000).toString();

    const initialGameState = {
      pin: gamePin,
      status: 'lobby',
      quizId: quiz.id,
      quizTitle: quiz.title,
      currentQuestionIndex: 0,
      totalQuestions: selectedQuiz.questions.length,
      questions: selectedQuiz.questions,
      players: {},
      answers: {},
      createdAt: Date.now()
    };

    await window.quizNetwork.createGame(initialGameState);

    lobbyPinDisplay.innerText = gamePin.slice(0, 3) + ' ' + gamePin.slice(3);
    lobbyQuizTitle.innerText = quiz.title;
    lobbyPlayerCount.innerText = '0';
    lobbyPlayersList.innerHTML = '<div class="lobby-empty-hint">Waiting for players to join with PIN...</div>';

    // Start button initially requires at least 1 player
    updateStartButtonState(0);

    showScreen(hostLobbyScreen, 'lobby');

    if (unsubscribeGame) unsubscribeGame();
    unsubscribeGame = window.quizNetwork.listenToGame(gamePin, (updatedGame) => {
      if (!updatedGame) return;
      activeGame = updatedGame;
      onHostGameUpdate(updatedGame);
    });
  }

  function updateStartButtonState(count) {
    if (count < 1) {
      btnStartGame.style.opacity = '0.5';
      btnStartGame.style.cursor = 'not-allowed';
      btnStartGame.title = 'At least 1 player must join to start';
    } else {
      btnStartGame.style.opacity = '1';
      btnStartGame.style.cursor = 'pointer';
      btnStartGame.title = 'Start game';
    }
  }

  // Recalculate and synchronize player points from answers accurately
  function syncPlayerPoints(game) {
    if (!game.players) return;
    Object.keys(game.players).forEach(pId => {
      let accumulatedScore = 0;
      let streak = 0;
      if (game.answers) {
        Object.keys(game.answers).forEach(qIdx => {
          const ans = game.answers[qIdx]?.[pId];
          if (ans && ans.isCorrect) {
            accumulatedScore += Number(ans.pointsAwarded || 0);
            streak++;
          } else if (ans) {
            streak = 0;
          }
        });
      }
      // Ensure score is the maximum of server score or computed answers score
      const finalScore = Math.max(Number(game.players[pId].score || 0), accumulatedScore);
      game.players[pId].score = finalScore;
      game.players[pId].streak = streak;
    });
  }

  // Handle updates during game
  function onHostGameUpdate(game) {
    syncPlayerPoints(game);
    const playersList = Object.values(game.players || {});
    
    // In Lobby: Update joined count and show nicknames
    if (game.status === 'lobby') {
      const oldCount = parseInt(lobbyPlayerCount.innerText) || 0;
      if (playersList.length > oldCount) {
        lobbyPlayerCount.classList.add('bounce');
        setTimeout(() => lobbyPlayerCount.classList.remove('bounce'), 300);
        window.soundEngine.playTone(720, 'sine', 0.1, 0.25);
      }
      lobbyPlayerCount.innerText = playersList.length;
      updateStartButtonState(playersList.length);

      if (playersList.length > 0) {
        lobbyPlayersList.innerHTML = '';
        playersList.forEach(p => {
          const tag = document.createElement('div');
          tag.className = 'player-tag';
          const initial = (p.name || 'P').trim().charAt(0).toUpperCase();
          tag.innerHTML = `
            <div class="player-avatar-dot">${initial}</div>
            <span>${p.name}</span>
          `;
          lobbyPlayersList.appendChild(tag);
        });
      } else {
        lobbyPlayersList.innerHTML = '<div class="lobby-empty-hint">Waiting for players to join with PIN...</div>';
      }
    }

    // In Question: Update answers count on right side with spring pop!
    if (game.status === 'question') {
      const qAnswers = (game.answers && game.answers[game.currentQuestionIndex]) ? Object.values(game.answers[game.currentQuestionIndex]) : [];
      const totalPlayers = playersList.length;

      const newAnswersCount = qAnswers.length;
      if (newAnswersCount > lastAnswersCount) {
        if (answersWidget) {
          answersWidget.classList.add('pop-answer');
          setTimeout(() => answersWidget.classList.remove('pop-answer'), 300);
        }
        window.soundEngine.playTone(880, 'sine', 0.08, 0.2);
      }
      lastAnswersCount = newAnswersCount;

      hostAnswersCount.innerText = newAnswersCount;
      hostTotalPlayersCount.innerText = totalPlayers;

      // When ALL joined players have answered, complete question early!
      if (totalPlayers > 0 && newAnswersCount >= totalPlayers) {
        clearInterval(timerInterval);
        setTimeout(() => {
          endQuestionTime();
        }, 500);
      }
    }
  }

  // Start Game Button (Requires at least 1 member)
  btnStartGame.addEventListener('click', () => {
    const playersCount = Object.keys(activeGame?.players || {}).length;
    if (playersCount < 1) {
      alert("At least 1 player must join before starting the game!");
      return;
    }

    window.soundEngine.stopLobbyMusic();
    window.soundEngine.playClick();
    currentQIndex = 0;
    triggerGetReadyCountdown(() => {
      startQuestion(currentQIndex);
    });
  });

  // Dramatic "Get Ready: 3... 2... 1..." Overlay
  function triggerGetReadyCountdown(onComplete) {
    let overlay = document.createElement('div');
    overlay.className = 'ready-overlay';
    overlay.innerHTML = `
      <div class="ready-subtitle">Question ${currentQIndex + 1}</div>
      <div class="ready-number" id="ready-num">3</div>
    `;
    document.body.appendChild(overlay);

    let count = 3;
    window.soundEngine.playTone(440, 'triangle', 0.15, 0.3);

    const readyInterval = setInterval(() => {
      count--;
      const numElem = document.getElementById('ready-num');
      if (count > 0) {
        if (numElem) numElem.innerText = count;
        window.soundEngine.playTone(440, 'triangle', 0.15, 0.3);
      } else if (count === 0) {
        if (numElem) numElem.innerText = 'GO!';
        window.soundEngine.playTone(880, 'sine', 0.3, 0.35);
      } else {
        clearInterval(readyInterval);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        onComplete();
      }
    }, 900);
  }

  // Launch a Question
  async function startQuestion(qIndex) {
    isEndingQuestion = false;
    currentQIndex = qIndex;
    const q = selectedQuiz.questions[qIndex];
    if (!q) {
      finishGameAndShowPodium();
      return;
    }

    const timeLimit = q.timeLimit || 20;
    timeRemaining = timeLimit;
    lastAnswersCount = 0;

    hostQIndex.innerText = `Question ${qIndex + 1} of ${selectedQuiz.questions.length}`;
    hostQText.innerText = q.text;
    hostTimerDigits.innerText = timeRemaining;
    hostTimerCircle.className = 'timer-circle-widget';

    if (timerSvgProgress) {
      timerSvgProgress.style.strokeDashoffset = '0';
    }

    hostAnswersCount.innerText = '0';
    const totalPlayers = Object.keys(activeGame?.players || {}).length;
    hostTotalPlayersCount.innerText = totalPlayers;

    // Render Answer Cards (supports 4 choices or 2 choices for True/False)
    renderHostAnswerCards(q);

    showScreen(hostQuestionScreen, 'question');
    window.soundEngine.playQuestionStart();

    await window.quizNetwork.updateGame(gamePin, {
      status: 'question',
      currentQuestionIndex: qIndex,
      questionStartTime: Date.now(),
      question: q
    });

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeRemaining--;
      hostTimerDigits.innerText = Math.max(0, timeRemaining);

      hostTimerCircle.classList.add('tick-punch');
      setTimeout(() => hostTimerCircle.classList.remove('tick-punch'), 150);

      if (timerSvgProgress && timeLimit > 0) {
        const offset = CIRCLE_CIRCUMFERENCE * (1 - (timeRemaining / timeLimit));
        timerSvgProgress.style.strokeDashoffset = offset;
      }

      if (timeRemaining <= 5 && timeRemaining > 0) {
        hostTimerCircle.className = 'timer-circle-widget danger';
        window.soundEngine.playTick(true);
      } else if (timeRemaining <= 10) {
        hostTimerCircle.className = 'timer-circle-widget warning';
        window.soundEngine.playTick(false);
      }

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        endQuestionTime();
      }
    }, 1000);
  }

  // Render Host Answer Cards (Multiple Choice or True/False)
  function renderHostAnswerCards(q) {
    hostAnswersGrid.innerHTML = '';
    const isTrueFalse = q.type === 'truefalse' || (q.options && q.options.length === 2);

    if (isTrueFalse) {
      // 2 Cards layout for True / False
      hostAnswersGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      
      const tfConfig = [
        { label: q.options[0] || 'True', color: 'card-blue', icon: `<svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>` },
        { label: q.options[1] || 'False', color: 'card-red', icon: `<svg viewBox="0 0 24 24"><polygon points="12,2 22,21 2,21"/></svg>` }
      ];

      tfConfig.forEach((cfg, idx) => {
        const card = document.createElement('div');
        card.className = `answer-card ${cfg.color}`;
        card.id = `host-card-${idx}`;
        card.innerHTML = `
          <div class="shape-icon">${cfg.icon}</div>
          <div class="answer-text">${cfg.label}</div>
        `;
        hostAnswersGrid.appendChild(card);
      });
    } else {
      // 4 Cards layout
      hostAnswersGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      const shapeSvgs = [
        `<svg viewBox="0 0 24 24"><polygon points="12,2 22,21 2,21"/></svg>`, // Red Triangle
        `<svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>`, // Blue Diamond
        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`, // Yellow Circle
        `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>` // Green Square
      ];
      const cardColors = ['card-red', 'card-blue', 'card-yellow', 'card-green'];

      (q.options || []).forEach((opt, idx) => {
        const card = document.createElement('div');
        card.className = `answer-card ${cardColors[idx % cardColors.length]}`;
        card.id = `host-card-${idx}`;
        card.innerHTML = `
          <div class="shape-icon">${shapeSvgs[idx % shapeSvgs.length]}</div>
          <div class="answer-text">${opt}</div>
        `;
        hostAnswersGrid.appendChild(card);
      });
    }
  }

  // Skip question early
  if (btnSkipQuestion) {
    btnSkipQuestion.addEventListener('click', () => {
      clearInterval(timerInterval);
      endQuestionTime();
    });
  }

  // When Question Time Ends -> Reveal Results
  async function endQuestionTime() {
    if (isEndingQuestion) return;
    isEndingQuestion = true;

    window.soundEngine.playTimesUp();
    const q = selectedQuiz.questions[currentQIndex];

    await window.quizNetwork.updateGame(gamePin, {
      status: 'reveal'
    });

    syncPlayerPoints(activeGame);

    const qAnswers = (activeGame?.answers && activeGame?.answers[currentQIndex]) 
      ? Object.values(activeGame.answers[currentQIndex]) 
      : [];

    const numOptions = q.options ? q.options.length : 4;
    const counts = new Array(numOptions).fill(0);
    let fastestPlayer = null;
    let minTime = 9999;

    qAnswers.forEach(ans => {
      if (typeof ans.optionIndex === 'number' && ans.optionIndex >= 0 && ans.optionIndex < numOptions) {
        counts[ans.optionIndex]++;
      }
      if (ans.isCorrect && ans.timeTaken < minTime) {
        minTime = ans.timeTaken;
        fastestPlayer = ans;
      }
    });

    // Highlight correct answer card
    for (let i = 0; i < numOptions; i++) {
      const card = document.getElementById(`host-card-${i}`);
      if (card) {
        if (i === Number(q.correctIndex)) {
          card.classList.add('is-correct');
          card.innerHTML += `<div class="answer-vote-count">✓ ${counts[i]}</div>`;
        } else {
          card.classList.add('is-wrong');
          card.innerHTML += `<div class="answer-vote-count">${counts[i]}</div>`;
        }
      }
    }

    setTimeout(() => {
      renderRevealScreen(q, counts, fastestPlayer);
    }, 1200);
  }

  // Render Result Breakdown Screen (Clean, centered, NO large purple button - only Down Arrow hotkey indicator!)
  function renderRevealScreen(q, counts, fastestPlayer) {
    showScreen(hostRevealScreen, 'reveal');
    revealCorrectText.innerText = q.options[q.correctIndex] || 'Correct Option';

    revealBarsContainer.innerHTML = '';
    const totalVotes = counts.reduce((a, b) => a + b, 0);
    const cardColors = ['card-red', 'card-blue', 'card-yellow', 'card-green'];
    const isTrueFalse = q.options.length === 2;
    const shapeNames = isTrueFalse 
      ? ['◆ True (Blue)', '▲ False (Red)'] 
      : ['▲ Red', '◆ Blue', '● Yellow', '■ Green'];

    counts.forEach((cnt, idx) => {
      const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
      const isCorrect = idx === Number(q.correctIndex);
      const barBox = document.createElement('div');
      barBox.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:10px; max-width:200px;';
      barBox.innerHTML = `
        <div style="font-weight:900; font-size:1.4rem; color:${isCorrect ? 'var(--green)' : 'var(--text-secondary)'};">
          ${cnt} ${isCorrect ? '✓' : ''}
        </div>
        <div style="width:100%; height:200px; background:#e2e8f0; border-radius:14px; display:flex; align-items:flex-end; overflow:hidden; box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">
          <div class="${cardColors[idx]}" style="width:100%; height:${Math.max(10, pct)}%; border-radius:12px; transition: height 0.8s cubic-bezier(0.16, 1, 0.3, 1);"></div>
        </div>
        <div style="font-size:0.95rem; font-weight:800; color:#475569;">${shapeNames[idx]}</div>
      `;
      revealBarsContainer.appendChild(barBox);
    });
  }

  // Go to Leaderboard (Triggered via Down Arrow key or clicking hint / button)
  let isGoingToLeaderboard = false;
  async function goToLeaderboard() {
    if (isGoingToLeaderboard) return;
    isGoingToLeaderboard = true;
    window.soundEngine.playClick();
    await window.quizNetwork.updateGame(gamePin, {
      status: 'leaderboard'
    });
    renderLeaderboard();
    isGoingToLeaderboard = false;
  }

  // Mobile / Desktop View Leaderboard button on reveal screen
  if (btnRevealNext) {
    btnRevealNext.addEventListener('click', goToLeaderboard);
  }

  // Render Leaderboard (Top 5 + Fastest Answer)
  function renderLeaderboard() {
    showScreen(hostLeaderboardScreen, 'leaderboard');
    leaderboardList.innerHTML = '';
    syncPlayerPoints(activeGame);

    const playersList = Object.values(activeGame?.players || {}).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

    const qAnswers = (activeGame?.answers && activeGame?.answers[currentQIndex]) 
      ? Object.entries(activeGame.answers[currentQIndex]) 
      : [];

    let fastest = null;
    let minTime = 99999;
    qAnswers.forEach(([pId, ans]) => {
      if (ans.isCorrect && ans.timeTaken < minTime) {
        minTime = ans.timeTaken;
        fastest = { pId, name: activeGame.players?.[pId]?.name || 'Player', time: ans.timeTaken, points: ans.pointsAwarded };
      }
    });

    if (fastest) {
      fastestPlayerBadge.style.display = 'block';
      fastestPlayerBadge.innerHTML = `⚡ <strong>Fastest Answer:</strong> ${fastest.name} in ${fastest.time.toFixed(1)}s (+${fastest.points} pts)!`;
      window.soundEngine.playTone(880, 'sine', 0.2, 0.3);
    } else {
      fastestPlayerBadge.style.display = 'none';
    }

    playersList.slice(0, 5).forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `leaderboard-item rank-${idx + 1}`;
      row.style.animationDelay = `${idx * 0.08}s`;
      row.innerHTML = `
        <div class="rank-badge">#${idx + 1}</div>
        <div class="player-info">
          <div class="player-name">${p.name}</div>
          ${p.streak > 1 ? `<div class="player-streak">🔥 Streak x${p.streak}</div>` : ''}
        </div>
        <div class="player-score">${p.score || 0} pts</div>
      `;
      leaderboardList.appendChild(row);
    });

    const isLastQ = currentQIndex >= selectedQuiz.questions.length - 1;
    const nextBtnText = isLastQ ? 'Show Final Podium 🏆' : 'Next Question ➡️';
    if (btnNextQuestion) btnNextQuestion.innerText = nextBtnText;
    if (btnNextQuestionBottom) btnNextQuestionBottom.innerText = nextBtnText;
  }

  // Advance to Next Question or Final Podium (Guarded against double clicks)
  async function advanceToNextQuestion() {
    if (isAdvancing) return;
    isAdvancing = true;

    window.soundEngine.playClick();
    if (currentQIndex < selectedQuiz.questions.length - 1) {
      currentQIndex++;
      triggerGetReadyCountdown(() => {
        isAdvancing = false;
        startQuestion(currentQIndex);
      });
    } else {
      isAdvancing = false;
      finishGameAndShowPodium();
    }
  }

  // Next Question Buttons (Desktop header button & Mobile friendly bottom button)
  if (btnNextQuestion) {
    btnNextQuestion.addEventListener('click', advanceToNextQuestion);
  }
  if (btnNextQuestionBottom) {
    btnNextQuestionBottom.addEventListener('click', advanceToNextQuestion);
  }

  // Finish Game & Setup Step-by-Step Podium (3rd -> 2nd -> Grand 1st -> 4th/5th Runners)
  async function finishGameAndShowPodium() {
    showScreen(hostPodiumScreen, 'podium');
    podiumStep = 0;

    await window.quizNetwork.updateGame(gamePin, {
      status: 'finished'
    });

    syncPlayerPoints(activeGame);
    const playersList = Object.values(activeGame?.players || {}).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    
    // Hide all 3 podium pedestals and runners initially
    podiumCol3.style.visibility = 'hidden';
    podiumCol3.style.opacity = '0';
    podiumCol2.style.visibility = 'hidden';
    podiumCol2.style.opacity = '0';
    podiumCol1.style.visibility = 'hidden';
    podiumCol1.style.opacity = '0';
    if (podiumRunnersContainer) podiumRunnersContainer.style.display = 'none';

    // Populate data
    const p1 = playersList[0];
    const p2 = playersList[1];
    const p3 = playersList[2];
    const p4 = playersList[3];
    const p5 = playersList[4];

    if (podiumP1Name && p1) {
      podiumP1Name.innerText = p1.name;
      podiumP1Score.innerText = `${p1.score || 0} pts`;
    }
    if (podiumP2Name && p2) {
      podiumP2Name.innerText = p2.name;
      podiumP2Score.innerText = `${p2.score || 0} pts`;
    }
    if (podiumP3Name && p3) {
      podiumP3Name.innerText = p3.name;
      podiumP3Score.innerText = `${p3.score || 0} pts`;
    }

    // 4th and 5th runners-up
    if (podiumRunner4) {
      podiumRunner4.innerText = p4 ? `4th Place: ${p4.name} - ${p4.score || 0} pts` : '';
      podiumRunner4.style.display = p4 ? 'block' : 'none';
    }
    if (podiumRunner5) {
      podiumRunner5.innerText = p5 ? `5th Place: ${p5.name} - ${p5.score || 0} pts` : '';
      podiumRunner5.style.display = p5 ? 'block' : 'none';
    }

    // Full scoreboard list
    if (podiumAllScoresList) {
      podiumAllScoresList.innerHTML = '';
      playersList.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
          <div class="rank-badge">#${idx + 1}</div>
          <div class="player-info"><div class="player-name">${p.name}</div></div>
          <div class="player-score">${p.score || 0} pts</div>
        `;
        podiumAllScoresList.appendChild(item);
      });
    }

    // AUTOMATIC TIMED REVEAL SEQUENCE (No Down Arrow needed for Podium!)
    // Step 1: Reveal 3rd place after 1 second
    setTimeout(() => {
      podiumCol3.style.visibility = 'visible';
      podiumCol3.style.opacity = '1';
      podiumCol3.style.animation = 'podiumBounce 0.8s ease';
      window.soundEngine.playTone(523.25, 'triangle', 0.4, 0.3);
    }, 1000);

    // Step 2: Reveal 2nd place after 3.2 seconds
    setTimeout(() => {
      podiumCol2.style.visibility = 'visible';
      podiumCol2.style.opacity = '1';
      podiumCol2.style.animation = 'podiumBounce 0.8s ease';
      window.soundEngine.playTone(659.25, 'triangle', 0.5, 0.3);
    }, 3200);

    // Step 3: Grand Reveal of 1st Place Champion after 5.5 seconds!
    setTimeout(() => {
      podiumCol1.style.visibility = 'visible';
      podiumCol1.style.opacity = '1';
      podiumCol1.classList.add('grand-champion-glow');
      podiumCol1.style.animation = 'grandChampionEntrance 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
      window.launchConfetti(7000);
      window.soundEngine.playVictory();
    }, 5500);

    // Step 4: Reveal 4th & 5th Runners-up after 8 seconds!
    setTimeout(() => {
      if (podiumRunnersContainer) {
        podiumRunnersContainer.style.display = 'flex';
        podiumRunnersContainer.style.animation = 'slideUp 0.6s ease';
      }
    }, 8000);
  }

  // Initialize
  loadQuizzesForHost();
});
