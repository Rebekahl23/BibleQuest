// Admin Dashboard Logic for BibleQuest
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const adminLoginScreen = document.getElementById('admin-login-screen');
  const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
  const adminPasscodeInput = document.getElementById('admin-passcode');
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const adminLoginError = document.getElementById('admin-login-error');

  const tabList = document.getElementById('tab-list');
  const tabCreate = document.getElementById('tab-create');
  const viewQuizList = document.getElementById('view-quiz-list');
  const viewQuizCreate = document.getElementById('view-quiz-create');

  const quizAdminCards = document.getElementById('quiz-admin-cards');
  const questionsContainer = document.getElementById('questions-container');
  const btnBottomAddQuestion = document.getElementById('btn-bottom-add-question');
  const btnSaveQuiz = document.getElementById('btn-save-quiz');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  const inputQuizTitle = document.getElementById('quiz-title');
  const inputQuizDesc = document.getElementById('quiz-desc');
  const editingQuizIdInput = document.getElementById('editing-quiz-id');

  const btnExportAll = document.getElementById('btn-export-all');
  const inputImportFile = document.getElementById('input-import-file');

  // Admin authentication helper (supports case-insensitive Ruby2523 and trims whitespace for mobile keyboards)
  function isPasscodeValid(code) {
    const clean = (code || '').trim();
    return clean === 'Ruby2523' || clean.toLowerCase() === 'ruby2523';
  }

  // Check session across both sessionStorage and localStorage for mobile persistence
  if (sessionStorage.getItem('biblequest_admin_logged') === 'true' || localStorage.getItem('biblequest_admin_logged') === 'true') {
    sessionStorage.setItem('biblequest_admin_logged', 'true');
    localStorage.setItem('biblequest_admin_logged', 'true');
    showDashboard();
  } else {
    showLogin();
  }

  function showLogin() {
    adminLoginScreen.style.display = 'block';
    adminDashboardScreen.style.display = 'none';
  }

  function showDashboard() {
    adminLoginScreen.style.display = 'none';
    adminDashboardScreen.style.display = 'block';
    loadAdminQuizzes();
    checkFirebaseConnectivity();
  }

  // Firebase status indicator
  async function checkFirebaseConnectivity() {
    const banner = document.getElementById('firebase-status-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    banner.className = 'status-banner status-info';
    banner.innerHTML = '🔄 Verifying Firebase connection...';

    const status = await window.quizNetwork.checkDatabaseStatus();
    if (status.ok) {
      banner.className = 'status-banner status-success';
      banner.innerHTML = '✅ Firebase Firestore is Connected & Active!';
      setTimeout(() => { banner.style.display = 'none'; }, 5000);
    } else {
      banner.className = 'status-banner status-warning';
      banner.innerHTML = `
        <div style="text-align:left;">
          ⚠️ <strong>Firebase Notice:</strong> ${status.error || 'Firestore not initialized in console'}.<br>
          <small>Quizzes are securely backed up locally and sync online when Firestore test mode is active.</small>
        </div>
      `;
    }
  }

  // Login handler
  btnAdminLogin.addEventListener('click', () => {
    const code = adminPasscodeInput.value;
    if (isPasscodeValid(code)) {
      sessionStorage.setItem('biblequest_admin_logged', 'true');
      localStorage.setItem('biblequest_admin_logged', 'true');
      adminLoginError.style.display = 'none';
      showDashboard();
    } else {
      adminLoginError.style.display = 'block';
      adminLoginError.innerText = 'Incorrect password! Please try again.';
    }
  });

  adminPasscodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnAdminLogin.click();
  });

  // Password visibility toggle for mobile
  const btnToggleAdminPass = document.getElementById('btn-toggle-admin-pass');
  if (btnToggleAdminPass) {
    btnToggleAdminPass.addEventListener('click', () => {
      if (adminPasscodeInput.type === 'password') {
        adminPasscodeInput.type = 'text';
        btnToggleAdminPass.innerText = '🙈';
      } else {
        adminPasscodeInput.type = 'password';
        btnToggleAdminPass.innerText = '👁️';
      }
    });
  }

  // Logout - Navigate directly to index.html
  const btnLogout = document.getElementById('btn-admin-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('biblequest_admin_logged');
      localStorage.removeItem('biblequest_admin_logged');
      window.location.href = 'index.html';
    });
  }

  // Tab Switching
  tabList.addEventListener('click', () => {
    tabList.classList.add('active');
    tabCreate.classList.remove('active');
    viewQuizList.style.display = 'block';
    viewQuizCreate.style.display = 'none';
    loadAdminQuizzes();
  });

  tabCreate.addEventListener('click', () => {
    tabCreate.classList.add('active');
    tabList.classList.remove('active');
    viewQuizList.style.display = 'none';
    viewQuizCreate.style.display = 'block';
    resetQuizForm();
  });

  // Load Quizzes in Admin View
  async function loadAdminQuizzes() {
    quizAdminCards.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700;">Loading quizzes...</p>';
    const quizzes = await window.quizNetwork.getQuizzes();
    quizAdminCards.innerHTML = '';

    if (quizzes.length === 0) {
      quizAdminCards.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;">No quizzes found. Click "+ Create New Quiz" to start!</p>';
      return;
    }

    quizzes.forEach(quiz => {
      const card = document.createElement('div');
      card.className = 'quiz-manage-card';

      card.innerHTML = `
        <div>
          <span class="quiz-lang-badge lang-en">BibleQuest</span>
          <h3 style="font-size:1.4rem; font-weight:900; margin:10px 0 6px 0; color:var(--purple);">${quiz.title}</h3>
          <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:12px;">${quiz.description || 'Interactive quiz challenge'}</p>
          <div style="font-size:0.88rem; font-weight:800; color:#475569;">
            📝 ${quiz.questions ? quiz.questions.length : 0} Questions
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <a href="host.html?quizId=${quiz.id}" class="btn-primary" style="text-align:center; text-decoration:none; padding:12px; font-size:1.05rem;">
            🚀 Host Game
          </a>
          <div style="display:flex; gap:10px;">
            <button class="icon-btn btn-edit" style="flex:1; justify-content:center;">✏️ Edit</button>
            <button class="icon-btn btn-delete" style="flex:1; justify-content:center; color:#e21b3c;">🗑️ Delete</button>
          </div>
        </div>
      `;

      card.querySelector('.btn-edit').addEventListener('click', () => {
        editQuiz(quiz);
      });

      card.querySelector('.btn-delete').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
          await window.quizNetwork.deleteQuiz(quiz.id);
          loadAdminQuizzes();
        }
      });

      quizAdminCards.appendChild(card);
    });
  }

  // Question Form Management
  function resetQuizForm() {
    editingQuizIdInput.value = '';
    inputQuizTitle.value = '';
    inputQuizDesc.value = '';
    questionsContainer.innerHTML = '';
    addQuestionForm();
  }

  function editQuiz(quiz) {
    tabCreate.click();
    editingQuizIdInput.value = quiz.id;
    inputQuizTitle.value = quiz.title || '';
    inputQuizDesc.value = quiz.description || '';

    questionsContainer.innerHTML = '';
    if (quiz.questions && quiz.questions.length > 0) {
      quiz.questions.forEach((q, idx) => {
        addQuestionForm(q, idx + 1);
      });
    } else {
      addQuestionForm();
    }
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      tabList.click();
    });
  }

  // Renumber questions sequentially
  function renumberQuestions() {
    const items = questionsContainer.querySelectorAll('.question-builder-item');
    items.forEach((div, idx) => {
      const num = idx + 1;
      div.dataset.qIndex = num;
      const titleElem = div.querySelector('.q-number-title');
      if (titleElem) titleElem.innerText = `Question #${num}`;

      // Update radio names so each question has its own group
      const radios = div.querySelectorAll('.radio-correct');
      radios.forEach(r => {
        r.name = `correct_for_${num}`;
      });
    });
  }

  // Add Question Block to Editor (with Type Selector: Quiz vs True/False and direct "+ Add Another Question" button)
  function addQuestionForm(data = null, num = null) {
    const qNumber = num || (questionsContainer.children.length + 1);

    const div = document.createElement('div');
    div.className = 'question-builder-item';
    div.dataset.qIndex = qNumber;

    const qType = data?.type || 'quiz'; // 'quiz' or 'truefalse'
    const defaultText = data ? data.text : '';
    const defaultTime = data ? data.timeLimit : 20;
    const defaultPoints = data ? data.points : 1000;
    const options = data ? data.options : ['', '', '', ''];
    const correctIdx = data ? data.correctIndex : 0;

    div.innerHTML = `
      <div class="question-builder-header">
        <h4 class="q-number-title" style="font-weight:900; color:var(--purple); font-size:1.2rem;">
          Question #${qNumber}
        </h4>
        <div style="display:flex; gap:10px; align-items:center;">
          <button type="button" class="icon-btn btn-remove-q" style="color:#e21b3c; border-color:#fecaca;">
            ✕ Remove
          </button>
        </div>
      </div>

      <!-- Question Settings Row -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:18px;">
        <div>
          <label class="input-label">🎯 Question Type</label>
          <select class="input-text q-type-select" style="font-size:1rem; padding:12px; text-align:left; letter-spacing:normal;">
            <option value="quiz" ${qType === 'quiz' ? 'selected' : ''}>Quiz (4 Options)</option>
            <option value="truefalse" ${qType === 'truefalse' ? 'selected' : ''}>True / False (2 Options)</option>
          </select>
        </div>

        <div>
          <label class="input-label">⏱️ Time Limit</label>
          <select class="input-text q-time-input" style="font-size:1rem; padding:12px; text-align:left; letter-spacing:normal;">
            <option value="5" ${defaultTime === 5 ? 'selected' : ''}>5 Seconds</option>
            <option value="10" ${defaultTime === 10 ? 'selected' : ''}>10 Seconds</option>
            <option value="15" ${defaultTime === 15 ? 'selected' : ''}>15 Seconds</option>
            <option value="20" ${defaultTime === 20 ? 'selected' : ''}>20 Seconds (Standard)</option>
            <option value="30" ${defaultTime === 30 ? 'selected' : ''}>30 Seconds</option>
            <option value="60" ${defaultTime === 60 ? 'selected' : ''}>60 Seconds</option>
            <option value="90" ${defaultTime === 90 ? 'selected' : ''}>90 Seconds</option>
            <option value="120" ${defaultTime === 120 ? 'selected' : ''}>120 Seconds (2 Mins)</option>
          </select>
        </div>

        <div>
          <label class="input-label">⭐ Points Multiplier</label>
          <select class="input-text q-points-input" style="font-size:1rem; padding:12px; text-align:left; letter-spacing:normal;">
            <option value="1000" ${defaultPoints === 1000 ? 'selected' : ''}>Standard (1000 pts)</option>
            <option value="2000" ${defaultPoints === 2000 ? 'selected' : ''}>Double Points (2000 pts)</option>
          </select>
        </div>
      </div>

      <!-- Question Text -->
      <div class="input-group">
        <label class="input-label">Question Text (English or Tamil supported)</label>
        <input type="text" class="input-text q-text-input" placeholder="Type question here... (தமிழ் அல்லது ஆங்கிலத்தில் தட்டச்சு செய்யலாம்)" value="${escapeHtml(defaultText)}" style="font-size:1.15rem; text-align:left; letter-spacing:normal;" required />
      </div>

      <!-- Options Container -->
      <div class="options-wrapper">
        <label class="input-label" style="margin-bottom:10px;">Answer Options (Click radio button to mark correct answer):</label>
        
        <!-- Option 1: Red Triangle / False in TF -->
        <div class="option-input-row row-opt-0">
          <input type="radio" name="correct_for_${qNumber}" class="radio-correct radio-opt-0" value="0" ${correctIdx === 0 ? 'checked' : ''} title="Mark as correct answer">
          <div class="option-color-indicator" style="background:var(--red);" title="Red Triangle"></div>
          <input type="text" class="input-text q-opt-0" placeholder="Red Option..." value="${escapeHtml(options[0] || (qType === 'truefalse' ? 'True' : ''))}" style="font-size:1rem; text-align:left; padding:12px; letter-spacing:normal;" required>
        </div>

        <!-- Option 2: Blue Diamond / True in TF -->
        <div class="option-input-row row-opt-1">
          <input type="radio" name="correct_for_${qNumber}" class="radio-correct radio-opt-1" value="1" ${correctIdx === 1 ? 'checked' : ''} title="Mark as correct answer">
          <div class="option-color-indicator" style="background:var(--blue);" title="Blue Diamond"></div>
          <input type="text" class="input-text q-opt-1" placeholder="Blue Option..." value="${escapeHtml(options[1] || (qType === 'truefalse' ? 'False' : ''))}" style="font-size:1rem; text-align:left; padding:12px; letter-spacing:normal;" required>
        </div>

        <!-- Option 3: Yellow Circle (Hidden in TF) -->
        <div class="option-input-row row-opt-2" style="${qType === 'truefalse' ? 'display:none;' : ''}">
          <input type="radio" name="correct_for_${qNumber}" class="radio-correct radio-opt-2" value="2" ${correctIdx === 2 ? 'checked' : ''} title="Mark as correct answer">
          <div class="option-color-indicator" style="background:var(--yellow);" title="Yellow Circle"></div>
          <input type="text" class="input-text q-opt-2" placeholder="Yellow Option..." value="${escapeHtml(options[2] || '')}" style="font-size:1rem; text-align:left; padding:12px; letter-spacing:normal;" ${qType === 'truefalse' ? '' : 'required'}>
        </div>

        <!-- Option 4: Green Square (Hidden in TF) -->
        <div class="option-input-row row-opt-3" style="${qType === 'truefalse' ? 'display:none;' : ''}">
          <input type="radio" name="correct_for_${qNumber}" class="radio-correct radio-opt-3" value="3" ${correctIdx === 3 ? 'checked' : ''} title="Mark as correct answer">
          <div class="option-color-indicator" style="background:var(--green);" title="Green Square"></div>
          <input type="text" class="input-text q-opt-3" placeholder="Green Option..." value="${escapeHtml(options[3] || '')}" style="font-size:1rem; text-align:left; padding:12px; letter-spacing:normal;" ${qType === 'truefalse' ? '' : 'required'}>
        </div>
      </div>

      <!-- Add Question Button Right Below Each Question -->
      <div style="margin-top:20px; padding-top:14px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; color:var(--text-tertiary); font-weight:700;">Question #${qNumber} ready</span>
        <button type="button" class="btn-primary btn-inline-add" style="padding:10px 22px; font-size:0.95rem;">
          + Add Another Question Here ➕
        </button>
      </div>
    `;

    // Question Type toggle behavior (Quiz vs True/False)
    const typeSelect = div.querySelector('.q-type-select');
    const opt0Input = div.querySelector('.q-opt-0');
    const opt1Input = div.querySelector('.q-opt-1');
    const rowOpt2 = div.querySelector('.row-opt-2');
    const rowOpt3 = div.querySelector('.row-opt-3');
    const opt2Input = div.querySelector('.q-opt-2');
    const opt3Input = div.querySelector('.q-opt-3');

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'truefalse') {
        rowOpt2.style.display = 'none';
        rowOpt3.style.display = 'none';
        opt2Input.removeAttribute('required');
        opt3Input.removeAttribute('required');
        
        // Auto-fill True / False if blank or standard
        if (!opt0Input.value || opt0Input.value === 'Red Option') opt0Input.value = 'True';
        if (!opt1Input.value || opt1Input.value === 'Blue Option') opt1Input.value = 'False';
        
        // If correct was 2 or 3, reset to 0
        const radios = div.querySelectorAll('.radio-correct');
        if (radios[2].checked || radios[3].checked) {
          radios[0].checked = true;
        }
      } else {
        rowOpt2.style.display = 'flex';
        rowOpt3.style.display = 'flex';
        opt2Input.setAttribute('required', 'required');
        opt3Input.setAttribute('required', 'required');
      }
    });

    // Inline "+ Add Another Question" button click handler
    div.querySelector('.btn-inline-add').addEventListener('click', () => {
      addQuestionForm();
    });

    // Remove button handler
    div.querySelector('.btn-remove-q').addEventListener('click', () => {
      if (questionsContainer.children.length > 1) {
        div.remove();
        renumberQuestions();
      } else {
        alert('A quiz must have at least one question!');
      }
    });

    questionsContainer.appendChild(div);
  }

  // Bottom "+ Add Another Question" button
  if (btnBottomAddQuestion) {
    btnBottomAddQuestion.addEventListener('click', () => {
      addQuestionForm();
    });
  }

  // Save Quiz
  btnSaveQuiz.addEventListener('click', async () => {
    const title = inputQuizTitle.value.trim();
    const desc = inputQuizDesc.value.trim();
    const quizId = editingQuizIdInput.value.trim();

    if (!title) {
      alert('Please enter a Quiz Title');
      inputQuizTitle.focus();
      return;
    }

    const questionItems = questionsContainer.querySelectorAll('.question-builder-item');
    if (questionItems.length === 0) {
      alert('Please add at least 1 question');
      return;
    }

    const questions = [];
    let hasError = false;

    questionItems.forEach((item, idx) => {
      const qType = item.querySelector('.q-type-select').value;
      const qText = item.querySelector('.q-text-input').value.trim();
      const timeLimit = parseInt(item.querySelector('.q-time-input').value) || 20;
      const points = parseInt(item.querySelector('.q-points-input').value) || 1000;

      const opt0 = item.querySelector('.q-opt-0').value.trim();
      const opt1 = item.querySelector('.q-opt-1').value.trim();
      const checkedRadio = item.querySelector('.radio-correct:checked');
      const correctIndex = checkedRadio ? parseInt(checkedRadio.value) : 0;

      if (!qText || !opt0 || !opt1) {
        alert(`Question #${idx + 1} is missing text or options.`);
        hasError = true;
        return;
      }

      if (qType === 'truefalse') {
        questions.push({
          type: 'truefalse',
          text: qText,
          timeLimit,
          points,
          options: [opt0, opt1],
          correctIndex: correctIndex > 1 ? 0 : correctIndex
        });
      } else {
        const opt2 = item.querySelector('.q-opt-2').value.trim();
        const opt3 = item.querySelector('.q-opt-3').value.trim();
        if (!opt2 || !opt3) {
          alert(`Question #${idx + 1} requires all 4 options.`);
          hasError = true;
          return;
        }
        questions.push({
          type: 'quiz',
          text: qText,
          timeLimit,
          points,
          options: [opt0, opt1, opt2, opt3],
          correctIndex
        });
      }
    });

    if (hasError) return;

    btnSaveQuiz.disabled = true;
    btnSaveQuiz.innerText = 'Saving Quiz...';

    const quizPayload = {
      id: quizId || ('quiz_' + Date.now()),
      title,
      description: desc,
      questions
    };

    try {
      await window.quizNetwork.saveQuiz(quizPayload);
      alert('Quiz Saved Successfully! 🎉');
      tabList.click();
    } catch (err) {
      alert('Error saving quiz: ' + err.message);
    } finally {
      btnSaveQuiz.disabled = false;
      btnSaveQuiz.innerText = 'Save Quiz to Firebase 💾';
    }
  });

  // Export JSON backup
  if (btnExportAll) {
    btnExportAll.addEventListener('click', async () => {
      const quizzes = await window.quizNetwork.getQuizzes();
      const blob = new Blob([JSON.stringify(quizzes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biblequest_quizzes_backup_${Date.now()}.json`;
      a.click();
    });
  }

  // Import JSON backup
  if (inputImportFile) {
    inputImportFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const list = JSON.parse(event.target.result);
          if (Array.isArray(list)) {
            for (const q of list) {
              await window.quizNetwork.saveQuiz(q);
            }
            alert(`Imported ${list.length} quizzes successfully!`);
            loadAdminQuizzes();
          } else {
            alert('Invalid quiz JSON file format');
          }
        } catch (err) {
          alert('Could not read JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
