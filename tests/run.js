'use strict';
/* ELEMENTAL LITTLE WARS - headless simulation tests. */
global.ZAC = {};
require('../src/lw-core.js');
const LW = global.ZAC.LW;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL  ' + name + '\n      ' + (err && err.message || err));
  }
}
function step(state, seconds, dt) {
  dt = dt || 1 / 60;
  const count = Math.ceil(seconds / dt);
  for (let i = 0; i < count; i++) LW.update(state, dt);
  return state;
}
function snapshot(state) {
  return {
    base: { player: state.base.player, enemy: state.base.enemy },
    gates: state.gates,
    laneCount: state.laneCount,
    units: state.units.map((u) => ({ side: u.side, lane: u.lane, type: u.type, x: +u.x.toFixed(5), hp: +u.hp.toFixed(4) })),
    energy: +state.energy.toFixed(4),
    aiEnergy: +state.aiEnergy.toFixed(4),
    elapsed: +state.elapsed.toFixed(4)
  };
}
function putAtEnemyGate(state, lane) {
  const unit = LW.spawnFor(state, 'player', lane, 'pip', { free: true }).unit;
  unit.x = 0.85;
  unit.cd = 0;
  return unit;
}

test('six elements have pals, powers and an attack/defence identity', () => {
  assert.strictEqual(LW.ELEMENT_ORDER.length, 6);
  const abilities = new Set();
  for (const id of LW.ELEMENT_ORDER) {
    const el = LW.ELEMENTS[id];
    const roster = LW.getRoster(id);
    assert.strictEqual(roster.length, 3);
    assert(roster.every((u) => u.cost > 0 && u.hp > 0 && u.atk > 0 && u.name && u.defense > 0));
    abilities.add(el.ability.id);
  }
  assert.strictEqual(abilities.size, 6);
  assert.strictEqual(LW.EVENTS.length, 8);
  assert.strictEqual(LW.attackMultiplier('fire', 'earth'), 1.3);
  assert.strictEqual(LW.attackMultiplier('earth', 'fire'), 0.78);
  assert.strictEqual(LW.attackMultiplier('fire', 'water'), 1);
  assert.strictEqual(LW.attackMultiplier('fire', 'dark'), 0.78);
  assert(LW.defenseMultiplier('earth') < LW.defenseMultiplier('air'));
  assert.strictEqual(LW.strongAgainst('water'), 'light');
  assert.strictEqual(LW.weakAgainst('water'), 'air');
});

test('each element has its own kingdom, landscape and spawn gate', () => {
  const expected = {
    fire: 'Volcano Forge',
    water: 'Sapphire Lake',
    earth: 'Mud Mountain',
    air: 'Cloudtop Skyhold',
    light: 'Radiant Heaven',
    dark: 'Moonlit Underworld'
  };
  const landmarks = new Set();
  for (const id of LW.ELEMENT_ORDER) {
    const kingdom = LW.kingdomFor(id);
    assert.strictEqual(kingdom.name, expected[id]);
    assert(kingdom.terrain && kingdom.spawn && kingdom.realm && kingdom.tagline);
    assert(kingdom.sky.top && kingdom.sky.mid && kingdom.sky.low);
    assert(kingdom.land.far && kingdom.land.near && kingdom.land.top && kingdom.land.glow);
    assert(kingdom.platform.top && kingdom.platform.lip && kingdom.platform.face);
    landmarks.add(kingdom.landmark);
  }
  assert.strictEqual(landmarks.size, 6, 'every kingdom should draw a different landscape');
  const state = LW.createMatch({ player: 'fire', enemy: 'water', seed: 5, lanes: 3 });
  assert.strictEqual(state.kingdoms.player.name, 'Volcano Forge');
  assert.strictEqual(state.kingdoms.enemy.name, 'Sapphire Lake');
  assert.strictEqual(state.kingdoms.player.spawn, 'Lava Vent');
  assert.strictEqual(state.kingdoms.enemy.spawn, 'Tidewell');
  assert(state.feed.some((f) => /Volcano Forge marches on Sapphire Lake/.test(f.text)));
  assert(state.feed.some((f) => /platform lanes/.test(f.text)));
});

test('matches roll 3 to 5 lanes and stay deterministic for a seed', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const state = LW.createMatch({ player: 'water', seed });
    counts.add(state.laneCount);
    assert(state.laneCount >= 3 && state.laneCount <= 5);
    assert.strictEqual(state.lanes.length, state.laneCount);
    assert.strictEqual(state.laneNames.length, state.laneCount);
    assert.strictEqual(state.gates.player.length, state.laneCount);
    assert.strictEqual(state.gates.enemy.length, state.laneCount);
  }
  assert.deepStrictEqual([...counts].sort(), [3, 4, 5]);
  const a = LW.createMatch({ player: 'air', seed: 4242, lanes: 5 });
  const b = LW.createMatch({ player: 'air', seed: 4242, lanes: 5 });
  assert.strictEqual(a.laneCount, 5);
  step(a, 9);
  step(b, 9);
  assert.deepStrictEqual(snapshot(a), snapshot(b));
});

test('spawn readiness gates spending and reports a visible recharge', () => {
  const state = LW.createMatch({ player: 'fire', seed: 7, lanes: 3 });
  const status = LW.getSpawnStatus(state, 'pip');
  assert.strictEqual(status.ready, true);
  const before = state.energy;
  const res = LW.spawn(state, 1, 'pip');
  assert(res.ok, res.msg);
  assert.strictEqual(state.units.length, 1);
  assert.strictEqual(state.units[0].lane, 1);
  assert.strictEqual(state.energy, before - 2);
  const cooling = LW.getSpawnStatus(state, 'pip');
  assert.strictEqual(cooling.ready, false);
  assert.strictEqual(cooling.reason, 'cooldown');
  assert(cooling.cooldown > 1);
  assert(cooling.progress >= 0 && cooling.progress < 1);
  const blocked = LW.spawn(state, 1, 'pip');
  assert.strictEqual(blocked.ok, false);
  assert.strictEqual(blocked.reason, 'cooldown');
  state.energy = 0;
  state.spawnCd = 0;
  assert.strictEqual(LW.getSpawnStatus(state, 'pip').reason, 'energy');
  assert.strictEqual(LW.spawn(state, 1, 'pip').ok, false);
});

