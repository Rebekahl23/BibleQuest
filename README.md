# 📖 BibleQuest - Live Multiplayer Quiz Web App

A high-performance, real-time multiplayer quiz platform built exclusively with **HTML, CSS, JavaScript (Vanilla JS)** and **Firebase**, designed to host on **GitHub Pages** with zero build steps or backend servers!

---

## 🌟 Key Features

1. **Brand New Identity: BibleQuest**
   - Clean, modern, luxury light theme with ambient floating geometric shapes.
   - 100% English user interface throughout (questions and answers support both Tamil and English typing).

2. **Mixed Quiz Types (Multiple Choice & True / False)**
   - Create standard 4-option questions (Red Triangle, Blue Diamond, Yellow Circle, Green Square).
   - Create 2-option **True / False** questions (Blue Diamond for True, Red Triangle for False).
   - Freely mix both question types inside any quiz!

3. **Inline Question Creation**
   - "+ Add Another Question" button is now conveniently available directly at the bottom of every question block and at the bottom of the questions list.

4. **Accurate Speed-Based Scoring & Live Points Tracking**
   - Real-time scoring based on response speed and correctness (up to 1000 points per question).
   - Atomic score incrementation and host-side answer tallying so player points are always 100% accurate.

5. **Keyboard Hotkey Control for Host Screen**
   - When question results are revealed, the large inline leaderboard panel is hidden.
   - Simply press the **⬇️ Down Arrow** key on your keyboard to reveal the Leaderboard!

6. **Grand Step-by-Step Podium Celebration**
   - Step 1: 3rd Place Winner is revealed with bronze fanfare.
   - Step 2: 2nd Place Winner is revealed with silver fanfare.
   - Step 3: **Grand 1st Place Champion** is revealed with golden light, floating crown, 3-way cannon confetti fireworks, and triumph fanfare!
   - Step 4: 4th and 5th Runners-up are displayed with names and total points.

7. **Lobby & Player Limits**
   - Minimum 1 player must join before the game can start.
   - Supports up to 100 players per game session.
   - Host screen (`host.html`) is protected with Admin login.

---

## 📁 File Structure

```
├── index.html          # Player Screen (Join PIN, Nickname, Mobile-friendly Live Quiz)
├── host.html           # Protected Host Screen (Big screen/projector, Timer on left, Answers on right)
├── admin.html          # Admin Dashboard (Quiz bank, Mix Multiple Choice & True/False, Set timings)
├── css/
│   └── style.css       # Luxury Light Theme, Floating Ambient Shapes & Animations
├── js/
│   ├── firebase-config.js  # Firebase configuration & real-time network sync
│   ├── audio.js            # Web Audio API synthesizers (Ticks, chimes, victory melody)
│   ├── confetti.js         # Multi-angle physics confetti cannon engine
│   ├── player.js           # Player client logic with True/False & points tracking
│   ├── host.js             # Host controller (Step-by-step podium, ArrowDown hotkey)
│   └── admin.js            # Quiz builder with inline add button & True/False selector
└── README.md
```

---

## 🚀 How to Host on GitHub Pages

1. Push all files to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "BibleQuest Quiz App"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
2. In your repository on GitHub, navigate to **Settings > Pages**.
3. Under **Build and deployment > Branch**, select `main` and click **Save**.
4. Your site will be live in ~1 minute at:
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

## 🎮 How to Play & Manage

1. **For Players:**
   - Go straight to the website (`index.html`).
   - Enter the 6-digit Game PIN and Nickname to join and play!

2. **For Admin:**
   - On the same homepage (`index.html`), click **"🔐 Admin Login"** in the top navigation bar.
   - Enter passcode to access admin dashboard.
   - The navigation bar immediately reveals **"⚙️ Dashboard"**, **"💻 Host Screen"**, and **"🚪 Logout"**.
   - Create/edit quizzes, launch live host sessions, and log out with 1 click!
