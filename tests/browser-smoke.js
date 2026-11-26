/* Headless Chrome smoke test for Elemental Little Wars. */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '..');
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const chromePath = candidates.find((p) => p && fs.existsSync(p));

function browserTest() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const out = { ok: false };
  return (async () => {
    try {
      out.boot = !!(window.ZAC && ZAC.LW && ZAC.LWApp && ZAC.LWArena && ZAC.Audio);
      out.title = document.title;
      out.buddies = document.querySelectorAll('.buddy-card').length;
      out.buddyKingdoms = document.querySelectorAll('.buddy-kingdom').length;
      out.selectedKingdom = document.getElementById('selected-kingdom').textContent;
      out.startFootnote = document.querySelector('.start-footnote').textContent;
      out.startVisible = !document.getElementById('start-screen').classList.contains('hidden');
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await sleep(300);
      out.audio = {
        enabled: ZAC.Audio.enabled,
        state: ZAC.Audio.ctx ? ZAC.Audio.ctx.state : null,
        voices: ZAC.Audio.voices.length
      };

      const play = document.querySelector('[data-action="play"]');
      out.playButton = !!play;
      if (play) play.click();
      await sleep(500);

      const game = ZAC.LWApp.getMatch();
      out.game = !!game;
      out.gameVisible = !document.getElementById('game-ui').classList.contains('hidden');
      out.startHidden = document.getElementById('start-screen').classList.contains('hidden');
      out.pals = document.querySelectorAll('.pal-card').length;
      out.lanes = document.querySelectorAll('.lane-btn').length;
      out.laneCount = game ? game.laneCount : null;
      out.gateBars = document.querySelectorAll('.lane-gatebars').length;
      out.readyIndicator = document.getElementById('spawn-state').textContent;
      out.coreText = document.getElementById('player-base-number').textContent;
      out.playerKingdom = document.getElementById('player-kingdom').textContent;
      out.enemyKingdom = document.getElementById('enemy-kingdom').textContent;
      out.kingdomChip = document.getElementById('kingdom-chip').textContent;
      out.base = game ? [game.base.player, game.base.enemy] : null;
      out.initialEnergy = game ? game.energy : null;

      const canvas = document.getElementById('arena');
      out.canvas = canvas ? [canvas.width, canvas.height] : null;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let lit = 0;
        for (let i = 0; i < img.length; i += 200) {
          if (img[i] + img[i + 1] + img[i + 2] > 80) lit++;
        }
        out.litSamples = lit;
      }

      const laneIndex = game ? Math.min(1, game.laneCount - 1) : 1;
      const lane1 = document.querySelector('.lane-btn[data-lane="' + laneIndex + '"]');
      out.laneButton = !!lane1;
      if (lane1) lane1.click();
      await sleep(140);
      out.unitsAfterSpawn = game ? game.units.length : 0;
      out.energyAfterSpawn = game ? +game.energy.toFixed(2) : null;
      out.spawnCooling = game ? game.spawnCd > 0 : false;
      out.coolingIndicator = document.getElementById('spawn-state').textContent;
      out.sparkText = document.getElementById('spark-count').textContent;
      out.hint = document.getElementById('lane-hint').textContent;

      // The same lane tap should not become a second instant spawn.
      await sleep(60);
      if (game) {
        ZAC.LWApp.selectType('zap');
        ZAC.LWApp.trySpawn('zap');
      }
      await sleep(80);
      out.zapsWhileCooling = game ? game.units.filter((u) => u.side === 'player' && u.type === 'zap').length : 0;

      await sleep(1450);
      if (game) ZAC.LWApp.trySpawn('zap');
      await sleep(100);
      out.zaps = game ? game.units.filter((u) => u.side === 'player' && u.type === 'zap').length : 0;

      if (game) {
        const gateBefore = game.gates.enemy.reduce((sum, g) => sum + g.hp, 0);
        const coreBefore = game.base.enemy;
        ZAC.LWApp.useAbility();
        const gateAfter = game.gates.enemy.reduce((sum, g) => sum + g.hp, 0);
        out.abilityCooldown = +game.abilityCd.toFixed(2);
        out.abilityDealt = gateAfter < gateBefore;
        out.abilityCoreProtected = game.base.enemy === coreBefore;
      }
      await sleep(150);

      if (game) {
        game.eventTimer = 0;
        await sleep(220);
        out.eventVisible = !document.getElementById('event-layer').classList.contains('hidden');
        out.eventCards = document.querySelectorAll('.event-card').length;
        const choice = document.querySelector('.event-card');
        if (choice) choice.click();
        await sleep(180);
        out.eventClosed = document.getElementById('event-layer').classList.contains('hidden');
        out.resumed = !game.paused;
      }

      if (game) {
        const lane = 0;
        game.gates.enemy[lane].hp = 0;
        game.base.enemy = 5;
        const coreUnit = ZAC.LW.spawnFor(game, 'player', lane, 'pip', { free: true }).unit;
        coreUnit.x = 0.90;
        coreUnit.cd = 0;
        await sleep(420);
        out.resultVisible = !document.getElementById('result-layer').classList.contains('hidden');
        out.resultTitle = document.querySelector('#result-layer h2') ? document.querySelector('#result-layer h2').textContent : null;
      }

      // Random lanes are a gameplay rule, so exercise a five-lane build too.
      for (let i = 0; i < 30; i++) {
        ZAC.LWApp.startMatch();
        await sleep(35);
        const five = ZAC.LWApp.getMatch();
        if (five && five.laneCount === 5) {
          out.fiveLane = true;
          await sleep(260);
          out.fiveLaneButtons = document.querySelectorAll('.lane-btn').length;
          out.fiveGateBars = document.querySelectorAll('.lane-gatebars').length;
          const fiveLaneBtn = document.querySelector('.lane-btn[data-lane="4"]');
          if (fiveLaneBtn) fiveLaneBtn.click();
          await sleep(140);
          out.fiveLaneSpawn = five.units.length;
          out.fiveHudFits = document.querySelector('.bottom-hud').scrollWidth <= document.querySelector('.bottom-hud').clientWidth + 2;
          break;
        }
      }

      // Exercise the second battlefield: mode switch, maze click-to-send and a wall shift.
      ZAC.LWApp.setMode('maze');
      ZAC.LWApp.startMatch();
      await sleep(420);
      const mazeGame = ZAC.LWApp.getMatch();
      const mazeArena = ZAC.LWApp.getArena();
      out.modeButtons = document.querySelectorAll('.mode-card').length;
      out.mazeMode = !!(mazeGame && mazeGame.mode === 'maze');
      out.mazeUi = document.querySelectorAll('.lane-btn').length === 1 && !!document.querySelector('.maze-lane-btn');
      out.mazeChip = document.getElementById('mode-chip').textContent;
              out.mazePath = mazeGame ? ZAC.LW.mazePathExists(mazeGame.maze) : false;
        out.mazeMapShown = !document.getElementById('maze-map-wrap').classList.contains('hidden');
        out.objectiveChip = /GOAL/.test(document.getElementById('objective-chip').textContent);
        out.coachShown = !!document.querySelector('.coach-card');
      if (mazeGame && mazeArena && mazeArena.mazeRect) {
        const cr = canvas.getBoundingClientRect();
        const mx = cr.left + (mazeArena.mazeRect.left + mazeArena.mazeRect.right) / 2;
        const my = cr.top + (mazeArena.mazeRect.top + mazeArena.mazeRect.bottom) / 2;
        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: mx, clientY: my }));
        await sleep(180);
        out.mazeSpawn = mazeGame.units.some((u) => u.side === 'player');
        mazeGame.maze.shiftTimer = 0.001;
        await sleep(240);
        out.mazeShift = mazeGame.maze.shifts > 0;
        out.mazeStillConnected = ZAC.LW.mazePathExists(mazeGame.maze);
      }

      // Third battlefield: build a tower, start a siege wave and let it fire.
      ZAC.LWApp.setMode('tower');
      ZAC.LWApp.startMatch();
      await sleep(450);
      const towerGame = ZAC.LWApp.getMatch();
      out.modeButtons = document.querySelectorAll('.mode-card').length;
      out.towerMode = !!(towerGame && towerGame.mode === 'tower');
      out.towerPads = document.querySelectorAll('.tower-pad').length;
      out.towerChip = document.getElementById('mode-chip').textContent;
      if (towerGame) {
        const firstPad = document.querySelector('.tower-pad[data-pad="0"]');
        if (firstPad) firstPad.click();
        await sleep(220);
        out.towerBuilt = !!(towerGame.tower.pads[0].tower);
        out.towerEnergy = +towerGame.energy.toFixed(2);
        const builtPad = document.querySelector('.tower-pad[data-pad="0"]');
        if (builtPad) builtPad.click();
        await sleep(150);
        out.towerSecondTapLevel = towerGame.tower.pads[0].tower.level;
        out.towerChoices = document.querySelectorAll('#tower-upgrades .tower-choice').length;
        const laser = document.querySelector('#tower-upgrades [data-module="laser"]');
        if (laser) laser.click();
        await sleep(150);
        out.towerModule = towerGame.tower.pads[0].tower.module;
        out.towerPreview = document.getElementById('spawn-detail').textContent;
        out.towerRanges = document.querySelectorAll('.tower-pad').length;
        const waveBtn = document.getElementById('tower-wave-btn');
        out.towerWaveButton = !!waveBtn;
        const energyBeforeWave = towerGame.energy;
        if (waveBtn) waveBtn.click();
        await sleep(280);
        out.towerWaveActive = towerGame.tower.waveActive;
        out.towerEarlyBonus = towerGame.energy > energyBeforeWave;
        await sleep(720);
        out.towerEnemies = towerGame.units.filter((u) => u.side === 'enemy').length;
        out.towerShots = towerGame.tower.shots;
        out.towerHud = /TOWER DEFENCE/.test(document.getElementById('mode-chip').textContent);
      }

      // Fourth battlefield: send pals, capture a centre tower and unlock a forward spawn.
      ZAC.LWApp.setMode('clash');
      ZAC.LWApp.startMatch();
      await sleep(450);
      const clashGame = ZAC.LWApp.getMatch();
      if (clashGame) clashGame.aiTimer = 999;
      out.clashMode = !!(clashGame && clashGame.mode === 'clash');
      out.clashRoutes = document.querySelectorAll('.clash-route-btn').length;
      out.clashTowerCount = clashGame ? clashGame.clash.towers.length : 0;
      out.clashChip = document.getElementById('mode-chip').textContent;
      out.clashNext = !!(/GOAL: BREAK THE RIVAL KEEP/.test(document.getElementById('objective-chip').textContent) && /NORTH/.test(document.querySelector('.clash-route-btn[data-route="north"]').textContent) && /SOUTH/.test(document.querySelector('.clash-route-btn[data-route="south"]').textContent));
      out.clashRecommended = !!document.querySelector('.clash-route-btn.selected');
      if (clashGame) {
        const northBtn = document.querySelector('.clash-route-btn[data-route="north"]');
        const southBtn = document.querySelector('.clash-route-btn[data-route="south"]');
        if (northBtn) northBtn.click();
        await sleep(400);
        out.clashSpawn = clashGame.units.some((u) => u.side === 'player' && u.route === 'north');
        out.clashUnitsDrawable = clashGame.units.every((u) => Number.isFinite(u.x) && Number.isFinite(u.lane) && Number.isFinite(u.yOffset));
        const clashArena = ZAC.LWApp.getArena && ZAC.LWApp.getArena();
        if (clashArena) {
          const hub = clashGame.clash.towers[2];
          const rect = document.getElementById('arena').getBoundingClientRect();
          out.clashCanvasHub = clashArena.clashHubAt(rect.left + clashArena.mapX(hub.x), rect.top + clashArena.laneYAt(hub.laneIndex)) === hub.id;
          clashGame.spawnCd = 0;
          clashGame.energy = 10;
          const beforeClick = clashGame.units.filter((u) => u.side === 'player').length;
          document.getElementById('arena').dispatchEvent(new PointerEvent('pointerdown', {
            clientX: rect.left + clashArena.mapX(hub.x),
            clientY: rect.top + clashArena.laneYAt(hub.laneIndex),
            bubbles: true
          }));
          await sleep(150);
          out.clashCanvasSend = !!(clashGame.units.filter((u) => u.side === 'player').length > beforeClick && clashGame.units.some((u) => u.side === 'player' && u.route === 'south'));
        }
        const walker = clashGame.units.find((u) => u.side === 'player');
        const startX = walker ? walker.x : 0;
        await sleep(500);
        out.clashMoves = !!walker && walker.x > startX + 0.001;
        // Rendering regression: draw the same frame with and without units and
        // require the pals to actually change pixels.
        const arena = ZAC.LWApp.getArena && ZAC.LWApp.getArena();
        const canvas = document.getElementById('arena');
        if (arena && canvas) {
          const ts = performance.now() / 1000;
          const liveUnits = clashGame.units.slice();
          const grab = () => {
            arena.draw(ts, {});
            return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          };
          clashGame.units = [];
          const without = grab();
          clashGame.units = liveUnits;
          const withUnits = grab();
          let changed = 0;
          for (let i = 0; i < withUnits.length; i += 4) if (Math.abs(withUnits[i] - without[i]) > 12) changed++;
          out.clashPixels = changed > 40;
        }
        const hub = clashGame.clash.towers[1];
        hub.hp = 1;
        const capturer = ZAC.LW.spawnFor(clashGame, 'player', 1, 'pip', { free: true }).unit;
        capturer.hubPath = [1];
        capturer.hubAt = 0;
        capturer.hubT = 0;
        capturer.x = hub.x;
        capturer.lane = hub.laneIndex;
        capturer.cd = 0;
        let waited = 0;
        while (hub.owner !== 'player' && waited < 3000) { await sleep(100); waited += 100; }
        out.clashCapture = hub.owner === 'player';
        out.clashInstant = hub.owner === 'player' && hub.hp > 0;
        await sleep(150);
        out.clashChoices = !!(northBtn && /NEXT: MASTER TOWER/.test(northBtn.textContent) && southBtn && /NEXT: SOUTH-WEST/.test(southBtn.textContent));
        const northNode = northBtn ? northBtn.querySelector('[data-route-node="1"]') : null;
        out.clashRouteDone = !!(northNode && northNode.classList.contains('done'));
        const forward = ZAC.LW.spawnFor(clashGame, 'player', 4, 'pip', { free: true });
        out.clashForward = !!(forward.ok && forward.forward);
        clashGame.spawnCd = 0;
        clashGame.energy = 10;
        const beforeNext = clashGame.units.filter((u) => u.side === 'player').length;
        if (northBtn) northBtn.click();
        await sleep(150);
        out.clashNextClick = !!(clashGame.units.filter((u) => u.side === 'player').length > beforeNext && clashGame.units.some((u) => u.side === 'player' && u.route === 'north' && u.targetHub === 3));
        clashGame.clash.towers[3].owner = 'player';
        clashGame.clash.towers[4].owner = 'player';
        await sleep(150);
        out.clashKeepStep = !!(northBtn && /BREAK RIVAL KEEP/.test(northBtn.textContent));
        clashGame.spawnCd = 0;
        clashGame.energy = 10;
        const beforeKeep = clashGame.units.filter((u) => u.side === 'player').length;
        if (northBtn) northBtn.click();
        await sleep(150);
        out.clashKeepSend = !!(clashGame.units.filter((u) => u.side === 'player').length > beforeKeep && clashGame.units.some((u) => u.side === 'player' && u.route === 'north' && u.targetHub === 6));
      }

      out.ok = !!(out.boot && out.title === 'Elemental Little Wars' && out.buddies === 6 &&
        out.buddyKingdoms === 6 && /Volcano Forge/.test(out.selectedKingdom) && /No jumping/.test(out.startFootnote) &&
        out.playerKingdom.includes(game.kingdoms.player.name) && out.enemyKingdom.includes(game.kingdoms.enemy.name) &&
        out.kingdomChip.includes(game.kingdoms.player.name) && out.kingdomChip.includes(game.kingdoms.enemy.name) &&
        out.startVisible && out.playButton && out.game && out.gameVisible && out.startHidden &&
        out.pals === 3 && out.lanes >= 3 && out.lanes <= 5 && out.laneCount === out.lanes &&
        out.gateBars === out.lanes && out.readyIndicator && out.coreText.includes('/ 360') &&
        out.canvas && out.canvas[0] > 0 && out.litSamples > 10 &&
        out.laneButton && out.unitsAfterSpawn === 1 && out.energyAfterSpawn < out.initialEnergy &&
        out.spawnCooling && /READY IN/.test(out.coolingIndicator) && out.zapsWhileCooling === 0 &&
        out.zaps === 1 && out.abilityCooldown > 0 && out.abilityDealt && out.abilityCoreProtected &&
        out.eventVisible && out.eventCards === 2 && out.eventClosed && out.resumed &&
        out.resultVisible && out.resultTitle &&
        out.fiveLane && out.fiveLaneButtons === 5 && out.fiveGateBars === 5 && out.fiveLaneSpawn === 1 && out.fiveHudFits &&
        out.modeButtons === 4 && out.mazeMode && out.mazeUi && /MAZE/.test(out.mazeChip) &&
        out.mazePath && out.mazeSpawn && out.mazeShift && out.mazeStillConnected &&
        out.coachShown && out.objectiveChip && out.mazeMapShown &&
        out.towerMode && out.towerPads === 12 && out.towerRanges === 12 && /TOWER DEFENCE/.test(out.towerChip) &&
        out.towerBuilt && out.towerEnergy < 12 && out.towerSecondTapLevel === 2 && out.towerChoices === 5 && out.towerModule === 'laser' && /NEXT W/.test(out.towerPreview || '') &&
        out.towerWaveButton && out.towerEarlyBonus && out.towerWaveActive &&
        out.towerEnemies > 0 && out.towerShots > 0 && out.towerHud &&
        out.clashMode && out.clashRoutes === 2 && out.clashTowerCount === 7 &&
        /TOWER CLASH/.test(out.clashChip) && out.clashNext && out.clashRecommended && out.clashSpawn && out.clashUnitsDrawable && out.clashPixels && out.clashCanvasHub && out.clashCanvasSend && out.clashMoves && out.clashCapture && out.clashInstant &&
        out.clashChoices && out.clashRouteDone && out.clashForward && out.clashNextClick && out.clashKeepStep && out.clashKeepSend);
      if (!out.ok) out.reason = 'One or more browser assertions failed.';
      return out;
    } catch (e) {
      out.error = String(e && e.stack || e);
      return out;
    }
  })();
}