test('lane choices follow the random lane count', () => {
  const state = LW.createMatch({ player: 'earth', seed: 8, lanes: 5 });
  assert.strictEqual(LW.spawn(state, 4, 'pip').ok, true);
  assert.strictEqual(LW.spawn(state, 5, 'pip').ok, false);
  assert.strictEqual(LW.spawn(state, -1, 'pip').ok, false);
});

test('pals walk toward enemies and scrap in their own lane', () => {
  const state = LW.createMatch({ player: 'fire', seed: 11, lanes: 3 });
  const player = LW.spawnFor(state, 'player', 0, 'pip', { free: true }).unit;
  const enemy = LW.spawnFor(state, 'enemy', 0, 'pip', { free: true }).unit;
  player.x = 0.2; enemy.x = 0.8;
  const gap = enemy.x - player.x;
  step(state, 0.5);
  assert(enemy.x - player.x < gap, 'they should close the distance');
  player.x = 0.4; enemy.x = 0.43;
  player.cd = 0; enemy.cd = 0;
  const hpA = player.hp, hpB = enemy.hp;
  step(state, 0.12);
  assert(player.hp < hpA || enemy.hp < hpB, 'one side should take damage');
});

test('a lane gate absorbs damage before the core is exposed', () => {
  const state = LW.createMatch({ player: 'light', seed: 12, lanes: 3 });
  const gate = state.gates.enemy[2];
  const coreBefore = state.base.enemy;
  const unit = putAtEnemyGate(state, 2);
  step(state, 0.05);
  assert(gate.hp < gate.max, 'the gate should take the hit');
  assert.strictEqual(state.base.enemy, coreBefore, 'the core is protected while its gate stands');
  gate.hp = 1;
  unit.cd = 0;
  step(state, 0.05);
  assert.strictEqual(gate.hp, 0);
  unit.x = 0.895;
  unit.cd = 0;
  step(state, 0.05);
  assert(state.base.enemy < coreBefore, 'breaching the lane exposes the core');
  state.base.enemy = 5;
  unit.cd = 0;
  step(state, 0.1);
  assert(state.result && state.result.winner === 'player');
  assert(state.result.gates >= 1);
});

test('core and gate guards use elemental attack and defence', () => {
  const state = LW.createMatch({ player: 'fire', seed: 14, lanes: 3, enemy: 'earth' });
  const gate = state.gates.enemy[1];
  const before = gate.hp;
  const unit = putAtEnemyGate(state, 1);
  unit.element = 'water';
  step(state, 0.05);
  const waterHit = before - gate.hp;
  assert(waterHit > 0);
  const expected = Math.max(1, Math.round(unit.atk * LW.attackMultiplier('water', 'earth') * LW.defenseMultiplier('earth')));
  assert.strictEqual(waterHit, expected, 'damage should include the elemental attack and guard multipliers');
});

test('buddy abilities can repair gates and crack open a lane', () => {
  const water = LW.createMatch({ player: 'water', seed: 21, lanes: 4 });
  water.base.player = 300;
  water.gates.player[0].hp = 20;
  const heal = LW.useAbility(water);
  assert(heal.ok, heal.msg);
  assert(water.base.player > 300);
  assert(water.gates.player[0].hp > 20);
  assert(water.abilityCd > 0);
  assert.strictEqual(LW.useAbility(water).ok, false);

  const fire = LW.createMatch({ player: 'fire', seed: 21, lanes: 4, enemy: 'water' });
  const core = fire.base.enemy;
  assert(LW.useAbility(fire).ok);
  assert(fire.gates.enemy.some((g) => g.hp < g.max), 'meteor should crack gates');
  assert.strictEqual(fire.base.enemy, core, 'a closed gate still protects the core');
});

test('spawn events are less frequent and apply to every random lane', () => {
  const state = LW.createMatch({ player: 'earth', seed: 31, lanes: 5 });
  assert(state.eventTimer >= 26, 'first spawn event should wait');
  assert(state.wildTimer >= 30);
  LW.offerEvent(state);
  assert(state.paused);
  assert.strictEqual(state.eventOffer.length, 2);
  const chosen = LW.eventById(state.eventOffer[0]);
  const result = LW.chooseEvent(state, chosen.id);
  assert(result.ok, result.msg);
  assert.strictEqual(state.paused, false);
  assert.strictEqual(state.eventOffer, null);
  assert(state.eventTimer >= 30);
});

test('the rival builds an army and does not ignore elemental gate defences', () => {
  const state = LW.createMatch({ player: 'air', seed: 55, lanes: 4 });
  step(state, 4.5);
  assert(state.units.some((u) => u.side === 'enemy'), 'AI should send pals');
  assert(state.aiEnergy < 10);
});

test('Final Bounce opens every gate so matches can finish', () => {
  const state = LW.createMatch({ player: 'dark', seed: 77, lanes: 4 });
  assert.strictEqual(state.finalBounce, false);
  state.elapsed = state.finalBounceAt;
  LW.update(state, 1 / 30);
  assert(state.finalBounce, 'fuse should trigger');
  assert(state.gates.player.every((g) => g.hp === 0));
  assert(state.gates.enemy.every((g) => g.hp === 0));
  assert(state.feed.some((f) => /FINAL BOUNCE/.test(f.text)));
});

