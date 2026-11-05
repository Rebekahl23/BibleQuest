// Player Game Client Logic for BibleQuest with Integrated Admin Auth
document.addEventListener('DOMContentLoaded', () => {
  // Screens
  const screenPin = document.getElementById('screen-pin');
  const screenNickname = document.getElementById('screen-nickname');
  const screenLobby = document.getElementById('screen-lobby');
  const screenQuestion = document.getElementById('screen-question');
  const screenFeedback = document.getElementById('screen-feedback');
  const screenLeaderboard = document.getElementById('screen-leaderboard');
  const screenPodium = document.getElementById('screen-podium');

  // Player Form elements
  const inputPin = document.getElementById('player-pin');
  const btnPinSubmit = document.getElementById('btn-pin-submit');
  const inputNickname = document.getElementById('player-nickname');
  const btnNicknameSubmit = document.getElementById('btn-nickname-submit');

  const lobbyNicknameDisplay = document.getElementById('lobby-nickname-display');
  const lobbyQuizTitle = document.getElementById('lobby-quiz-title');

  const playerQuestionText = document.getElementById('player-question-text');
  const playerTimerText = document.getElementById('player-timer-text');
  const playerTimerBar = document.getElementById('player-timer-bar');
  const playerAnswersGrid = document.getElementById('player-answers-grid');

  const feedbackIcon = document.getElementById('feedback-icon');
  const feedbackTitle = document.getElementById('feedback-title');
  const feedbackPoints = document.getElementById('feedback-points');
  const feedbackStreak = document.getElementById('feedback-streak');

  const muteBtn = document.getElementById('btn-mute');

  // Admin Controls in Navbar & Modal
  const btnShowLoginModal = document.getElementById('btn-show-login-modal');
  const btnNavDashboard = document.getElementById('btn-nav-dashboard');
  const btnNavHost = document.getElementById('btn-nav-host');
  const btnNavLogout = document.getElementById('btn-nav-logout');

  const loginModal = document.getElementById('login-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalPasscodeInput = document.getElementById('modal-passcode');
  const btnModalSubmit = document.getElementById('btn-modal-submit');
  const modalError = document.getElementById('modal-error');

  // Passcode verification helper (supports case-insensitive Ruby2523 and trims whitespace)
  function checkPasscode(code) {
    const clean = (code || '').trim();
    return clean === 'Ruby2523' || clean.toLowerCase() === 'ruby2523';
  }

  function isAdminLoggedIn() {
    return sessionStorage.getItem('biblequest_admin_logged') === 'true' || localStorage.getItem('biblequest_admin_logged') === 'true';
  }

  // State
  let currentPin = '';
  let playerId = localStorage.getItem('biblequest_player_id') || ('p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
  localStorage.setItem('biblequest_player_id', playerId);
  let playerNickname = '';
  let activeGame = null;
  let unsubscribeGame = null;
  let questionTimerInterval = null;
  let hasAnsweredCurrentQuestion = false;
  let currentQuestionStartTime = 0;
  let myAccumulatedScore = 0;

  // Sound toggle
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      muteBtn.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound';
    });
  }

  // --- ADMIN AUTH STATE IN NAVBAR ---
  function syncAdminNavState() {
    const isAdmin = isAdminLoggedIn();
    if (btnShowLoginModal) btnShowLoginModal.style.display = isAdmin ? 'none' : 'inline-flex';
    if (btnNavDashboard) btnNavDashboard.style.display = isAdmin ? 'inline-flex' : 'none';
    if (btnNavHost) btnNavHost.style.display = isAdmin ? 'inline-flex' : 'none';
    if (btnNavLogout) btnNavLogout.style.display = isAdmin ? 'inline-flex' : 'none';
  }
  syncAdminNavState();

  // Open Admin Login Modal
  if (btnShowLoginModal) {
    btnShowLoginModal.addEventListener('click', () => {
      if (isAdminLoggedIn()) {
        window.location.href = 'admin.html';
        return;
      }
      if (loginModal) {
        loginModal.style.display = 'flex';
        modalError.style.display = 'none';
        modalPasscodeInput.value = '';
        setTimeout(() => modalPasscodeInput.focus(), 150);
      }
    });
  }

  // Hero Host Button
  const btnHeroHost = document.getElementById('btn-hero-host');
  if (btnHeroHost) {
    btnHeroHost.addEventListener('click', (e) => {
      e.preventDefault();
      if (isAdminLoggedIn()) {
        window.location.href = 'admin.html';
      } else if (btnShowLoginModal) {
        btnShowLoginModal.click();
      }
    });
  }

  // Close Admin Login Modal
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (loginModal) loginModal.style.display = 'none';
    });
  }

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = 'none';
      }
    });
  }

  // Submit Admin Login - Saves session and redirects to admin.html on mobile/desktop
  if (btnModalSubmit) {
    btnModalSubmit.addEventListener('click', () => {
      const code = modalPasscodeInput.value;
      if (checkPasscode(code)) {
        sessionStorage.setItem('biblequest_admin_logged', 'true');
        localStorage.setItem('biblequest_admin_logged', 'true');
        syncAdminNavState();
        if (loginModal) loginModal.style.display = 'none';
        window.soundEngine.playCorrect();
        // Redirect directly to admin dashboard so user can immediately add/manage questions!
        window.location.href = 'admin.html';
      } else {
        modalError.style.display = 'block';
        modalError.innerText = 'Incorrect password! Please try again.';
        window.soundEngine.playWrong();
      }
    });
  }

  if (modalPasscodeInput) {
    modalPasscodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') btnModalSubmit.click();
    });
  }

  // Password visibility toggle for mobile
  const btnToggleModalPass = document.getElementById('btn-toggle-modal-pass');
  if (btnToggleModalPass) {
    btnToggleModalPass.addEventListener('click', () => {
      if (modalPasscodeInput.type === 'password') {
        modalPasscodeInput.type = 'text';
        btnToggleModalPass.innerText = '🙈';
      } else {
        modalPasscodeInput.type = 'password';
        btnToggleModalPass.innerText = '👁️';
      }
    });
  }

  // Admin Logout from Navbar - Navigate directly to index.html
  if (btnNavLogout) {
    btnNavLogout.addEventListener('click', () => {
      sessionStorage.removeItem('biblequest_admin_logged');
      localStorage.removeItem('biblequest_admin_logged');
      window.location.href = 'index.html';
    });
  }

  // --- PLAYER JOIN FLOW ---
  const urlParams = new URLSearchParams(window.location.search);
  const pinFromUrl = urlParams.get('pin');
  if (pinFromUrl) {
    inputPin.value = pinFromUrl;
    setTimeout(() => inputNickname.focus(), 200);
  }

  function showScreen(screen) {
    [screenPin, screenNickname, screenLobby, screenQuestion, screenFeedback, screenLeaderboard, screenPodium].forEach(s => {
      if (s) s.style.display = 'none';
    });
    if (screen) screen.style.display = 'block';
  }

  // Step 1: Submit PIN
  btnPinSubmit.addEventListener('click', async () => {
    const pin = inputPin.value.trim().replace(/\s+/g, '');
    if (!pin || pin.length < 4) {
      alert('Please enter a valid Game PIN');
      inputPin.focus();
      return;
    }

    currentPin = pin;
    window.soundEngine.playClick();
    showScreen(screenNickname);
    inputNickname.focus();
  });

  inputPin.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnPinSubmit.click();
  });

  // Step 2: Submit Nickname
  btnNicknameSubmit.addEventListener('click', async () => {
    const nick = inputNickname.value.trim();
    if (!nick) {
      alert('Please enter your nickname');
      inputNickname.focus();
      return;
    }

    playerNickname = nick;
    window.soundEngine.playClick();
    btnNicknameSubmit.disabled = true;
    btnNicknameSubmit.innerText = 'Joining...';

    try {
      await window.quizNetwork.joinGame(currentPin, playerId, playerNickname);

      lobbyNicknameDisplay.innerText = playerNickname;
      showScreen(screenLobby);

      startListeningToGame(currentPin);
    } catch (err) {
      alert('Could not join game: ' + err.message);
      btnNicknameSubmit.disabled = false;
      btnNicknameSubmit.innerText = 'OK, Go! 👉';
    }
  });

  inputNickname.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnNicknameSubmit.click();
  });

  // Listen to game updates from Host
  function startListeningToGame(pin) {
    if (unsubscribeGame) unsubscribeGame();

    unsubscribeGame = window.quizNetwork.listenToGame(pin, (game) => {
      if (!game) return;
      activeGame = game;
      handleGameStateChange(game);
    });
  }

  function handleGameStateChange(game) {
    if (lobbyQuizTitle) {
      lobbyQuizTitle.innerText = game.quizTitle || 'BibleQuest';
    }

    if (game.players && game.players[playerId]) {
      myAccumulatedScore = Number(game.players[playerId].score || 0);
    }

    switch (game.status) {
      case 'lobby':
        showScreen(screenLobby);
        break;

      case 'question':
        renderQuestionScreen(game);
        break;

      case 'reveal':
        renderRevealScreen(game);
        break;

      case 'leaderboard':
        renderLeaderboardScreen(game);
        break;

      case 'finished':
        renderPodiumScreen(game);
        break;
    }
  }

  let currentRenderedQIndex = -1;

  // Render Question on Player Screen (Rock-solid DOM: only renders once per question to eliminate blinking when 10+ players answer)
  function renderQuestionScreen(game) {
    const qIndex = Number(game.currentQuestionIndex) || 0;
    const q = game.question || (game.questions ? game.questions[qIndex] : {});

    // Check if player has already answered this question in game data
    const myExistingAnswer = game.answers?.[qIndex]?.[playerId];
    if (myExistingAnswer) {
      hasAnsweredCurrentQuestion = true;
    }

    // Only rebuild question DOM when question index changes!
    if (currentRenderedQIndex !== qIndex) {
      currentRenderedQIndex = qIndex;
      hasAnsweredCurrentQuestion = !!myExistingAnswer;
      currentQuestionStartTime = Date.now();
      window.soundEngine.playQuestionStart();

      if (hasAnsweredCurrentQuestion) {
        showScreen(screenFeedback);
        feedbackIcon.innerHTML = '⏳';
        feedbackTitle.innerText = 'Answer Submitted!';
        feedbackPoints.innerText = 'Waiting for everyone to finish...';
        return;
      }

      showScreen(screenQuestion);
      playerQuestionText.innerText = q.text || 'Question';

      const timeLimit = Number(q.timeLimit) || 20;
      const elapsed = Math.max(0, (Date.now() - (game.questionStartTime || Date.now())) / 1000);
      let remaining = Math.max(0, Math.ceil(timeLimit - elapsed));

      if (playerTimerText) playerTimerText.innerText = remaining + 's';
      if (playerTimerBar) {
        playerTimerBar.style.width = Math.min(100, (remaining / timeLimit) * 100) + '%';
      }

      clearInterval(questionTimerInterval);
      questionTimerInterval = setInterval(() => {
        remaining--;
        if (playerTimerText) playerTimerText.innerText = Math.max(0, remaining) + 's';
        if (playerTimerBar) {
          playerTimerBar.style.width = Math.max(0, (remaining / timeLimit) * 100) + '%';
        }
        if (remaining <= 5 && remaining > 0) {
          window.soundEngine.playTick(true);
        }
        if (remaining <= 0) {
          clearInterval(questionTimerInterval);
        }
      }, 1000);

      // Render Answer Cards ONCE for this question
      buildAnswerCards(q, qIndex);
    } else {
      // Same question index: DO NOT touch playerAnswersGrid or DOM to prevent blinking!
      if (hasAnsweredCurrentQuestion) {
        showScreen(screenFeedback);
      }
    }
  }

  // Build Answer Cards once per question
  function buildAnswerCards(q, qIndex) {
    playerAnswersGrid.innerHTML = '';
    const isTrueFalse = q.type === 'truefalse' || (q.options && q.options.length === 2);

    if (isTrueFalse) {
      playerAnswersGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      const tfButtons = [
        { label: q.options[0] || 'True', color: 'card-blue', icon: `<svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>` },
        { label: q.options[1] || 'False', color: 'card-red', icon: `<svg viewBox="0 0 24 24"><polygon points="12,2 22,21 2,21"/></svg>` }
      ];

      tfButtons.forEach((btnData, optIdx) => {
        const btn = document.createElement('button');
        btn.className = `answer-card ${btnData.color}`;
        btn.innerHTML = `
          <div class="shape-icon">${btnData.icon}</div>
          <div class="answer-text">${btnData.label}</div>
        `;
        btn.addEventListener('click', () => {
          submitPlayerAnswer(qIndex, optIdx, q, btn);
        });
        playerAnswersGrid.appendChild(btn);
      });
    } else {
      playerAnswersGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      const shapeSvgs = [
        `<svg viewBox="0 0 24 24"><polygon points="12,2 22,21 2,21"/></svg>`,
        `<svg viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12"/></svg>`,
        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`,
        `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`
      ];
      const cardColors = ['card-red', 'card-blue', 'card-yellow', 'card-green'];

      (q.options || []).forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.className = `answer-card ${cardColors[optIdx % cardColors.length]}`;
        btn.innerHTML = `
          <div class="shape-icon">${shapeSvgs[optIdx % shapeSvgs.length]}</div>
          <div class="answer-text">${optText}</div>
        `;
        btn.addEventListener('click', () => {
          submitPlayerAnswer(qIndex, optIdx, q, btn);
        });
        playerAnswersGrid.appendChild(btn);
      });
    }
  }

  // Player clicks an answer
  async function submitPlayerAnswer(questionIndex, optionIndex, questionObj, clickedBtn = null) {
    if (hasAnsweredCurrentQuestion) return;
    hasAnsweredCurrentQuestion = true;
    clearInterval(questionTimerInterval);

    // Immediately disable pointer events on all cards to prevent duplicate clicks
    const allCards = playerAnswersGrid.querySelectorAll('.answer-card');
    allCards.forEach(c => {
      c.style.pointerEvents = 'none';
      c.style.opacity = '0.6';
    });
    if (clickedBtn) {
      clickedBtn.style.opacity = '1';
      clickedBtn.style.transform = 'scale(0.97)';
      clickedBtn.style.outline = '4px solid var(--gold-divine)';
    }

    window.soundEngine.playClick();

    const timeTaken = Math.max(0.2, (Date.now() - currentQuestionStartTime) / 1000);
    const timeLimit = Number(questionObj.timeLimit) || 20;
    const isCorrect = optionIndex === Number(questionObj.correctIndex);

    let pointsAwarded = 0;
    if (isCorrect) {
      const basePoints = Number(questionObj.points) || 1000;
      const timeRatio = Math.min(1, Math.max(0, timeTaken / timeLimit));
      pointsAwarded = Math.round(basePoints * (1 - (timeRatio / 2)));
      myAccumulatedScore += pointsAwarded;
      window.soundEngine.playCorrect();
    } else {
      window.soundEngine.playWrong();
    }

    const answerPayload = {
      questionIndex,
      optionIndex,
      timeTaken: parseFloat(timeTaken.toFixed(2)),
      isCorrect,
      pointsAwarded,
      playerName: playerNickname
    };

    try {
      await window.quizNetwork.submitAnswer(currentPin, playerId, answerPayload);
    } catch (e) {
      console.warn("Submit answer error:", e);
    }

    showScreen(screenFeedback);
    if (isCorrect) {
      feedbackIcon.innerHTML = '🎉';
      feedbackTitle.innerText = 'Correct!';
      feedbackTitle.style.color = 'var(--green)';
      feedbackPoints.innerText = `+${pointsAwarded} pts! ⚡ ${timeTaken.toFixed(1)}s`;
      window.launchConfetti(2200);
    } else {
      feedbackIcon.innerHTML = '❌';
      feedbackTitle.innerText = 'Incorrect!';
      feedbackTitle.style.color = 'var(--red)';
      feedbackPoints.innerText = '+0 pts';
    }
    feedbackStreak.innerText = 'Waiting for question results...';
  }

  // Result Reveal
  function renderRevealScreen(game) {
    showScreen(screenFeedback);
    const myData = (game.players && game.players[playerId]) ? game.players[playerId] : null;
    const totalScore = myData ? Number(myData.score || 0) : myAccumulatedScore;

    if (myData && myData.lastCorrect) {
      feedbackIcon.innerHTML = '⭐';
      feedbackTitle.innerText = 'Awesome Job!';
      feedbackTitle.style.color = 'var(--green)';
      feedbackPoints.innerText = `Total Score: ${totalScore} pts`;
      feedbackStreak.innerText = `🔥 Streak: ${myData.streak || 1}`;
    } else {
      feedbackIcon.innerHTML = '💡';
      feedbackTitle.innerText = 'Better luck next question!';
      feedbackTitle.style.color = '#e21b3c';
      feedbackPoints.innerText = `Total Score: ${totalScore} pts`;
      feedbackStreak.innerText = 'Streak reset';
    }
  }

  // Leaderboard Screen for Player
  function renderLeaderboardScreen(game) {
    showScreen(screenLeaderboard);
    const container = document.getElementById('player-leaderboard-list');
    if (!container) return;
    container.innerHTML = '';

    const playersList = Object.values(game.players || {}).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const myRank = playersList.findIndex(p => p.id === playerId) + 1;
    const currentScore = game.players?.[playerId]?.score || myAccumulatedScore;

    const rankBanner = document.getElementById('player-my-rank');
    if (rankBanner) {
      rankBanner.innerText = `Your Rank: #${myRank || '-'} | Score: ${currentScore} pts`;
    }

    playersList.slice(0, 5).forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = `leaderboard-item rank-${idx + 1} ${p.id === playerId ? 'is-me' : ''}`;
      item.innerHTML = `
        <div class="rank-badge">#${idx + 1}</div>
        <div class="player-info">
          <div class="player-name">${p.name} ${p.id === playerId ? ' (You)' : ''}</div>
          ${p.streak > 1 ? `<div class="player-streak">🔥 Streak x${p.streak}</div>` : ''}
        </div>
        <div class="player-score">${p.score || 0} pts</div>
      `;
      container.appendChild(item);
    });
  }

  // Podium Screen (User sees only Quiz Completed / Game Finished - no points, no rank)
  function renderPodiumScreen(game) {
    showScreen(screenPodium);
    window.launchConfetti(4000);
    window.soundEngine.playVictory();

    const finalMsg = document.getElementById('player-podium-msg');
    if (finalMsg) {
      finalMsg.innerText = 'Thank you for participating! Check the host screen for winners & scores.';
    }
  }
});
