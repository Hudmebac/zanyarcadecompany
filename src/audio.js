/* ELEMENTAL LITTLE WARS - bouncy procedural chiptune and toy-box effects. */
(function (global) {
  'use strict';
  var ZAC = (global.ZAC = global.ZAC || {});

  var SCORES = {
    fire: {
      bpm: 126, root: 60, lead: 'square',
      prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]],
      melody: [12, null, 16, 19, null, 16, 14, null, 12, 14, 16, null, 19, 16, 14, 12]
    },
    water: {
      bpm: 110, root: 55, lead: 'triangle',
      prog: [[0, 4, 7], [2, 5, 9], [5, 9, 12], [4, 7, 11]],
      melody: [12, 14, null, 16, 14, null, 12, 9, 7, 9, 12, null, 14, 16, 14, null]
    },
    earth: {
      bpm: 116, root: 53, lead: 'triangle',
      prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [0, 4, 7]],
      melody: [12, null, 9, 12, 14, null, 12, 9, 7, null, 9, 12, 14, 12, 9, null]
    },
    air: {
      bpm: 136, root: 57, lead: 'square',
      prog: [[0, 4, 7], [2, 5, 9], [7, 11, 14], [5, 9, 12]],
      melody: [12, 14, 16, null, 19, 16, 14, 12, 14, 16, 19, null, 21, 19, 16, 14]
    },
    light: {
      bpm: 122, root: 60, lead: 'triangle',
      prog: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]],
      melody: [12, 16, 19, 16, 14, 17, 21, null, 19, 16, 14, 12, 14, 16, 19, null]
    },
    dark: {
      bpm: 108, root: 57, lead: 'square',
      prog: [[0, 3, 7], [-2, 1, 5], [-4, 0, 3], [-5, -1, 2]],
      melody: [12, null, 15, 14, null, 12, 10, null, 7, 10, 12, 15, null, 14, 12, null]
    }
  };

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function Engine() {
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.enabled = false; this.element = 'fire'; this.mood = 'menu';
    this.volumes = { master: 0.7, music: 0.45, sfx: 0.72 };
    this.timer = null; this.nextTime = 0; this.step = 0; this.voices = []; this.noiseBuffer = null;
  }

  Engine.prototype.init = function () {
    if (this.ctx) { this.resume(); return; }
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.enabled = true;
      this.applyVolumes();
      this.startMusic();
    } catch (e) { this.enabled = false; }
  };
  Engine.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };
  Engine.prototype.applyVolumes = function () {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.08);
    this.musicGain.gain.setTargetAtTime(this.volumes.music * 0.48, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.volumes.sfx * 0.8, t, 0.04);
  };
  Engine.prototype.setVolumes = function (v) {
    Object.keys(v || {}).forEach(function (k) {
      if (this.volumes[k] !== undefined) this.volumes[k] = v[k];
    }, this);
    this.applyVolumes();
  };
  Engine.prototype.setElement = function (el) {
    if (!SCORES[el] || el === this.element) return;
    this.element = el;
    if (this.enabled) this.startMusic();
  };
  Engine.prototype.setMood = function (mood) {
    if (!mood || mood === this.mood) return;
    this.mood = mood;
    if (this.enabled) this.startMusic();
  };
  Engine.prototype.startMusic = function () {
    if (!this.ctx || !this.enabled) return;
    this.stopMusic();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    var self = this;
    this.timer = setInterval(function () { self.schedule(); }, 80);
    this.schedule();
  };
  Engine.prototype.stopMusic = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    var voices = this.voices.slice();
    this.voices = [];
    voices.forEach(function (osc) { try { osc.stop(); } catch (e) { } });
  };
  Engine.prototype.schedule = function () {
    if (!this.ctx || !this.enabled) return;
    var score = SCORES[this.element] || SCORES.fire;
    var bpm = score.bpm + (this.mood === 'battle' ? 6 : -4);
    var stepDur = 60 / bpm / 4;
    var horizon = this.ctx.currentTime + 0.3;
    var guard = 0;
    while (this.nextTime < horizon && guard < 14) {
      this.playStep(this.step, this.nextTime, score, stepDur);
      this.step++;
      this.nextTime += stepDur;
      guard++;
    }
  };
  Engine.prototype.playStep = function (step, when, score, stepDur) {
    var bar = Math.floor(step / 16) % score.prog.length;
    var chord = score.prog[bar];
    var beat = step % 16;
    var root = score.root;

    if (beat === 0 || beat === 8) this.kick(when, 0.055);
    if (beat === 4 || beat === 12) this.snare(when, 0.022);
    if (beat % 2 === 1) this.hat(when, 0.006);
    if (beat === 0 || beat === 8) {
      this.bass(midi(root + chord[0] - 12), when, stepDur * 3.6, 0.055);
    }
    if (beat === 4 || beat === 12) {
      this.bass(midi(root + chord[2] - 12), when, stepDur * 2.2, 0.04);
    }
    if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
      for (var c = 0; c < chord.length; c++) {
        this.stab(midi(root + chord[c] + 12), when, stepDur * 0.9, 0.018, score.lead);
      }
    }
    var note = score.melody[step % score.melody.length];
    if (note !== null && note !== undefined) {
      this.lead(midi(root + note + 12), when, stepDur * 1.55, 0.035, score.lead);
    }
  };

  Engine.prototype.register = function (osc) {
    var self = this;
    this.voices.push(osc);
    osc.onended = function () {
      var i = self.voices.indexOf(osc);
      if (i >= 0) self.voices.splice(i, 1);
    };
  };
  Engine.prototype.tone = function (freq, dur, type, vol, delay, dest) {
    if (!this.enabled || !this.ctx) return;
    try {
      var t = this.ctx.currentTime + (delay || 0);
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(dest || this.sfxGain);
      osc.start(t); osc.stop(t + dur + 0.03);
    } catch (e) { }
  };
  Engine.prototype.lead = function (freq, when, dur, vol, type) {
    if (!this.ctx) return;
    try {
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      var filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 2300;
      osc.type = type || 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(filter); filter.connect(g); g.connect(this.musicGain);
      osc.start(when); osc.stop(when + dur + 0.03);
      this.register(osc);
    } catch (e) { }
  };
  Engine.prototype.stab = function (freq, when, dur, vol, type) {
    if (!this.ctx) return;
    try {
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(when); osc.stop(when + dur + 0.02);
      this.register(osc);
    } catch (e) { }
  };
  Engine.prototype.bass = function (freq, when, dur, vol) {
    if (!this.ctx) return;
    try {
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(when); osc.stop(when + dur + 0.02);
      this.register(osc);
    } catch (e) { }
  };
  Engine.prototype.noise = function (dur, vol, cutoff, when, highpass) {
    if (!this.ctx) return;
    try {
      if (!this.noiseBuffer) {
        var len = Math.floor(this.ctx.sampleRate * 0.22);
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var data = this.noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      var src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      var filter = this.ctx.createBiquadFilter();
      filter.type = highpass ? 'highpass' : 'lowpass';
      filter.frequency.value = cutoff;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(filter); filter.connect(g); g.connect(this.musicGain);
      src.start(when); src.stop(when + dur + 0.02);
    } catch (e) { }
  };
  Engine.prototype.kick = function (when, vol) {
    if (!this.ctx) return;
    try {
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.14);
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.17);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(when); osc.stop(when + 0.18);
      this.register(osc);
    } catch (e) { }
  };
  Engine.prototype.snare = function (when, vol) { this.noise(0.14, vol, 1800, when, false); };
  Engine.prototype.hat = function (when, vol) { this.noise(0.035, vol, 7000, when, true); };

  Engine.prototype.click = function () { this.tone(880, 0.055, 'square', 0.035); };
  Engine.prototype.confirm = function () { this.tone(660, 0.08, 'square', 0.04); this.tone(990, 0.14, 'square', 0.03, 0.07); };
  Engine.prototype.error = function () { this.tone(150, 0.14, 'square', 0.032); this.tone(120, 0.14, 'square', 0.024, 0.08); };
  Engine.prototype.spawn = function () { this.tone(420, 0.07, 'square', 0.035); this.tone(680, 0.11, 'square', 0.03, 0.05); };
  Engine.prototype.ability = function () { this.tone(520, 0.09, 'triangle', 0.05); this.tone(780, 0.15, 'triangle', 0.04, 0.07); this.tone(1040, 0.2, 'square', 0.025, 0.14); };
  Engine.prototype.event = function () { this.tone(660, 0.1, 'square', 0.04); this.tone(880, 0.1, 'square', 0.035, 0.08); this.tone(1320, 0.22, 'triangle', 0.03, 0.16); };
  Engine.prototype.coin = function () { this.tone(988, 0.06, 'square', 0.03); this.tone(1319, 0.14, 'square', 0.025, 0.055); };
  Engine.prototype.hit = function () { this.noise(0.06, 0.025, 900, this.ctx ? this.ctx.currentTime : 0, false); };
  Engine.prototype.win = function () { [0, 4, 7, 12, 16].forEach(function (n, i) { this.tone(midi(60 + n), 0.28, 'square', 0.04, i * 0.1); }, this); };
  Engine.prototype.lose = function () { [12, 7, 4, 0].forEach(function (n, i) { this.tone(midi(60 + n - 12), 0.26, 'triangle', 0.04, i * 0.12); }, this); };

  ZAC.Audio = new Engine();
})(typeof globalThis !== 'undefined' ? globalThis : this);