test('a full autonomous match reaches a core result', () => {
  const state = LW.createMatch({ player: 'dark', seed: 99 });
  let guard = 0;
  while (!state.result && guard < 9000) {
    if (!state.paused && !state.eventOffer) {
      if (state.energy >= 4 && state.spawnCd <= 0) {
        LW.spawn(state, guard % state.laneCount, guard % 2 ? 'chonk' : 'zap');
      }
      if (state.abilityCd <= 0) LW.useAbility(state);
    }
    if (state.eventOffer) LW.chooseEvent(state, state.eventOffer[0]);
    LW.update(state, 1 / 30);
    guard++;
  }
  assert(state.result, 'match should finish within 300 simulated seconds');
  assert(['player', 'enemy'].includes(state.result.winner));
  assert(state.result.seconds >= 0);
});

test('every element has its own character silhouette', () => {
  const expected = { fire: 'flame', water: 'drop', earth: 'rock', air: 'cloud', light: 'star', dark: 'crescent' };
  const shapes = new Set();
  for (const id of LW.ELEMENT_ORDER) {
    assert.strictEqual(LW.ELEMENTS[id].silhouette, expected[id]);
    shapes.add(LW.ELEMENTS[id].silhouette);
  }
  assert.strictEqual(shapes.size, 6);
});

test('shifting maze mode generates connected rectangular mazes from 8x8 to 25x25', () => {
  const sizes = new Set();
  let rectangular = 0;
  for (let seed = 1; seed <= 48; seed++) {
    const state = LW.createMatch({ mode: 'maze', player: 'water', seed });
    assert.strictEqual(state.mode, 'maze');
    assert.strictEqual(state.laneCount, 1);
    assert.strictEqual(state.gates.player.length, 1);
    assert.strictEqual(state.gates.enemy.length, 1);
    assert(state.maze.cols >= 8 && state.maze.cols <= 25);
    assert(state.maze.rows >= 8 && state.maze.rows <= 25);
    if (state.maze.cols !== state.maze.rows) rectangular++;
    assert(LW.mazeCellOpen(state.maze, state.maze.home.x, state.maze.home.y));
    assert(LW.mazeCellOpen(state.maze, state.maze.foe.x, state.maze.foe.y));
    assert(LW.mazePathExists(state.maze), 'every generated maze must have a route');
    sizes.add(state.maze.cols + 'x' + state.maze.rows);
  }
  assert(sizes.size >= 4, 'maze sizes should vary between matches');
  assert(rectangular > 0, 'maze maps should include rectangular layouts');

  const smallest = LW.createMatch({ mode: 'maze', player: 'earth', seed: 1, mazeCols: 8, mazeRows: 8 });
  assert.strictEqual(smallest.maze.cols, 8);
  assert.strictEqual(smallest.maze.rows, 8);
  assert(LW.mazePathExists(smallest.maze), '8x8 must have a route');

  const tall = LW.createMatch({ mode: 'maze', player: 'water', seed: 2, mazeCols: 8, mazeRows: 15 });
  assert.strictEqual(tall.maze.cols, 8);
  assert.strictEqual(tall.maze.rows, 15);
  assert(LW.mazePathExists(tall.maze), '8x15 must have a route');

  const wide = LW.createMatch({ mode: 'maze', player: 'air', seed: 3, mazeCols: 15, mazeRows: 10 });
  assert.strictEqual(wide.maze.cols, 15);
  assert.strictEqual(wide.maze.rows, 10);
  assert(LW.mazePathExists(wide.maze), '15x10 must have a route');

  const largest = LW.createMatch({ mode: 'maze', player: 'air', seed: 4, mazeCols: 25, mazeRows: 25 });
  assert.strictEqual(largest.maze.cols, 25);
  assert.strictEqual(largest.maze.rows, 25);
  assert(LW.mazePathExists(largest.maze), '25x25 must have a route');

  const clamped = LW.createMatch({ mode: 'maze', player: 'light', seed: 5, mazeCols: 7, mazeRows: 30 });
  assert.strictEqual(clamped.maze.cols, 8, 'maze width must not go below 8');
  assert.strictEqual(clamped.maze.rows, 25, 'maze height must not go above 25');
});

test('maze pals pathfind, walls shift and an open gate exposes the core', () => {
  const state = LW.createMatch({ mode: 'maze', player: 'earth', enemy: 'air', seed: 12345 });
  const unit = LW.spawn(state, 0, 'pip').unit;
  assert(unit, 'maze spawn should work without a lane choice');
  const start = { gx: unit.gx, gy: unit.gy };
  step(state, 3.2);
  assert(unit.mt > 0 || unit.gx !== start.gx || unit.gy !== start.gy, 'maze pal should follow a route');

  const gridBefore = state.maze.grid.join('');
  state.maze.shiftTimer = 0.001;
  LW.update(state, 1 / 60);
  assert(state.maze.shifts >= 1, 'walls should shift when the timer ends');
  assert.notStrictEqual(state.maze.grid.join(''), gridBefore, 'the maze layout should visibly change');
  assert(LW.mazePathExists(state.maze), 'shifting must leave a route open');

  state.eventOffer = null;
  state.paused = false;
  state.units = [];
  state.gates.enemy[0].hp = 0;
  state.base.enemy = 1;
  const finisher = LW.spawnFor(state, 'player', 0, 'chonk', { free: true }).unit;
  finisher.gx = state.maze.foe.x;
  finisher.gy = state.maze.foe.y;
  finisher.nx = null;
  finisher.ny = null;
  finisher.mt = 0;
  finisher.cd = 0;
  step(state, 0.1);
  assert(state.result && state.result.winner === 'player');
  assert.strictEqual(state.result.mode, 'maze');
  assert(state.result.maze && state.result.maze.cols === state.maze.cols);
});