async function freePort() {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.on('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
}
async function waitServer(url, tries) {
  for (let i = 0; i < tries; i++) {
    try { const res = await fetch(url); if (res.ok) return true; } catch (e) { }
    await sleep(200);
  }
  throw new Error('Timed out waiting for ' + url);
}
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.json();
}
async function waitJson(url, accept, tries) {
  for (let i = 0; i < tries; i++) {
    try { const data = await fetchJson(url); if (accept(data)) return data; } catch (e) { }
    await sleep(200);
  }
  throw new Error('Timed out waiting for ' + url);
}

// Phone-sized pass: start screen, HUD fit, lane/hub tap targets, no clipping.
function mobileTest() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  return (async () => {
    const out = { ok: false };
    try {
      out.viewport = [innerWidth, innerHeight];
      out.noXScroll = document.documentElement.scrollWidth <= innerWidth + 1;
      const play = document.querySelector('[data-action="play"]');
      const pr = play.getBoundingClientRect();
      out.play = [Math.round(pr.width), Math.round(pr.height)];
      out.playOnScreen = pr.left >= 0 && pr.right <= innerWidth && pr.height >= 44;
      play.click();
      await sleep(500);
      out.gameVisible = !document.getElementById('game-ui').classList.contains('hidden');
      const top = document.querySelector('.top-hud').getBoundingClientRect();
      const bottom = document.querySelector('.bottom-hud').getBoundingClientRect();
      const laneRects = [...document.querySelectorAll('.lane-btn')].map((b) => b.getBoundingClientRect());
      out.lanes = laneRects.length;
      out.laneSizes = laneRects.map((r) => [Math.round(r.width), Math.round(r.height)]);
      out.laneClipped = laneRects.some((r) => r.left < -1 || r.right > innerWidth + 1);
      out.hudFits = bottom.top > top.bottom && bottom.bottom <= innerHeight + 1 && bottom.height < innerHeight * 0.55;
      out.hudHeight = Math.round(bottom.height);
      const pause = document.querySelector('.round-pause').getBoundingClientRect();
      out.pause = [Math.round(pause.width), Math.round(pause.height)];
      // Clash hub buttons must also stay on screen and be thumb-sized.
      document.querySelector('.round-pause').click();
      await sleep(250);
      const menu = document.querySelector('[data-action="main-menu"]');
      if (menu) menu.click();
      await sleep(300);
      const card = document.querySelector('[data-mode="clash"]');
      if (card) card.click();
      await sleep(120);
      document.querySelector('[data-action="play"]').click();
      await sleep(450);
      const hubs = [...document.querySelectorAll('.clash-route-btn')].map((b) => b.getBoundingClientRect());
      out.hubs = hubs.length;
      out.hubSizes = hubs.map((r) => [Math.round(r.width), Math.round(r.height)]);
      out.hubClipped = hubs.some((r) => r.left < -1 || r.right > innerWidth + 1);
      out.routeChoice = [...document.querySelectorAll('.clash-route-btn')].map((b) => b.textContent.trim());
      out.clashMode = (ZAC.LWApp.getMatch() || {}).mode === 'clash';
      out.ok = out.noXScroll && out.playOnScreen && out.gameVisible && out.hudFits && !out.laneClipped &&
        out.lanes >= 3 && out.lanes <= 5 && out.hubs === 2 && !out.hubClipped && out.clashMode &&
        out.routeChoice.some((t) => /NORTH/.test(t)) && out.routeChoice.some((t) => /SOUTH/.test(t)) &&
        out.hubSizes.every((s) => s[0] > 120 && s[1] >= 44) &&
        out.pause[0] >= 36 && out.pause[1] >= 36;
    } catch (e) {
      out.error = String(e && e.stack || e);
    }
    return out;
  })();
}

