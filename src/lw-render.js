/* ELEMENTAL LITTLE WARS - bright three-lane battlefield renderer. */
(function (global) {
  'use strict';
  var ZAC = (global.ZAC = global.ZAC || {});
  var LW = ZAC.LW;

  function rgba(hex, a) {
    var h = String(hex || '#FF6B35').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }

  function Arena(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.selectedLane = 1;
    this.selectedType = 'pip';
    this.selectedPad = 0;
    this.w = 0; this.h = 0; this.dpr = 1;
    this.laneCount = 3;
    this.laneYs = [0, 0, 0];
    this.baseY = 0;
    this.time = 0;
    this.resize();
  }

  Arena.prototype.resize = function () {
    var w = this.canvas.clientWidth || global.innerWidth || 1100;
    var h = this.canvas.clientHeight || global.innerHeight || 760;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.w = w; this.h = h; this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = this.laneCount || 3;
    // Keep the lanes between the real HUD boxes, whatever the phone wraps to.
    var topHud = document.querySelector('.top-hud');
    var bottomHud = document.querySelector('.bottom-hud');
    var topReserve = topHud && topHud.getBoundingClientRect().height > 0 ? topHud.getBoundingClientRect().height + 10 : 0;
    var bottomReserve = bottomHud && bottomHud.getBoundingClientRect().height > 0 ? bottomHud.getBoundingClientRect().height + 10 : 0;
    var topFloor = h < 520 ? 82 : 112;
    var bottomFloor = h < 520 ? 92 : (count > 3 ? 158 : 145);
    var top = Math.max(topFloor, h * (count > 3 ? 0.165 : 0.18), topReserve);
    var bottom = h - Math.max(bottomFloor, h * (count > 3 ? 0.22 : 0.19), bottomReserve);
    var span = Math.max(90, bottom - top);
    this.laneYs = [];
    for (var i = 0; i < count; i++) {
      this.laneYs.push(top + span * (0.1 + 0.8 * i / Math.max(1, count - 1)));
    }
    this.baseY = (this.laneYs[0] + this.laneYs[count - 1]) / 2;
  };

  Arena.prototype.setMatch = function (state) {
    this.state = state;
    this.laneCount = state ? state.laneCount : 3;
    if (state) {
      this.selectedLane = Math.floor(this.laneCount / 2);
      this.selectedType = 'pip';
    }
    this.resize();
  };

  // Lanes are a vertical scale, so hub pals can sit between lanes on a strand.
  Arena.prototype.laneYAt = function (lane) {
    var count = this.laneYs.length;
    if (!count) return this.baseY || 0;
    var t = clamp(lane === undefined || lane === null ? 0 : lane, 0, count - 1);
    var lo = Math.floor(t), hi = Math.min(count - 1, lo + 1);
    return this.laneYs[lo] + (this.laneYs[hi] - this.laneYs[lo]) * (t - lo);
  };

  Arena.prototype.mapX = function (x) {
    return this.w * 0.085 + x * this.w * 0.83;
  };

  Arena.prototype.laneAt = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    var count = this.laneCount || 3;
    if (y < this.laneYs[0] - 65 || y > this.laneYs[count - 1] + 65) return null;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < count; i++) {
      var d = Math.abs(y - this.laneYs[i]);
      if (d < bestDist) { best = i; bestDist = d; }
    }
    var spacing = count > 1 ? this.laneYs[1] - this.laneYs[0] : 100;
    return bestDist <= Math.max(42, spacing * 0.5) ? best : null;
  };

  // Hubs are clickable: tap a tower on the web to send the next pals there.
  Arena.prototype.clashHubAt = function (clientX, clientY) {
    var state = this.state;
    if (!state || !state.clash) return null;
    var rect = this.canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    var best = null, bestDist = Infinity;
    for (var i = 0; i < state.clash.towers.length; i++) {
      var hub = state.clash.towers[i];
      if (hub.kind === 'keep') continue;
      var hx = this.mapX(hub.x), hy = this.laneYAt(hub.laneIndex);
      var d = Math.hypot(x - hx, y - hy);
      if (d < 46 && d < bestDist) { best = hub.id; bestDist = d; }
    }
    return best;
  };

  Arena.prototype.inMaze = function (clientX, clientY) {
    if (!this.mazeRect) return false;
    var rect = this.canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    return x >= this.mazeRect.left - 18 && x <= this.mazeRect.right + 18 &&
      y >= this.mazeRect.top - 18 && y <= this.mazeRect.bottom + 18;
  };

  Arena.prototype.mazePoint = function (gx, gy) {
    var m = this.mazeRect;
    if (!m) return { x: this.w / 2, y: this.h / 2 };
    return { x: m.left + (gx + 0.5) * m.cell, y: m.top + (gy + 0.5) * m.cell };
  };

  Arena.prototype.mazeGatePoint = function (side) {
    var m = this.mazeRect;
    if (!m) return { x: this.w / 2, y: this.baseY };
    return {
      x: side === 'enemy' ? m.right + (this.mazeGateOffset || 28) : m.left - (this.mazeGateOffset || 28),
      y: this.baseY
    };
  };

  Arena.prototype.draw = function (time, ui) {
    if (!this.ctx) return;
    this.time = time || 0;
    this.ui = ui || {};
    this.selectedLane = ui && ui.lane !== undefined ? ui.lane : this.selectedLane;
    this.selectedType = ui && ui.type ? ui.type : this.selectedType;
    this.selectedPad = ui && ui.pad !== undefined ? ui.pad : this.selectedPad;
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawSky();
    this.drawScenery();
    if (this.state && this.state.mode === 'tower') {
      this.drawTowerField();
      this.drawTowerUnits();
      this.drawEffects(this.state);
      this.drawVignette();
      return;
    }
    if (this.state && this.state.mode === 'clash') {
      this.drawLanes();
      this.drawForts();
      this.drawClashTowers();
      this.drawUnits();
      this.drawEffects(this.state);
      this.drawVignette();
      return;
    }
    if (this.state && this.state.mode === 'maze') {
      this.drawMaze();
      this.drawForts();
      this.drawMazeGates();
    } else {
      this.drawLanes();
      if (this.state) {
        this.drawForts();
        this.drawGatehouses();
        this.drawSpawnGates();
      }
    }
    this.drawDecorations();
    if (this.state) {
      if (this.state.mode === 'maze') {
        this.drawMazePreview();
        this.drawMazeUnits();
      } else {
        this.drawPreview();
        this.drawUnits();
      }
      this.drawEffects(this.state);
    } else {
      this.drawAmbientPals();
    }
    this.drawVignette();
  };

  Arena.prototype.drawSky = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    var kL = this.state && this.state.kingdoms ? this.state.kingdoms.player : null;
    var kR = this.state && this.state.kingdoms ? this.state.kingdoms.enemy : null;

    if (!kL || !kR) {
      var lobbySky = ctx.createLinearGradient(0, 0, 0, h);
      lobbySky.addColorStop(0, '#79D9FF');
      lobbySky.addColorStop(0.45, '#B9F1FF');
      lobbySky.addColorStop(0.78, '#F3F8D8');
      lobbySky.addColorStop(1, '#A5E36D');
      ctx.fillStyle = lobbySky;
      ctx.fillRect(0, 0, w, h);
      var sunX = w * 0.82, sunY = h * 0.12, sunR = Math.max(34, Math.min(w, h) * 0.065);
      var glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
      glow.addColorStop(0, 'rgba(255,246,168,0.9)');
      glow.addColorStop(0.35, 'rgba(255,231,114,0.25)');
      glow.addColorStop(1, 'rgba(255,231,114,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF1A6';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
      var cloudDrift = (this.time * 6) % (w + 300);
      this.cloud(cloudDrift - 150, h * 0.16, 1, 0.75);
      this.cloud(w - cloudDrift + 80, h * 0.24, 0.75, 0.6);
      this.cloud(cloudDrift * 0.6 + w * 0.35, h * 0.08, 0.6, 0.45);
      return;
    }

    // The two kingdoms share one bright horizon, each washing in from its own side.
    var sky = ctx.createLinearGradient(0, h * 0.08, w, h * 0.78);
    sky.addColorStop(0, kL.sky.top);
    sky.addColorStop(0.2, kL.sky.mid);
    sky.addColorStop(0.44, kL.sky.low);
    sky.addColorStop(0.56, kR.sky.low);
    sky.addColorStop(0.8, kR.sky.mid);
    sky.addColorStop(1, kR.sky.top);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    var topWash = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    topWash.addColorStop(0, 'rgba(31,25,52,0.22)');
    topWash.addColorStop(1, 'rgba(31,25,52,0)');
    ctx.fillStyle = topWash;
    ctx.fillRect(0, 0, w, h * 0.6);

    var leftGlow = ctx.createRadialGradient(w * 0.17, h * 0.42, 0, w * 0.17, h * 0.42, w * 0.52);
    leftGlow.addColorStop(0, rgba(kL.sky.low, 0.72));
    leftGlow.addColorStop(0.55, rgba(kL.sky.low, 0.18));
    leftGlow.addColorStop(1, rgba(kL.sky.low, 0));
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, w, h);
    var rightGlow = ctx.createRadialGradient(w * 0.83, h * 0.42, 0, w * 0.83, h * 0.42, w * 0.52);
    rightGlow.addColorStop(0, rgba(kR.sky.low, 0.72));
    rightGlow.addColorStop(0.55, rgba(kR.sky.low, 0.18));
    rightGlow.addColorStop(1, rgba(kR.sky.low, 0));
    ctx.fillStyle = rightGlow;
    ctx.fillRect(0, 0, w, h);

    var seam = ctx.createLinearGradient(w * 0.4, 0, w * 0.6, 0);
    seam.addColorStop(0, 'rgba(255,249,218,0)');
    seam.addColorStop(0.5, 'rgba(255,249,218,0.28)');
    seam.addColorStop(1, 'rgba(255,249,218,0)');
    ctx.fillStyle = seam;
    ctx.fillRect(w * 0.36, 0, w * 0.28, h);

    var drift = (this.time * 5) % (w + 340);
    this.cloud(drift - 170, h * 0.15, 1.0, 0.55);
    this.cloud(w - drift + 60, h * 0.25, 0.72, 0.42);
    this.cloud(drift * 0.55 + w * 0.3, h * 0.07, 0.52, 0.28);

    ctx.globalAlpha = 0.4;
    for (var i = 0; i < 22; i++) {
      var dx = (i * 137 + this.time * (5 + i % 4)) % w;
      var dy = h * 0.09 + ((i * 73) % Math.max(1, h * 0.4));
      ctx.fillStyle = i % 2 ? '#FFFFFF' : (i % 3 ? kL.sky.low : kR.sky.low);
      ctx.beginPath(); ctx.arc(dx, dy, 1.3 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Arena.prototype.cloud = function (x, y, scale, alpha) {
    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
    ctx.arc(x + 34 * scale, y - 12 * scale, 36 * scale, 0, Math.PI * 2);
    ctx.arc(x + 76 * scale, y + 3 * scale, 26 * scale, 0, Math.PI * 2);
    ctx.arc(x + 40 * scale, y + 18 * scale, 33 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Arena.prototype.sideKingdom = function (side) {
    if (!this.state) return null;
    if (this.state.kingdoms && this.state.kingdoms[side]) return this.state.kingdoms[side];
    var element = side === 'player' ? this.state.playerElement : this.state.enemyElement;
    return LW.kingdomFor ? LW.kingdomFor(element) : null;
  };

  Arena.prototype.drawValley = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    var kL = this.sideKingdom('player'), kR = this.sideKingdom('enemy');
    if (!kL || !kR) return;
    var far = ctx.createLinearGradient(0, 0, w, 0);
    far.addColorStop(0, kL.land.far);
    far.addColorStop(0.32, kL.land.near);
    far.addColorStop(0.5, '#B7C78F');
    far.addColorStop(0.68, kR.land.near);
    far.addColorStop(1, kR.land.far);
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = far;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.73);
    ctx.quadraticCurveTo(w * 0.16, h * 0.63, w * 0.34, h * 0.7);
    ctx.quadraticCurveTo(w * 0.5, h * 0.75, w * 0.66, h * 0.69);
    ctx.quadraticCurveTo(w * 0.84, h * 0.63, w, h * 0.72);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFF5D5';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    ctx.quadraticCurveTo(w * 0.24, h * 0.73, w * 0.5, h * 0.79);
    ctx.quadraticCurveTo(w * 0.76, h * 0.84, w, h * 0.77);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  Arena.prototype.drawSideLandscape = function (side) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var k = this.sideKingdom(side);
    if (!k) return;
    var mirror = side === 'enemy';
    var x = w * 0.17, base = h * 0.67;
    ctx.save();
    ctx.globalAlpha = 0.75;
    if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }

    // A shared rolling ridge keeps both kingdoms grounded in the same toy world.
    ctx.fillStyle = k.land.far;
    ctx.beginPath();
    ctx.moveTo(-20, base);
    ctx.quadraticCurveTo(w * 0.04, h * 0.46, w * 0.12, h * 0.57);
    ctx.quadraticCurveTo(w * 0.22, h * 0.44, w * 0.31, h * 0.58);
    ctx.quadraticCurveTo(w * 0.37, h * 0.66, w * 0.43, base);
    ctx.closePath();
    ctx.fill();

    if (k.landmark === 'volcano') {
      ctx.fillStyle = k.land.near;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.18, base);
      ctx.lineTo(x - w * 0.018, h * 0.255);
      ctx.lineTo(x + w * 0.032, h * 0.255);
      ctx.lineTo(x + w * 0.21, base);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = k.land.rock; ctx.lineWidth = 2; ctx.stroke();
      var crater = ctx.createRadialGradient(x + w * 0.008, h * 0.275, 0, x + w * 0.008, h * 0.275, w * 0.12);
      crater.addColorStop(0, rgba(k.land.glow, 0.95));
      crater.addColorStop(0.42, rgba(k.land.glow, 0.34));
      crater.addColorStop(1, rgba(k.land.glow, 0));
      ctx.fillStyle = crater;
      ctx.beginPath(); ctx.arc(x + w * 0.008, h * 0.275, w * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.land.rock;
      ctx.beginPath(); ctx.ellipse(x + w * 0.008, h * 0.26, w * 0.036, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = k.land.glow; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.012, h * 0.28);
      ctx.bezierCurveTo(x + w * 0.09, h * 0.38, x - w * 0.03, h * 0.49, x + w * 0.065, base);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,220,0.24)';
      ctx.beginPath();
      ctx.arc(x - w * 0.012, h * 0.19, w * 0.038, 0, Math.PI * 2);
      ctx.arc(x + w * 0.04, h * 0.15, w * 0.05, 0, Math.PI * 2);
      ctx.arc(x + w * 0.095, h * 0.21, w * 0.032, 0, Math.PI * 2);
      ctx.fill();
    } else if (k.landmark === 'lake') {
      var water = ctx.createRadialGradient(x, h * 0.59, 0, x, h * 0.59, w * 0.2);
      water.addColorStop(0, rgba(k.land.glow, 0.9));
      water.addColorStop(0.55, rgba(k.land.top, 0.8));
      water.addColorStop(1, rgba(k.land.rock, 0.8));
      ctx.fillStyle = water;
      ctx.beginPath(); ctx.ellipse(x, h * 0.59, w * 0.2, h * 0.065, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, h * 0.59, w * 0.15, h * 0.038, 0, 0.2, Math.PI * 1.7); ctx.stroke();
      ctx.globalAlpha = 0.6;
      for (var r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.ellipse(x - w * 0.09 + r * w * 0.075, h * (0.56 + r * 0.025), w * 0.04, h * 0.008, 0, 0, Math.PI * 2);
        ctx.strokeStyle = k.land.glow; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = k.land.top;
      ctx.beginPath(); ctx.ellipse(x - w * 0.07, h * 0.585, w * 0.026, h * 0.009, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w * 0.055, h * 0.61, w * 0.02, h * 0.007, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x - w * 0.064, h * 0.583, w * 0.004, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(k.land.glow, 0.7); ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.12, h * 0.34);
      ctx.bezierCurveTo(x - w * 0.09, h * 0.43, x - w * 0.14, h * 0.5, x - w * 0.105, h * 0.58);
      ctx.stroke();
    } else if (k.landmark === 'mountain') {
      ctx.fillStyle = k.land.near;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.21, base); ctx.lineTo(x - w * 0.095, h * 0.3); ctx.lineTo(x + w * 0.015, base);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - w * 0.02, base); ctx.lineTo(x + w * 0.085, h * 0.38); ctx.lineTo(x + w * 0.205, base);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF7DA';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.128, h * 0.38); ctx.lineTo(x - w * 0.095, h * 0.3); ctx.lineTo(x - w * 0.066, h * 0.39);
      ctx.lineTo(x - w * 0.097, h * 0.36); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.05, h * 0.45); ctx.lineTo(x + w * 0.085, h * 0.38); ctx.lineTo(x + w * 0.125, h * 0.45);
      ctx.lineTo(x + w * 0.085, h * 0.425); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6E4B2F';
      ctx.beginPath(); ctx.ellipse(x + w * 0.015, h * 0.615, w * 0.062, h * 0.018, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(k.land.glow, 0.7);
      ctx.beginPath(); ctx.ellipse(x - w * 0.005, h * 0.611, w * 0.025, h * 0.006, 0, 0, Math.PI * 2); ctx.fill();
      for (var b = 0; b < 4; b++) {
        ctx.strokeStyle = rgba('#FFF1C2', 0.65); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x - w * 0.025 + b * w * 0.02, h * 0.605, w * (0.005 + b * 0.001), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = k.land.top;
      for (var g = 0; g < 5; g++) {
        var gx = x - w * 0.15 + g * w * 0.045;
        ctx.beginPath(); ctx.ellipse(gx, base - 4, w * 0.012, h * 0.009, 0.4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k.landmark === 'cloud') {
      ctx.fillStyle = k.land.far;
      ctx.beginPath(); ctx.ellipse(x, h * 0.49, w * 0.16, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.land.top;
      ctx.beginPath(); ctx.ellipse(x, h * 0.475, w * 0.15, h * 0.02, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.land.rock;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.09, h * 0.49); ctx.lineTo(x + w * 0.06, h * 0.49); ctx.lineTo(x + w * 0.02, h * 0.58); ctx.lineTo(x - w * 0.035, h * 0.56);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.beginPath();
      ctx.arc(x - w * 0.09, h * 0.55, w * 0.05, 0, Math.PI * 2);
      ctx.arc(x - w * 0.03, h * 0.53, w * 0.065, 0, Math.PI * 2);
      ctx.arc(x + w * 0.04, h * 0.56, w * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      for (var c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(x - w * 0.11 + c * w * 0.08, h * 0.36 - c * h * 0.035, w * (0.045 - c * 0.006), 0, Math.PI * 2);
        ctx.arc(x - w * 0.06 + c * w * 0.08, h * 0.345 - c * h * 0.035, w * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
      }
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = k.land.top; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - w * 0.01, h * 0.465); ctx.lineTo(x - w * 0.01, h * 0.39); ctx.stroke();
      ctx.fillStyle = k.land.top;
      ctx.beginPath(); ctx.moveTo(x - w * 0.01, h * 0.39); ctx.lineTo(x + w * 0.035, h * 0.405); ctx.lineTo(x - w * 0.01, h * 0.42); ctx.closePath(); ctx.fill();
    } else if (k.landmark === 'heaven') {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = k.land.glow; ctx.lineWidth = 9;
      for (var ray = 0; ray < 7; ray++) {
        var a = -1.4 + ray * 0.27;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.32);
        ctx.lineTo(x + Math.cos(a) * w * 0.31, h * 0.32 + Math.sin(a) * h * 0.35);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = k.land.near;
      ctx.fillRect(x - w * 0.075, h * 0.34, w * 0.018, h * 0.22);
      ctx.fillRect(x + w * 0.057, h * 0.34, w * 0.018, h * 0.22);
      ctx.strokeStyle = k.land.near; ctx.lineWidth = w * 0.012;
      ctx.beginPath(); ctx.arc(x, h * 0.36, w * 0.077, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = k.land.glow;
      ctx.beginPath(); ctx.arc(x, h * 0.34, w * 0.017, 0, Math.PI * 2); ctx.fill();
      for (var st = 0; st < 3; st++) {
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.beginPath();
        this.roundRect(x - w * (0.09 - st * 0.012), h * (0.56 + st * 0.045), w * (0.18 - st * 0.024), h * 0.018, h * 0.008);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(x - w * 0.16, h * 0.62, w * 0.055, 0, Math.PI * 2);
      ctx.arc(x - w * 0.09, h * 0.635, w * 0.07, 0, Math.PI * 2);
      ctx.arc(x + w * 0.14, h * 0.6, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (k.landmark === 'underworld') {
      ctx.fillStyle = k.land.rock;
      ctx.beginPath();
      ctx.moveTo(-20, base);
      ctx.quadraticCurveTo(w * 0.02, h * 0.36, w * 0.13, h * 0.32);
      ctx.quadraticCurveTo(w * 0.27, h * 0.34, w * 0.36, base);
      ctx.closePath(); ctx.fill();
      var portal = ctx.createRadialGradient(x, h * 0.35, 0, x, h * 0.35, w * 0.14);
      portal.addColorStop(0, rgba(k.land.glow, 0.65));
      portal.addColorStop(0.55, rgba(k.land.top, 0.28));
      portal.addColorStop(1, rgba(k.land.top, 0));
      ctx.fillStyle = portal;
      ctx.beginPath(); ctx.arc(x, h * 0.35, w * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E9D9FF';
      ctx.beginPath(); ctx.arc(x, h * 0.32, w * 0.043, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.land.rock;
      ctx.beginPath(); ctx.arc(x + w * 0.016, h * 0.307, w * 0.04, 0, Math.PI * 2); ctx.fill();
      var crystals = [
        [0.09, 0.38, 0.04], [0.16, 0.42, 0.06], [0.24, 0.4, 0.045], [0.31, 0.48, 0.055]
      ];
      for (var cr = 0; cr < crystals.length; cr++) {
        var q = crystals[cr], cxp = w * q[0], cyp = h * q[1], crh = h * q[2];
        ctx.fillStyle = cr % 2 ? k.land.top : k.land.near;
        ctx.beginPath();
        ctx.moveTo(cxp - w * 0.018, base); ctx.lineTo(cxp, cyp - crh); ctx.lineTo(cxp + w * 0.02, base);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(k.land.glow, 0.5); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.fillStyle = rgba(k.land.glow, 0.65);
      for (var ff = 0; ff < 6; ff++) {
        ctx.beginPath(); ctx.arc(w * (0.05 + ff * 0.05), h * (0.3 + (ff % 3) * 0.07), 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  };

  Arena.prototype.drawScenery = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!this.state) {
      var cx = w * 0.24, cy = h * 0.47;
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#F8E7C2';
      ctx.fillRect(cx - 28, cy - 32, 56, 62);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy - 32); ctx.lineTo(cx, cy - 58); ctx.lineTo(cx + 36, cy - 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E7C58F';
      ctx.fillRect(cx - 5, cy - 4, 10, 34);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8FDD6A';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.58);
      for (var x = 0; x <= w + 100; x += 100) {
        ctx.quadraticCurveTo(x + 50, h * 0.47 + Math.sin(x * 0.01) * 22, x + 100, h * 0.58);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6FCC55';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.67);
      for (var x2 = 0; x2 <= w + 140; x2 += 140) {
        ctx.quadraticCurveTo(x2 + 70, h * 0.56 + Math.sin(x2 * 0.015) * 18, x2 + 140, h * 0.67);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      for (var i = 0; i < 8; i++) {
        var bx = (i * 193 + 60) % w;
        var by = h * 0.60 + (i % 3) * 8;
        var r = 16 + (i % 4) * 6;
        ctx.fillStyle = i % 2 ? '#4FB84C' : '#61C756';
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.arc(bx + r * 0.8, by + 4, r * 0.78, 0, Math.PI * 2);
        ctx.arc(bx - r * 0.8, by + 5, r * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    this.drawValley();
    this.drawSideLandscape('player');
    this.drawSideLandscape('enemy');
  };

  Arena.prototype.drawLanes = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    var startX = w * 0.10, endX = w * 0.90;
    var count = this.state ? this.state.laneCount : 3;
    var pathH = Math.max(count > 3 ? 28 : 34, Math.min(56, h * (count > 3 ? 0.052 : 0.066)));
    var kL = this.sideKingdom('player'), kR = this.sideKingdom('enemy');
    for (var i = 0; i < count; i++) {
      var y = this.laneYs[i];
      var selected = this.state && i === this.selectedLane;
      var top = y + 5, bottom = top + pathH;
      ctx.save();
      ctx.fillStyle = 'rgba(35,55,45,0.18)';
      ctx.beginPath();
      this.roundRect(startX - 10, top + 9, endX - startX + 20, pathH, 14);
      ctx.fill();

      // Chunky little support posts make the lanes read as walkable platforms.
      ctx.fillStyle = 'rgba(58,45,35,0.22)';
      for (var sp = 1; sp <= 3; sp++) {
        var sx = startX + (endX - startX) * (sp / 4);
        ctx.beginPath();
        ctx.moveTo(sx - 5, bottom - 2);
        ctx.lineTo(sx + 5, bottom - 2);
        ctx.lineTo(sx + 9, bottom + 10);
        ctx.lineTo(sx - 9, bottom + 10);
        ctx.closePath(); ctx.fill();
      }

      var face = ctx.createLinearGradient(startX, 0, endX, 0);
      face.addColorStop(0, kL ? kL.platform.face : '#7A4533');
      face.addColorStop(0.28, kL ? kL.platform.lip : '#B56B3D');
      face.addColorStop(0.5, selected ? '#A77E45' : '#8D7045');
      face.addColorStop(0.72, kR ? kR.platform.lip : '#3E7E7A');
      face.addColorStop(1, kR ? kR.platform.face : '#2F616B');
      ctx.fillStyle = face;
      ctx.beginPath();
      this.roundRect(startX, top, endX - startX, pathH, 10);
      ctx.fill();

      var deck = ctx.createLinearGradient(startX, 0, endX, 0);
      deck.addColorStop(0, kL ? kL.platform.top : '#F2B96F');
      deck.addColorStop(0.28, kL ? kL.platform.top : '#F2B96F');
      deck.addColorStop(0.5, '#FFF3C7');
      deck.addColorStop(0.72, kR ? kR.platform.top : '#9BE3C8');
      deck.addColorStop(1, kR ? kR.platform.top : '#9BE3C8');
      ctx.fillStyle = deck;
      ctx.beginPath();
      this.roundRect(startX, top, endX - startX, Math.max(8, pathH * 0.3), 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.33)';
      ctx.beginPath();
      this.roundRect(startX + 2, top + 1, endX - startX - 4, 2, 2);
      ctx.fill();

      // Masonry seams and bolts.
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#4E3829'; ctx.lineWidth = 1;
      for (var bx = startX + 26; bx < endX - 10; bx += 62) {
        ctx.beginPath(); ctx.moveTo(bx, top + 9); ctx.lineTo(bx + 12, bottom - 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(startX + 7, top + pathH * 0.66); ctx.lineTo(endX - 7, top + pathH * 0.66); ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255,239,190,0.75)';
      for (var bolt = 0; bolt < 5; bolt++) {
        ctx.beginPath(); ctx.arc(startX + 22 + bolt * (endX - startX - 44) / 4, top + pathH * 0.62, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // A soft walking guide, still horizontal: no jumping needed.
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = '#5C452E'; ctx.lineWidth = 2;
      for (var d = 0; d < 5; d++) {
        var px = startX + (endX - startX) * (0.18 + d * 0.16);
        ctx.beginPath();
        ctx.moveTo(px - 5, top + pathH * 0.51);
        ctx.lineTo(px + 1, top + pathH * 0.56);
        ctx.lineTo(px - 5, top + pathH * 0.61);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = selected ? 'rgba(255,248,190,0.95)' : 'rgba(72,52,36,0.38)';
      ctx.lineWidth = selected ? 3 : 1.4;
      ctx.beginPath();
      this.roundRect(startX, top, endX - startX, pathH, 10);
      ctx.stroke();
      if (selected) {
        ctx.shadowColor = 'rgba(255,225,100,0.8)';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255,240,154,0.95)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Pennants under each side give the platform a little kingdom territory.
      if (kL && kR) {
        ctx.fillStyle = kL ? LW.ELEMENTS[kL.id].color : '#FF8A4D';
        ctx.beginPath(); ctx.moveTo(startX + 12, bottom - 1); ctx.lineTo(startX + 26, bottom + 13); ctx.lineTo(startX + 40, bottom - 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = kR ? LW.ELEMENTS[kR.id].color : '#27B8E8';
        ctx.beginPath(); ctx.moveTo(endX - 40, bottom - 1); ctx.lineTo(endX - 26, bottom + 13); ctx.lineTo(endX - 12, bottom - 1); ctx.closePath(); ctx.fill();
      }

      // Lane number pad sits at the mouth of the platform.
      ctx.fillStyle = selected ? 'rgba(255,226,111,0.98)' : 'rgba(255,252,236,0.88)';
      ctx.strokeStyle = selected ? '#E0A52F' : 'rgba(87,64,33,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(startX - 34, top + pathH * 0.48, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6A4A22';
      ctx.font = '800 11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), startX - 34, top + pathH * 0.48 + 1);
      ctx.restore();
    }
  };

  Arena.prototype.drawForts = function () {
    var ctx = this.ctx;
    var state = this.state;
    var player = LW.ELEMENTS[state.playerElement];
    var enemy = LW.ELEMENTS[state.enemyElement];
    this.drawFort(0.055, this.baseY, player, state.base.player / state.baseMax.player, true, this.sideKingdom('player'));
    this.drawFort(0.945, this.baseY, enemy, state.base.enemy / state.baseMax.enemy, false, this.sideKingdom('enemy'));
  };

  Arena.prototype.drawFort = function (x, y, element, ratio, player, kingdom) {
    var ctx = this.ctx;
    var s = Math.max(38, Math.min(66, this.w * 0.055));
    ctx.save();
    ctx.translate(x * this.w, y);
    ctx.fillStyle = 'rgba(45,72,45,0.2)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.95, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();

    var bounce = Math.sin(this.time * 2.2 + (player ? 0 : 1.3)) * 2;
    ctx.translate(0, bounce);
    var body = ctx.createLinearGradient(0, -s, 0, s);
    body.addColorStop(0, '#FFFBE9');
    body.addColorStop(0.7, '#FFEBC2');
    body.addColorStop(1, '#E5B975');
    ctx.fillStyle = body;
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.roundRect(-s * 0.62, -s * 0.65, s * 1.24, s * 1.25, s * 0.2);
    ctx.fill(); ctx.stroke();

    // Roof.
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.78, -s * 0.65);
    ctx.quadraticCurveTo(0, -s * 1.35, s * 0.78, -s * 0.65);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = element.dark; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = element.light;
    ctx.beginPath(); ctx.arc(0, -s * 0.93, s * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = element.dark; ctx.lineWidth = 2; ctx.stroke();

    // Door.
    ctx.fillStyle = element.dark;
    ctx.beginPath();
    ctx.arc(0, s * 0.38, s * 0.22, Math.PI, 0);
    ctx.lineTo(s * 0.22, s * 0.6);
    ctx.lineTo(-s * 0.22, s * 0.6);
    ctx.closePath(); ctx.fill();

    // Heart and core health readout.
    var pulse = 0.85 + 0.15 * Math.sin(this.time * 4 + (player ? 0 : 2));
    ctx.save();
    ctx.translate(0, -s * 0.15);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = ratio <= 0.3 ? '#FF7A59' : element.light;
    this.heart(ctx, 0, 0, s * 0.23);
    ctx.restore();
    ctx.fillStyle = element.dark;
    ctx.font = '900 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(ratio * 100) + '% CORE', 0, -s * 1.22);

    // Flag.
    ctx.strokeStyle = '#6C4C24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s * 0.53, -s * 0.38); ctx.lineTo(s * 0.53, -s * 1.04); ctx.stroke();
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.moveTo(s * 0.53, -s * 1.0);
    ctx.lineTo(s * 0.53 + s * 0.36, -s * 0.87);
    ctx.lineTo(s * 0.53, -s * 0.7);
    ctx.closePath(); ctx.fill();

    if (kingdom) {
      var label = kingdom.short.toUpperCase();
      ctx.font = '900 ' + Math.max(7, Math.round(s * 0.14)) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,250,230,0.92)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(label, 0, s * 1.03);
      ctx.fillStyle = element.dark;
      ctx.fillText(label, 0, s * 1.03);
    }
    ctx.restore();
  };

  Arena.prototype.towerMetrics = function () {
    var state = this.state;
    if (!state || !state.tower) return null;
    var cols = state.tower.cols, rows = state.tower.rows;
    var h = this.h, w = this.w;
    var topLimit = Math.max(104, h * 0.145);
    var bottomLimit = h - Math.max(148, h * 0.195);
    var areaH = Math.max(170, bottomLimit - topLimit);
    var cell = Math.floor(Math.min((w * 0.8) / cols, areaH / rows));
    cell = Math.max(16, cell);
    var mw = cell * cols, mh = cell * rows;
    var left = (w - mw) / 2;
    var top = clamp(topLimit + (areaH - mh) / 2, topLimit, bottomLimit - mh);
    return { left: left, top: top, right: left + mw, bottom: top + mh, cell: cell, cols: cols, rows: rows };
  };

  Arena.prototype.towerPoint = function (gx, gy) {
    var m = this.towerRect;
    if (!m) return { x: this.w / 2, y: this.h / 2 };
    return { x: m.left + (gx + 0.5) * m.cell, y: m.top + (gy + 0.5) * m.cell };
  };

  Arena.prototype.towerPadAt = function (clientX, clientY) {
    if (!this.state || this.state.mode !== 'tower' || !this.towerRect) return null;
    var rect = this.canvas.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    var m = this.towerRect;
    var pads = this.state.tower.pads;
    for (var i = 0; i < pads.length; i++) {
      var p = this.towerPoint(pads[i].x, pads[i].y);
      var dx = x - p.x, dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= m.cell * 0.62) return i;
    }
    var gx = Math.floor((x - m.left) / m.cell);
    var gy = Math.floor((y - m.top) / m.cell);
    for (var j = 0; j < pads.length; j++) {
      if (pads[j].x === gx && pads[j].y === gy) return j;
    }
    return null;
  };

  Arena.prototype.drawTowerField = function () {
    var state = this.state;
    if (!state || !state.tower) return;
    var ctx = this.ctx;
    var t = state.tower;
    var m = this.towerMetrics();
    if (!m) return;
    this.towerRect = m;
    var self = this;
    var playerEl = LW.ELEMENTS[state.playerElement];
    var enemyEl = LW.ELEMENTS[state.enemyElement];
    var kL = this.sideKingdom('player') || LW.kingdomFor(state.playerElement);
    var kR = this.sideKingdom('enemy') || LW.kingdomFor(state.enemyElement);
    this.baseY = m.top + m.cell * 0.5;

    ctx.save();
    ctx.shadowColor = 'rgba(28,36,27,0.26)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = 'rgba(46,57,43,0.34)';
    this.roundRect(m.left - 9, m.top - 9, m.right - m.left + 18, m.bottom - m.top + 18, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    var board = ctx.createLinearGradient(m.left, m.top, m.left, m.bottom);
    board.addColorStop(0, '#77825F');
    board.addColorStop(0.52, '#687455');
    board.addColorStop(1, '#59654C');
    ctx.fillStyle = board;
    this.roundRect(m.left - 4, m.top - 4, m.right - m.left + 8, m.bottom - m.top + 8, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,218,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var rim = ctx.createLinearGradient(m.left, 0, m.right, 0);
    rim.addColorStop(0, rgba(kL.land.top, 0.5));
    rim.addColorStop(0.5, 'rgba(255,238,173,0.16)');
    rim.addColorStop(1, rgba(kR.land.top, 0.5));
    ctx.fillStyle = rim;
    this.roundRect(m.left - 4, m.top - 4, m.right - m.left + 8, 4, 2);
    ctx.fill();

    // The siege route is one soft continuous walkway, not a set of tracks.
    function traceRoute() {
      ctx.beginPath();
      for (var r = 0; r < t.path.length; r++) {
        var rp = self.towerPoint(t.path[r].x, t.path[r].y);
        if (r === 0) ctx.moveTo(rp.x, rp.y); else ctx.lineTo(rp.x, rp.y);
      }
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.save();
    ctx.translate(0, Math.max(2, m.cell * 0.06));
    traceRoute();
    ctx.strokeStyle = 'rgba(48,59,44,0.24)';
    ctx.lineWidth = m.cell * 0.84;
    ctx.stroke();
    ctx.restore();
    traceRoute();
    ctx.strokeStyle = '#C6AE7A';
    ctx.lineWidth = m.cell * 0.8;
    ctx.stroke();
    traceRoute();
    ctx.strokeStyle = '#F4E3B8';
    ctx.lineWidth = m.cell * 0.7;
    ctx.stroke();
    traceRoute();
    ctx.strokeStyle = 'rgba(255,252,235,0.5)';
    ctx.lineWidth = Math.max(2, m.cell * 0.26);
    ctx.stroke();

    for (var i = 0; i < t.pads.length; i++) {
      var pad = t.pads[i];
      var pp = this.towerPoint(pad.x, pad.y);
      var radius = m.cell * 0.4;
      if (this.selectedPad === i) {
        var preview = pad.tower || LW.getTowerStats(state.playerElement, this.selectedType);
        if (preview) {
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = rgba(playerEl.light, 0.52);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, preview.range * m.cell, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.fillStyle = 'rgba(42,52,40,0.18)';
      ctx.beginPath(); ctx.ellipse(pp.x, pp.y + 4, radius * 1.06, radius * 0.52, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#D8C79D';
      ctx.strokeStyle = '#A58B59';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#EFE2BF';
      ctx.beginPath(); ctx.arc(pp.x, pp.y, radius * 0.76, 0, Math.PI * 2); ctx.fill();
      if (!pad.tower) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(122,101,60,0.42)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(pp.x, pp.y, radius * 0.52, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#8A744D';
        ctx.font = '900 ' + Math.max(9, Math.round(m.cell * 0.2)) + 'px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', pp.x, pp.y + 1);
      } else {
        this.drawTowerSpire(pad, playerEl, this.selectedPad === i);
      }
    }

    // Built towers always show their reach; the selected pad shows its whole coverage.
    for (var r = 0; r < t.pads.length; r++) {
      var rp = t.pads[r];
      if (!rp.tower) continue;
      var rpPoint = this.towerPoint(rp.x, rp.y);
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = rgba(playerEl.light, this.selectedPad === r ? 0.5 : 0.22);
      ctx.lineWidth = this.selectedPad === r ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.arc(rpPoint.x, rpPoint.y, rp.tower.range * m.cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    var selected = t.pads[this.selectedPad];
    var previewStats = selected && selected.tower ? selected.tower : LW.getTowerStats(state.playerElement, this.selectedType);
    if (selected && previewStats) {
      ctx.save();
      ctx.fillStyle = rgba(playerEl.light, 0.4);
      for (var cov = 0; cov < t.path.length; cov++) {
        var cp = t.path[cov];
        var dx = cp.x - selected.x, dy = cp.y - selected.y;
        if (Math.sqrt(dx * dx + dy * dy) > previewStats.range) continue;
        var covPoint = this.towerPoint(cp.x, cp.y);
        ctx.beginPath();
        ctx.arc(covPoint.x, covPoint.y, Math.max(2, m.cell * 0.09), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this.drawTowerPortal(t.path[0], enemyEl);
    this.drawTowerCore(t.path[t.path.length - 1], playerEl, state.base.player / state.baseMax.player);
    ctx.restore();
  };

  Arena.prototype.drawTowerSpire = function (pad, element, selected) {
    var m = this.towerRect;
    if (!m) return;
    var tower = pad.tower;
    var ctx = this.ctx;
    var p = this.towerPoint(pad.x, pad.y);
    var s = m.cell;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(35,45,35,0.22)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.32, s * 0.28, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    var body = ctx.createLinearGradient(0, -s * 0.55, 0, s * 0.3);
    body.addColorStop(0, element.light);
    body.addColorStop(0.55, element.color);
    body.addColorStop(1, element.dark);
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = Math.max(1.2, s * 0.035);
    if (tower.type === 'chonk') {
      ctx.fillStyle = body;
      this.roundRect(-s * 0.3, -s * 0.06, s * 0.6, s * 0.34, s * 0.07);
      ctx.fill(); ctx.stroke();
      for (var c = 0; c < 3; c++) {
        this.roundRect(-s * 0.3 + c * s * 0.2, -s * 0.18, s * 0.14, s * 0.14, s * 0.03);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = element.light;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.17, s * 0.12, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    } else if (tower.type === 'zap') {
      ctx.fillStyle = '#F9EBC6';
      this.roundRect(-s * 0.12, -s * 0.34, s * 0.24, s * 0.6, s * 0.06);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = element.light;
      ctx.lineWidth = Math.max(1, s * 0.038);
      for (var ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(0, -s * (0.28 - ring * 0.12), s * 0.16, s * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = element.light;
      ctx.beginPath(); ctx.arc(0, -s * 0.38, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(element.light, 0.72);
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(0, -s * 0.38, s * 0.14, 0.3, Math.PI * 1.3); ctx.stroke();
    } else {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.52);
      ctx.lineTo(s * 0.2, s * 0.28);
      ctx.lineTo(-s * 0.2, s * 0.28);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = element.light;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.09, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(element.light, 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    ctx.fillStyle = '#F3E3BC';
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = 1.2;
    this.roundRect(-s * 0.24, s * 0.2, s * 0.48, s * 0.1, s * 0.04);
    ctx.fill(); ctx.stroke();
    for (var lv = 0; lv < 3; lv++) {
      ctx.fillStyle = lv < tower.level ? element.light : 'rgba(70,80,60,0.22)';
      ctx.beginPath(); ctx.arc((lv - 1) * s * 0.11, s * 0.25, s * 0.028, 0, Math.PI * 2); ctx.fill();
    }
    // Module badge: which upgrade this tower took, readable from the board.
    if (tower.module && LW.TOWER_MODULES) {
      var mod = LW.TOWER_MODULES[tower.module];
      ctx.fillStyle = 'rgba(255,252,240,0.94)';
      ctx.strokeStyle = mod ? mod.color : '#FFE156';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.round(Math.max(9, s * 0.16)) + 'px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#3C3222';
      ctx.fillText(mod ? mod.icon : '★', 0, -s * 0.715);
    }
    if (selected) {
      ctx.strokeStyle = 'rgba(255,244,170,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, s * 0.04, s * 0.42, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  Arena.prototype.drawTowerPortal = function (cell, element) {
    var m = this.towerRect;
    if (!m) return;
    var ctx = this.ctx;
    var p = this.towerPoint(cell.x, cell.y);
    var s = m.cell;
    ctx.save();
    ctx.translate(p.x, p.y);
    var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.72);
    glow.addColorStop(0, rgba(element.light, 0.56));
    glow.addColorStop(1, rgba(element.light, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(44,32,54,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath(); ctx.arc(0, 0, s * 0.27, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(element.light, 0.8);
    ctx.lineWidth = 1.4;
    for (var r = 0; r < 3; r++) {
      var spin = this.time * (1.1 + r * 0.4) + r * 1.9;
      ctx.beginPath();
      ctx.arc(0, 0, s * (0.13 + r * 0.04), spin, spin + Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,248,230,0.8)';
    ctx.font = '900 ' + Math.max(5, Math.round(s * 0.09)) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIEGE', 0, s * 0.44);
    ctx.restore();
  };

  Arena.prototype.drawTowerCore = function (cell, element, ratio) {
    var m = this.towerRect;
    if (!m) return;
    var ctx = this.ctx;
    var p = this.towerPoint(cell.x, cell.y);
    var s = m.cell;
    var pulse = 0.86 + 0.14 * Math.sin(this.time * 3.2);
    ctx.save();
    ctx.translate(p.x, p.y);
    var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.92);
    glow.addColorStop(0, rgba(element.light, 0.5));
    glow.addColorStop(1, rgba(element.light, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(74,64,44,0.3)';
    ctx.lineWidth = Math.max(3, s * 0.075);
    ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ratio <= 0.3 ? '#FF8A6A' : element.color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(ratio, 0, 1));
    ctx.stroke();
    ctx.fillStyle = '#FFF6DF';
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = 1.6;
    this.roundRect(-s * 0.2, -s * 0.15, s * 0.4, s * 0.33, s * 0.06);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, -s * 0.15);
    ctx.lineTo(0, -s * 0.31);
    ctx.lineTo(s * 0.24, -s * 0.15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.translate(0, 0);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = element.light;
    this.heart(ctx, 0, 0, s * 0.09);
    ctx.restore();
    ctx.fillStyle = element.dark;
    ctx.font = '900 ' + Math.max(6, Math.round(s * 0.1)) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CORE', 0, s * 0.34);
    ctx.restore();
  };

  Arena.prototype.drawTowerUnits = function () {
    var state = this.state;
    if (!state || !state.tower || !this.towerRect) return;
    var m = this.towerRect, ctx = this.ctx;
    var units = state.units.slice().sort(function (a, b) {
      return (a.pathIndex + (a.pathT || 0)) - (b.pathIndex + (b.pathT || 0));
    });
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var pos = LW.towerUnitPosition ? LW.towerUnitPosition(u) : { x: u.pathIndex || 0, y: 0 };
      var p = this.towerPoint(pos.x, pos.y);
      var s = Math.max(9, m.cell * 0.27);
      if (u.type === 'chonk') s *= 1.3;
      if (u.type === 'zap') s *= 0.92;
      if (u.boss) s *= 1.35;
      var floorY = p.y + m.cell * 0.2;
      var hop = Math.sin(this.time * (u.type === 'zap' ? 8 : 6) + u.id) * (u.stun > 0 ? 0.8 : 2.2);
      if (u.kind === 'shielder') {
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.05 * Math.sin(this.time * 3 + u.id);
        ctx.fillStyle = LW.ELEMENTS[u.element].light;
        ctx.beginPath(); ctx.arc(p.x, floorY - s * 0.6, m.cell * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = 'rgba(40,52,40,0.22)';
      ctx.beginPath(); ctx.ellipse(p.x, floorY, s * 0.6, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(p.x, floorY - s * 0.85 + hop);
      if (u.side !== 'player') ctx.scale(-1, 1);
      this.drawBlobBody(s * (u.side === 'player' ? 0.85 : 1), u.type, LW.ELEMENTS[u.element], u.hitFlash > 0, u.stun > 0);
      ctx.restore();
      var bw = Math.max(12, s * 1.55);
      if (u.hp < u.maxHp) {
        ctx.fillStyle = 'rgba(45,52,42,0.36)';
        ctx.beginPath(); this.roundRect(p.x - bw / 2, floorY - s * 1.55, bw, 4, 2); ctx.fill();
        ctx.fillStyle = u.side === 'player' ? '#65D45B' : '#FF8A6A';
        ctx.beginPath(); this.roundRect(p.x - bw / 2, floorY - s * 1.55, bw * clamp(u.hp / u.maxHp, 0, 1), 4, 2); ctx.fill();
      }
      if (u.kind === 'brute' || u.boss) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.strokeStyle = '#DCE3D0';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p.x, floorY - s * 0.95, s * 0.95, 0, Math.PI * 2); ctx.stroke();
      }
      if (u.kind === 'shielder') {
        ctx.fillStyle = '#E8DBFF';
        this.star(ctx, p.x + s * 0.5, floorY - s * 1.35, 4, 4);
      }
      if (u.boss) {
        ctx.fillStyle = '#FFE56A';
        this.star(ctx, p.x, floorY - s * 1.9, 6, 5);
        ctx.textAlign = 'center';
        ctx.font = '900 9px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(52,30,20,0.7)';
        ctx.lineWidth = 3;
        var bossName = u.name || 'SIEGE TITAN';
        ctx.strokeText(bossName.toUpperCase(), p.x, floorY - s * 2.15);
        ctx.fillStyle = '#FFD3C4';
        ctx.fillText(bossName.toUpperCase(), p.x, floorY - s * 2.15);
      }
    }
  };

  Arena.prototype.drawTowerEffects = function (state) {
    var ctx = this.ctx;
    var m = this.towerRect;
    if (!m) return;
    var self = this;
    state.effects.forEach(function (e) {
      var p = clamp(e.life / (e.maxLife || 0.5), 0, 1);
      ctx.save();
      ctx.globalAlpha = p;
      if (e.kind === 'towerWave') {
        var midX = (m.left + m.right) / 2;
        var by = m.top + m.cell * 0.58;
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.round(Math.min(40, m.cell * 0.62)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(64,42,22,0.5)'; ctx.lineWidth = 6;
        ctx.strokeText(e.text, midX, by);
        ctx.fillStyle = e.color || '#FFE156';
        ctx.fillText(e.text, midX, by);
        ctx.font = '900 ' + Math.round(Math.min(13, m.cell * 0.2)) + 'px "Trebuchet MS", sans-serif';
        ctx.fillStyle = 'rgba(255,252,232,0.92)';
        ctx.fillText('SIEGE INCOMING', midX, by + m.cell * 0.3);
      } else if (e.kind === 'towerBuild' || e.kind === 'towerUpgrade') {
        var bp = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 3 * p + 1;
        ctx.beginPath(); ctx.arc(bp.x, bp.y, (1 - p) * m.cell * 0.7 + 8, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = e.color || '#FFE77A';
        self.star(ctx, bp.x, bp.y - m.cell * 0.42, (1 - p) * 10 + 3, 5);
      } else if (e.kind === 'towerSpawn') {
        var sp = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 2 + 2 * p;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, (1 - p) * m.cell * 0.5 + 4, 0, Math.PI * 2); ctx.stroke();
      } else if (e.kind === 'towerShot') {
        var fp = self.towerPoint(e.fromGx, e.fromGy);
        var tp = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFF2A8';
        ctx.lineWidth = e.towerType === 'chonk' ? 4 : 2.4;
        ctx.beginPath(); ctx.moveTo(fp.x, fp.y - m.cell * 0.32); ctx.lineTo(tp.x, tp.y); ctx.stroke();
        if (e.towerType === 'chonk') {
          ctx.globalAlpha = p * 0.45;
          ctx.fillStyle = e.color || '#FFD166';
          ctx.beginPath(); ctx.arc(tp.x, tp.y, m.cell * 0.38, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = p;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 3.4, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'towerChain') {
        var cf = self.towerPoint(e.fromGx, e.fromGy);
        var ct = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFF2A8';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(cf.x, cf.y);
        for (var j = 1; j <= 4; j++) {
          var q = j / 4;
          ctx.lineTo(cf.x + (ct.x - cf.x) * q + (j % 2 ? 1 : -1) * m.cell * 0.07, cf.y + (ct.y - cf.y) * q);
        }
        ctx.lineTo(ct.x, ct.y);
        ctx.stroke();
      } else if (e.kind === 'towerHit') {
        var hp = self.towerPoint(e.gx, e.gy);
        ctx.fillStyle = e.color || '#FFE77A';
        self.star(ctx, hp.x, hp.y, 6 + (1 - p) * 10, 6);
      } else if (e.kind === 'towerPoof') {
        var pp = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 2.4 * p + 0.5;
        ctx.beginPath(); ctx.arc(pp.x, pp.y, (1 - p) * m.cell * 0.55 + 4, 0, Math.PI * 2); ctx.stroke();
        if (e.boss) {
          ctx.fillStyle = e.color || '#FFE77A';
          self.star(ctx, pp.x, pp.y - m.cell * 0.3, 8, 7);
        }
      } else if (e.kind === 'towerSpark') {
        var sparkPoint = self.towerPoint(e.gx, e.gy);
        ctx.fillStyle = e.color || '#FFE156';
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.max(10, Math.round(m.cell * 0.2)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(56,40,18,0.55)';
        ctx.lineWidth = 3;
        ctx.strokeText(e.text || '+1⚡', sparkPoint.x, sparkPoint.y - m.cell * 0.55 - (1 - p) * 22);
        ctx.fillText(e.text || '+1⚡', sparkPoint.x, sparkPoint.y - m.cell * 0.55 - (1 - p) * 22);
      } else if (e.kind === 'towerLeak') {
        var lp = self.towerPoint(e.gx, e.gy);
        ctx.strokeStyle = 'rgba(255,110,90,0.95)';
        ctx.lineWidth = 4 * p + 1;
        ctx.beginPath(); ctx.arc(lp.x, lp.y, (1 - p) * m.cell * 1.1 + 10, 0, Math.PI * 2); ctx.stroke();
        if (e.amount) {
          ctx.fillStyle = '#FFB0A0';
          ctx.font = '900 12px "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('-' + e.amount, lp.x, lp.y - m.cell * 0.58 - (1 - p) * 16);
        }
      } else if (e.kind === 'towerHeal' || e.kind === 'towerSiphon') {
        var gp = self.towerPoint(e.gx, e.gy);
        if (e.kind === 'towerHeal') {
          ctx.fillStyle = e.color || '#C8F59C';
          ctx.fillRect(gp.x - 8, gp.y - 30, 16, 5);
          ctx.fillRect(gp.x - 2.5, gp.y - 36, 5, 16);
        }
        ctx.strokeStyle = e.color || '#D8C2FF';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gp.x, gp.y, (1 - p) * m.cell * 0.8 + 6, 0, Math.PI * 2); ctx.stroke();
      } else if (e.kind === 'towerSnare') {
        ctx.strokeStyle = e.color || '#C8F59C';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc((m.left + m.right) / 2, (m.top + m.bottom) / 2, (1 - p) * m.cell * 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === 'towerGust') {
        ctx.strokeStyle = e.color || '#E9F8FF';
        ctx.lineWidth = 3;
        for (var g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.arc(m.left + m.cell * 2, m.top + m.cell * (1.4 + g * 1.4), (1 - p) * m.cell * 1.4 + 12, 0.4, Math.PI * 1.5);
          ctx.stroke();
        }
      } else if (e.kind === 'towerMeteor') {
        var mx = m.left + m.cell * 7;
        var my = m.top + m.cell * 3.2;
        ctx.fillStyle = e.color || '#FFD166';
        self.star(ctx, mx, my, 10 + (1 - p) * 10, 6);
        ctx.strokeStyle = e.color || '#FFD166';
        ctx.lineWidth = 6 * p;
        ctx.beginPath(); ctx.moveTo(mx - m.cell * 0.5, my - m.cell * 0.5); ctx.lineTo(mx, my); ctx.stroke();
      } else if (e.kind === 'towerBeam') {
        ctx.strokeStyle = e.color || '#FFF6B8';
        ctx.lineWidth = 2 + 4 * p;
        ctx.beginPath(); ctx.moveTo(m.left, m.top + m.cell * 2); ctx.lineTo(m.right, m.top + m.cell * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.left, m.top + m.cell * 5); ctx.lineTo(m.right, m.top + m.cell * 5); ctx.stroke();
      }
      ctx.restore();
    });
  };

  Arena.prototype.drawMaze = function () {
    var state = this.state;
    if (!state || !state.maze) return;
    var maze = state.maze;
    var ctx = this.ctx, w = this.w, h = this.h;
    var kL = this.sideKingdom('player') || LW.kingdomFor(state.playerElement);
    var kR = this.sideKingdom('enemy') || LW.kingdomFor(state.enemyElement);
    var topLimit = Math.max(112, h * 0.15);
    var bottomLimit = h - Math.max(150, h * 0.2);
    var areaH = Math.max(170, bottomLimit - topLimit);
    var areaW = w * 0.64;
    var cell = Math.floor(Math.min(areaW / maze.cols, areaH / maze.rows));
    cell = Math.max(10, cell);
    var mw = cell * maze.cols, mh = cell * maze.rows;
    var left = (w - mw) / 2;
    var centerY = clamp(h * 0.47, topLimit + mh / 2, bottomLimit - mh / 2);
    var top = centerY - mh / 2;
    this.mazeRect = { left: left, top: top, right: left + mw, bottom: top + mh, cell: cell, centerY: centerY };
    this.mazeGateOffset = Math.max(24, cell * 0.72);
    this.baseY = centerY;

    ctx.save();
    // A muted board gives the maze depth without turning the scene harsh.
    ctx.shadowColor = 'rgba(28,36,27,0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(48,58,45,0.24)';
    ctx.beginPath();
    this.roundRect(left - 13, top - 11, mw + 26, mh + 24, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    var board = ctx.createLinearGradient(left, top, left, top + mh);
    board.addColorStop(0, '#69725F');
    board.addColorStop(0.52, '#5B6654');
    board.addColorStop(1, '#4C584B');
    ctx.fillStyle = board;
    ctx.beginPath();
    this.roundRect(left - 4, top - 4, mw + 8, mh + 8, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,218,0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    var rim = ctx.createLinearGradient(left, 0, left + mw, 0);
    rim.addColorStop(0, rgba(kL.land.top, 0.45));
    rim.addColorStop(0.5, 'rgba(255,238,173,0.12)');
    rim.addColorStop(1, rgba(kR.land.top, 0.45));
    ctx.fillStyle = rim;
    ctx.beginPath();
    this.roundRect(left - 4, top - 4, mw + 8, 4, 2);
    ctx.fill();

    var wall = ctx.createLinearGradient(left, top, left, top + mh);
    wall.addColorStop(0, '#7C7E63');
    wall.addColorStop(0.48, '#68715B');
    wall.addColorStop(1, '#586351');
    var deck = ctx.createLinearGradient(left, 0, left + mw, 0);
    deck.addColorStop(0, '#F7D9A5');
    deck.addColorStop(0.28, '#FBE9C4');
    deck.addColorStop(0.5, '#FFF6E1');
    deck.addColorStop(0.72, '#F2F5DD');
    deck.addColorStop(1, '#DCEAD6');
    var shiftAge = state.elapsed - (maze.lastShift || -999);
    var shifting = shiftAge >= 0 && shiftAge < 1.1;

    // The closed cells become chunky, shifting garden walls.
    for (var y = 0; y < maze.rows; y++) {
      for (var x = 0; x < maze.cols; x++) {
        if (LW.mazeCellOpen(maze, x, y)) continue;
        var wx = left + x * cell + 1;
        var wy = top + y * cell + 1;
        var pop = shifting ? Math.sin(clamp(shiftAge / 1.1, 0, 1) * Math.PI) * 2 : 0;
        ctx.fillStyle = 'rgba(42,51,40,0.12)';
        ctx.beginPath();
        this.roundRect(wx + 2, wy + 4 - pop, cell - 2, cell - 2 + pop, Math.max(3, cell * 0.12));
        ctx.fill();
        ctx.fillStyle = wall;
        ctx.strokeStyle = 'rgba(84,88,68,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.roundRect(wx, wy - pop, cell - 2, cell - 2 + pop, Math.max(3, cell * 0.12));
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = shifting ? 'rgba(255,236,155,0.28)' : 'rgba(185,207,153,0.16)';
        ctx.beginPath();
        this.roundRect(wx + 2, wy - pop + 2, cell - 6, Math.max(3, cell * 0.15), 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(79,82,64,0.08)';
        ctx.fillRect(wx + 3, wy - pop + Math.max(8, cell * 0.3), cell - 8, 1.5);
      }
    }

    // Open cells are raised platform tiles. Adjacent tiles make winding walkways.
    for (var oy = 0; oy < maze.rows; oy++) {
      for (var ox = 0; ox < maze.cols; ox++) {
        if (!LW.mazeCellOpen(maze, ox, oy)) continue;
        var px = left + ox * cell + 0.5;
        var py = top + oy * cell + 0.5;
        ctx.fillStyle = deck;
        ctx.strokeStyle = 'rgba(255,251,234,0.45)';
        ctx.lineWidth = Math.max(1, cell * 0.032);
        ctx.beginPath();
        this.roundRect(px, py, cell - 1, cell - 1, Math.max(3, cell * 0.1));
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(139,98,49,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.roundRect(px + 2, py + 2, cell - 5, cell - 5, Math.max(2, cell * 0.08));
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        this.roundRect(px + 3, py + 3, cell - 7, Math.max(2, cell * 0.1), 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(117,75,26,0.06)';
        ctx.fillRect(px + 3, py + cell - 6, cell - 7, 3);
      }
    }

    var playerEl = LW.ELEMENTS[state.playerElement];
    var enemyEl = LW.ELEMENTS[state.enemyElement];

    // A dotted golden breadcrumb shows the live route from your gate to the exit,
    // and re-draws itself every time the walls move.
    if (maze.playerPath && maze.playerPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,213,92,0.9)';
      ctx.lineWidth = Math.max(2, cell * 0.13);
      ctx.lineCap = 'round';
      ctx.setLineDash([Math.max(3, cell * 0.22), Math.max(3, cell * 0.2)]);
      ctx.beginPath();
      for (var pIdx = 0; pIdx < maze.playerPath.length; pIdx++) {
        var pp = this.mazePoint(maze.playerPath[pIdx].x, maze.playerPath[pIdx].y);
        if (pIdx === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    this.drawMazePortal(maze.home.x, maze.home.y, playerEl, true);
    this.drawMazePortal(maze.foe.x, maze.foe.y, enemyEl, false);

    // Three seconds before a shift the board pulses, so nobody is ambushed by a wall.
    if (maze.warning) {
      var warnPulse = 0.5 + 0.5 * Math.sin(this.time * 8);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,92,' + (0.25 + warnPulse * 0.45) + ')';
      ctx.lineWidth = 3 + warnPulse * 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      this.roundRect(left - 8, top - 8, mw + 16, mh + 16, 16);
      ctx.stroke();
      ctx.restore();
    }

    // A soft moving shimmer tells players where the walls just rearranged.
    if (shifting) {
      ctx.globalAlpha = 0.1 + Math.sin(clamp(shiftAge / 1.1, 0, 1) * Math.PI) * 0.12;
      ctx.strokeStyle = 'rgba(255,245,196,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.roundRect(left - 4, top - 4, mw + 8, mh + 8, 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  Arena.prototype.drawMazePortal = function (gx, gy, element, player) {
    var p = this.mazePoint(gx, gy);
    var cell = this.mazeRect ? this.mazeRect.cell : 32;
    var ctx = this.ctx;
    var pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + (player ? 0 : 1));
    ctx.save();
    ctx.translate(p.x, p.y);
    var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, cell * 0.75);
    glow.addColorStop(0, rgba(element.light, 0.66));
    glow.addColorStop(1, rgba(element.light, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, cell * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = Math.max(2, cell * 0.09);
    ctx.beginPath();
    ctx.arc(0, cell * 0.05, cell * 0.27, Math.PI, 0);
    ctx.lineTo(cell * 0.27, cell * 0.34);
    ctx.lineTo(-cell * 0.27, cell * 0.34);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,248,223,0.82)';
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.arc(0, cell * 0.06, cell * 0.17 + pulse * 1.5, Math.PI, 0);
    ctx.lineTo(cell * 0.17, cell * 0.32);
    ctx.lineTo(-cell * 0.17, cell * 0.32);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  Arena.prototype.drawMazeGates = function () {
    var state = this.state;
    if (!state || !state.gates || !this.mazeRect) return;
    var playerEl = LW.ELEMENTS[state.playerElement];
    var enemyEl = LW.ELEMENTS[state.enemyElement];
    var pg = this.mazeGatePoint('player');
    var eg = this.mazeGatePoint('enemy');
    this.drawGatehouse(pg.x, pg.y, playerEl, state.gates.player[0], true);
    this.drawGatehouse(eg.x, eg.y, enemyEl, state.gates.enemy[0], false);
  };

  Arena.prototype.drawMazePreview = function () {
    var state = this.state;
    if (!state || !state.maze || state.paused || state.result) return;
    var p = this.mazePoint(state.maze.home.x, state.maze.home.y);
    var el = LW.ELEMENTS[state.playerElement];
    var info = LW.getStats(state.playerElement, this.selectedType);
    if (!info) return;
    var cell = this.mazeRect ? this.mazeRect.cell : 30;
    var bob = Math.sin(this.time * 4) * 3;
    var s = Math.max(7, Math.min(22, cell * 0.34));
    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(p.x, p.y + cell * 0.18 - s * 0.85 + bob);
    this.drawBlobBody(s, this.selectedType, el, false, 0);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#6B4B22';
    ctx.font = '900 ' + Math.max(7, Math.round(cell * 0.2)) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    if (cell >= 18) ctx.fillText('TAP MAZE', p.x, p.y + cell * 0.72);
    ctx.restore();
  };

  Arena.prototype.drawMazeUnits = function () {
    var state = this.state;
    if (!state || !state.maze || !this.mazeRect) return;
    var m = this.mazeRect;
    var ctx = this.ctx;
    var units = state.units.slice().sort(function (a, b) { return b.gy - a.gy; });
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var el = LW.ELEMENTS[u.element];
      var nx = u.nx === undefined || u.nx === null ? u.gx : u.nx;
      var ny = u.ny === undefined || u.ny === null ? u.gy : u.ny;
      var t = u.mt || 0;
      var px = m.left + (u.gx + (nx - u.gx) * t + 0.5) * m.cell;
      var floorY = m.top + (u.gy + (ny - u.gy) * t + 0.5) * m.cell + m.cell * 0.2;
      var moving = t > 0;
      var hop = Math.sin(this.time * (u.shape === 'zap' ? 9 : 7) + u.id) * (moving ? 3 : 1.2);
      var breathe = 1 + Math.sin(this.time * 5 + u.id) * 0.025;
      var spawn = u.age < 0.34 ? 0.45 + easeOut(u.age / 0.34) * 0.55 : 1;
      var s = Math.max(7, Math.min(25, m.cell * 0.4));
      if (u.type === 'chonk') s *= 1.28;
      if (u.type === 'zap') s *= 0.9;
      s *= spawn * breathe;

      ctx.save();
      ctx.fillStyle = 'rgba(50,74,45,0.22)';
      ctx.beginPath(); ctx.ellipse(px, floorY + 1, s * 0.62, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(px, floorY - s * 0.85 + hop);
      if (u.side === 'enemy') ctx.scale(-1, 1);
      this.drawBlobBody(s, u.type, el, u.hitFlash > 0, u.stun > 0);
      ctx.restore();

      if (u.hp < u.maxHp) {
        var bw = Math.max(12, s * 1.55);
        ctx.fillStyle = 'rgba(45,52,42,0.36)';
        ctx.beginPath(); this.roundRect(px - bw / 2, floorY - s * 1.65, bw, 4, 2); ctx.fill();
        ctx.fillStyle = u.side === 'player' ? '#65D45B' : '#FF8A6A';
        ctx.beginPath(); this.roundRect(px - bw / 2, floorY - s * 1.65, bw * clamp(u.hp / u.maxHp, 0, 1), 4, 2); ctx.fill();
      }
    }
  };

  // The web: strand ropes between hubs, then each hub as a small tower.
  Arena.prototype.drawClashTowers = function () {
    var state = this.state;
    if (!state || !state.clash) return;
    var ctx = this.ctx;
    var towers = state.clash.towers;
    var self = this;
    var northTargetId = LW.clashRouteTarget ? LW.clashRouteTarget(state, 'player', 'north') : null;
    var southTargetId = LW.clashRouteTarget ? LW.clashRouteTarget(state, 'player', 'south') : null;
    (state.clash.strands || []).forEach(function (pair) {
      var a = towers[pair[0]], b = towers[pair[1]];
      if (!a || !b) return;
      var ax = self.mapX(a.x), ay = self.laneYAt(a.laneIndex) + 8;
      var bx = self.mapX(b.x), by = self.laneYAt(b.laneIndex) + 8;
      ctx.strokeStyle = 'rgba(62,52,36,0.26)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ax, ay + 6); ctx.lineTo(bx, by + 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,228,0.78)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay + 6); ctx.lineTo(bx, by + 6); ctx.stroke();
      ctx.setLineDash([]);
    });

    towers.forEach(function (tower) {
      if (tower.kind === 'keep') return;
      var x = self.mapX(tower.x);
      var y = self.laneYAt(tower.laneIndex) + 6;
      var ownerEl = tower.owner === 'neutral' ? null : LW.ELEMENTS[tower.owner === 'player' ? state.playerElement : state.enemyElement];
      var color = ownerEl ? ownerEl.color : '#B9AD8C';
      var dark = ownerEl ? ownerEl.dark : '#6E6248';
      var light = ownerEl ? ownerEl.light : '#F1E6C8';
      var master = tower.kind === 'master';
      var s = master ? 22 : 17;

      ctx.save();
      if (ownerEl) {
        ctx.globalAlpha = 0.12 + 0.05 * Math.sin(self.time * 2 + tower.id);
        ctx.fillStyle = light;
        ctx.beginPath(); ctx.arc(x, y, s * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      var northTag = tower.id === northTargetId;
      var southTag = tower.id === southTargetId;
      if (northTag || southTag) {
        var pulse = 0.5 + 0.5 * Math.sin(self.time * 4);
        if (northTag) {
          ctx.strokeStyle = 'rgba(255,206,63,' + (0.62 + 0.3 * pulse) + ')';
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(x, y + s * 0.1, s * 2.05 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        }
        if (southTag) {
          ctx.strokeStyle = 'rgba(92,214,232,' + (0.58 + 0.28 * pulse) + ')';
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(x, y + s * 0.1, s * 2.05 + (northTag ? 7 : 0) + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(44,63,42,0.18)';
      ctx.beginPath(); ctx.ellipse(x, y + 16, s * 1.4, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(82,67,44,0.30)';
      self.roundRect(x - s * 0.95, y + 1, s * 1.9, 14, 5); ctx.fill();

      var body = ctx.createLinearGradient(x, y - s * 2.1, x, y + 4);
      body.addColorStop(0, '#FFF9E9');
      body.addColorStop(0.66, light);
      body.addColorStop(1, '#D9BE8B');
      ctx.fillStyle = body;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.3;
      self.roundRect(x - s * 0.6, y - s * 1.9, s * 1.2, s * 2.15, s * 0.2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      self.roundRect(x - s * 0.66, y - s * 0.9, s * 1.32, s * 0.28, s * 0.08); ctx.fill();
      ctx.fillStyle = '#FFF4D2';
      for (var c = 0; c < 3; c++) ctx.fillRect(x - s * 0.5 + c * s * 0.44, y - s * 2.12, s * 0.24, s * 0.32);
      if (master) {
        ctx.fillStyle = '#FFD75C'; ctx.strokeStyle = '#B77A1E'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.44, y - s * 2.16);
        ctx.lineTo(x - s * 0.26, y - s * 2.56);
        ctx.lineTo(x - s * 0.05, y - s * 2.24);
        ctx.lineTo(x + s * 0.14, y - s * 2.6);
        ctx.lineTo(x + s * 0.3, y - s * 2.24);
        ctx.lineTo(x + s * 0.46, y - s * 2.54);
        ctx.lineTo(x + s * 0.46, y - s * 2.08);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      var ownerLabel = tower.owner === 'player' ? 'YOURS' : tower.owner === 'enemy' ? 'ENEMY' : 'NEUTRAL';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.font = '900 7.5px "Trebuchet MS", sans-serif';
      ctx.strokeStyle = 'rgba(255,250,230,0.94)'; ctx.lineWidth = 3;
      var label = tower.name;
      ctx.strokeText(label, x, y - s * 2.95);
      ctx.fillStyle = ownerEl ? dark : '#7E6C4C';
      ctx.fillText(label, x, y - s * 2.95);
      ctx.font = '900 6.5px "Trebuchet MS", sans-serif';
      ctx.strokeText(ownerLabel, x, y + s * 1.25);
      ctx.fillText(ownerLabel, x, y + s * 1.25);
      if (northTag || southTag) {
        var tagY = y - s * 2.95 - 13;
        var tagXs = northTag && southTag ? [x - 12, x + 12] : [x];
        tagXs.forEach(function (tagX, index) {
          var isSouth = northTag && southTag ? index === 1 : southTag;
          ctx.fillStyle = isSouth ? '#69D8E8' : '#FFD24A';
          ctx.strokeStyle = isSouth ? '#155968' : '#7A4B00';
          ctx.lineWidth = 1.5;
          self.roundRect(tagX - 10, tagY - 7, 20, 14, 7);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#263A2B';
          ctx.font = '900 8px "Trebuchet MS", sans-serif';
          ctx.fillText(isSouth ? 'S' : 'N', tagX, tagY + 0.5);
        });
      }

      var bw = s * 2.6, by = y - s * 2.72;
      ctx.fillStyle = 'rgba(44,53,38,0.36)';
      self.roundRect(x - bw / 2, by, bw, 4, 2); ctx.fill();
      ctx.fillStyle = tower.owner === 'player' ? '#65D45B' : tower.owner === 'enemy' ? '#FF8A6A' : '#D8CA9B';
      self.roundRect(x - bw / 2, by, bw * clamp(tower.hp / tower.max, 0, 1), 4, 2); ctx.fill();

      if (master && tower.owner !== 'player') {
        ctx.font = '900 7px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(255,250,230,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText('OPENS THE KEEP', x, y + s * 1.95);
        ctx.fillStyle = '#7E4B2C';
        ctx.fillText('OPENS THE KEEP', x, y + s * 1.95);
      }
      ctx.restore();
    });

    // Both rails are drawn so the choice is visible before tapping.
    function drawRoute(routeName, targetId, color, selected) {
      if (!LW.clashRouteSpawnHub || !LW.clashPath || targetId === null || !towers[targetId]) return;
      var launch = LW.clashRouteSpawnHub(state, 'player', routeName, targetId);
      var route = launch ? LW.clashPath(state, launch.id, targetId) : null;
      if (!route || route.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = selected ? 0.95 : 0.48;
      ctx.lineWidth = selected ? 3.5 : 2.2;
      ctx.setLineDash(selected ? [10, 7] : [5, 7]);
      ctx.beginPath();
      route.forEach(function (id, index) {
        var hub = towers[id];
        var px = self.mapX(hub.x), py = self.laneYAt(hub.laneIndex);
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      var endHub = towers[route[route.length - 1]];
      ctx.lineWidth = selected ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.arc(self.mapX(endHub.x), self.laneYAt(endHub.laneIndex) + 6, selected ? 27 : 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    var chosen = this.clashRoute === 'south' ? 'south' : 'north';
    drawRoute('north', northTargetId, 'rgba(255,224,110,0.95)', chosen === 'north');
    drawRoute('south', southTargetId, 'rgba(92,214,232,0.95)', chosen === 'south');
  };

  Arena.prototype.drawGatehouses = function () {
    var state = this.state;
    if (!state || !state.gates) return;
    var playerEl = LW.ELEMENTS[state.playerElement];
    var enemyEl = LW.ELEMENTS[state.enemyElement];
    for (var lane = 0; lane < state.laneCount; lane++) {
      this.drawGatehouse(this.w * 0.155, this.laneYs[lane], playerEl, state.gates.player[lane], true);
      this.drawGatehouse(this.w * 0.845, this.laneYs[lane], enemyEl, state.gates.enemy[lane], false);
    }
  };

  Arena.prototype.drawSpawnGates = function () {
    var state = this.state;
    if (!state || !state.kingdoms) return;
    var playerEl = LW.ELEMENTS[state.playerElement];
    var enemyEl = LW.ELEMENTS[state.enemyElement];
    for (var lane = 0; lane < state.laneCount; lane++) {
      this.drawSpawnGate(this.mapX(0.09), this.laneYs[lane], playerEl, true);
      this.drawSpawnGate(this.mapX(0.91), this.laneYs[lane], enemyEl, false);
    }
  };

  Arena.prototype.drawSpawnGate = function (x, laneY, element, player) {
    var ctx = this.ctx;
    var s = this.laneCount > 3 ? 8 : 10;
    var deck = laneY + 5 + 3;
    ctx.save();
    ctx.translate(x, deck);
    if (!player) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(40,54,40,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 4, s * 1.4, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF8DF';
    ctx.strokeStyle = element.dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(-s, -s * 1.05);
    ctx.arc(0, -s * 1.05, s, Math.PI, 0);
    ctx.lineTo(s, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = element.dark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.56, 0);
    ctx.lineTo(-s * 0.56, -s * 0.82);
    ctx.arc(0, -s * 0.82, s * 0.56, Math.PI, 0);
    ctx.lineTo(s * 0.56, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = element.light;
    ctx.globalAlpha = 0.42;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.08, s * 0.48, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#6C4C24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 0.72, -s * 0.92); ctx.lineTo(s * 0.72, -s * 1.9); ctx.stroke();
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.moveTo(s * 0.72, -s * 1.88);
    ctx.lineTo(s * 1.32, -s * 1.64);
    ctx.lineTo(s * 0.72, -s * 1.38);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  Arena.prototype.drawGatehouse = function (x, y, element, gate, player) {
    var ctx = this.ctx;
    var s = this.laneCount > 3 ? 14 : 17;
    var ratio = clamp(gate.hp / gate.max, 0, 1);
    ctx.save();
    ctx.translate(x, y + 8);
    ctx.fillStyle = 'rgba(48,69,40,0.18)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.85, s * 1.3, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();

    if (gate.hp > 0) {
      ctx.fillStyle = '#F8E6BD';
      ctx.strokeStyle = element.dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); this.roundRect(-s * 0.9, -s * 0.9, s * 1.8, s * 1.55, s * 0.22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = element.light;
      ctx.beginPath(); this.roundRect(-s * 0.66, -s * 0.34, s * 1.32, s * 0.38, s * 0.12); ctx.fill();
      ctx.fillStyle = element.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.98, -s * 0.82);
      ctx.lineTo(0, -s * 1.4);
      ctx.lineTo(s * 0.98, -s * 0.82);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = element.dark; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = element.dark;
      ctx.beginPath();
      ctx.arc(0, s * 0.38, s * 0.3, Math.PI, 0);
      ctx.lineTo(s * 0.3, s * 0.62);
      ctx.lineTo(-s * 0.3, s * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-s * 0.74, -s * 0.6, s * 0.16, s * 0.16);
    } else {
      ctx.fillStyle = 'rgba(87,69,45,0.2)';
      ctx.strokeStyle = element.dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); this.roundRect(-s * 0.95, -s * 0.2, s * 0.38, s * 0.95, s * 0.12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); this.roundRect(s * 0.57, -s * 0.2, s * 0.38, s * 0.95, s * 0.12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFE77A';
      ctx.font = '900 ' + Math.round(s * 0.52) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('OPEN', 0, s * 0.25);
    }

    // Gate health bar above the little building.
    var bw = s * 2.3;
    var by = gate.hp > 0 ? -s * 1.7 : -s * 0.72;
    ctx.fillStyle = 'rgba(44,53,38,0.36)';
    ctx.beginPath(); this.roundRect(-bw / 2, by, bw, 4, 2); ctx.fill();
    ctx.fillStyle = player ? '#63C956' : '#FF9070';
    ctx.beginPath(); this.roundRect(-bw / 2, by, bw * ratio, 4, 2); ctx.fill();
    if (ratio <= 0) {
      ctx.fillStyle = '#7E5B32';
      ctx.font = '900 6px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BREACHED', 0, by - 4);
    }
    ctx.restore();
  };

  Arena.prototype.drawDecorations = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    var kL = this.sideKingdom('player'), kR = this.sideKingdom('enemy');
    var blocks = [
      { x: 0.16, y: 0.20, color: kL ? LW.ELEMENTS[kL.id].color : '#FFB84D', mark: '?' },
      { x: 0.48, y: 0.12, color: '#FFE07A', mark: '★' },
      { x: 0.70, y: 0.22, color: kR ? LW.ELEMENTS[kR.id].color : '#B28CFF', mark: '!' }
    ];
    blocks.forEach(function (b, i) {
      var bob = Math.sin(this.time * 1.4 + i) * 4;
      var bx = b.x * w, by = b.y * h + bob, s = Math.min(26, w * 0.033);
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = 'rgba(104,63,20,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); this.roundRect(-s, -s, s * 2, s * 2, s * 0.22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); this.roundRect(-s * 0.72, -s * 0.72, s * 1.44, s * 0.32, s * 0.12); ctx.fill();
      ctx.fillStyle = '#6B431D';
      ctx.font = '800 ' + Math.round(s * 1.1) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.mark, 0, s * 0.12);
      ctx.restore();
    }, this);

    if (this.state) {
      this.drawKingdomMotes('player');
      this.drawKingdomMotes('enemy');
    }

    // Flowers along the bottom.
    for (var i = 0; i < 15; i++) {
      var fx = (i * 163 + 33) % w;
      var fy = h * 0.81 + (i % 4) * 13;
      ctx.fillStyle = i % 2 ? '#FF8BB3' : '#FFE05D';
      for (var p = 0; p < 5; p++) {
        var a = p * Math.PI * 0.4;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFF7D0';
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
    }
  };

  Arena.prototype.drawKingdomMotes = function (side) {
    var k = this.sideKingdom(side);
    if (!k) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    var element = LW.ELEMENTS[k.id];
    var span = w * 0.43;
    var baseX = side === 'player' ? w * 0.015 : w * 0.555;
    for (var i = 0; i < 12; i++) {
      var x = baseX + ((i * 83 + this.time * (k.landmark === 'cloud' ? 12 : 5)) % span);
      var y = h * 0.2 + ((i * 61) % Math.max(1, h * 0.52)) + Math.sin(this.time * 1.4 + i) * 5;
      ctx.save();
      ctx.globalAlpha = 0.48;
      if (k.landmark === 'volcano') {
        var fl = ctx.createRadialGradient(x, y, 0, x, y, 5);
        fl.addColorStop(0, 'rgba(255,230,150,0.9)');
        fl.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = fl;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      } else if (k.landmark === 'lake') {
        ctx.strokeStyle = element.light; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2); ctx.stroke();
      } else if (k.landmark === 'mountain') {
        ctx.fillStyle = k.land.top;
        ctx.beginPath(); ctx.ellipse(x, y, 3.2, 1.5, -0.6, 0, Math.PI * 2); ctx.fill();
      } else if (k.landmark === 'cloud') {
        ctx.fillStyle = '#FFFFFF';
        this.star(ctx, x, y, 2.6 + (i % 2), 4);
      } else if (k.landmark === 'heaven') {
        ctx.fillStyle = element.light;
        this.star(ctx, x, y, 3.2 + (i % 3), 4);
      } else {
        ctx.fillStyle = element.light;
        ctx.beginPath(); ctx.arc(x, y, 2.2 + (i % 2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };

  Arena.prototype.drawPreview = function () {
    var state = this.state;
    if (!state || state.paused || state.result) return;
    var lane = clamp(this.selectedLane || 0, 0, state.laneCount - 1);
    var x = this.mapX(0.16);
    var y = this.laneYs[lane] + 3;
    var info = LW.getStats(state.playerElement, this.selectedType);
    if (!info) return;
    var el = LW.ELEMENTS[state.playerElement];
    var bob = Math.sin(this.time * 4) * 5;
    var s = 16;
    var ready = !this.ui || this.ui.ready !== false;
    this.ctx.save();
    this.ctx.globalAlpha = ready ? 0.52 : 0.24;
    this.ctx.translate(x, y - 8 + bob);
    this.drawBlobBody(s, this.selectedType, el, false, 0);
    this.ctx.restore();
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillStyle = ready ? '#6B4B22' : '#9A876B';
    this.ctx.font = '700 9px "Trebuchet MS", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(ready ? (state.mode === 'clash' ? 'TAP ROUTE' : 'TAP PLATFORM') : 'RECHARGING', x, y + 28);
    this.ctx.globalAlpha = 1;
  };

  Arena.prototype.drawUnits = function () {
    var state = this.state;
    var units = state.units.slice().sort(function (a, b) {
      if (a.lane !== b.lane) return a.lane - b.lane;
      return a.x - b.x;
    });
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var el = LW.ELEMENTS[u.element];
      var x = this.mapX(u.x);
      var y = this.laneYAt(u.lane) + (u.yOffset || 0) * this.h * 0.6;
      var moving = !this.unitInCombat(u);
      var hop = Math.sin(this.time * (u.shape === 'zap' ? 9 : 7) + u.id) * (moving ? 4 : 1.5);
      var breathe = 1 + Math.sin(this.time * 5 + u.id) * 0.025;
      var spawn = u.age < 0.34 ? 0.45 + easeOut(u.age / 0.34) * 0.55 : 1;
      var s = Math.max(15, Math.min(28, Math.min(this.w, this.h) * 0.031));
      if (u.type === 'chonk') s *= 1.32;
      if (u.type === 'zap') s *= 0.9;
      s *= spawn * breathe;

      var ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(50,74,45,0.18)';
      ctx.beginPath(); ctx.ellipse(x, y + 13, s * 0.7, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(x, y - 13 + hop);
      if (u.side === 'enemy') ctx.scale(-1, 1);
      this.drawBlobBody(s, u.type, el, u.hitFlash > 0, u.stun > 0);
      ctx.restore();

      if (u.hp < u.maxHp) {
        var bw = Math.max(20, s * 1.6);
        ctx.fillStyle = 'rgba(45,52,42,0.36)';
        ctx.beginPath(); this.roundRect(x - bw / 2, y - s * 1.35, bw, 4, 2); ctx.fill();
        ctx.fillStyle = u.side === 'player' ? '#65D45B' : '#FF8A6A';
        ctx.beginPath(); this.roundRect(x - bw / 2, y - s * 1.35, bw * clamp(u.hp / u.maxHp, 0, 1), 4, 2); ctx.fill();
      }
    }
  };

  Arena.prototype.unitInCombat = function (unit) {
    if (!this.state) return false;
    for (var i = 0; i < this.state.units.length; i++) {
      var other = this.state.units[i];
      if (other.side === unit.side || other.lane !== unit.lane) continue;
      return Math.abs(other.x - unit.x) <= unit.range + 0.06;
    }
    return false;
  };

  Arena.prototype.drawBlobBody = function (s, type, el, hit, stunned) {
    var ctx = this.ctx;
    // Shadow and glow.
    var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
    glow.addColorStop(0, rgba(el.light, 0.28));
    glow.addColorStop(1, rgba(el.light, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.fill();

    var body = ctx.createLinearGradient(0, -s, 0, s);
    body.addColorStop(0, hit ? '#FFFFFF' : el.light);
    body.addColorStop(0.58, el.color);
    body.addColorStop(1, el.dark);
    ctx.fillStyle = body;
    ctx.strokeStyle = el.dark;
    ctx.lineWidth = Math.max(1.5, s * 0.09);

    var silhouette = el.silhouette || 'flame';
    if (silhouette === 'flame') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.32);
      ctx.bezierCurveTo(s * 0.48, -s * 0.98, s * 0.94, -s * 0.5, s * 0.63, s * 0.2);
      ctx.bezierCurveTo(s * 0.44, s * 0.78, -s * 0.44, s * 0.78, -s * 0.63, s * 0.2);
      ctx.bezierCurveTo(-s * 0.94, -s * 0.3, -s * 0.48, -s * 0.72, -s * 0.15, -s * 0.52);
      ctx.bezierCurveTo(-s * 0.04, -s * 0.9, 0, -s * 1.14, 0, -s * 1.32);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,244,157,0.56)';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.74);
      ctx.bezierCurveTo(s * 0.3, -s * 0.44, s * 0.32, -s * 0.02, 0, s * 0.25);
      ctx.bezierCurveTo(-s * 0.3, -s * 0.04, -s * 0.24, -s * 0.42, 0, -s * 0.74);
      ctx.fill();
    } else if (silhouette === 'drop') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.28);
      ctx.bezierCurveTo(s * 0.34, -s * 0.87, s * 0.92, -s * 0.26, s * 0.82, s * 0.22);
      ctx.bezierCurveTo(s * 0.7, s * 0.9, -s * 0.7, s * 0.9, -s * 0.82, s * 0.22);
      ctx.bezierCurveTo(-s * 0.92, -s * 0.26, -s * 0.34, -s * 0.87, 0, -s * 1.28);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath(); ctx.arc(-s * 0.37, -s * 0.28, s * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.3, s * 0.3, s * 0.09, 0, Math.PI * 2); ctx.fill();
    } else if (silhouette === 'rock') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, s * 0.4);
      ctx.bezierCurveTo(-s * 1.02, -s * 0.18, -s * 0.62, -s * 0.72, -s * 0.06, -s * 0.75);
      ctx.bezierCurveTo(s * 0.6, -s * 0.8, s * 0.96, -s * 0.26, s * 0.86, s * 0.4);
      ctx.bezierCurveTo(s * 0.76, s * 0.9, -s * 0.7, s * 0.92, -s * 0.9, s * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(151,226,111,0.92)';
      ctx.beginPath(); ctx.ellipse(-s * 0.08, -s * 0.42, s * 0.62, s * 0.23, -0.08, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4F9C3F'; ctx.lineWidth = Math.max(1.2, s * 0.07);
      ctx.beginPath(); ctx.moveTo(s * 0.28, -s * 0.58); ctx.quadraticCurveTo(s * 0.34, -s * 0.92, s * 0.6, -s * 0.96); ctx.stroke();
      ctx.fillStyle = '#70C85A';
      ctx.beginPath(); ctx.ellipse(s * 0.62, -s * 0.98, s * 0.2, s * 0.11, -0.35, 0, Math.PI * 2); ctx.fill();
    } else if (silhouette === 'cloud') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.92, s * 0.38);
      ctx.bezierCurveTo(-s * 1.16, -s * 0.03, -s * 0.72, -s * 0.42, -s * 0.3, -s * 0.34);
      ctx.bezierCurveTo(-s * 0.2, -s * 0.98, s * 0.5, -s * 1.02, s * 0.58, -s * 0.4);
      ctx.bezierCurveTo(s * 1.05, -s * 0.5, s * 1.2, s * 0.14, s * 0.78, s * 0.38);
      ctx.bezierCurveTo(s * 0.6, s * 0.72, -s * 0.6, s * 0.72, -s * 0.92, s * 0.38);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(1.2, s * 0.06);
      ctx.beginPath(); ctx.arc(-s * 0.12, s * 0.02, s * 0.32, 0.2, Math.PI * 1.7); ctx.stroke();
    } else if (silhouette === 'star') {
      ctx.beginPath();
      for (var sp = 0; sp < 12; sp++) {
        var sa = -Math.PI / 2 + sp * Math.PI / 6;
        var sr = sp % 2 === 0 ? s * 1.13 : s * 0.67;
        var spx = Math.cos(sa) * sr, spy = Math.sin(sa) * sr;
        if (sp === 0) ctx.moveTo(spx, spy); else ctx.lineTo(spx, spy);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,244,156,0.7)';
      ctx.lineWidth = Math.max(1, s * 0.045);
      for (var ray = 0; ray < 4; ray++) {
        var ra = ray * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * s * 1.25, Math.sin(ra) * s * 1.25);
        ctx.lineTo(Math.cos(ra) * s * 1.48, Math.sin(ra) * s * 1.48);
        ctx.stroke();
      }
    } else if (silhouette === 'crescent') {
      ctx.beginPath(); ctx.arc(0, s * 0.03, s * 0.91, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = el.dark;
      ctx.beginPath(); ctx.moveTo(-s * 0.48, -s * 0.7); ctx.lineTo(-s * 0.72, -s * 1.08); ctx.lineTo(-s * 0.16, -s * 0.88); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.48, -s * 0.7); ctx.lineTo(s * 0.72, -s * 1.08); ctx.lineTo(s * 0.16, -s * 0.88); ctx.fill();
      ctx.strokeStyle = 'rgba(216,194,255,0.92)';
      ctx.lineWidth = Math.max(1.4, s * 0.11);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -s * 0.07, s * 0.52, 0.42, Math.PI * 1.42); ctx.stroke();
      ctx.fillStyle = 'rgba(255,246,190,0.9)';
      this.star(ctx, s * 0.62, s * 0.26, s * 0.1, 4);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Unit role accessories sit on top of the element silhouette.
    if (type === 'zap') {
      ctx.fillStyle = el.light;
      this.star(ctx, s * 0.82, -s * 1.0, s * 0.2, 4);
      ctx.strokeStyle = rgba(el.light, 0.62);
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, s * 1.04, 0.2, Math.PI * 1.7); ctx.stroke();
    } else if (type === 'chonk') {
      ctx.strokeStyle = 'rgba(82,52,28,0.34)';
      ctx.lineWidth = Math.max(1.2, s * 0.065);
      ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.43); ctx.quadraticCurveTo(0, s * 0.56, s * 0.5, s * 0.43); ctx.stroke();
    }

    // Feet.
    ctx.fillStyle = el.dark;
    ctx.beginPath(); ctx.ellipse(-s * 0.32, s * 0.9, s * 0.22, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.32, s * 0.9, s * 0.22, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();

    // Face.
    var faceX = silhouette === 'crescent' ? s * 0.06 : 0;
    var eyeY = type === 'chonk' ? s * 0.08 : 0;
    if (silhouette === 'rock') eyeY = s * 0.04;
    if (silhouette === 'flame' || silhouette === 'drop') eyeY = -s * 0.04;
    if (silhouette === 'cloud') eyeY = -s * 0.02;
    var eyeGap = s * 0.29;
    ctx.fillStyle = '#2B2440';
    ctx.beginPath(); ctx.arc(faceX - eyeGap, eyeY, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceX + eyeGap, eyeY, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(faceX - eyeGap + s * 0.04, eyeY - s * 0.045, s * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceX + eyeGap + s * 0.04, eyeY - s * 0.045, s * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2B2440';
    ctx.lineWidth = Math.max(1, s * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(faceX, eyeY + s * 0.15, s * 0.2, 0.15, Math.PI - 0.15);
    ctx.stroke();
    // Cheeks.
    ctx.fillStyle = 'rgba(255,105,123,0.48)';
    ctx.beginPath(); ctx.arc(faceX - s * 0.48, eyeY + s * 0.19, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceX + s * 0.48, eyeY + s * 0.19, s * 0.12, 0, Math.PI * 2); ctx.fill();

    if (stunned) {
      ctx.font = '700 ' + Math.round(s * 0.45) + 'px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#FFE56A';
      ctx.textAlign = 'center';
      ctx.fillText('✦ ✦', 0, -s * 1.15);
    }
  };

  Arena.prototype.drawEffects = function (state) {
    if (state.mode === 'tower') { this.drawTowerEffects(state); return; }
    if (state.mode === 'maze') { this.drawMazeEffects(state); return; }
    var ctx = this.ctx;
    state.effects.forEach(function (e) {
      var p = clamp(e.life / (e.maxLife || 0.5), 0, 1);
      ctx.save();
      ctx.globalAlpha = p;
      if (e.kind === 'banner') {
        var bx = this.w / 2, by = this.h * 0.23;
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.round(Math.min(44, this.w * 0.055)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(78,47,22,0.5)';
        ctx.lineWidth = 6;
        ctx.strokeText(e.text, bx, by);
        ctx.fillStyle = e.color || '#FFE156';
        ctx.fillText(e.text, bx, by);
      } else if (e.kind === 'clashTowerHit' || e.kind === 'clashCapture' || e.kind === 'clashBreach') {
        var cx = this.mapX(e.x === undefined ? 0.5 : e.x), cy = this.laneYAt(e.lane);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 3 + 3 * p;
        ctx.beginPath();
        ctx.arc(cx, cy, (1 - p) * (e.kind === 'clashTowerHit' ? 25 : 78) + 9, 0, Math.PI * 2);
        ctx.stroke();
        if (e.kind === 'clashBreach') {
          ctx.strokeStyle = e.color || '#FFE77A';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath(); ctx.arc(cx, cy, 30 + (1 - p) * 26, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (e.kind === 'clashCapture') {
          this.star(ctx, cx, cy - 8, 12 + (1 - p) * 20, 6);
          ctx.globalAlpha = p * 0.35;
          ctx.fillStyle = e.color || '#FFE77A';
          ctx.fillRect(cx - 8, cy - 150, 16, 150);
        }
      } else if (e.kind === 'clashBolt') {
        var cfx = this.mapX(e.from), ctx2 = this.mapX(e.x), cy2 = this.laneYAt(e.lane) - 18;
        ctx.strokeStyle = e.color || '#FFF2A8';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cfx, cy2); ctx.lineTo(ctx2, cy2); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ctx2, cy2, 4.5, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'clashRush') {
        ctx.fillStyle = 'rgba(255,225,86,' + (0.14 * p) + ')';
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.strokeStyle = e.color || '#FFE156';
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 8, this.w - 16, this.h - 16);
      } else if (e.kind === 'text') {
        var tx = this.mapX(e.x), ty = this.laneYAt(e.lane) - 44 - (1 - p) * 22;
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.round(Math.min(20, this.w * 0.022)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(62,40,23,0.5)'; ctx.lineWidth = 4;
        ctx.strokeText(e.text, tx, ty);
        ctx.fillStyle = e.color || '#FFFFFF';
        ctx.fillText(e.text, tx, ty);
      } else if (e.kind === 'hit' || e.kind === 'poof' || e.kind === 'spawn') {
        var hx = this.mapX(e.x), hy = this.laneYAt(e.lane);
        if (e.kind === 'hit') {
          ctx.fillStyle = e.color || '#FFE77A';
          this.star(ctx, hx, hy, 9 + (1 - p) * 14, 6);
        } else {
          var radius = (1 - p) * 28 + 5;
          ctx.strokeStyle = e.color || '#FFE77A';
          ctx.lineWidth = 3 * p;
          ctx.beginPath(); ctx.arc(hx, hy, radius, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (e.kind === 'bolt') {
        var fx = this.mapX(e.from), tx2 = this.mapX(e.x), y2 = this.laneYAt(e.lane);
        ctx.strokeStyle = e.color || '#FFF2A8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx, y2 - 18); ctx.lineTo(tx2, y2 - 18); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(tx2, y2 - 18, 4.5, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'meteor') {
        var mx = this.w * (0.35 + (1 - p) * 0.35), my = -40 + (1 - p) * this.h * 0.9;
        ctx.strokeStyle = e.color || '#FFD166'; ctx.lineWidth = 10 * p;
        ctx.beginPath(); ctx.moveTo(mx - 28, my - 46); ctx.lineTo(mx, my); ctx.stroke();
        ctx.fillStyle = '#FFF6C4';
        ctx.beginPath(); ctx.arc(mx, my, 18 * p + 6, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'baseHit') {
        var bx2 = e.side === 'enemy' ? this.w * 0.945 : this.w * 0.055;
        ctx.strokeStyle = e.color || '#FFE77A'; ctx.lineWidth = 5 * p;
        ctx.beginPath(); ctx.arc(bx2, this.baseY, (1 - p) * 80 + 18, 0, Math.PI * 2); ctx.stroke();
      } else if (e.kind === 'gateHit' || e.kind === 'gateBreak') {
        var gx = e.side === 'enemy' ? this.w * 0.845 : this.w * 0.155;
        var gy = this.laneYAt(e.lane);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 3 + 3 * p;
        ctx.beginPath(); ctx.arc(gx, gy, (1 - p) * (e.kind === 'gateBreak' ? 45 : 22) + 10, 0, Math.PI * 2); ctx.stroke();
        if (e.kind === 'gateBreak') this.star(ctx, gx, gy - 8, 10 + (1 - p) * 16, 6);
      } else if (e.kind === 'finalBounce') {
        ctx.fillStyle = 'rgba(255,232,109,' + (0.12 * p) + ')';
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.strokeStyle = e.color || '#FFE156';
        ctx.lineWidth = 2;
        for (var fb = 0; fb < 8; fb++) {
          var angle = fb * Math.PI / 4 + this.time * 0.2;
          ctx.beginPath();
          ctx.moveTo(this.w / 2, this.baseY);
          ctx.lineTo(this.w / 2 + Math.cos(angle) * this.w * 0.7, this.baseY + Math.sin(angle) * this.h * 0.7);
          ctx.stroke();
        }
      } else if (e.kind === 'heal') {
        var hx2 = this.mapX(e.x), hy2 = this.laneYAt(e.lane === undefined ? 1 : e.lane);
        ctx.fillStyle = e.color || '#C8F59C';
        ctx.fillRect(hx2 - 10, hy2 - 28, 20, 6);
        ctx.fillRect(hx2 - 3, hy2 - 35, 6, 20);
      } else if (e.kind === 'snare') {
        ctx.strokeStyle = e.color || '#C8F59C'; ctx.lineWidth = 4;
        for (var s = 0; s < (state.laneCount || 3); s++) {
          ctx.beginPath();
          ctx.arc(this.w * 0.55, this.laneYs[s], (1 - p) * 50, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (e.kind === 'gust') {
        ctx.strokeStyle = e.color || '#E9F8FF'; ctx.lineWidth = 5;
        for (var g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.arc(this.w * (0.35 + g * 0.1), this.h * (0.3 + g * 0.14), (1 - p) * 90 + 20, 0.3, Math.PI * 1.2);
          ctx.stroke();
        }
      } else if (e.kind === 'beam' || e.kind === 'star' || e.kind === 'siphon') {
        ctx.strokeStyle = e.color || '#FFF6B8'; ctx.lineWidth = 2 + 4 * p;
        for (var b = 0; b < (state.laneCount || 3); b++) {
          var by = this.laneYs[b];
          ctx.beginPath(); ctx.moveTo(this.w * 0.12, by); ctx.lineTo(this.w * 0.88, by); ctx.stroke();
        }
      }
      ctx.restore();
    }, this);
  };

  Arena.prototype.drawMazeEffects = function (state) {
    var ctx = this.ctx;
    var m = this.mazeRect;
    if (!m) return;
    state.effects.forEach(function (e) {
      var p = clamp(e.life / (e.maxLife || 0.5), 0, 1);
      ctx.save();
      ctx.globalAlpha = p;
      if (e.kind === 'banner') {
        var bx = this.w / 2, by = this.h * 0.23;
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.round(Math.min(44, this.w * 0.055)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(78,47,22,0.5)'; ctx.lineWidth = 6;
        ctx.strokeText(e.text, bx, by);
        ctx.fillStyle = e.color || '#FFE156'; ctx.fillText(e.text, bx, by);
      } else if (e.kind === 'text') {
        var tx, ty;
        if (e.gx !== undefined && e.gy !== undefined) {
          var tp = this.mazePoint(e.gx, e.gy);
          tx = tp.x; ty = tp.y - m.cell * 0.42 - (1 - p) * 16;
        } else {
          var gp = this.mazeGatePoint((e.x || 0) > 0.5 ? 'enemy' : 'player');
          tx = gp.x; ty = gp.y - 38;
        }
        ctx.textAlign = 'center';
        ctx.font = '900 ' + Math.round(Math.min(19, this.w * 0.02)) + 'px "Trebuchet MS", sans-serif';
        ctx.strokeStyle = 'rgba(62,40,23,0.5)'; ctx.lineWidth = 4;
        ctx.strokeText(e.text, tx, ty);
        ctx.fillStyle = e.color || '#FFFFFF'; ctx.fillText(e.text, tx, ty);
      } else if (e.kind === 'mazeHit') {
        var hp = this.mazePoint(e.gx, e.gy);
        ctx.fillStyle = e.color || '#FFE77A';
        this.star(ctx, hp.x, hp.y, m.cell * 0.2 + (1 - p) * 12, 6);
      } else if (e.kind === 'mazePoof' || (e.kind === 'spawn' && e.gx !== undefined)) {
        var rp = this.mazePoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFE77A';
        ctx.lineWidth = 3 * p;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, (1 - p) * m.cell * 0.6 + 5, 0, Math.PI * 2); ctx.stroke();
        if (e.kind === 'mazePoof') this.star(ctx, rp.x, rp.y, m.cell * 0.2, 4);
      } else if (e.kind === 'mazeBolt') {
        var fp = this.mazePoint(e.fromGx, e.fromGy), qp = this.mazePoint(e.gx, e.gy);
        ctx.strokeStyle = e.color || '#FFF2A8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fp.x, fp.y); ctx.lineTo(qp.x, qp.y); ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(qp.x, qp.y, 4, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'gateHit' || e.kind === 'gateBreak') {
        var gp2 = this.mazeGatePoint(e.side);
        ctx.strokeStyle = e.color || '#FFE77A'; ctx.lineWidth = 3 + 3 * p;
        ctx.beginPath(); ctx.arc(gp2.x, gp2.y, (1 - p) * (e.kind === 'gateBreak' ? 45 : 22) + 10, 0, Math.PI * 2); ctx.stroke();
        if (e.kind === 'gateBreak') this.star(ctx, gp2.x, gp2.y - 8, 10 + (1 - p) * 16, 6);
      } else if (e.kind === 'baseHit') {
        var bx2 = e.side === 'enemy' ? this.w * 0.945 : this.w * 0.055;
        ctx.strokeStyle = e.color || '#FFE77A'; ctx.lineWidth = 5 * p;
        ctx.beginPath(); ctx.arc(bx2, this.baseY, (1 - p) * 80 + 18, 0, Math.PI * 2); ctx.stroke();
      } else if (e.kind === 'mazeShift') {
        ctx.strokeStyle = e.color || '#FFE56A';
        ctx.lineWidth = 2 + 5 * p;
        ctx.beginPath(); this.roundRect(m.left - 5, m.top - 5, m.right - m.left + 10, m.bottom - m.top + 10, 14); ctx.stroke();
        var scanY = m.top + (m.bottom - m.top) * (1 - p);
        ctx.fillStyle = rgba(e.color || '#FFE56A', 0.35);
        ctx.fillRect(m.left - 5, scanY, m.right - m.left + 10, 2 + 3 * p);
      } else if (e.kind === 'meteor') {
        var mx = this.w * (0.38 + (1 - p) * 0.24), my = m.top - 30 + (1 - p) * (m.bottom - m.top + 30);
        ctx.strokeStyle = e.color || '#FFD166'; ctx.lineWidth = 10 * p;
        ctx.beginPath(); ctx.moveTo(mx - 28, my - 46); ctx.lineTo(mx, my); ctx.stroke();
        ctx.fillStyle = '#FFF6C4'; ctx.beginPath(); ctx.arc(mx, my, 18 * p + 6, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'finalBounce') {
        ctx.fillStyle = 'rgba(255,232,109,' + (0.12 * p) + ')';
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.strokeStyle = e.color || '#FFE156'; ctx.lineWidth = 2;
        for (var fb = 0; fb < 8; fb++) {
          var angle = fb * Math.PI / 4 + this.time * 0.2;
          ctx.beginPath();
          ctx.moveTo(this.w / 2, this.baseY);
          ctx.lineTo(this.w / 2 + Math.cos(angle) * this.w * 0.7, this.baseY + Math.sin(angle) * this.h * 0.7);
          ctx.stroke();
        }
      } else if (e.kind === 'heal') {
        var healP = this.mazeGatePoint('player');
        ctx.fillStyle = e.color || '#C8F59C';
        ctx.fillRect(healP.x - 10, healP.y - 44, 20, 6);
        ctx.fillRect(healP.x - 3, healP.y - 51, 6, 20);
      } else if (e.kind === 'snare' || e.kind === 'gust' || e.kind === 'beam' || e.kind === 'star' || e.kind === 'siphon') {
        var cx = (m.left + m.right) / 2, cy = (m.top + m.bottom) / 2;
        ctx.strokeStyle = e.color || '#FFF6B8';
        ctx.lineWidth = 2 + 4 * p;
        if (e.kind === 'snare') {
          ctx.beginPath(); ctx.arc(cx, cy, (1 - p) * Math.max(m.right - m.left, m.bottom - m.top) * 0.55 + 20, 0, Math.PI * 2); ctx.stroke();
        } else if (e.kind === 'gust') {
          for (var g = 0; g < 4; g++) {
            ctx.beginPath();
            ctx.arc(m.left + (m.right - m.left) * (0.2 + g * 0.2), m.top + (m.bottom - m.top) * (0.3 + g * 0.12), (1 - p) * 70 + 20, 0.3, Math.PI * 1.2);
            ctx.stroke();
          }
        } else {
          for (var b = 0; b < 3; b++) {
            var by = m.top + (m.bottom - m.top) * (0.32 + b * 0.18);
            ctx.beginPath(); ctx.moveTo(m.left, by); ctx.lineTo(m.right, by); ctx.stroke();
          }
        }
      }
      ctx.restore();
    }, this);
  };

  Arena.prototype.drawAmbientPals = function () {
    var els = [LW.ELEMENTS.fire, LW.ELEMENTS.water, LW.ELEMENTS.earth, LW.ELEMENTS.air, LW.ELEMENTS.light, LW.ELEMENTS.dark];
    var ctx = this.ctx;
    for (var i = 0; i < 6; i++) {
      var x = this.w * (0.2 + (i % 3) * 0.3) + Math.sin(this.time * 0.8 + i) * 10;
      var y = this.h * (0.55 + Math.floor(i / 3) * 0.18) + Math.sin(this.time * 3 + i) * 7;
      ctx.save();
      ctx.translate(x, y);
      this.drawBlobBody(22, i % 3 === 0 ? 'zap' : i % 2 ? 'chonk' : 'pip', els[i], false, false);
      ctx.restore();
    }
  };

  Arena.prototype.drawVignette = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    var vignette = ctx.createLinearGradient(0, 0, 0, h);
    vignette.addColorStop(0, 'rgba(34,78,123,0.16)');
    vignette.addColorStop(0.2, 'rgba(34,78,123,0)');
    vignette.addColorStop(0.8, 'rgba(34,78,123,0)');
    vignette.addColorStop(1, 'rgba(34,78,123,0.14)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };

  Arena.prototype.roundRect = function (x, y, w, h, r) {
    var ctx = this.ctx;
    r = Math.min(r || 0, Math.min(w, h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  Arena.prototype.star = function (ctx, x, y, radius, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / points;
      var r = i % 2 === 0 ? radius : radius * 0.44;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  };

  Arena.prototype.heart = function (ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.8);
    ctx.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.5, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s, x + s * 1.2, y - s * 0.1, x, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
  };

  ZAC.LWArena = Arena;
})(typeof globalThis !== 'undefined' ? globalThis : this);