test('tower defence builds a fixed siege route with twelve pads and three tower types', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'fire', enemy: 'water', seed: 5 });
  assert.strictEqual(state.mode, 'tower');
  assert.strictEqual(state.laneCount, 12);
  assert.strictEqual(state.tower.cols, 12);
  assert.strictEqual(state.tower.rows, 8);
  assert.strictEqual(state.tower.path.length, 25);
  assert.strictEqual(state.tower.pads.length, 12);
  assert.strictEqual(state.tower.totalWaves, 8);
  assert.strictEqual(state.base.player, 360);
  assert.strictEqual(state.energy, 14, 'tower defence opens with 14 spark');
  assert.strictEqual(state.tower.path[0].x, 0);
  assert.strictEqual(state.tower.path[24].x, 11);
  assert.strictEqual(state.tower.path[24].y, 6);
  assert(state.feed.some((f) => /TOWER DEFENCE/.test(f.text)));
  assert.strictEqual(LW.spawnFor(state, 'player', 0, 'pip', {}).reason, 'mode');
  assert.strictEqual(LW.getTowerRoster('fire').length, 3);
  assert.deepStrictEqual(LW.getTowerRoster('fire').map((t) => t.cost), [3, 5, 4]);
  assert(LW.getTowerRoster('earth').every((t) => t.damage > 0 && t.range > 0 && t.name));
});

test('tower building spends spark and upgrades a pad to level three', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'earth', seed: 6 });
  state.energy = 40;
  const before = state.energy;
  const cost = LW.getTowerStats('earth', 'pip').cost;
  const built = LW.buildTower(state, 0, 'pip');
  assert(built.ok, built.msg);
  assert.strictEqual(state.energy, before - cost);
  const pad = state.tower.pads[0];
  assert(pad.tower && pad.tower.level === 1);
  assert.strictEqual(state.tower.towers, 1);
  const preview = LW.towerUpgradePreview(pad.tower);
  assert(preview && preview.level === 2, 'the upgrade button should preview level 2');
  assert(preview.damage > pad.tower.damage && preview.range >= pad.tower.range, 'the preview should show real gains');
  assert(preview.cost === 2, 'a first level on a cheap tower should cost 2 spark');
  const up1 = LW.buildTower(state, 0, 'pip');
  assert(up1.ok && up1.upgraded);
  assert.strictEqual(pad.tower.level, 2);
  assert.strictEqual(pad.tower.damage, preview.damage, 'the button preview should match the bought level');
  assert.strictEqual(pad.tower.range, preview.range);
  assert(LW.buildTower(state, 0, 'pip').ok);
  assert.strictEqual(pad.tower.level, 3);
  assert.strictEqual(LW.buildTower(state, 0, 'pip').reason, 'max');
  state.energy = 0;
  assert.strictEqual(LW.buildTower(state, 1, 'chonk').reason, 'energy');
  assert.strictEqual(state.tower.pads[1].tower, null);
  assert.strictEqual(LW.buildTower(state, 99, 'pip').reason, 'pad');
  assert.strictEqual(LW.buildTower(LW.createMatch({ player: 'fire', seed: 1 }), 0, 'pip').reason, 'mode');
});

test('tower defence economy rewards clean streaks and refunds repositioning', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'earth', enemy: 'fire', seed: 30 });
  assert(LW.buildTower(state, 0, 'pip').ok);
  assert(LW.towerCoverage(state, 0) >= 3, 'the opening pad should cover several path tiles');
  const tower = state.tower.pads[0].tower;
  assert.strictEqual(tower.spent, 3);
  state.energy = 0;
  state.tower.wave = 1;
  state.tower.waveActive = true;
  state.tower.queue = [];
  state.tower.streak = 20;
  const keepAlive = LW.spawnTowerEnemy(state, 'pip', false, 'runner');
  keepAlive.hp = 9999;
  keepAlive.maxHp = 9999;
  const brute = LW.spawnTowerEnemy(state, 'chonk', false, 'brute');
  brute.pathIndex = 2;
  brute.pathT = 0;
  brute.hp = 1;
  state.tower.pads[0].tower.cd = 0;
  step(state, 0.2);
  assert.strictEqual(state.tower.sparkEarned, 3, 'a ×1.4 bounty should pay 3 spark for a brute');
  assert.strictEqual(state.tower.bestStreak, 21);
  state.energy = 4;
  const refund = LW.sellTower(state, 0);
  assert(refund.ok);
  assert.strictEqual(refund.refund, 2);
  assert.strictEqual(state.tower.pads[0].tower, null);
  assert.strictEqual(state.energy, 6, 'selling returns 75% of the investment (rounded)');
  assert(LW.towerEarlyBonus(state) >= 1);
});

test('tower modules are four distinct, visible upgrades', () => {
  function withModule(id) {
    const state = LW.createMatch({ mode: 'tower', player: 'earth', enemy: 'fire', seed: 31 });
    state.energy = 40;
    assert(LW.buildTower(state, 0, 'pip').ok);
    const result = LW.installTowerModule(state, 0, id);
    return { state, tower: state.tower.pads[0].tower, result };
  }
  const base = LW.getTowerStats('earth', 'pip');

  const laser = withModule('laser');
  assert(laser.result.ok);
  assert.strictEqual(laser.tower.module, 'laser');
  assert(laser.tower.range >= base.range + 0.5, 'laser should extend range');
  assert(laser.tower.damage > base.damage, 'laser should raise damage');
  assert(laser.tower.armorPierce, 'laser should ignore armour');
  const laserRange = laser.tower.range;
  assert(LW.buildTower(laser.state, 0, 'pip').ok, 'level upgrade after a module should still work');
  assert(laser.tower.range > laserRange, 'the module bonus should survive a level upgrade');
  assert.strictEqual(LW.installTowerModule(laser.state, 0, 'slow').reason, 'module', 'one module per tower');

  const slow = withModule('slow');
  slow.state.tower.wave = 1;
  slow.state.tower.waveActive = true;
  slow.state.tower.queue = [{ kind: 'runner', type: 'pip', boss: false }];
  const enemy = LW.spawnTowerEnemy(slow.state, 'chonk', false, 'brute');
  enemy.pathIndex = 2;
  enemy.pathT = 0;
  slow.tower.cd = 0;
  step(slow.state, 0.3);
  assert(enemy.slowTime > 0, 'slow shots should chill the target');
  assert(enemy.slowPower < 0.7);

  const aoe = withModule('aoe');
  assert(aoe.tower.splash >= 0.85);
  assert(aoe.tower.splashRadius >= 1.2);

  const troops = withModule('troops');
  troops.state.tower.wave = 1;
  troops.state.tower.waveActive = true;
  troops.state.tower.queue = [{ kind: 'runner', type: 'pip', boss: false }];
  step(troops.state, 2.5);
  assert(troops.state.units.some((u) => u.side === 'player'), 'troops should send a Hearth Guard');
});