// Landscape phone: the HUD must leave a real battlefield between top and bottom bars.
function landscapeTest() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  return (async () => {
    const out = { ok: false };
    try {
      out.viewport = [innerWidth, innerHeight];
      out.shortMedia = matchMedia('(max-height: 520px)').matches;
      document.querySelector('[data-action="play"]').click();
      await sleep(500);
      const top = document.querySelector('.top-hud').getBoundingClientRect();
      const bottom = document.querySelector('.bottom-hud').getBoundingClientRect();
      const arena = ZAC.LWApp.getArena();
      const span = arena.laneYs.length ? arena.laneYs[arena.laneYs.length - 1] - arena.laneYs[0] : 0;
      out.hud = { topBottom: Math.round(top.bottom), bottomTop: Math.round(bottom.top), height: Math.round(bottom.height) };
      out.laneSpan = Math.round(span);
      out.laneYs = arena.laneYs.map((y) => Math.round(y));
      out.noXScroll = document.documentElement.scrollWidth <= innerWidth + 1;
      out.canvasCovers = document.getElementById('arena').clientHeight === innerHeight;
      out.ok = out.shortMedia && out.noXScroll && out.canvasCovers &&
        bottom.top > top.bottom && bottom.bottom <= innerHeight + 1 && bottom.height < innerHeight * 0.65 && span >= 110;
    } catch (e) {
      out.error = String(e && e.stack || e);
    }
    return out;
  })();
}

