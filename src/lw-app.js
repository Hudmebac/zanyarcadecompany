/* ELEMENTAL LITTLE WARS - game shell and interface. */
(function (global) {
  'use strict';
  var ZAC = (global.ZAC = global.ZAC || {});
  var LW = ZAC.LW, Audio = ZAC.Audio;
  var App = (ZAC.LWApp = {});
  var el = function (id) { return document.getElementById(id); };

  var selectedElement = 'fire';
  var selectedMode = 'lanes';
  var selectedType = 'pip';
  var selectedLane = 1;
  var selectedClashRoute = 'north';
  var selectedPad = 0;
  var match = null;
  var arena = null;
  var appPaused = false;
  var eventShowing = false;
  var resultShowing = false;
  var muted = false;
  var lastFrame = 0;
  var hudClock = 0;
  var lastFeedSig = '';
  var lastAbilitySig = '';
  var lastUpgradeSig = '';
  var lastSpawnReady = null;
  var lastDeniedAt = 0;
  var coachSeen = {};
  var lastObjective = '';

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function element() { return LW.ELEMENTS[selectedElement]; }
  function roster() { return LW.getRoster(selectedElement); }
  function ensureAudio() {
    Audio.init();
    Audio.setVolumes({ master: muted ? 0 : 0.7, music: 0.45, sfx: 0.72 });
  }
  function toast(text, type) {
    var layer = el('toasts');
    if (!layer) return;
    var now = Date.now();
    toast._last = toast._last || {};
    if (toast._last[text] && now - toast._last[text] < 1600) return;
    toast._last[text] = now;
    while (layer.children.length >= 3) layer.removeChild(layer.firstChild);
    var node = document.createElement('div');
    node.className = 'toast ' + (type || 'info');
    node.textContent = text;
    layer.appendChild(node);
    setTimeout(function () { node.classList.add('out'); }, 1700);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 2250);
  }
  function setSoundButton() {
    var b = el('sound-btn');
    if (b) {
      b.textContent = muted ? '🔇' : '🔊';
      b.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    }
  }

  function renderBuddies() {
    var grid = el('buddy-grid');
    if (!grid) return;
    grid.innerHTML = LW.ELEMENT_ORDER.map(function (id) {
      var e = LW.ELEMENTS[id];
      var kingdom = LW.kingdomFor(id);
      return '<button class="buddy-card' + (id === selectedElement ? ' selected' : '') + '" data-action="buddy" data-id="' + id + '" style="--el:' + e.color + ';--el-light:' + e.light + '">' +
        '<span class="buddy-emoji">' + e.emoji + '</span>' +
        '<span class="buddy-name">' + esc(e.buddy) + '</span>' +
        '<span class="buddy-element">' + esc(e.name) + '</span>' +
        '<span class="buddy-kingdom">' + e.emoji + ' ' + esc(kingdom.name) + '</span>' +
        '<span class="buddy-blurb">' + esc(e.blurb) + '</span>' +
        '<span class="buddy-ability">' + e.ability.emoji + ' ' + esc(e.ability.name) + '</span>' +
        '<span class="buddy-trait">' + esc(e.trait) + '</span>' +
        '<span class="buddy-matchup">⚔ ' + esc(LW.ELEMENTS[LW.strongAgainst(id)].name) + ' · 🛡 ' + e.stats.defense.toFixed(2) + 'x</span>' +
        '</button>';
    }).join('');
    var label = el('selected-label');
    if (label) label.textContent = element().buddy + ' the ' + element().name + ' buddy · guard ' + element().stats.defense.toFixed(2) + 'x';
    var realm = el('selected-kingdom');
    if (realm) {
      var k = LW.kingdomFor(selectedElement);
      realm.textContent = element().emoji + ' ' + k.name + ' · ' + k.terrain + ' · spawn gate: ' + k.spawn;
    }
  }

  function renderModes() {
    var cards = document.querySelectorAll('.mode-card');
    Array.prototype.forEach.call(cards, function (card) {
      card.classList.toggle('selected', card.dataset.mode === selectedMode);
    });
    var blurb = el('mode-blurb');
    if (blurb) {
      blurb.textContent = selectedMode === 'maze'
        ? 'Shifting Maze · random 8×8 to 25×25 labyrinth. Every 12–15s the shift cuts your live route and opens new corridors; gold trail marks the way.'
        : selectedMode === 'tower'
          ? 'Tower Defence · 12 pads, 12 starting spark. Kills pay and build a bounty streak; leaks reset it. Upgrade or sell to reposition, and hold 8 waves.'
          : selectedMode === 'clash'
            ? 'Tower Clash · pick NORTH or SOUTH. Both rails meet at the Master; break a tower to take it and push the keep.'
            : 'Simple Lanes · 3–5 straight raised platforms. Fast, readable and classic.';
    }
  }

  function renderRoster() {
    var wrap = el('pal-roster');
    if (!wrap) return;
    var towerMode = !!(match && match.mode === 'tower');
    var cards = towerMode ? LW.getTowerRoster(selectedElement) : roster();
    wrap.innerHTML = cards.map(function (c) {
      var subtitle = towerMode ? (c.damageType ? c.damageType.toUpperCase() + ' · ' + c.role : c.role) : c.role;
      return '<button class="pal-card" data-action="pal" data-type="' + c.id + '" title="' + esc(towerMode ? c.hint : c.role) + '" style="--el:' + element().color + ';--el-light:' + element().light + '">' +
        '<span class="pal-icon pal-' + c.id + '">' + (c.id === 'pip' ? '●' : c.id === 'chonk' ? '⬢' : '✦') + '</span>' +
        '<span class="pal-info"><b>' + esc(c.name) + '</b><small>' + esc(subtitle) + '</small></span>' +
        '<span class="pal-cost">' + c.cost + '<i>⚡</i></span>' +
        '</button>';
    }).join('');
  }

  function renderLanes() {
    var wrap = el('lane-buttons');
    if (!wrap) return;
    wrap.className = 'lane-buttons';
    if (match && match.mode === 'tower') {
      var towerInfo = LW.getTowerStats(match.playerElement, selectedType);
      wrap.className = 'lane-buttons tower-pads';
      wrap.innerHTML = match.tower.pads.map(function (pad, i) {
        var tower = pad.tower;
        var towerLabel = tower ? (tower.type === 'pip' ? 'SPIRE' : tower.type === 'chonk' ? 'BASTION' : 'COIL') + (tower.level > 1 ? ' ' + tower.level : '') : 'PAD';
        var nextCost = tower ? (tower.level >= 3 ? 0 : tower.upgradeCost) : (towerInfo ? towerInfo.cost : 0);
        var mod = tower && tower.module ? LW.TOWER_MODULES[tower.module] : null;
        return '<button class="lane-btn tower-pad' + (i === selectedPad ? ' selected' : '') + (tower ? ' built' : '') + (mod ? ' has-module' : '') + (tower && tower.level >= 3 ? ' maxed' : '') + (match.energy < nextCost ? ' short' : '') + '" data-action="tower-pad" data-pad="' + i + '" aria-label="Build or upgrade tower pad ' + pad.id + '">' +
          '<span class="pad-top"><b>' + pad.id + '</b><small>' + towerLabel + '</small></span>' +
          '<span class="pad-glyph">' + (mod ? mod.icon : tower ? (tower.type === 'pip' ? '▲' : tower.type === 'chonk' ? '⬢' : '✦') : '＋') + '</span>' +
          '<span class="pad-cost">' + (tower ? (tower.level >= 3 ? 'MAX' : '▲' + tower.upgradeCost) : (towerInfo ? towerInfo.cost + '⚡' : '')) + '</span>' +
          '</button>';
      }).join('');
      return;
    }
    if (match && match.mode === 'clash') {
      wrap.className = 'lane-buttons clash-routes';
      wrap.innerHTML = ['north', 'south'].map(function (route) {
        var ids = route === 'north' ? [1, 3, 4] : [2, 3, 5];
        var labels = { 1: 'NW', 2: 'SW', 3: '★', 4: 'NE', 5: 'SE' };
        return '<button class="clash-route-btn' + (route === selectedClashRoute ? ' selected' : '') + '" data-action="clash-route" data-route="' + route + '" aria-label="Send pals down the ' + route + ' rail">' +
          '<span class="route-head"><b>' + (route === 'north' ? '▲ NORTH' : '▼ SOUTH') + '</b><small>' + (route === 'north' ? 'TOP RAIL' : 'BOTTOM RAIL') + '</small></span>' +
          '<span class="route-track">' + ids.map(function (id, i) {
            return '<i data-route-node="' + id + '">' + labels[id] + '</i>' + (i < ids.length - 1 ? '<em>›</em>' : '');
          }).join('') + '</span>' +
          '<span class="route-next"><b data-route-next>NEXT TOWER</b><small data-route-state>--</small></span>' +
          '</button>';
      }).join('');
      return;
    }
    if (match && match.mode === 'maze') {
      var you = match.gates.player[0];
      var foe = match.gates.enemy[0];
      wrap.innerHTML = '<button class="lane-btn maze-lane-btn selected" data-action="lane" data-lane="0" aria-label="Send a pal into the shifting maze">' +
        '<span class="lane-top"><b>⚑</b><small>' + match.maze.cols + '×' + match.maze.rows + ' MAZE</small></span>' +
        '<span class="lane-gatebars"><i class="you" data-gate="player"></i><i class="foe" data-gate="enemy"></i></span>' +
        '<span class="lane-gate-hp"><em data-hp="player">' + (you.hp > 0 ? Math.ceil(you.hp) : 'OPEN') + '</em><span>·</span><em data-hp="enemy">' + (foe.hp > 0 ? Math.ceil(foe.hp) : 'OPEN') + '</em></span>' +
        '</button>';
      return;
    }
    var names = match ? match.laneNames : LW.getLaneNames(3);
    wrap.className = 'lane-buttons lane-grid';
    wrap.innerHTML = names.map(function (name, i) {
      var you = match ? match.gates.player[i] : { hp: 0, max: 1 };
      var foe = match ? match.gates.enemy[i] : { hp: 0, max: 1 };
      return '<button class="lane-btn' + (i === selectedLane ? ' selected' : '') + '" data-action="lane" data-lane="' + i + '" aria-label="Spawn in ' + esc(name) + ' lane">' +
        '<span class="lane-top"><b>' + (i + 1) + '</b><small>' + esc(name) + '</small><i class="lane-count" data-count>0v0</i></span>' +
        '<span class="lane-gatebars"><i class="you" data-gate="player"></i><i class="foe" data-gate="enemy"></i></span>' +
        '<span class="lane-gate-hp"><em class="you">YOU <b data-hp="player">' + (you.hp > 0 ? Math.ceil(you.hp) : 'OPEN') + '</b></em><em class="foe">RIVAL <b data-hp="enemy">' + (foe.hp > 0 ? Math.ceil(foe.hp) : 'OPEN') + '</b></em></span>' +
        '</button>';
    }).join('');
  }

  function syncLaneSelection() {
    Array.prototype.forEach.call(document.querySelectorAll('.lane-btn'), function (btn) {
      btn.classList.toggle('selected', Number(btn.dataset.lane) === selectedLane);
    });
  }

  function renderAbility() {
    var b = el('ability-btn');
    if (!b || !match) return;
    var ab = LW.abilityFor(match.playerElement);
    var cd = Math.ceil(match.abilityCd);
    var sig = ab.id + ':' + cd;
    if (sig !== lastAbilitySig) {
      lastAbilitySig = sig;
      b.innerHTML = '<span class="ability-icon">' + ab.emoji + '</span><span class="ability-copy"><b>' + esc(ab.name) + '</b><small>' + (cd > 0 ? cd + 's' : 'Ready!') + '</small></span>';
    }
    b.disabled = cd > 0 || !!match.result;
    b.classList.toggle('cooling', cd > 0);
  }

  function renderFeed() {
    var feed = el('feed');
    if (!feed) return;
    var feedSig = match.feed.slice(0, 3).map(function (f) { return f.text; }).join('|');
    if (feedSig !== lastFeedSig) {
      lastFeedSig = feedSig;
      feed.innerHTML = match.feed.slice(0, 3).map(function (f) { return '<div>' + esc(f.text) + '</div>'; }).join('');
    }
  }

  function renderTowerHud() {
    var t = match.tower;
    var info = LW.getTowerStats(match.playerElement, selectedType) || LW.getTowerStats(match.playerElement, 'pip');
    var pad = t.pads[selectedPad] || t.pads[0];
    var built = pad ? pad.tower : null;
    var padCost = built ? (built.level >= 3 ? 0 : built.upgradeCost) : (info ? info.cost : 0);
    var canAfford = match.energy >= padCost;
    var shortName = selectedType === 'pip' ? 'SPIRE' : selectedType === 'chonk' ? 'BASTION' : 'COIL';
    var builtShort = built ? (built.type === 'pip' ? 'SPIRE' : built.type === 'chonk' ? 'BASTION' : 'COIL') : 'EMPTY';

    var eFill = el('enemy-base-fill');
    var eNum = el('enemy-base-number');
    if (eFill) eFill.style.width = clamp((t.cleared + (t.waveActive ? 0.35 : 0)) / t.totalWaves * 100, 0, 100) + '%';
    if (eNum) eNum.textContent = 'WAVE ' + Math.min(t.wave, t.totalWaves) + ' / ' + t.totalWaves;

    var modeChip = el('mode-chip');
    if (modeChip) {
      modeChip.textContent = '🏰 TOWER DEFENCE · ' + t.cleared + '/' + t.totalWaves + ' HELD';
      modeChip.className = 'mode-chip tower';
    }
    var phaseChip = el('phase-chip');
    if (phaseChip) {
      phaseChip.textContent = t.waveActive
        ? 'SIEGE · ' + (match.units.length + t.queue.length) + ' LEFT'
        : t.cleared >= t.totalWaves ? 'ALL WAVES HELD' : 'NEXT WAVE ' + Math.max(0, Math.ceil(t.waveTimer)) + 's';
      phaseChip.classList.remove('final');
    }
    var eventChip = el('event-chip');
    if (eventChip) {
      var bounty = LW.towerBounty ? LW.towerBounty(match) : 1;
      eventChip.textContent = t.towers + ' TOWERS · STREAK ' + (t.streak || 0) + ' ×' + bounty.toFixed(2).replace(/0$/, '') + ' · +' + (t.sparkEarned || 0) + '⚡';
      eventChip.classList.remove('ready');
    }

    var cards = document.querySelectorAll('.pal-card');
    Array.prototype.forEach.call(cards, function (card) {
      var type = card.dataset.type;
      var cardInfo = LW.getTowerStats(match.playerElement, type);
      card.classList.toggle('selected', type === selectedType);
      card.classList.toggle('short', !!cardInfo && match.energy < cardInfo.cost);
    });

    var hint = el('lane-hint');
    if (hint) {
      var covers = pad ? (LW.towerCoverage(match, selectedPad) || 0) : 0;
      var modInfo = built && built.module ? LW.TOWER_MODULES[built.module] : null;
      hint.textContent = built
        ? 'PAD ' + pad.id + ' · Lv ' + built.level + ' ' + built.name + (modInfo ? ' · ' + modInfo.icon + ' ' + modInfo.name : '') + ' · ' + built.damage + ' dmg · ' + built.range.toFixed(2) + ' range · covers ' + covers + ' tiles' + (built.level < 3 ? ' · tap the pad again to level' : '')
        : (info
          ? info.name + ' (' + info.damageType + ') · ' + info.damage + ' dmg · ' + info.range + ' range · would cover ' + (LW.towerCoverage(match, selectedPad, info.range) || 0) + ' tiles · build, then choose an upgrade'
          : 'Tap a build pad to build a tower');
    }
    var keyHints = el('key-hints');
    if (keyHints) keyHints.textContent = '1–9 pads · Q W E towers · Enter start wave · Space power';

    var spawnLabel = el('spawn-label');
    if (spawnLabel) spawnLabel.textContent = pad ? 'PAD ' + pad.id + ' · ' + builtShort : 'BUILD PAD';
    var spawnState = el('spawn-state');
    if (spawnState) {
      var stateText = built
        ? (built.level >= 3 ? 'MAX LEVEL' : 'LEVEL ' + (built.level + 1) + ' · ' + built.upgradeCost + '⚡')
        : (!canAfford ? 'NEED ' + Math.ceil(padCost - match.energy) + ' SPARK' : 'BUILD ' + shortName);
      if (spawnState.textContent !== stateText) spawnState.textContent = stateText;
      spawnState.classList.toggle('ready', canAfford);
      spawnState.classList.toggle('charging', !canAfford);
    }
    var spawnMeter = el('spawn-meter');
    if (spawnMeter) spawnMeter.style.width = Math.round(clamp((t.cleared + (t.waveActive ? 0.5 : 0)) / t.totalWaves, 0, 1) * 100) + '%';
    var spawnDetail = el('spawn-detail');
    var preview = LW.getTowerWavePreview(match);
    if (spawnDetail) {
      if (t.waveActive) {
        spawnDetail.textContent = 'WAVE ' + t.wave + ' · ' + (match.units.length + t.queue.length) + ' LEFT · TAP PADS TO BUILD';
      } else if (preview) {
        var bountyNow = LW.towerBounty ? LW.towerBounty(match) : 1;
        spawnDetail.textContent = 'NEXT W' + preview.wave + ': ' + preview.kinds.runner + '🏃 · ' + preview.kinds.brute + '🛡️ · ' + preview.kinds.shielder + '🔮' + (preview.boss ? ' · 👹 BOSS' : '') + ' · BOUNTY ×' + bountyNow.toFixed(2).replace(/0$/, '') + ' · ' + preview.tip;
      } else {
        spawnDetail.textContent = 'ALL WAVES HELD';
      }
    }

    var waveBtn = el('tower-wave-btn');
    if (waveBtn) {
      var canStart = !t.waveActive && t.cleared < t.totalWaves && !match.result;
      waveBtn.classList.toggle('hidden', !canStart);
      waveBtn.disabled = !canStart;
      if (canStart) {
        var earlyGain = LW.towerEarlyBonus ? LW.towerEarlyBonus(match) : 0;
        waveBtn.textContent = 'START WAVE ' + (t.wave + 1) + (t.waveTimer > 0.5 ? ' · +' + earlyGain + '⚡' : '');
      }
    }
    var upgradeBox = el('tower-upgrades');
    if (upgradeBox) {
      var upgradeSig = built
        ? selectedPad + ':' + built.level + ':' + (built.module || '-') + ':' + Math.floor(match.energy)
        : 'empty:' + selectedPad;
      if (upgradeSig === lastUpgradeSig) { /* unchanged */ }
      else if (built) {
        lastUpgradeSig = upgradeSig;
        var parts = [];
        var tags = { laser: 'DAMAGE · RANGE · PIERCE', slow: 'SUPPORT · 45% CHILL', aoe: 'DAMAGE · WIDE SPLASH', troops: 'SUPPORT · HEARTH GUARD' };
        var preview = LW.towerUpgradePreview ? LW.towerUpgradePreview(built) : null;
        parts.push('<div class="upgrade-head"><b>PAD ' + pad.id + ' · ' + esc(built.name) + '</b><small>LV ' + built.level + ' / 3</small></div>');
        if (preview) {
          parts.push('<button class="tower-choice level' + (match.energy < preview.cost ? ' short' : '') + '" data-action="upgrade-tower" type="button" title="Level ' + preview.level + ' for ' + preview.cost + ' spark">' +
            '<b>▲ LEVEL ' + preview.level + '</b>' +
            '<small>' + preview.cost + '⚡ · ' + built.damage + '→' + preview.damage + ' DMG · ' + built.range.toFixed(1) + '→' + preview.range.toFixed(1) + ' RNG</small></button>');
        } else {
          parts.push('<button class="tower-choice level maxed" type="button" disabled><b>▲ MAX LEVEL</b><small>FULLY UPGRADED</small></button>');
        }
        if (!built.module) {
          parts.push('<div class="upgrade-sub">SPECIALISE — PICK ONE</div>');
          Object.keys(LW.TOWER_MODULES).forEach(function (id) {
            var mod = LW.TOWER_MODULES[id];
            var cost = LW.towerModuleCost(built, id);
            parts.push('<button class="tower-choice' + (match.energy < cost ? ' short' : '') + '" data-action="tower-module" data-module="' + id + '" type="button" style="--choice:' + mod.color + '" title="' + esc(mod.desc) + '"><b>' + mod.icon + ' ' + mod.name + '</b><small>' + cost + '⚡ · ' + tags[id] + '</small></button>');
          });
        } else {
          var installed = LW.TOWER_MODULES[built.module];
          parts.push('<div class="upgrade-sub">SPECIALITY INSTALLED</div>');
          parts.push('<button class="tower-choice active" type="button" disabled style="--choice:' + installed.color + '"><b>' + installed.icon + ' ' + installed.name + '</b><small>' + tags[built.module] + '</small></button>');
        }
        upgradeBox.innerHTML = parts.join('');
        upgradeBox.classList.remove('hidden');
      } else {
        lastUpgradeSig = upgradeSig;
        upgradeBox.innerHTML = '';
        upgradeBox.classList.add('hidden');
      }
    }
    var sellBtn = el('tower-sell-btn');
    if (sellBtn) {
      var canSell = !!(built && !match.result);
      sellBtn.classList.toggle('hidden', !canSell);
      sellBtn.disabled = !canSell;
      if (canSell) sellBtn.textContent = 'SELL +' + Math.max(2, Math.round((built.spent || built.baseCost || 3) * 0.6)) + '⚡';
    }

    var panel = el('lane-panel');
    if (panel) {
      panel.classList.add('tower-mode');
      panel.classList.toggle('spawn-ready', canAfford);
      panel.classList.toggle('spawn-charging', !canAfford);
      lastSpawnReady = canAfford;
    }

    var padBtns = document.querySelectorAll('.tower-pad');
    Array.prototype.forEach.call(padBtns, function (btn) {
      var idx = Number(btn.dataset.pad);
      var p = t.pads[idx];
      if (!p) return;
      var tower = p.tower;
      var cost = tower ? (tower.level >= 3 ? 0 : tower.upgradeCost) : (info ? info.cost : 0);
      btn.classList.toggle('selected', idx === selectedPad);
      btn.classList.toggle('built', !!tower);
      btn.classList.toggle('maxed', !!(tower && tower.level >= 3));
      btn.classList.toggle('short', match.energy < cost);
      var costNode = btn.querySelector('.pad-cost');
      if (costNode) {
        var next = tower ? (tower.level >= 3 ? 'MAX' : '▲' + tower.upgradeCost) : (info ? info.cost + '⚡' : '');
        if (costNode.textContent !== next) costNode.textContent = next;
      }
      var labelNode = btn.querySelector('.pad-top small');
      if (labelNode && tower) {
        var shortType = tower.type === 'pip' ? 'SPIRE' : tower.type === 'chonk' ? 'BASTION' : 'COIL';
        var nextLabel = shortType + (tower.level > 1 ? ' ' + tower.level : '');
        if (labelNode.textContent !== nextLabel) labelNode.textContent = nextLabel;
      }
    });

    renderAbility();
    renderFeed();
  }

  function renderClashHud() {
    var c = match.clash;
    var playerTowers = LW.clashOwnedCount(match, 'player');
    var master = LW.clashHubFor ? LW.clashHubFor(match, 3) : null;
    var masterOwner = master ? master.owner : 'neutral';

    var modeChip = el('mode-chip');
    if (modeChip) {
      modeChip.textContent = '⚔ TOWER CLASH · ' + playerTowers + '/5 TOWERS';
      modeChip.className = 'mode-chip clash';
    }
    var northTarget = LW.clashRouteTarget ? LW.clashRouteTarget(match, 'player', 'north') : null;
    var southTarget = LW.clashRouteTarget ? LW.clashRouteTarget(match, 'player', 'south') : null;
    var phaseChip = el('phase-chip');
    if (phaseChip) {
      phaseChip.textContent = masterOwner === 'player' ? 'KEEP: OPEN'
        : masterOwner === 'enemy' ? 'MASTER: RIVAL' : 'KEEP: LOCKED';
      phaseChip.classList.toggle('final', masterOwner === 'player');
    }
    var objective = el('objective-chip');
    if (objective) objective.textContent = 'GOAL: BREAK THE RIVAL KEEP';
    var eventChip = el('event-chip');
    if (eventChip) {
      eventChip.textContent = 'PICK A RAIL: NORTH OR SOUTH';
      eventChip.classList.add('ready');
    }

    var spawn = LW.getSpawnStatus(match, selectedType);
    var routeButtons = document.querySelectorAll('.clash-route-btn');
    Array.prototype.forEach.call(routeButtons, function (btn) {
      var route = btn.dataset.route === 'south' ? 'south' : 'north';
      var targetId = route === 'south' ? southTarget : northTarget;
      var target = targetId === null ? null : c.towers[targetId];
      var routeIds = route === 'north' ? [1, 3, 4] : [2, 3, 5];
      btn.classList.toggle('selected', route === selectedClashRoute);
      btn.classList.toggle('ready', spawn.ready);
      btn.classList.toggle('charging', !spawn.ready);
      var nextNode = btn.querySelector('[data-route-next]');
      var stateNode = btn.querySelector('[data-route-state]');
      if (nextNode) nextNode.textContent = target
        ? (target.kind === 'keep' ? 'BREAK RIVAL KEEP' : 'NEXT: ' + target.name.toUpperCase())
        : 'NEXT TOWER';
      if (stateNode) stateNode.textContent = target ? Math.ceil(target.hp) + ' HP' : '--';
      routeIds.forEach(function (id) {
        var dot = btn.querySelector('[data-route-node="' + id + '"]');
        var tower = c.towers[id];
        if (!dot || !tower) return;
        dot.classList.toggle('done', tower.owner === 'player');
        dot.classList.toggle('rival', tower.owner === 'enemy');
        dot.classList.toggle('current', id === targetId);
      });
    });

    var cards = document.querySelectorAll('.pal-card');
    var selectedInfo = roster().filter(function (x) { return x.id === selectedType; })[0];
    Array.prototype.forEach.call(cards, function (card) {
      var type = card.dataset.type;
      var info = roster().filter(function (x) { return x.id === type; })[0];
      card.classList.toggle('selected', type === selectedType);
      card.classList.toggle('short', !!info && match.energy < info.cost);
    });

    var routeTargetId = selectedClashRoute === 'south' ? southTarget : northTarget;
    var launch = LW.clashRouteSpawnHub && routeTargetId !== null ? LW.clashRouteSpawnHub(match, 'player', selectedClashRoute, routeTargetId) : null;
    var strandPath = launch && LW.clashPath && routeTargetId !== null ? LW.clashPath(match, launch.id, routeTargetId) : null;
    var forward = !!(launch && launch.id !== 0);
    var hint = el('lane-hint');
    if (hint) hint.textContent = 'Choose NORTH or SOUTH. Pals walk that rail, break the next tower, and it becomes yours.';
    var keyHints = el('key-hints');
    if (keyHints) keyHints.textContent = '1 NORTH · 2 SOUTH · Q W E pals · Space power';

    var spawnLabel = el('spawn-label');
    if (spawnLabel) spawnLabel.textContent = launch ? (forward ? 'SEND FROM ' + launch.name.toUpperCase() : 'SEND FROM HOME') : 'HOME GATE';
    var spawnState = el('spawn-state');
    if (spawnState) {
      var stateText = spawn.ready ? 'READY TO SEND' : spawn.reason === 'cooldown' ? 'READY IN ' + spawn.cooldown.toFixed(1) + 's' : 'NEED ' + spawn.needed + ' SPARK';
      if (spawnState.textContent !== stateText) spawnState.textContent = stateText;
      spawnState.classList.toggle('ready', spawn.ready);
      spawnState.classList.toggle('charging', !spawn.ready);
    }
    var spawnMeter = el('spawn-meter');
    if (spawnMeter) spawnMeter.style.width = Math.round(spawn.progress * 100) + '%';
    var spawnDetail = el('spawn-detail');
    if (spawnDetail) {
      var hops = strandPath ? Math.max(0, strandPath.length - 1) : 0;
      spawnDetail.textContent = selectedInfo
        ? selectedInfo.name + ' ' + selectedInfo.cost + '⚡ · ' + hops + ' strand' + (hops === 1 ? '' : 's') + ' · ' + selectedClashRoute.toUpperCase() + ' rail'
        : 'Choose NORTH or SOUTH';
    }

    var panel = el('lane-panel');
    if (panel) {
      panel.classList.remove('tower-mode', 'maze-mode');
      panel.classList.toggle('spawn-ready', spawn.ready);
      panel.classList.toggle('spawn-charging', !spawn.ready);
      if (lastSpawnReady !== spawn.ready) {
        if (spawn.ready) {
          panel.classList.remove('just-ready');
          void panel.offsetWidth;
          panel.classList.add('just-ready');
          setTimeout(function () { panel.classList.remove('just-ready'); }, 600);
        }
        lastSpawnReady = spawn.ready;
      }
    }

    renderAbility();
    renderFeed();
  }

  function drawMazeMinimap() {
    var canvas = el('maze-map');
    if (!canvas || !match || match.mode !== 'maze' || !match.maze) return;
    var maze = match.maze;
    var ctx = canvas.getContext('2d');
    var size = canvas.width;
    var cell = Math.max(2, Math.floor(size / Math.max(maze.cols, maze.rows)));
    var ox = (size - cell * maze.cols) / 2;
    var oy = (size - cell * maze.rows) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#3F4C3C';
    ctx.fillRect(0, 0, size, size);
    for (var y = 0; y < maze.rows; y++) {
      for (var x = 0; x < maze.cols; x++) {
        if (!LW.mazeCellOpen(maze, x, y)) continue;
        ctx.fillStyle = '#FBF0D2';
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 0.5, cell - 0.5);
      }
    }
    if (maze.playerPath) {
      ctx.fillStyle = '#FFC93C';
      maze.playerPath.forEach(function (p) {
        ctx.fillRect(ox + p.x * cell + cell * 0.25, oy + p.y * cell + cell * 0.25, Math.max(1.5, cell * 0.5), Math.max(1.5, cell * 0.5));
      });
    }
    ctx.fillStyle = '#57C74B';
    ctx.fillRect(ox + maze.home.x * cell, oy + maze.home.y * cell, cell, cell);
    ctx.fillStyle = '#FF7A5C';
    ctx.fillRect(ox + maze.foe.x * cell, oy + maze.foe.y * cell, cell, cell);
    match.units.forEach(function (u) {
      ctx.fillStyle = u.side === 'player' ? '#2E8B57' : '#C0392B';
      ctx.beginPath();
      ctx.arc(ox + (u.gx + 0.5) * cell, oy + (u.gy + 0.5) * cell, Math.max(1.2, cell * 0.28), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderHud() {
    if (!match) return;
    var gameUi = el('game-ui');
    if (gameUi) gameUi.classList.toggle('tower-mode', match.mode === 'tower');
    var mapWrap = el('maze-map-wrap');
    if (mapWrap) mapWrap.classList.toggle('hidden', match.mode !== 'maze');
    var objective = el('objective-chip');
    if (objective) {
      var objectiveText = match.mode === 'tower' ? 'GOAL: HOLD 8 WAVES'
        : match.mode === 'clash' ? 'GOAL: BREAK THE RIVAL KEEP'
          : match.mode === 'maze' ? 'GOAL: EXIT GATE → CORE'
            : 'GOAL: GATE → CORE';
      if (objective.textContent !== objectiveText) objective.textContent = objectiveText;
    }
    var pMax = match.baseMax.player, eMax = match.baseMax.enemy;
    var pPct = clamp(match.base.player / pMax * 100, 0, 100);
    var ePct = clamp(match.base.enemy / eMax * 100, 0, 100);
    var pFill = el('player-base-fill'), eFill = el('enemy-base-fill');
    if (pFill) pFill.style.width = pPct + '%';
    if (eFill) eFill.style.width = ePct + '%';
    var pNum = el('player-base-number'), eNum = el('enemy-base-number');
    if (pNum) pNum.textContent = Math.ceil(match.base.player) + ' / ' + pMax;
    if (eNum) eNum.textContent = Math.ceil(match.base.enemy) + ' / ' + eMax;
    var enemyElement = LW.ELEMENTS[match.enemyElement];
    var playerKingdom = match.kingdoms ? match.kingdoms.player : LW.kingdomFor(match.playerElement);
    var enemyKingdom = match.kingdoms ? match.kingdoms.enemy : LW.kingdomFor(match.enemyElement);
    var pName = el('player-name'), eName = el('enemy-name');
    if (pName) pName.textContent = element().buddy + ' · ' + element().name;
    if (eName) eName.textContent = enemyElement.buddy + ' · ' + enemyElement.name;
    var pKingdom = el('player-kingdom'), eKingdom = el('enemy-kingdom');
    if (pKingdom) pKingdom.textContent = element().emoji + ' ' + playerKingdom.name;
    if (eKingdom) eKingdom.textContent = enemyElement.emoji + ' ' + enemyKingdom.name;
    var kingdomChip = el('kingdom-chip');
    if (kingdomChip) kingdomChip.textContent = playerKingdom.name + ' ↔ ' + enemyKingdom.name;
    var modeChip = el('mode-chip');
    if (modeChip) {
      if (match.mode === 'maze') {
        modeChip.textContent = '🌀 MAZE ' + match.maze.cols + '×' + match.maze.rows + ' · ' + (match.maze.warning ? 'SHIFTING!' : 'SHIFT ' + Math.max(0, Math.ceil(match.maze.shiftTimer)) + 's') + ' · ROUTE ' + (match.maze.playerPath ? match.maze.playerPath.length : 0);
        modeChip.className = 'mode-chip maze';
      } else {
        modeChip.textContent = '🛤️ SIMPLE LANES';
        modeChip.className = 'mode-chip';
      }
    }

    var time = el('match-time');
    if (time) time.textContent = fmtTime(match.elapsed);
    var matchInfo = LW.matchup(match.playerElement, match.enemyElement);
    var matchupChip = el('matchup-chip');
    if (matchupChip) {
      matchupChip.textContent = element().emoji + ' ' + element().name + ' vs ' + enemyElement.emoji + ' ' + enemyElement.name + ' · ' + matchInfo.label;
      matchupChip.className = 'matchup-chip ' + matchInfo.label.toLowerCase();
    }
    var phaseChip = el('phase-chip');
    if (phaseChip) {
      phaseChip.textContent = match.finalBounce ? 'FINAL BOUNCE!' : 'Final Bounce in ' + fmtTime(Math.max(0, match.finalBounceAt - match.elapsed));
      phaseChip.classList.toggle('final', !!match.finalBounce);
    }
    var event = el('event-chip');
    if (event) {
      event.textContent = match.eventOffer ? 'EVENT!' : 'Event in ' + Math.max(0, Math.ceil(match.eventTimer)) + 's';
      event.classList.toggle('ready', !!match.eventOffer);
    }
    var spark = el('spark-count'), pips = el('spark-pips');
    if (spark) spark.textContent = Math.floor(match.energy) + ' / ' + match.maxEnergy;
    if (pips) {
      var html = '';
      for (var i = 0; i < match.maxEnergy; i++) {
        html += '<i' + (i < Math.floor(match.energy) ? ' class="full"' : '') + '></i>';
      }
      if (pips.innerHTML !== html) pips.innerHTML = html;
    }

    if (match.mode === 'clash') {
      renderClashHud();
      return;
    }
    if (match.mode === 'tower') {
      renderTowerHud();
      return;
    }

    var spawn = LW.getSpawnStatus(match, selectedType);
    var laneButtons = document.querySelectorAll('.lane-btn');
    Array.prototype.forEach.call(laneButtons, function (btn) {
      var lane = Number(btn.dataset.lane);
      var you = match.gates.player[lane];
      var foe = match.gates.enemy[lane];
      var youBar = btn.querySelector('[data-gate="player"]');
      var foeBar = btn.querySelector('[data-gate="enemy"]');
      var youHp = btn.querySelector('[data-hp="player"]');
      var foeHp = btn.querySelector('[data-hp="enemy"]');
      if (youBar) youBar.style.width = clamp(you.hp / you.max * 100, 0, 100) + '%';
      if (foeBar) foeBar.style.width = clamp(foe.hp / foe.max * 100, 0, 100) + '%';
      if (youHp) youHp.textContent = you.hp > 0 ? Math.ceil(you.hp) : 'OPEN';
      if (foeHp) foeHp.textContent = foe.hp > 0 ? Math.ceil(foe.hp) : 'OPEN';
      btn.classList.toggle('selected', lane === selectedLane);
      btn.classList.toggle('your-breached', you.hp <= 0);
      btn.classList.toggle('enemy-breached', foe.hp <= 0);
      btn.classList.toggle('cooling', spawn.reason === 'cooldown');
      var mine = 0, theirs = 0;
      match.units.forEach(function (u) {
        if (u.lane !== lane) return;
        if (u.side === 'player') mine++; else theirs++;
      });
      var countNode = btn.querySelector('[data-count]');
      var countText = mine + 'v' + theirs;
      if (countNode && countNode.textContent !== countText) countNode.textContent = countText;
      btn.title = 'Your gate ' + (you.hp > 0 ? Math.ceil(you.hp) : 'OPEN') + ' · Rival gate ' + (foe.hp > 0 ? Math.ceil(foe.hp) : 'OPEN') + ' · ' + countText + ' pals';
    });
    var pushLane = -1;
    if (match.mode !== 'maze') {
      var lowest = Infinity;
      match.gates.enemy.forEach(function (g, i) {
        if (g.hp <= 0) { pushLane = i; lowest = -1; return; }
        if (lowest !== -1 && g.hp < lowest) { lowest = g.hp; pushLane = i; }
      });
      Array.prototype.forEach.call(laneButtons, function (btn) {
        btn.classList.toggle('focus', Number(btn.dataset.lane) === pushLane);
      });
    }
    if (match.mode === 'maze') drawMazeMinimap();

    var cards = document.querySelectorAll('.pal-card');
    Array.prototype.forEach.call(cards, function (card) {
      var type = card.dataset.type;
      var info = roster().filter(function (x) { return x.id === type; })[0];
      card.classList.toggle('selected', type === selectedType);
      card.classList.toggle('short', info && match.energy < info.cost);
    });
    var hint = el('lane-hint');
    var choice = roster().filter(function (x) { return x.id === selectedType; })[0];
    if (hint) {
      if (match.mode === 'maze') {
        hint.textContent = 'Tap the maze · ' + (choice ? choice.name + ' ' + choice.cost + '⚡ · ' : '') + (match.maze.warning ? 'WALLS STIRRING!' : 'walls shift in ' + Math.max(0, Math.ceil(match.maze.shiftTimer)) + 's') + ' · follow the gold dots';
      } else {
        hint.textContent = choice
          ? 'Tap a platform · ' + choice.name + ' ' + choice.cost + '⚡ · break gate (' + LW.GATE_MAX + ') then core (' + LW.CORE_MAX + ') · ' + matchInfo.label + ' vs ' + enemyElement.name
          : 'Tap a platform to send a pal';
      }
    }
    var spawnLabel = el('spawn-label');
    if (spawnLabel) spawnLabel.textContent = match.mode === 'maze' ? 'MAZE ENTRANCE' : 'SPAWN PLATFORM';
    var keyHints = el('key-hints');
    if (keyHints) keyHints.textContent = match.mode === 'maze' ? 'Tap maze / S send · Q W E pals · Space power' : '1–5 lanes · Q W E pals · Space power';

    var spawnState = el('spawn-state');
    var spawnMeter = el('spawn-meter');
    var spawnDetail = el('spawn-detail');
    var panel = el('lane-panel');
    if (spawnState) {
      var stateText = spawn.ready ? 'READY TO SPAWN' : spawn.reason === 'cooldown' ? 'READY IN ' + spawn.cooldown.toFixed(1) + 's' : 'NEED ' + spawn.needed + ' SPARK';
      if (spawnState.textContent !== stateText) spawnState.textContent = stateText;
      spawnState.classList.toggle('ready', spawn.ready);
      spawnState.classList.toggle('charging', !spawn.ready);
    }
    if (spawnMeter) spawnMeter.style.width = Math.round(spawn.progress * 100) + '%';
    if (spawnDetail) {
      if (match.mode === 'maze') {
        spawnDetail.textContent = spawn.ready
          ? (choice ? choice.name + ' · tap the maze entrance' : 'Tap the maze entrance')
          : spawn.reason === 'cooldown' ? 'Spawn horn recharging' : 'Spark is filling';
      } else {
        spawnDetail.textContent = spawn.ready
          ? (choice ? choice.name + ' · tap a platform' : 'Tap a platform')
          : spawn.reason === 'cooldown' ? 'Spawn horn recharging' : 'Spark is filling';
      }
    }
    var towerWaveBtn = el('tower-wave-btn');
    if (towerWaveBtn) towerWaveBtn.classList.add('hidden');
    if (panel) {
      panel.classList.remove('tower-mode');
      panel.classList.toggle('maze-mode', match.mode === 'maze');
      panel.classList.toggle('spawn-ready', spawn.ready);
      panel.classList.toggle('spawn-charging', !spawn.ready);
      if (lastSpawnReady !== spawn.ready) {
        if (spawn.ready) {
          panel.classList.remove('just-ready');
          void panel.offsetWidth;
          panel.classList.add('just-ready');
          setTimeout(function () { panel.classList.remove('just-ready'); }, 600);
        }
        lastSpawnReady = spawn.ready;
      }
    }

    renderAbility();
    renderFeed();
  }

  function showGame() {
    el('start-screen').classList.add('hidden');
    el('game-ui').classList.remove('hidden');
    el('result-layer').classList.add('hidden');
    el('event-layer').classList.add('hidden');
  }

  function startWaveNow() {
    if (!match || match.mode !== 'tower' || appPaused || eventShowing || resultShowing || match.result) return false;
    var res = LW.startTowerWave(match, true);
    if (!res) { Audio.error(); return false; }
    Audio.confirm();
    toast('Wave ' + match.tower.wave + ' started!', 'good');
    renderHud();
    checkEnd();
    return true;
  }

  function startMatch() {
    ensureAudio();
    match = LW.createMatch({ player: selectedElement, mode: selectedMode });
    selectedType = 'pip';
    selectedClashRoute = match.mode === 'clash' && LW.clashSuggestedRoute ? LW.clashSuggestedRoute(match, 'player') : 'north';
    selectedLane = match.mode === 'maze' || match.mode === 'tower' ? 0
      : match.mode === 'clash' ? LW.clashRouteTarget(match, 'player', selectedClashRoute)
        : Math.floor(match.laneCount / 2);
    selectedPad = 0;
    appPaused = false;
    eventShowing = false;
    resultShowing = false;
    lastFeedSig = '';
    lastAbilitySig = '';
    lastSpawnReady = null;
    hideCoach();
    arena.setMatch(match);
    arena.clashRoute = selectedClashRoute;
    showGame();
    renderRoster();
    renderLanes();
    renderHud();
    Audio.setElement(selectedElement);
    Audio.setMood('battle');
    Audio.confirm();
    if (!coachSeen[match.mode]) {
      coachSeen[match.mode] = true;
      showCoach(match.mode);
    }
  }

  function backToLobby() {
    match = null;
    appPaused = false;
    eventShowing = false;
    resultShowing = false;
    lastFeedSig = '';
    lastAbilitySig = '';
    lastSpawnReady = null;
    arena.setMatch(null);
    hideCoach();
    el('game-ui').classList.add('hidden');
    el('start-screen').classList.remove('hidden');
    el('event-layer').classList.add('hidden');
    el('result-layer').classList.add('hidden');
    el('modal-layer').classList.add('hidden');
    var startScreen = el('start-screen');
    if (startScreen) startScreen.scrollTop = 0;
    renderBuddies();
    renderModes();
    Audio.setMood('menu');
    Audio.setElement(selectedElement);
  }

  function trySpawn(type, options) {
    if (!match || appPaused || eventShowing || resultShowing || match.result) return;
    if (match.mode === 'tower') { buildOnPad(selectedPad); return; }
    var info = roster().filter(function (x) { return x.id === type; })[0];
    if (!info) return;
    var res = LW.spawn(match, selectedLane, type, options);
    if (res.ok) {
      selectedType = type;
      Audio.spawn();
      renderHud();
    } else {
      var panel = el('lane-panel');
      if (panel) {
        panel.classList.remove('denied');
        void panel.offsetWidth;
        panel.classList.add('denied');
        setTimeout(function () { panel.classList.remove('denied'); }, 320);
      }
      var now = Date.now();
      if (now - lastDeniedAt > 700 && res.reason !== 'cooldown') {
        lastDeniedAt = now;
        Audio.error();
      }
      renderHud();
    }
  }

  function setLane(lane) {
    if (!match) return;
    if (match.mode === 'clash') {
      if (!match.clash.towers[lane]) return;
    } else if (lane < 0 || lane >= match.laneCount) return;
    selectedLane = lane;
    syncLaneSelection();
    if (!appPaused && !eventShowing && !resultShowing) trySpawn(selectedType);
  }

  function sendClashRoute(route) {
    if (!match || match.mode !== 'clash') return;
    selectedClashRoute = route === 'south' ? 'south' : 'north';
    if (arena) arena.clashRoute = selectedClashRoute;
    var target = LW.clashRouteTarget ? LW.clashRouteTarget(match, 'player', selectedClashRoute) : null;
    if (target === null) return;
    selectedLane = target;
    syncLaneSelection();
    if (!appPaused && !eventShowing && !resultShowing) trySpawn(selectedType, { route: selectedClashRoute });
    renderHud();
  }

  function selectPal(type) {
    if (!match) return;
    selectedType = type;
    lastSpawnReady = null;
    if (match.mode === 'tower') renderLanes();
    Audio.confirm();
    renderHud();
  }

  function upgradeSelectedTower() {
    if (!match || match.mode !== 'tower' || appPaused || eventShowing || resultShowing || match.result) return;
    var res = LW.buildTower(match, selectedPad, selectedType);
    if (res.ok) {
      Audio.confirm();
      toast(res.msg, 'good');
      renderLanes();
      renderHud();
    } else {
      Audio.error();
      toast(res.msg, 'bad');
    }
  }

  function installSelectedModule(moduleId) {
    if (!match || match.mode !== 'tower' || appPaused || eventShowing || resultShowing || match.result) return;
    var res = LW.installTowerModule(match, selectedPad, moduleId);
    if (res.ok) {
      Audio.confirm();
      toast(res.msg, 'good');
      renderLanes();
      renderHud();
    } else {
      Audio.error();
      toast(res.msg, 'bad');
    }
  }

  function sellSelectedTower() {
    if (!match || match.mode !== 'tower' || appPaused || eventShowing || resultShowing || match.result) return;
    var res = LW.sellTower(match, selectedPad);
    if (res.ok) {
      Audio.confirm();
      toast(res.msg, 'good');
      renderLanes();
      renderHud();
    } else {
      Audio.error();
      toast(res.msg, 'bad');
    }
  }

  function buildOnPad(index) {
    if (!match || match.mode !== 'tower' || appPaused || eventShowing || resultShowing || match.result) return false;
    var wasSelected = selectedPad === index;
    selectedPad = index;
    var pad = match.tower.pads[index];
    // First tap inspects a built tower; tapping the same pad again is the quick
    // level-up path used by most tower games.
    if (pad && pad.tower) {
      if (wasSelected) { upgradeSelectedTower(); return true; }
      Audio.confirm();
      renderLanes();
      renderHud();
      return true;
    }
    var res = LW.buildTower(match, index, selectedType);
    if (res.ok) {
      Audio.confirm();
      toast(res.msg, 'good');
      renderLanes();
      renderHud();
      checkEnd();
      return true;
    }
    var now = Date.now();
    if (now - lastDeniedAt > 650) {
      lastDeniedAt = now;
      Audio.error();
      toast(res.msg, 'bad');
    }
    var panel = el('lane-panel');
    if (panel) {
      panel.classList.remove('denied');
      void panel.offsetWidth;
      panel.classList.add('denied');
      setTimeout(function () { panel.classList.remove('denied'); }, 320);
    }
    renderHud();
    return false;
  }

  function useAbility() {
    if (!match || appPaused || eventShowing || resultShowing) return;
    var res = LW.useAbility(match);
    if (res.ok) {
      Audio.ability();
      toast(res.msg, 'good');
      renderHud();
      checkEnd();
    } else {
      Audio.error();
      toast(res.msg, 'bad');
    }
  }

  function showEvent() {
    if (!match || !match.eventOffer || eventShowing) return;
    eventShowing = true;
    var layer = el('event-layer');
    var chosen = match.eventOffer.map(function (id) { return LW.eventById(id); }).filter(Boolean);
    layer.innerHTML = '<div class="event-pop">' +
      '<div class="event-kicker">SPAWN EVENT!</div>' +
      '<h2>Pick a bonus, quick!</h2>' +
      '<p class="event-sub">The little war is holding its breath.</p>' +
      '<div class="event-choices">' + chosen.map(function (ev) {
        return '<button class="event-card" data-action="pick-event" data-id="' + ev.id + '" style="--el:' + ev.color + '">' +
          '<span class="event-emoji">' + ev.emoji + '</span><b>' + esc(ev.title) + '</b><span>' + esc(ev.desc) + '</span><em>Choose this</em></button>';
      }).join('') + '</div>' +
      '<button class="skip-btn" data-action="skip-event">Skip for +3 spark</button>' +
      '</div>';
    layer.classList.remove('hidden');
    Audio.event();
  }

  function chooseEvent(id) {
    if (!match) return;
    var res = LW.chooseEvent(match, id);
    if (!res.ok) { toast(res.msg, 'bad'); return; }
    eventShowing = false;
    el('event-layer').classList.add('hidden');
    Audio.confirm();
    toast(res.msg, 'good');
    renderHud();
    checkEnd();
  }

  function skipEvent() {
    if (!match) return;
    var res = LW.skipEvent(match);
    if (!res.ok) { toast(res.msg, 'bad'); return; }
    eventShowing = false;
    el('event-layer').classList.add('hidden');
    Audio.coin();
    toast(res.msg, 'info');
    renderHud();
  }

  function checkEnd() {
    if (!match || !match.result || resultShowing) return;
    resultShowing = true;
    var layer = el('result-layer');
    var win = match.result.winner === 'player';
    var pk = match.kingdoms ? match.kingdoms.player : LW.kingdomFor(match.playerElement);
    var ek = match.kingdoms ? match.kingdoms.enemy : LW.kingdomFor(match.enemyElement);
    if (match.result.mode === 'clash') {
      var cr = match.result.clash;
      layer.innerHTML = '<div class="result-card ' + (win ? 'win' : 'lose') + ' clash-result">' +
        '<div class="result-burst">' + (win ? '⚔️🏰🌟' : '💥🌧️🏚️') + '</div>' +
        '<div class="result-kicker">' + (win ? 'KEEP BROKEN!' : 'KEEP LOST') + '</div>' +
        '<h2>' + (win ? 'The rival keep is broken!' : 'Your keep has fallen!') + '</h2>' +
        '<p>' + esc(match.result.reason) + '</p>' +
        '<div class="result-kingdoms">' + esc(pk.name) + ' <span>vs</span> ' + esc(ek.name) + '</div>' +
        '<div class="result-stats">' +
        '<span><b>' + fmtTime(match.result.seconds) + '</b>time</span>' +
        '<span><b>' + cr.playerTowers + ' / 3</b>towers held</span>' +
        '<span><b>' + cr.master.toUpperCase() + '</b>master tower</span>' +
        '<span><b>' + cr.towerKills + '</b>towers taken</span>' +
        '<span><b>' + match.result.kills + '</b>pals popped</span></div>' +
        '<div class="result-actions"><button class="big-btn" data-action="rematch">REMATCH</button><button class="soft-btn" data-action="change-kingdom">CHANGE KINGDOM</button><button class="soft-btn" data-action="main-menu">MAIN MENU</button></div>' +
        '</div>';
      layer.classList.remove('hidden');
      if (win) Audio.win(); else Audio.lose();
      return;
    }
    if (match.result.mode === 'tower') {
      var tr = match.result.tower;
      layer.innerHTML = '<div class="result-card ' + (win ? 'win' : 'lose') + ' tower-result">' +
        '<div class="result-burst">' + (win ? '🏰✨🌟' : '💥🌧️🏚️') + '</div>' +
        '<div class="result-kicker">' + (win ? 'SIEGE BROKEN!' : 'BASTION FALLEN') + '</div>' +
        '<h2>' + (win ? 'Your bastion held every wave!' : 'The siege broke through!') + '</h2>' +
        '<p>' + esc(match.result.reason) + '</p>' +
        '<div class="result-kingdoms">' + esc(pk.name) + ' <span>vs</span> ' + esc(ek.name) + '</div>' +
        '<div class="result-stats">' +
        '<span><b>' + fmtTime(match.result.seconds) + '</b>time</span>' +
        '<span><b>' + tr.cleared + ' / ' + tr.totalWaves + '</b>waves held</span>' +
        '<span><b>' + tr.kills + '</b>siege pals popped</span>' +
        '<span><b>' + tr.towers + '</b>towers built</span>' +
        '<span><b>' + tr.leaks + '</b>leaks</span></div>' +
        '<div class="result-actions"><button class="big-btn" data-action="rematch">REMATCH</button><button class="soft-btn" data-action="change-kingdom">CHANGE KINGDOM</button><button class="soft-btn" data-action="main-menu">MAIN MENU</button></div>' +
        '</div>';
      layer.classList.remove('hidden');
      if (win) Audio.win(); else Audio.lose();
      return;
    }
    var isMaze = match.result.mode === 'maze' && match.result.maze;
    var scaleValue = isMaze ? match.result.maze.cols + '×' + match.result.maze.rows : match.result.laneCount;
    var scaleLabel = isMaze ? 'maze' : 'platforms';
    var extraStat = isMaze ? '<span><b>' + match.result.maze.shifts + '</b>wall shifts</span>' : '';
    layer.innerHTML = '<div class="result-card ' + (win ? 'win' : 'lose') + '">' +
      '<div class="result-burst">' + (win ? '🎉🌈⭐' : '💧🍄💫') + '</div>' +
      '<div class="result-kicker">' + (match.finalBounce ? 'FINAL BOUNCE!' : win ? 'CORE POPPED!' : 'CORE WENT POP...') + '</div>' +
      '<h2>' + (win ? (isMaze ? 'Your kingdom holds the maze!' : 'Your kingdom holds the lane!') : 'The rival kingdom broke through!') + '</h2>' +
      '<p>' + esc(match.result.reason) + '</p>' +
      '<div class="result-kingdoms">' + esc(pk.name) + ' <span>vs</span> ' + esc(ek.name) + '</div>' +
      '<div class="result-stats"><span><b>' + fmtTime(match.result.seconds) + '</b>time</span><span><b>' + match.result.kills + '</b>pals popped</span><span><b>' + match.result.gates + '</b>gates opened</span><span><b>' + scaleValue + '</b>' + scaleLabel + '</span>' + extraStat + '</div>' +
      '<div class="result-actions"><button class="big-btn" data-action="rematch">REMATCH</button><button class="soft-btn" data-action="change-kingdom">CHANGE KINGDOM</button><button class="soft-btn" data-action="main-menu">MAIN MENU</button></div>' +
      '</div>';
    layer.classList.remove('hidden');
    if (win) Audio.win(); else Audio.lose();
  }

  function showHowTo() {
    var layer = el('modal-layer');
    layer.innerHTML = '<div class="modal-backdrop" data-action="close-modal"></div><div class="how-card">' +
      '<button class="close-x" data-action="close-modal" aria-label="Close">×</button>' +
      '<div class="how-kicker">NO JUMPING REQUIRED</div><h2>Pick a kingdom. Pick a battlefield. Pop a core.</h2>' +
      '<div class="how-grid">' +
      '<div><span>1</span><b>Pick a kingdom</b><p>Fire lives at Volcano Forge, Water at Sapphire Lake, Earth at Mud Mountain, Air at Cloudtop Skyhold, Light at Radiant Heaven and Dark at Moonlit Underworld.</p></div>' +
      '<div><span>2</span><b>Choose a battlefield</b><p>Simple Lanes gives 3–5 straight platforms. Shifting Maze builds a random 8×8 to 25×25 labyrinth, square or rectangular. Tower Defence gives you 12 build pads around a 12×8 switchback, 12 opening spark and a kill-funded economy that pays more for clean streaks. Tower Clash gives you seven towers on a web of strands, with a Master Tower at the centre that opens the rival keep.</p></div>' +
      '<div><span>3</span><b>Break gate, pop core</b><p>In lanes and maze, send pals from your entrance to crack the gatehouse, then smash the core. Tap a platform (or the maze) to send your selected pal. A PUSH badge marks the lane with the weakest rival gate.</p></div>' +
      '<div><span>4</span><b>Build, then hold</b><p>In Tower Defence you start with <b>12 spark</b> and every kill pays back more as your streak grows (up to ×1.6) — a leak resets it. Spires are rapid, Bastions splash, Coils chain. Tap a built tower to choose <b>Laser, Slow, AOE or Troops</b>, or press <b>LEVEL ▲</b>; <b>SELL</b> refunds 60%. Range rings and path-tile counts show what a pad really covers.</p></div>' +
      '<div><span>5</span><b>Pick a rail</b><p>Tower Clash gives both sides a choice: <b>NORTH</b> or <b>SOUTH</b>. Tap a rail and your pals walk it, break its next tower, and take it. Both rails meet at the <b>Master</b>; hold it to open the rival keep. Your rival chooses a rail too.</p></div>' +
      '</div>' +
      '<div class="how-tips"><span>🔥 Every elemental pal has its element\'s body: flame, droplet, mossy rock, cloud, star or crescent moon. Pip, Chonk and Zap change the size and role.</span><span>🏰 Your chosen element sets your home kingdom and its spawn gate; the rival brings their own landscape.</span><span>⚔ Elements matter: STRONG attacks deal +30%, WEAK attacks deal −22%, and each element has its own guard.</span><span>🌀 In the maze, tap anywhere on the labyrinth to send your selected pal. Gold dots trace your live route; the board pulses 3 seconds before the walls move, and the route redraws itself.</span><span>🏰 Tower Defence: 12 spark to open, then kills pay spark and build a bounty streak (up to ×1.6). Tap a built tower to pick an upgrade — Laser (range, armour-piercing), Slow (chill), AOE (wide splash) or Troops (a Hearth Guard on the route) — or press LEVEL. SELL refunds 60%. Dashed rings show range; the hint counts the path tiles a pad covers.</span><span>⚔ Tower Clash: both sides pick NORTH or SOUTH. Tap a rail, break its next tower, and it becomes yours. Both rails meet at the Master; take it to open the keep. First keep to zero loses.</span><span>💥 The Final Bounce begins at 2:45 in lanes and maze and exposes both cores.</span><span>☰ The top-right menu has pause, restart, change kingdom and main menu — you never have to start a match to leave one.</span></div>' +
      '<button class="big-btn wide" data-action="close-modal">GOT IT!</button></div>';
    layer.classList.remove('hidden');
  }

  function modeObjective(mode) {
    return mode === 'tower'
      ? 'Build on the pads, pop siege pals to fund more towers, and hold all 8 waves. Tap a built tower to pick Laser, Slow, AOE or Troops, or level it up. Clean kill streaks raise the bounty; leaks reset it.'
      : mode === 'clash'
        ? 'Pick NORTH or SOUTH. Pals walk that rail, break the next tower, and it becomes yours. Both rails meet at the Master; take it to open the rival keep.'
        : mode === 'maze'
          ? 'Tap the maze to send pals. Follow the gold route; every 12–15 seconds the shift cuts it and your pals find a new one.'
          : 'Tap a platform to send the selected pal. Break the rival gatehouse first, then pop the core. Final Bounce at 2:45.';
  }

  function pauseGame() {
    if (!match || eventShowing || resultShowing) return;
    appPaused = true;
    var layer = el('modal-layer');
    layer.innerHTML = '<div class="modal-backdrop" data-action="resume"></div><div class="pause-card">' +
      '<div class="how-kicker">GAME MENU</div><h2>Paused</h2>' +
      '<p class="pause-objective">' + esc(modeObjective(match.mode)) + '</p>' +
      '<div class="pause-actions"><button class="big-btn" data-action="resume">KEEP BOUNCING</button>' +
      '<button class="soft-btn" data-action="show-how">HOW TO PLAY</button>' +
      '<button class="soft-btn" data-action="restart">RESTART MATCH</button>' +
      '<button class="soft-btn" data-action="change-kingdom">CHANGE KINGDOM</button>' +
      '<button class="soft-btn" data-action="main-menu">MAIN MENU</button>' +
      '<button class="soft-btn" data-action="toggle-sound">SOUND: ' + (muted ? 'OFF' : 'ON') + '</button></div>' +
      '<a class="pause-link" href="site/lore.html">LORE &amp; FIELD GUIDE →</a></div>';
    layer.classList.remove('hidden');
  }
  function resumeGame() {
    appPaused = false;
    el('modal-layer').classList.add('hidden');
  }

  var coachTimer = null;
  function hideCoach() {
    if (coachTimer) { clearTimeout(coachTimer); coachTimer = null; }
    var layer = el('coach-layer');
    if (layer) { layer.classList.add('hidden'); layer.innerHTML = ''; }
  }
  function showCoach(mode) {
    var layer = el('coach-layer');
    if (!layer) return;
    var text = modeObjective(mode);
    var title = mode === 'tower' ? 'TOWER DEFENCE · 12 SPARK TO START'
      : mode === 'clash' ? 'TOWER CLASH · PICK NORTH OR SOUTH'
        : mode === 'maze' ? 'SHIFTING MAZE · FOLLOW THE GOLD'
          : 'SIMPLE LANES · GATE THEN CORE';
    layer.innerHTML = '<div class="coach-card">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(text) + '</span>' +
      '<div class="coach-actions"><button class="coach-btn" data-action="show-how">HOW TO PLAY</button>' +
      '<button class="coach-btn primary" data-action="dismiss-coach">GOT IT</button></div></div>';
    layer.classList.remove('hidden');
    if (coachTimer) clearTimeout(coachTimer);
    coachTimer = setTimeout(hideCoach, 12000);
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.dataset.action;
      Audio.click();
      if (action === 'buddy') {
        selectedElement = target.dataset.id;
        renderBuddies();
        Audio.setElement(selectedElement);
        return;
      }
      if (action === 'mode') {
        if (target.dataset.mode === 'lanes' || target.dataset.mode === 'maze' || target.dataset.mode === 'tower' || target.dataset.mode === 'clash') {
          selectedMode = target.dataset.mode;
          renderModes();
          Audio.confirm();
        }
        return;
      }
      if (action === 'play') { startMatch(); return; }
      if (action === 'pal') { selectPal(target.dataset.type); return; }
      if (action === 'lane') { setLane(Number(target.dataset.lane)); return; }
      if (action === 'clash-route') { sendClashRoute(target.dataset.route); return; }
      if (action === 'tower-pad') { buildOnPad(Number(target.dataset.pad)); return; }
      if (action === 'start-wave') { startWaveNow(); return; }
      if (action === 'upgrade-tower') { upgradeSelectedTower(); return; }
      if (action === 'tower-module') { installSelectedModule(target.dataset.module); return; }
      if (action === 'sell-tower') { sellSelectedTower(); return; }
      if (action === 'ability') { useAbility(); return; }
      if (action === 'pick-event') { chooseEvent(target.dataset.id); return; }
      if (action === 'skip-event') { skipEvent(); return; }
      if (action === 'pause') { pauseGame(); return; }
      if (action === 'resume') { resumeGame(); return; }
      if (action === 'show-how') { showHowTo(); return; }
      if (action === 'close-modal') { resumeGame(); return; }
      if (action === 'restart') { resumeGame(); startMatch(); return; }
      if (action === 'rematch') { resultShowing = false; el('result-layer').classList.add('hidden'); startMatch(); return; }
      if (action === 'lobby' || action === 'main-menu') {
        resumeGame();
        backToLobby();
        if (global.scrollTo) global.scrollTo(0, 0);
        return;
      }
      if (action === 'change-kingdom') {
        resumeGame();
        backToLobby();
        var grid = el('buddy-grid');
        if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Pick a kingdom for the next match', 'info');
        return;
      }
      if (action === 'dismiss-coach') { hideCoach(); return; }
      if (action === 'how') { showHowTo(); return; }
      if (action === 'toggle-sound') { toggleSound(); return; }
    });

    var canvas = el('arena');
    canvas.addEventListener('pointerdown', function (e) {
      ensureAudio();
      if (!match || appPaused || eventShowing || resultShowing) return;
      if (match.mode === 'tower') {
        var padIndex = arena.towerPadAt(e.clientX, e.clientY);
        if (padIndex === null) return;
        buildOnPad(padIndex);
        return;
      }
      if (match.mode === 'clash') {
        var clickedHub = arena.clashHubAt(e.clientX, e.clientY);
        if (clickedHub === null) return;
        var clickedRoute = clickedHub === 2 || clickedHub === 5 ? 'south'
          : clickedHub === 1 || clickedHub === 4 ? 'north' : selectedClashRoute;
        sendClashRoute(clickedRoute);
        return;
      }
      if (match.mode === 'maze') {
        if (!arena.inMaze(e.clientX, e.clientY)) return;
        selectedLane = 0;
        syncLaneSelection();
        trySpawn(selectedType);
        return;
      }
      var lane = arena.laneAt(e.clientX, e.clientY);
      if (lane === null) return;
      selectedLane = lane;
      syncLaneSelection();
      trySpawn(selectedType);
    });

    canvas.addEventListener('pointermove', function () {
      canvas.style.cursor = match && match.mode === 'clash' ? 'pointer' : '';
    });

    var sound = el('sound-btn');
    if (sound) sound.addEventListener('click', function (e) { e.stopPropagation(); toggleSound(); });

    document.addEventListener('keydown', function (e) {
      if (!match || resultShowing) return;
      if (eventShowing) {
        if (e.key === '1' || e.key === '2') {
          var ids = match.eventOffer || [];
          if (ids[e.key === '1' ? 0 : 1]) chooseEvent(ids[e.key === '1' ? 0 : 1]);
        }
        return;
      }
      if (appPaused) { if (e.key === 'Escape') resumeGame(); return; }
      if (match.mode === 'tower') {
        if (e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          buildOnPad(Number(e.key) - 1);
          return;
        }
        if (e.key === 'q' || e.key === 'Q') { selectPal('pip'); return; }
        if (e.key === 'w' || e.key === 'W') { selectPal('chonk'); return; }
        if (e.key === 'e' || e.key === 'E') { selectPal('zap'); return; }
        if (e.key === 'u' || e.key === 'U') { upgradeSelectedTower(); return; }
        if (e.key === 'Enter') { e.preventDefault(); startWaveNow(); return; }
        if (e.code === 'Space') { e.preventDefault(); useAbility(); return; }
        if (e.key === 'Escape') pauseGame();
        return;
      }
      if (match.mode === 'maze' && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        selectedLane = 0;
        syncLaneSelection();
        trySpawn(selectedType);
        return;
      }
      if (match.mode === 'clash') {
        if (e.key === '1' || e.key === 'n' || e.key === 'N') { e.preventDefault(); sendClashRoute('north'); }
        else if (e.key === '2' || e.key === 's' || e.key === 'S') { e.preventDefault(); sendClashRoute('south'); }
        else if (e.key === 'Enter') { e.preventDefault(); sendClashRoute(selectedClashRoute); }
        else if (e.key === 'q' || e.key === 'Q') selectPal('pip');
        else if (e.key === 'w' || e.key === 'W') selectPal('chonk');
        else if (e.key === 'e' || e.key === 'E') selectPal('zap');
        else if (e.code === 'Space') { e.preventDefault(); useAbility(); }
        else if (e.key === 'Escape') pauseGame();
        return;
      }
      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        var laneKey = Number(e.key) - 1;
        if (laneKey >= match.laneCount) return;
        selectedLane = laneKey;
        syncLaneSelection();
        trySpawn(selectedType);
      } else if (e.key === 'q' || e.key === 'Q') selectPal('pip');
      else if (e.key === 'w' || e.key === 'W') selectPal('chonk');
      else if (e.key === 'e' || e.key === 'E') selectPal('zap');
      else if (e.code === 'Space') { e.preventDefault(); useAbility(); }
      else if (e.key === 'Escape') pauseGame();
    });

    global.addEventListener('resize', function () { arena.resize(); });
    global.addEventListener('orientationchange', function () {
      arena.resize();
      setTimeout(function () { arena.resize(); }, 250);
    });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', function () { arena.resize(); });
    }
    if (global.ResizeObserver) {
      // The HUD grows and wraps on phones; keep the lanes above whatever it occupies.
      var hudObserver = new ResizeObserver(function () { arena.resize(); });
      Array.prototype.forEach.call(document.querySelectorAll('.top-hud, .bottom-hud'), function (node) {
        hudObserver.observe(node);
      });
    }
    global.addEventListener('pointerdown', function once() {
      ensureAudio();
      global.removeEventListener('pointerdown', once);
    }, { once: true });

    Array.prototype.forEach.call(document.querySelectorAll('[data-action="toggle-sound"]'), function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); toggleSound(); });
    });
  }

  function toggleSound() {
    ensureAudio();
    muted = !muted;
    Audio.setVolumes({ master: muted ? 0 : 0.7 });
    setSoundButton();
    if (!muted) Audio.confirm();
    toast(muted ? 'Sound off' : 'Sound on', 'info');
    if (appPaused) {
      var buttons = el('modal-layer').querySelectorAll('[data-action="toggle-sound"]');
      Array.prototype.forEach.call(buttons, function (b) { b.textContent = 'SOUND: ' + (muted ? 'OFF' : 'ON'); });
    }
  }

  function loop(ts) {
    var dt = lastFrame ? Math.min(0.05, (ts - lastFrame) / 1000) : 0.016;
    lastFrame = ts;
    if (match && !appPaused && !eventShowing && !resultShowing && !match.result) {
      LW.update(match, dt);
      if (match.eventOffer && !eventShowing) showEvent();
      if (match.result && !resultShowing) checkEnd();
    }
    arena.draw(ts / 1000, { lane: selectedLane, type: selectedType });
    hudClock += dt;
    if (match && hudClock > 0.1) {
      hudClock = 0;
      renderHud();
      if (match.eventOffer && !eventShowing) showEvent();
      if (match.result && !resultShowing) checkEnd();
    }
    requestAnimationFrame(loop);
  }

  App.init = function () {
    arena = new ZAC.LWArena(el('arena'));
    renderBuddies();
    renderModes();
    renderLanes();
    setSoundButton();
    bind();
    requestAnimationFrame(loop);
  };

  App.startMatch = startMatch;
  App.backToLobby = backToLobby;
  App.trySpawn = trySpawn;
  App.useAbility = useAbility;
  App.chooseEvent = chooseEvent;
  App.showEvent = showEvent;
  App.getMatch = function () { return match; };
  App.getArena = function () { return arena; };
  App.selectType = function (type) { selectedType = type; lastSpawnReady = null; if (match && match.mode === 'tower') renderLanes(); };
  App.buildOnPad = buildOnPad;
  App.startTowerWave = startWaveNow;
  App.selectLane = function (lane) {
    if (!match || lane < 0 || lane >= match.laneCount) return false;
    selectedLane = lane;
    syncLaneSelection();
    return true;
  };
  App.setElement = function (id) { if (LW.ELEMENTS[id]) { selectedElement = id; renderBuddies(); } };
  App.getArena = function () { return arena; };
  App.setMode = function (mode) { if (mode === 'lanes' || mode === 'maze' || mode === 'tower' || mode === 'clash') { selectedMode = mode; renderModes(); } };
  App.getMode = function () { return selectedMode; };
  App.toggleSound = toggleSound;
})(typeof globalThis !== 'undefined' ? globalThis : this);