test('tower waves spawn siege pals and built towers shoot them', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'fire', enemy: 'earth', seed: 9 });
  state.energy = 40;
  assert(LW.buildTower(state, 0, 'pip').ok);
  state.tower.waveTimer = 0.01;
  LW.update(state, 0.02);
  assert(state.tower.waveActive);
  assert.strictEqual(state.tower.wave, 1);
  assert.strictEqual(state.tower.queue.length, 5);
  step(state, 3);
  assert(state.tower.spawned > 0);
  assert(state.tower.shots > 0, 'a spark spire should fire at siege pals');
  assert(state.units.some((u) => u.hp < u.maxHp), 'tower shots should damage a siege pal');
});

test('tower leaks damage the bastion core', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'water', enemy: 'fire', seed: 10 });
  LW.startTowerWave(state);
  state.tower.queue = [];
  const unit = LW.spawnTowerEnemy(state, 'pip', false);
  unit.pathIndex = state.tower.path.length - 1;
  unit.pathT = 1;
  const before = state.base.player;
  LW.update(state, 0.05);
  assert(state.base.player < before, 'a leak should hurt the core');
  assert.strictEqual(state.tower.leaks, 1);
  assert.strictEqual(state.units.length, 0);
  assert.strictEqual(state.base.player, before - (10 + state.tower.wave * 3));
});

test('tower defence is won by holding all eight waves', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'light', seed: 11 });
  state.tower.wave = 8;
  state.tower.cleared = 7;
  state.tower.waveActive = true;
  state.tower.queue = [];
  state.units = [];
  LW.update(state, 0.02);
  assert.strictEqual(state.tower.cleared, 8);
  assert(state.result && state.result.winner === 'player');
  assert.strictEqual(state.result.mode, 'tower');
  assert.strictEqual(state.result.tower.totalWaves, 8);
  assert.strictEqual(state.result.tower.cleared, 8);
});

test('tower defence is lost when the bastion core reaches zero', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'dark', seed: 12 });
  state.base.player = 0;
  LW.update(state, 0.02);
  assert(state.result && state.result.winner === 'enemy');
  assert.strictEqual(state.result.mode, 'tower');
});

test('tower buddy powers damage the siege or heal the core', () => {
  const fire = LW.createMatch({ mode: 'tower', player: 'fire', enemy: 'earth', seed: 13 });
  LW.startTowerWave(fire);
  const unit = LW.spawnTowerEnemy(fire, 'pip', false);
  const hp = unit.hp;
  assert(LW.useAbility(fire).ok);
  assert(unit.hp < hp, 'meteor should hit siege pals');
  assert(fire.abilityCd > 0);
  assert.strictEqual(LW.useAbility(fire).ok, false);

  const water = LW.createMatch({ mode: 'tower', player: 'water', enemy: 'earth', seed: 13 });
  water.base.player = 200;
  assert(LW.useAbility(water).ok);
  assert(water.base.player > 200, 'bubble bath should heal the bastion core');
});

test('tower kills pay spark back and armoured brutes resist rapid fire', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'fire', enemy: 'earth', seed: 41 });
  state.tower.wave = 5;
  LW.startTowerWave(state);
  state.tower.queue = [];
  const runner = LW.spawnTowerEnemy(state, 'pip', false, 'runner');
  const brute = LW.spawnTowerEnemy(state, 'chonk', false, 'brute');
  const boss = LW.spawnTowerEnemy(state, 'chonk', true);
  assert.strictEqual(boss.kind, 'boss');
  assert(brute.armor < 1, 'brutes are armoured');
  assert(brute.maxHp > runner.maxHp, 'brutes outlast runners');
  const before = state.energy;
  runner.hp = 1;
  brute.hp = 1;
  assert(LW.useAbility(state).ok, 'meteor should fire');
  assert(state.tower.kills >= 2, 'both pops should count');
  assert(state.energy > before, 'pops should pay spark back');
  assert(state.tower.sparkEarned >= 3, 'brutes pay more than runners');
  assert(state.effects.some((e) => e.kind === 'towerSpark'));
  assert.strictEqual(boss.hp, boss.maxHp - 42, 'the boss survives a meteor');
});

test('a ward shielder reduces damage taken by the pack around it', () => {
  function damageTaken(withShield) {
    const state = LW.createMatch({ mode: 'tower', player: 'earth', enemy: 'fire', seed: 42 });
    state.tower.wave = 3;
    LW.startTowerWave(state);
    state.tower.queue = [];
    const ally = LW.spawnTowerEnemy(state, 'pip', false, 'runner');
    ally.pathIndex = 4;
    ally.pathT = 0;
    if (withShield) {
      const shielder = LW.spawnTowerEnemy(state, 'zap', false, 'shielder');
      shielder.pathIndex = 4;
      shielder.pathT = 0.05;
    }
    state.energy = 60;
    assert(LW.buildTower(state, 8, 'chonk').ok);
    const hp = ally.hp;
    for (let i = 0; i < 80; i++) LW.update(state, 0.02);
    return hp - ally.hp;
  }
  const plain = damageTaken(false);
  const shielded = damageTaken(true);
  assert(plain > 0, 'the tower should hit the runner');
  assert(shielded < plain, 'a nearby shielder should cut the damage taken');
  assert.strictEqual(LW.getTowerStats('earth', 'chonk').damageType, 'splash');
  assert.strictEqual(LW.getTowerStats('earth', 'pip').damageType, 'rapid');
  assert.strictEqual(LW.getTowerStats('earth', 'zap').damageType, 'chain');
});