(async () => {
  if (!chromePath) {
    console.error('BROWSER_SMOKE_SKIP: Chrome not found.');
    return;
  }
  const serverPort = await freePort();
  let debugPort = await freePort();
  while (debugPort === serverPort) debugPort = await freePort();
  const profile = path.join(os.tmpdir(), 'little-wars-smoke-' + Date.now());
  let server, chrome, ws;
  let serverLog = '';
  const exceptions = [];
  try {
    server = spawn(process.execPath, ['server.js'], {
      cwd: root,
      env: Object.assign({}, process.env, { PORT: String(serverPort) }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stdout.on('data', (d) => { serverLog += String(d); });
    server.stderr.on('data', (d) => { serverLog += String(d); });
    try { await waitServer('http://127.0.0.1:' + serverPort + '/', 50); }
    catch (e) { throw new Error(e.message + ' | ' + serverLog); }

    chrome = spawn(chromePath, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio',
      '--autoplay-policy=no-user-gesture-required', '--remote-allow-origins=*',
      '--no-first-run', '--no-default-browser-check', '--window-size=1280,900',
      '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile,
      'http://127.0.0.1:' + serverPort + '/play.html'
    ], { stdio: 'ignore' });

    const pages = await waitJson('http://127.0.0.1:' + debugPort + '/json/list',
      (list) => Array.isArray(list) && list.some((p) => p.type === 'page' && p.webSocketDebuggerUrl), 60);
    const page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
    await sleep(700);
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(String(event.data)); } catch (e) { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params && msg.params.exceptionDetails);
      }
    });
    function send(method, params) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
    await send('Runtime.enable');
    await send('Page.enable');
    const evaluated = await send('Runtime.evaluate', {
      expression: '(' + browserTest.toString() + ')()',
      awaitPromise: true,
      returnByValue: true
    });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    const result = evaluated.result.value;

    // Repeat the critical layout checks on a portrait phone viewport.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true
    });
    await send('Page.navigate', { url: 'http://127.0.0.1:' + serverPort + '/play.html' });
    await sleep(1100);
    const mobileEval = await send('Runtime.evaluate', {
      expression: '(' + mobileTest.toString() + ')()',
      awaitPromise: true,
      returnByValue: true
    });
    const mobile = mobileEval.result && mobileEval.result.value;

    // And a landscape phone: short and wide must still leave room to play.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 740, height: 390, deviceScaleFactor: 2, mobile: true
    });
    await send('Page.navigate', { url: 'http://127.0.0.1:' + serverPort + '/play.html' });
    await sleep(900);
    const landscapeEval = await send('Runtime.evaluate', {
      expression: '(' + landscapeTest.toString() + ')()',
      awaitPromise: true,
      returnByValue: true
    });
    const landscape = landscapeEval.result && landscapeEval.result.value;
    console.log(JSON.stringify({
      result,
      mobile,
      landscape,
      exceptions: exceptions.map((e) => ({
        text: e.text,
        description: e.exception && e.exception.description,
        frames: e.stackTrace && e.stackTrace.callFrames ? e.stackTrace.callFrames.slice(0, 6).map((f) => f.functionName + ' @ ' + f.url + ':' + (f.lineNumber + 1) + ':' + (f.columnNumber + 1)) : []
      }))
    }, null, 2));
    const fails = [];
    if (!result || !result.ok) fails.push(result && (result.reason || result.error) || 'browser test failed');
    if (!mobile || !mobile.ok) fails.push('mobile layout: ' + JSON.stringify(mobile));
    if (!landscape || !landscape.ok) fails.push('landscape layout: ' + JSON.stringify(landscape));
    if (exceptions.length) fails.push(exceptions.length + ' uncaught browser exception(s)');
    if (fails.length) {
      console.error('BROWSER_SMOKE_FAIL: ' + fails.join('; '));
      process.exitCode = 1;
    } else {
      console.log('BROWSER_SMOKE_PASS');
    }
  } catch (e) {
    console.error('BROWSER_SMOKE_FAIL: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    try { if (ws) ws.close(); } catch (e) { }
    try { if (chrome) chrome.kill(); } catch (e) { }
    try { if (server) server.kill(); } catch (e) { }
    await sleep(350);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
  }
})();
