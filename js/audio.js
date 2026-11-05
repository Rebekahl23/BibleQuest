// Web Audio API Synthesizer for Kahoot sound effects
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lobbyTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopLobbyMusic();
    }
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.2, gainValue = 0.2, startDelay = 0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + startDelay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio playTone error:", e);
    }
  }

  // Answer selected click
  playClick() {
    this.playTone(600, 'triangle', 0.08, 0.25);
  }

  // Countdown tick
  playTick(isUrgent = false) {
    if (isUrgent) {
      this.playTone(880, 'square', 0.08, 0.2);
    } else {
      this.playTone(520, 'sine', 0.06, 0.15);
    }
  }

  // Correct answer chime (Uplifting major chord)
  playCorrect() {
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.4, 0.25, idx * 0.08);
    });
  }

  // Wrong answer bonk
  playWrong() {
    if (this.isMuted) return;
    this.init();
    const notes = [320, 260, 200];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.25, 0.15, idx * 0.09);
    });
  }

  // Time's up buzzer
  playTimesUp() {
    if (this.isMuted) return;
    this.init();
    this.playTone(220, 'sawtooth', 0.5, 0.25);
    this.playTone(180, 'sawtooth', 0.5, 0.25, 0.1);
  }

  // Start question fanfare
  playQuestionStart() {
    if (this.isMuted) return;
    this.init();
    const chords = [440, 554.37, 659.25, 880];
    chords.forEach((freq, i) => {
      this.playTone(freq, 'sine', 0.3, 0.2, i * 0.06);
    });
  }

  // Podium victory fanfare
  playVictory() {
    if (this.isMuted) return;
    this.init();
    const melody = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 523.25, d: 0.15, t: 0.18 },
      { f: 523.25, d: 0.15, t: 0.36 },
      { f: 659.25, d: 0.4, t: 0.54 },
      { f: 783.99, d: 0.6, t: 0.95 },
      { f: 1046.50, d: 0.9, t: 1.55 }
    ];
    melody.forEach(note => {
      this.playTone(note.f, 'triangle', note.d, 0.3, note.t);
    });
  }

  // Funky Kahoot-style lobby background melody loop
  startLobbyMusic() {
    if (this.isMuted || this.lobbyTimer) return;
    this.init();

    const pattern = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    let step = 0;

    this.lobbyTimer = setInterval(() => {
      if (this.isMuted) return;
      const freq = pattern[step % pattern.length];
      this.playTone(freq, 'sine', 0.18, 0.08);
      step++;
    }, 450);
  }

  stopLobbyMusic() {
    if (this.lobbyTimer) {
      clearInterval(this.lobbyTimer);
      this.lobbyTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