test('maze shifts redraw the route, add loops and warn before moving', () => {
  const state = LW.createMatch({ mode: 'maze', player: 'water', seed: 5150 });
  assert(state.maze.playerPath.length > 1, 'the maze starts with a drawn route');
  const before = state.maze.playerPath.map((c) => c.x + ',' + c.y).join('|');
  state.maze.shiftTimer = 0.001;
  LW.update(state, 1 / 60);
  assert(state.maze.shifts === 1, 'the walls should have moved');
  assert(state.maze.playerPath.length > 1, 'a route always exists after a shift');
  assert(state.maze.loops >= 1, 'more corridors should create route loops');
  state.maze.shiftTimer = 2.5;
  state.maze.warning = false;
  LW.update(state, 1 / 60);
  assert(state.maze.warning, 'the board should warn before the walls move');
  assert(state.maze.playerPath.map((c) => c.x + ',' + c.y).join('|') !== before, 'the route can change');
});

test('maze shifts reroute the war substantially without stranding pals', () => {
  const state = LW.createMatch({ mode: 'maze', player: 'earth', seed: 2026 });
  const cells = () => state.maze.playerPath.map((c) => c.x + ',' + c.y);
  let previous = cells();
  const renewals = [];
  const lengths = [previous.length];
  const pal = LW.spawnFor(state, 'player', 0, 'chonk', { free: true }).unit;
  for (let i = 0; i < 3; i++) {
    state.maze.shiftTimer = 0.001;
    LW.update(state, 1 / 60);
    const current = cells();
    const before = new Set(previous);
    const shared = current.filter((cell) => before.has(cell)).length;
    renewals.push(1 - shared / Math.max(previous.length, current.length));
    lengths.push(current.length);
    previous = current;
    assert(LW.mazePathExists(state.maze), 'a route must survive every shift');
    const reachable = LW.mazeDistances(state.maze, { x: pal.gx, y: pal.gy });
    assert(isFinite(reachable[LW.mazeIndex(state.maze, state.maze.foe.x, state.maze.foe.y)]), 'a pal already in the maze must never be stranded');
  }
  assert.strictEqual(state.maze.shifts, 3);
  assert(renewals.every((share) => share >= 0.4), 'each shift should rebuild most of the route, not nudge it');
  assert(Math.max(...lengths) - Math.min(...lengths) >= 4, 'route length should swing by several tiles');
});

test('both rails give tower choices and the master opens the keep', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'fire', enemy: 'water', seed: 616 });
  assert.strictEqual(state.clash.rush, undefined, 'the timed rush rule is gone');
  assert.strictEqual(LW.clashRouteTarget(state, 'player', 'north'), 1, 'north starts at North-West');
  assert.strictEqual(LW.clashRouteTarget(state, 'player', 'south'), 2, 'south starts at South-West');
  assert.strictEqual(LW.clashRouteTarget(state, 'enemy', 'north'), 4, 'the rival has the mirrored north choice');
  assert.strictEqual(LW.clashRouteTarget(state, 'enemy', 'south'), 5, 'the rival has the mirrored south choice');

  // The rails meet at the Master; there is no bypass around it.
  const northPath = LW.clashPath(state, 0, 6);
  assert(northPath.includes(3), 'the keep route must pass through the Master');
  assert(!state.clash.strands.some((pair) => (pair[0] === 1 && pair[1] === 4) || (pair[0] === 2 && pair[1] === 5) || (pair[0] === 3 && pair[1] === 6)), 'no cross-rail or direct keep shortcut');

  const attacker = LW.spawnFor(state, 'player', 3, 'chonk', { free: true }).unit;
  attacker.hubPath = [3];
  attacker.hubAt = 0;
  attacker.hubT = 0;
  attacker.x = 0.5;
  attacker.lane = 1;
  attacker.cd = 0;
  const hp = state.clash.towers[3].hp;
  step(state, 0.2);
  assert(state.clash.towers[3].hp < hp, 'the master should take damage');

  state.clash.towers[1].owner = 'player';
  assert.strictEqual(LW.clashRouteTarget(state, 'player', 'north'), 3, 'the north rail advances to the Master');
  state.clash.towers[3].owner = 'player';
  assert.strictEqual(LW.clashRouteTarget(state, 'player', 'north'), 4, 'after the Master the north rail advances to North-East');
  state.clash.towers[4].owner = 'player';
  assert.strictEqual(LW.clashRouteTarget(state, 'player', 'north'), 6, 'the final north tower opens the keep');

  // A south push must stay on the south rail even when a north tower is owned.
  const direction = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'air', seed: 617 });
  direction.clash.towers[3].owner = 'player';
  direction.clash.towers[4].owner = 'player';
  const southUnit = LW.spawnFor(direction, 'player', 5, 'pip', { free: true, route: 'south' });
  assert(southUnit.ok && southUnit.unit.route === 'south');
  assert.strictEqual(southUnit.unit.targetHub, 5, 'the south rail targets South-East');
  assert(!southUnit.unit.hubPath.includes(4), 'a south push must not detour through North-East');
});

test('tower defence previews the next wave and rewards an early start', () => {
  const state = LW.createMatch({ mode: 'tower', player: 'light', seed: 14 });
  const first = LW.getTowerWavePreview(state);
  assert(first && first.wave === 1 && first.count === 5);
  assert.deepStrictEqual(first.types, { pip: 5, zap: 0, chonk: 0 });
  state.tower.wave = 7;
  const last = LW.getTowerWavePreview(state);
  assert(last && last.wave === 8 && last.boss);
  assert(last.types.chonk > 0 && last.types.zap > 0);

  const started = LW.createMatch({ mode: 'tower', player: 'light', seed: 15 });
  started.energy = 8;
  const earlyGain = LW.towerEarlyBonus(started);
  assert(earlyGain >= 2 && earlyGain <= 4, 'starting early should pay 2–4 spark by how early you are');
  assert(LW.startTowerWave(started, true));
  assert.strictEqual(started.tower.wave, 1);
  assert.strictEqual(started.energy, 8 + earlyGain);
  assert.strictEqual(started.tower.queue.length, 5);
  assert.strictEqual(LW.startTowerWave(started, true), false, 'a wave cannot start twice');
});

