// Firebase Configuration for BibleQuest
const firebaseConfig = {
  apiKey: "AIzaSyDNLRqNCVjtcnseB8KPwYal-JyXbGo8Rdw",
  authDomain: "kahoot-website.firebaseapp.com",
  projectId: "kahoot-website",
  storageBucket: "kahoot-website.firebasestorage.app",
  messagingSenderId: "953560918882",
  appId: "1:953560918882:web:20e3a5823115c27eb91a3b",
  measurementId: "G-MPNFR7DXED"
};

// Global Firebase handles
let app = null;
let db = null;
let rtdb = null;
let auth = null;
let isFirebaseOnline = false;

// Initialize Firebase SDK
try {
  if (typeof firebase !== 'undefined') {
    app = firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore
    try {
      db = firebase.firestore();
      try {
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (e) {}
    } catch (fsErr) {
      console.warn("Firestore init notice:", fsErr);
    }

    // Initialize Realtime Database as alternative
    try {
      rtdb = firebase.database();
    } catch (rtdbErr) {
      console.warn("RTDB init notice:", rtdbErr);
    }

    // Initialize Auth
    try {
      auth = firebase.auth();
    } catch (authErr) {
      console.warn("Auth init notice:", authErr);
    }

    isFirebaseOnline = true;
    console.log("🔥 Firebase initialized for BibleQuest:", firebaseConfig.projectId);
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// Universal database helper with fallback to LocalStorage/BroadcastChannel for testing/offline
class QuizNetwork {
  constructor() {
    this.useFirestore = !!db;
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('biblequest_channel') : null;
  }

  // Check connection status
  async checkDatabaseStatus() {
    if (!db) return { ok: false, error: "Firestore SDK not loaded" };
    try {
      await db.collection('_health_check').doc('ping').set({ ping: Date.now() }, { merge: true });
      return { ok: true };
    } catch (err) {
      return { 
        ok: false, 
        error: err.message, 
        code: err.code,
        needConsoleSetup: err.code === 'permission-denied' || err.code === 'not-found' || err.message.includes('NOT_FOUND')
      };
    }
  }

  // --- QUIZ MANAGEMENT ---
  async saveQuiz(quiz) {
    quiz.updatedAt = Date.now();
    if (!quiz.id) {
      quiz.id = 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    // Always save locally as backup
    const localQuizzes = this.getLocalQuizzes();
    const existingIndex = localQuizzes.findIndex(q => q.id === quiz.id);
    if (existingIndex >= 0) {
      localQuizzes[existingIndex] = quiz;
    } else {
      localQuizzes.unshift(quiz);
    }
    localStorage.setItem('biblequest_quizzes', JSON.stringify(localQuizzes));

    // Save to Firestore if available
    if (db) {
      try {
        await db.collection('quizzes').doc(quiz.id).set(quiz);
      } catch (err) {
        console.warn("Could not save to Firestore, saved to local cache:", err.message);
      }
    }
    return quiz;
  }

  async getQuizzes() {
    let list = [];
    if (db) {
      try {
        const snap = await db.collection('quizzes').orderBy('updatedAt', 'desc').get();
        snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
      } catch (err) {
        console.warn("Firestore getQuizzes fallback to local:", err.message);
      }
    }
    
    if (list.length === 0) {
      list = this.getLocalQuizzes();
    }
    
    if (list.length === 0) {
      const defaultQuizzes = this.getDefaultSampleQuizzes();
      for (const dq of defaultQuizzes) {
        await this.saveQuiz(dq);
      }
      return defaultQuizzes;
    }
    return list;
  }

  getLocalQuizzes() {
    try {
      const data = localStorage.getItem('biblequest_quizzes');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async deleteQuiz(quizId) {
    const list = this.getLocalQuizzes().filter(q => q.id !== quizId);
    localStorage.setItem('biblequest_quizzes', JSON.stringify(list));
    if (db) {
      try {
        await db.collection('quizzes').doc(quizId).delete();
      } catch (e) {
        console.warn("Firestore delete failed:", e);
      }
    }
  }

  // --- GAME SESSION MANAGEMENT ---
  async createGame(gameData) {
    const pin = gameData.pin;
    
    localStorage.setItem('game_' + pin, JSON.stringify(gameData));
    
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'GAME_UPDATE', pin, data: gameData });
    }

    if (db) {
      try {
        await db.collection('games').doc(pin).set(gameData);
      } catch (err) {
        console.warn("Firebase game creation warning:", err.message);
      }
    }
    return pin;
  }

  async updateGame(pin, partialData) {
    const current = this.getLocalGame(pin) || {};
    const updated = { ...current, ...partialData, updatedAt: Date.now() };
    localStorage.setItem('game_' + pin, JSON.stringify(updated));

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'GAME_UPDATE', pin, data: updated });
    }

    if (db) {
      try {
        await db.collection('games').doc(pin).update(partialData);
      } catch (err) {
        console.warn("Firestore updateGame error:", err.message);
      }
    }
  }

  getLocalGame(pin) {
    try {
      const d = localStorage.getItem('game_' + pin);
      return d ? JSON.parse(d) : null;
    } catch (e) {
      return null;
    }
  }

  // Real-time listener for Game State
  listenToGame(pin, callback) {
    let unsubscribeFirestore = null;

    if (db) {
      try {
        unsubscribeFirestore = db.collection('games').doc(pin).onSnapshot(
          (doc) => {
            if (doc.exists) {
              const remoteData = doc.data();
              // Sync local copy
              localStorage.setItem('game_' + pin, JSON.stringify(remoteData));
              callback(remoteData);
            } else {
              const local = this.getLocalGame(pin);
              if (local) callback(local);
            }
          },
          (err) => {
            console.warn("Firestore listenToGame fallback to local:", err.message);
          }
        );
      } catch (e) {
        console.warn("Firestore subscription error:", e);
      }
    }

    const localListener = (e) => {
      if (e.key === 'game_' + pin && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', localListener);

    let bcListener = null;
    if (this.broadcastChannel) {
      bcListener = (ev) => {
        if (ev.data && ev.data.pin === pin && ev.data.data) {
          callback(ev.data.data);
        }
      };
      this.broadcastChannel.addEventListener('message', bcListener);
    }

    const initialLocal = this.getLocalGame(pin);
    if (initialLocal) {
      callback(initialLocal);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('storage', localListener);
      if (this.broadcastChannel && bcListener) {
        this.broadcastChannel.removeEventListener('message', bcListener);
      }
    };
  }

  // Join player to game (Max 100 players allowed)
  async joinGame(pin, playerId, nickname) {
    let game = this.getLocalGame(pin);

    // If Firestore is available, fetch latest game state first to verify player limit
    if (db) {
      try {
        const doc = await db.collection('games').doc(pin).get();
        if (doc.exists) {
          game = doc.data();
        }
      } catch (e) {}
    }

    if (!game) {
      throw new Error("Game session not found. Please verify the PIN.");
    }

    const playersCount = game.players ? Object.keys(game.players).length : 0;
    if (playersCount >= 100) {
      throw new Error("Lobby is full! Maximum 100 players allowed.");
    }

    const playerRecord = {
      id: playerId,
      name: nickname,
      score: 0,
      streak: 0,
      lastAnswer: null,
      lastScore: 0,
      joinedAt: Date.now()
    };

    if (!game.players) game.players = {};
    game.players[playerId] = playerRecord;
    localStorage.setItem('game_' + pin, JSON.stringify(game));

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'GAME_UPDATE', pin, data: game });
    }

    if (db) {
      try {
        const updatePayload = {};
        updatePayload[`players.${playerId}`] = playerRecord;
        await db.collection('games').doc(pin).update(updatePayload);
      } catch (err) {
        console.warn("Firestore joinGame update:", err.message);
      }
    }
    return playerRecord;
  }

  // Submit answer and guarantee points are accumulated
  async submitAnswer(pin, playerId, answerData) {
    let game = this.getLocalGame(pin) || {};
    if (!game.answers) game.answers = {};
    if (!game.answers[answerData.questionIndex]) game.answers[answerData.questionIndex] = {};
    game.answers[answerData.questionIndex][playerId] = answerData;

    if (!game.players) game.players = {};
    if (!game.players[playerId]) {
      game.players[playerId] = { id: playerId, name: answerData.playerName || 'Player', score: 0, streak: 0 };
    }

    const currentScore = Number(game.players[playerId].score || 0);
    const addedPoints = Number(answerData.pointsAwarded || 0);
    const newTotalScore = currentScore + addedPoints;

    game.players[playerId].score = newTotalScore;
    game.players[playerId].lastAnswer = answerData;
    game.players[playerId].lastScore = addedPoints;
    game.players[playerId].lastCorrect = !!answerData.isCorrect;
    
    if (answerData.isCorrect) {
      game.players[playerId].streak = (game.players[playerId].streak || 0) + 1;
    } else {
      game.players[playerId].streak = 0;
    }

    localStorage.setItem('game_' + pin, JSON.stringify(game));
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'GAME_UPDATE', pin, data: game });
    }

    if (db) {
      try {
        const updatePayload = {};
        updatePayload[`answers.${answerData.questionIndex}.${playerId}`] = answerData;
        
        // Firestore atomic update
        if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
          updatePayload[`players.${playerId}.score`] = firebase.firestore.FieldValue.increment(addedPoints);
        } else {
          updatePayload[`players.${playerId}.score`] = newTotalScore;
        }
        
        updatePayload[`players.${playerId}.lastScore`] = addedPoints;
        updatePayload[`players.${playerId}.lastCorrect`] = !!answerData.isCorrect;
        updatePayload[`players.${playerId}.lastAnswer`] = answerData;
        if (answerData.isCorrect) {
          updatePayload[`players.${playerId}.streak`] = game.players[playerId].streak;
        } else {
          updatePayload[`players.${playerId}.streak`] = 0;
        }
        await db.collection('games').doc(pin).update(updatePayload);
      } catch (err) {
        console.warn("Firestore submitAnswer:", err.message);
      }
    }
  }

  // Default Sample Quizzes (with both Multiple Choice and True/False questions)
  getDefaultSampleQuizzes() {
    return [
      {
        id: "quiz_bible_heritage_1",
        title: "Bible Heritage & Knowledge Quiz",
        type: "mixed",
        description: "Engaging quiz with multiple-choice and True/False questions",
        updatedAt: Date.now(),
        questions: [
          {
            type: "quiz", // 4 choices
            text: "How many books are in the standard Holy Bible?",
            timeLimit: 20,
            points: 1000,
            options: [
              "66 Books",
              "72 Books",
              "60 Books",
              "80 Books"
            ],
            correctIndex: 0
          },
          {
            type: "truefalse", // 2 choices
            text: "David defeated Goliath with a sling and stones.",
            timeLimit: 15,
            points: 1000,
            options: [
              "True",
              "False"
            ],
            correctIndex: 0
          },
          {
            type: "quiz",
            text: "Who led the Israelites out of Egypt across the Red Sea?",
            timeLimit: 20,
            points: 1000,
            options: [
              "Abraham",
              "Moses",
              "Joshua",
              "Solomon"
            ],
            correctIndex: 1
          },
          {
            type: "truefalse",
            text: "Solomon was famous for asking God for riches instead of wisdom.",
            timeLimit: 15,
            points: 1000,
            options: [
              "True",
              "False"
            ],
            correctIndex: 1
          },
          {
            type: "quiz",
            text: "What is the longest chapter in the Bible?",
            timeLimit: 20,
            points: 1000,
            options: [
              "Psalm 23",
              "Genesis 1",
              "Psalm 119",
              "John 3"
            ],
            correctIndex: 2
          }
        ]
      }
    ];
  }
}

// Global instance
window.quizNetwork = new QuizNetwork();