test('clash pals keep pushing along the web instead of stopping', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'fire', seed: 32 });
  state.aiTimer = 999;
  state.clash.towers[1].owner = 'player';
  const first = LW.spawnFor(state, 'player', 1, 'pip', { free: true });
  assert(first.ok);
  assert.notStrictEqual(first.unit.targetHub, 1, 'a hub you own is not the objective');
  assert.strictEqual(first.unit.targetHub, 3, 'the push should head for the Master');
  assert(first.unit.hubPath.length > 1);
  const startX = first.unit.x;
  step(state, 1.5);
  assert(first.unit.x > startX, 'pals should visibly walk the strand');

  const state2 = LW.createMatch({ mode: 'clash', player: 'water', enemy: 'air', seed: 33 });
  state2.aiTimer = 999;
  state2.clash.towers[1].owner = 'player';
  state2.clash.towers[3].owner = 'player';
  const walker = LW.spawnFor(state2, 'player', 4, 'pip', { free: true }).unit;
  state2.clash.towers[4].owner = 'player';
  step(state2, 9);
  assert.notStrictEqual(walker.targetHub, 4, 'reaching an owned hub should re-target the next one');
  assert(walker.targetHub === 3 || walker.targetHub === 6, 'the next objective should be the Master or the keep');
});

test('tower clash starts with a seven-hub web and a gated master', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'fire', enemy: 'water', seed: 21 });
  assert.strictEqual(state.mode, 'clash');
  assert.strictEqual(state.laneCount, 3);
  assert.strictEqual(state.clash.towers.length, 7, 'two keeps, four outer hubs and the master');
  assert.strictEqual(state.clash.strands.length, 8, 'two rails into the Master and two out again');
  assert.strictEqual(state.clash.towers[3].kind, 'master');
  assert.strictEqual(state.clash.towers[3].hp, 300);
  assert.strictEqual(state.clash.towers[0].owner, 'player');
  assert.strictEqual(state.clash.towers[6].owner, 'enemy');
  assert(state.clash.towers.slice(1, 6).every((t) => t.owner === 'neutral'));
  assert.strictEqual(state.base.player, LW.CLASH_CORE_MAX);
  assert.strictEqual(state.base.enemy, LW.CLASH_CORE_MAX);
  [1, 2, 3, 4, 5, 6].forEach((id) => assert(LW.clashPath(state, 0, id), 'hub ' + id + ' should be on the web'));
  const spawn = LW.spawn(state, 4, 'pip');
  assert(spawn.ok);
  assert.strictEqual(spawn.unit.targetHub, 4);
  assert(spawn.unit.hubPath.length >= 3, 'the pal should follow the strands, not fly');
  assert(Number.isFinite(spawn.unit.yOffset), 'clash pals need a drawable vertical offset');
  assert(Number.isFinite(spawn.unit.x) && Number.isFinite(spawn.unit.lane));
  assert.strictEqual(state.energy, 6 - 2);
});

test('tower clash slows passive spark and pays extra for towers', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'air', seed: 618 });
  state.aiTimer = 9999;
  state.energy = 0;
  state.aiEnergy = 0;
  for (let i = 0; i < 20; i++) LW.update(state, 0.05);
  assert(Math.abs(state.energy - LW.CLASH_BASE_RATE) < 0.001, 'both sides use the slower base rate');
  assert(Math.abs(state.aiEnergy - LW.CLASH_BASE_RATE) < 0.001, 'the rival uses the same base rate');

  state.clash.towers[1].owner = 'player';
  state.energy = 0;
  for (let i = 0; i < 20; i++) LW.update(state, 0.05);
  assert(Math.abs(state.energy - (LW.CLASH_BASE_RATE + LW.CLASH_TOWER_RATE)) < 0.001, 'one owned tower adds tower income');

  state.clash.towers[4].owner = 'enemy';
  state.aiEnergy = 0;
  for (let i = 0; i < 20; i++) LW.update(state, 0.05);
  assert(Math.abs(state.aiEnergy - (LW.CLASH_BASE_RATE + LW.CLASH_TOWER_RATE)) < 0.001, 'the rival gets the same tower income');
});

test('breaking a clash tower captures it in one step', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'air', seed: 22 });
  const tower = state.clash.towers[1];
  const attacker = LW.spawnFor(state, 'player', 1, 'pip', { free: true }).unit;
  attacker.hubPath = [1];
  attacker.hubAt = 0;
  attacker.hubT = 0;
  attacker.x = tower.x;
  attacker.lane = tower.laneIndex;
  attacker.cd = 0;
  tower.hp = 1;
  step(state, 0.05);
  assert.strictEqual(tower.owner, 'player', 'the killing blow flips the tower immediately');
  assert.strictEqual(state.clash.captures.player, 1);
  assert.strictEqual(tower.hp, Math.round(tower.max * 0.6), 'a captured tower keeps 60% health');
  assert(!state.clash.towers.some((t) => t.progress || t.breached), 'no hold or breach phase remains');
  const forward = LW.spawnFor(state, 'player', 4, 'pip', { free: true });
  assert(forward.ok && forward.forward, 'a captured hub becomes the forward spawn');
  assert.strictEqual(forward.path[0], 1);
});

test('clash hubs fire along their strands', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'light', enemy: 'dark', seed: 23 });
  const tower = state.clash.towers[1];
  tower.owner = 'player';
  tower.cd = 0;
  const foe = LW.spawnFor(state, 'enemy', 1, 'pip', { free: true }).unit;
  foe.hubPath = [1];
  foe.hubAt = 0;
  foe.hubT = 0;
  foe.x = tower.x + 0.01;
  foe.lane = tower.laneIndex;
  const hp = foe.hp;
  step(state, 0.05);
  assert(foe.hp < hp, 'an owned hub should shoot enemies in range');
  assert(state.effects.some((e) => e.kind === 'clashBolt'));
  assert(state.units.every((u) => !u.tower), 'owned hubs shoot but do not print free units');
});

test('keeps fire on anything at their gate', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'air', seed: 26 });
  state.aiTimer = 999;
  const attacker = LW.spawnFor(state, 'enemy', 0, 'pip', { free: true }).unit;
  attacker.hubPath = [0];
  attacker.hubAt = 0;
  attacker.hubT = 0;
  attacker.x = 0.075;
  attacker.lane = 1;
  const hp = attacker.hp;
  step(state, 0.2);
  assert(attacker.hp < hp, 'the home keep should defend its gate');
  assert(state.effects.some((e) => e.kind === 'clashBolt'), 'the keep should show a bolt');
});

test('the master hub guards the rival keep until captured', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'fire', enemy: 'earth', seed: 24 });
  state.base.enemy = 300;
  const attacker = LW.spawnFor(state, 'player', 6, 'chonk', { free: true }).unit;
  attacker.hubPath = [6];
  attacker.hubAt = 0;
  attacker.hubT = 0;
  attacker.x = 0.925;
  attacker.lane = 1;
  attacker.cd = 0;
  step(state, 0.1);
  assert.strictEqual(state.base.enemy, 300, 'the neutral master should block core damage');
  assert(state.feed.some((f) => /Master Tower still guards/.test(f.text)));
  state.clash.towers[3].owner = 'player';
  attacker.cd = 0;
  step(state, 0.1);
  assert(state.base.enemy < 300, 'owning the master opens the keep');
});

test('clash captures win by breaking the rival keep and lose when the home keep falls', () => {
  const winState = LW.createMatch({ mode: 'clash', player: 'water', enemy: 'fire', seed: 25 });
  winState.clash.towers[3].owner = 'player';
  winState.base.enemy = 1;
  const finisher = LW.spawnFor(winState, 'player', 6, 'zap', { free: true }).unit;
  finisher.hubPath = [6];
  finisher.hubAt = 0;
  finisher.hubT = 0;
  finisher.x = 0.925;
  finisher.lane = 1;
  finisher.cd = 0;
  step(winState, 0.1);
  assert(winState.result && winState.result.winner === 'player');
  assert.strictEqual(winState.result.mode, 'clash');
  assert(winState.result.clash.playerTowers >= 1);

  const loseState = LW.createMatch({ mode: 'clash', player: 'dark', enemy: 'light', seed: 26 });
  loseState.base.player = 0;
  LW.update(loseState, 0.02);
  assert(loseState.result && loseState.result.winner === 'enemy');
  assert.strictEqual(loseState.result.mode, 'clash');
});

test('clash buddy powers hit troops and towers or heal the keep', () => {
  const fire = LW.createMatch({ mode: 'clash', player: 'fire', enemy: 'earth', seed: 27 });
  const foe = LW.spawnFor(fire, 'enemy', 1, 'chonk', { free: true }).unit;
  foe.x = 0.7;
  fire.clash.towers[1].owner = 'enemy';
  const hp = foe.hp;
  const towerHp = fire.clash.towers[1].hp;
  assert(LW.useAbility(fire).ok);
  assert(foe.hp < hp, 'meteor should hit clash troops');
  assert(fire.clash.towers[1].hp < towerHp, 'meteor should damage enemy towers');

  const water = LW.createMatch({ mode: 'clash', player: 'water', enemy: 'fire', seed: 28 });
  water.base.player = 300;
  water.clash.towers[1].owner = 'player';
  water.clash.towers[1].hp = 100;
  assert(LW.useAbility(water).ok);
  assert(water.base.player > 300, 'bubble bath should heal the clash keep');
  assert(water.clash.towers[1].hp > 100, 'bubble bath should heal owned towers');
});

test('a full autonomous tower clash resolves', () => {
  const state = LW.createMatch({ mode: 'clash', player: 'earth', enemy: 'water', seed: 29 });
  let guard = 0;
  while (!state.result && guard < 9000) {
    if (state.energy >= 3 && state.spawnCd <= 0) {
      const keepOpen = state.clash.towers[3].owner === 'player';
      const target = (keepOpen && state.clash.towers[6].owner !== 'player')
        ? state.clash.towers[6]
        : state.clash.towers.find((t) => t.kind !== 'keep' && t.owner !== 'player');
      LW.spawn(state, target ? target.id : 1, guard % 6 === 0 ? 'zap' : 'pip');
    }
    if (state.abilityCd <= 0) LW.useAbility(state);
    LW.update(state, 1 / 30);
    guard++;
  }
  assert(state.result, 'tower clash should finish within 300 simulated seconds');
  assert(['player', 'enemy'].includes(state.result.winner));
  assert.strictEqual(state.result.mode, 'clash');
});

test('the arcade hub and site pages link to real local targets', () => {
  const root = path.join(__dirname, '..');
  const pages = ['index.html', 'play.html', 'site/lore.html', 'site/codex.html', 'site/studio.html'];
  pages.forEach((page) => {
    const file = path.join(root, page);
    const html = fs.readFileSync(file, 'utf8');
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    links.forEach((href) => {
      if (/^(?:https?:|mailto:|data:|#)/.test(href)) return;
      const target = href.split('#')[0].split('?')[0];
      if (!target) return;
      assert(fs.existsSync(path.resolve(path.dirname(file), target)), page + ' has a broken link to ' + href);
    });
  });
  const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(hub.includes('href="play.html"'), 'the hub must link to Elemental Little Wars');
  assert(hub.includes('https://downdowndown.netlify.app/'), 'the hub must link to DownDownDown');
  const studio = fs.readFileSync(path.join(root, 'site/studio.html'), 'utf8');
  assert(studio.includes('https://downdowndown.netlify.app/'), 'the Studio needs its own DownDownDown button');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed.');
if (failed) process.exitCode = 1;
