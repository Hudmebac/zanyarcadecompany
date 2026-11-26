/* ELEMENTAL LITTLE WARS - little lane wars with elemental gate-cracking. */
(function (global) {
  'use strict';
  var ZAC = (global.ZAC = global.ZAC || {});
  var LW = {};

  var LANES = ['Left', 'Middle', 'Right'];
  var ELEMENT_ORDER = ['fire', 'water', 'earth', 'air', 'light', 'dark'];
  var ELEMENT_BEATS = {
    fire: 'earth',
    earth: 'air',
    air: 'water',
    water: 'light',
    light: 'dark',
    dark: 'fire'
  };
  var CORE_MAX = 360;
  var GATE_MAX = 120;
  var SPAWN_MAX = 1.35;
  var FINAL_BOUNCE_AT = 165;
  var GATE_X = { player: 0.155, enemy: 0.845 };
  var CORE_X = { player: 0.105, enemy: 0.895 };

  var ELEMENTS = {
    fire: {
      name: 'Fire', buddy: 'Cinder', emoji: '🔥', color: '#FF6B35', light: '#FFD166', dark: '#A93212', silhouette: 'flame',
      blurb: 'A bouncy little firecracker.', trait: 'Glass cannon',
      stats: { atk: 1.15, hp: 0.95, defense: 1.05 },
      names: { pip: 'Ember Pip', chonk: 'Lava Chonk', zap: 'Fizz Zap' },
      ability: { id: 'meteor', name: 'Meteor Plop', emoji: '☄️', cooldown: 25, desc: 'Crack every rival gate. If a lane is open, the core takes a meteor too.' }
    },
    water: {
      name: 'Water', buddy: 'Splash', emoji: '💧', color: '#27B8E8', light: '#B8F3FF', dark: '#08617D', silhouette: 'drop',
      blurb: 'A splashy friend who shares snacks.', trait: 'Sturdy healer',
      stats: { atk: 1.0, hp: 1.15, cooldown: 0.95, defense: 0.94 },
      names: { pip: 'Bubble Pip', chonk: 'Tide Chonk', zap: 'Dribble Zap' },
      ability: { id: 'heal', name: 'Bubble Bath', emoji: '🫧', cooldown: 24, desc: 'Heal your core, your gates and every pal.' }
    },
    earth: {
      name: 'Earth', buddy: 'Sprout', emoji: '🌱', color: '#55B852', light: '#C8F59C', dark: '#216B25', silhouette: 'rock',
      blurb: 'A steady sprout with a mossy hat.', trait: 'Big guard, slow feet',
      stats: { atk: 0.95, hp: 1.3, speed: 0.9, defense: 0.82 },
      names: { pip: 'Seed Pip', chonk: 'Moss Chonk', zap: 'Pebble Zap' },
      ability: { id: 'snare', name: 'Vine Tangle', emoji: '🌿', cooldown: 26, desc: 'Root every rival unit in place.' }
    },
    air: {
      name: 'Air', buddy: 'Breeze', emoji: '💨', color: '#82C7F2', light: '#E9F8FF', dark: '#2C648D', silhouette: 'cloud',
      blurb: 'A zooming cloud with somewhere to be.', trait: 'Fast but fragile',
      stats: { atk: 0.95, hp: 0.95, speed: 1.18, defense: 1.08 },
      names: { pip: 'Whirly Pip', chonk: 'Cloud Chonk', zap: 'Gust Zap' },
      ability: { id: 'gust', name: 'Big Whoosh', emoji: '🌪️', cooldown: 23, desc: 'Blow every rival unit backwards.' }
    },
    light: {
      name: 'Light', buddy: 'Sunny', emoji: '✨', color: '#F6C945', light: '#FFF6B8', dark: '#96700B', silhouette: 'star',
      blurb: 'A sparkly pal with a pocket sun.', trait: 'Quick, balanced',
      stats: { atk: 1.05, hp: 0.95, cooldown: 0.88, defense: 0.96 },
      names: { pip: 'Glow Pip', chonk: 'Prism Chonk', zap: 'Beam Zap' },
      ability: { id: 'sunbeam', name: 'Sun Beam', emoji: '🌞', cooldown: 25, desc: 'Scorch the rival gates and beam an open core.' }
    },
    dark: {
      name: 'Dark', buddy: 'Murk', emoji: '🌙', color: '#9367D8', light: '#D8C2FF', dark: '#472271', silhouette: 'crescent',
      blurb: 'A sleepy shadow with a secret snack.', trait: 'Hits steal health',
      stats: { atk: 1.12, hp: 0.9, lifesteal: 0.22, defense: 0.99 },
      names: { pip: 'Shadow Pip', chonk: 'Gloom Chonk', zap: 'Spook Zap' },
      ability: { id: 'siphon', name: 'Shadow Sip', emoji: '🌑', cooldown: 25, desc: 'Drain rivals, then heal your pals, gates and core.' }
    }
  };

  var KINGDOMS = {
    fire: {
      id: 'fire', name: 'Volcano Forge', short: 'Volcano', realm: 'The Cinder Crown', landmark: 'volcano',
      terrain: 'A warm caldera with a friendly lava fountain.', spawn: 'Lava Vent',
      tagline: 'Where every spark gets a warm welcome.',
      sky: { top: '#3F1F42', mid: '#F07B50', low: '#FFD88B' },
      land: { far: '#7A3B4C', near: '#A84C3F', top: '#E68A4C', rock: '#5B2D36', glow: '#FFB24A' },
      platform: { top: '#F2B96F', lip: '#B56B3D', face: '#7A4533' }
    },
    water: {
      id: 'water', name: 'Sapphire Lake', short: 'Lake', realm: 'The Ripple Court', landmark: 'lake',
      terrain: 'A bright mirror-lake full of lily pads and bubbles.', spawn: 'Tidewell',
      tagline: 'A splashy kingdom with very polite tides.',
      sky: { top: '#1F6FA8', mid: '#7BDCF1', low: '#DDFFF3' },
      land: { far: '#397C92', near: '#2E8691', top: '#7BDDC1', rock: '#245D73', glow: '#B8F3FF' },
      platform: { top: '#9BE3C8', lip: '#3E7E7A', face: '#2F616B' }
    },
    earth: {
      id: 'earth', name: 'Mud Mountain', short: 'Mud Mountain', realm: 'The Mossy Hold', landmark: 'mountain',
      terrain: 'A lumpy mountain dotted with friendly mud puddles.', spawn: 'Mud Burrow',
      tagline: 'Big rocks, soft moss, and the best mud around.',
      sky: { top: '#5AA6D6', mid: '#C6EDC7', low: '#F8E7B2' },
      land: { far: '#67874A', near: '#5C8A3B', top: '#8DD86C', rock: '#6B4A31', glow: '#EAC47D' },
      platform: { top: '#9CDB72', lip: '#77613A', face: '#66533A' }
    },
    air: {
      id: 'air', name: 'Cloudtop Skyhold', short: 'Cloudtop', realm: 'The Breeze Roost', landmark: 'cloud',
      terrain: 'A sky island drifted into a pile of fluffy clouds.', spawn: 'Cloud Chute',
      tagline: 'A windy keep with the softest front door in the sky.',
      sky: { top: '#55BAF4', mid: '#B9EFFF', low: '#FDFFF8' },
      land: { far: '#93CBE5', near: '#BFEAF9', top: '#F5FEFF', rock: '#7FAFCB', glow: '#FFFFFF' },
      platform: { top: '#E7FBFF', lip: '#8DC5DF', face: '#6FA6C3' }
    },
    light: {
      id: 'light', name: 'Radiant Heaven', short: 'Heaven', realm: 'The Sunlit Gate', landmark: 'heaven',
      terrain: 'Golden stairs, soft clouds and a very shiny gate.', spawn: 'Sun Gate',
      tagline: 'A warm kingdom that leaves the porch light on.',
      sky: { top: '#F2C34B', mid: '#FFEDB0', low: '#FFFFFF' },
      land: { far: '#E4C369', near: '#F2D88A', top: '#FFF5CF', rock: '#BC9855', glow: '#FFF1A6' },
      platform: { top: '#FFF0B8', lip: '#C39B46', face: '#9B7940' }
    },
    dark: {
      id: 'dark', name: 'Moonlit Underworld', short: 'Underworld', realm: 'The Gloom Court', landmark: 'underworld',
      terrain: 'A cozy underworld of crystals and purple fireflies.', spawn: 'Shade Well',
      tagline: 'A shadowy kingdom with a surprising amount of glow.',
      sky: { top: '#1C1639', mid: '#523672', low: '#C67BCB' },
      land: { far: '#39295B', near: '#4A3472', top: '#8C68C8', rock: '#241D40', glow: '#E4A6FF' },
      platform: { top: '#8C70C2', lip: '#4B3868', face: '#30244A' }
    }
  };

  var TYPES = {
    pip: { id: 'pip', role: 'Bouncer', cost: 2, hp: 72, atk: 9, speed: 0.063, range: 0.026, cooldown: 0.88, radius: 0.014, shape: 'pip' },
    chonk: { id: 'chonk', role: 'Big Pal', cost: 4, hp: 215, atk: 14, speed: 0.034, range: 0.03, cooldown: 1.2, radius: 0.021, shape: 'chonk' },
    zap: { id: 'zap', role: 'Zapper', cost: 3, hp: 58, atk: 11, speed: 0.045, range: 0.155, cooldown: 1.28, radius: 0.013, shape: 'zap' }
  };

  var MAZE_MIN_SIZE = 8;
  var MAZE_MAX_SIZE = 25;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function randomRange(rng, a, b) { return a + rng() * (b - a); }
  function makeRng(seed) {
    var next = mulberry32(seed || 1);
    return {
      next: next,
      range: function (a, b) { return randomRange(next, a, b); },
      choose: function (list) { return list[Math.floor(next() * list.length)]; }
    };
  }

  function getLaneNames(count) {
    count = clamp(Number(count) || 3, 3, 5);
    if (count === 5) return ['Far Left', 'Left', 'Middle', 'Right', 'Far Right'];
    if (count === 4) return ['Far Left', 'Mid Left', 'Mid Right', 'Far Right'];
    return LANES.slice();
  }

  function createGates(count) {
    var gates = [];
    for (var i = 0; i < count; i++) gates.push({ hp: GATE_MAX, max: GATE_MAX });
    return gates;
  }

  function getStats(elementId, typeId) {
    var base = TYPES[typeId], el = ELEMENTS[elementId];
    if (!base || !el) return null;
    var mods = el.stats || {};
    return {
      id: typeId, role: base.role, shape: base.shape, cost: base.cost,
      name: el.names[typeId],
      hp: Math.round(base.hp * (mods.hp || 1)),
      atk: Math.round(base.atk * (mods.atk || 1)),
      speed: base.speed * (mods.speed || 1),
      range: base.range,
      cooldown: base.cooldown * (mods.cooldown || 1),
      radius: base.radius,
      lifesteal: mods.lifesteal || 0,
      defense: mods.defense || 1,
      strongAgainst: ELEMENT_BEATS[elementId],
      weakAgainst: weakAgainst(elementId)
    };
  }

  function getRoster(elementId) {
    return ['pip', 'chonk', 'zap'].map(function (id) { return getStats(elementId, id); });
  }

  function kingdomFor(elementId) { return KINGDOMS[elementId] || KINGDOMS.fire; }
  function strongAgainst(elementId) { return ELEMENT_BEATS[elementId]; }
  function weakAgainst(elementId) {
    for (var id in ELEMENT_BEATS) if (ELEMENT_BEATS[id] === elementId) return id;
    return null;
  }
  function attackMultiplier(attackerElement, defenderElement) {
    if (ELEMENT_BEATS[attackerElement] === defenderElement) return 1.3;
    if (ELEMENT_BEATS[defenderElement] === attackerElement) return 0.78;
    return 1;
  }
  function defenseMultiplier(defenderElement) {
    var el = ELEMENTS[defenderElement];
    return el && el.stats.defense ? el.stats.defense : 1;
  }
  function matchup(attackerElement, defenderElement) {
    var attack = attackMultiplier(attackerElement, defenderElement);
    var guard = defenseMultiplier(defenderElement);
    return {
      attack: attack,
      defense: guard,
      total: attack * guard,
      label: attack > 1 ? 'STRONG' : attack < 1 ? 'WEAK' : 'EVEN',
      color: attack > 1 ? '#4E9D3D' : attack < 1 ? '#C05C40' : '#8A7B5E'
    };
  }

  function addEffect(state, kind, data) {
    data = data || {};
    data.kind = kind;
    data.life = data.life || 0.45;
    data.maxLife = data.life;
    state.effects.push(data);
    if (state.effects.length > 100) state.effects.shift();
  }

  function addText(state, lane, x, text, color) {
    addEffect(state, 'text', { lane: lane, x: x, text: text, color: color || '#ffffff', life: 0.8 });
  }

  function addFeed(state, text) {
    state.feed.unshift({ id: state.feedId++, text: text, t: state.elapsed });
    if (state.feed.length > 5) state.feed.length = 5;
  }

  function mazeIndex(maze, x, y) { return y * maze.cols + x; }

  function mazeCellOpen(maze, x, y) {
    return x >= 0 && y >= 0 && x < maze.cols && y < maze.rows && !!maze.grid[y * maze.cols + x];
  }

  function mazeNeighbors(maze, x, y) {
    var out = [];
    if (mazeCellOpen(maze, x + 1, y)) out.push({ x: x + 1, y: y });
    if (mazeCellOpen(maze, x - 1, y)) out.push({ x: x - 1, y: y });
    if (mazeCellOpen(maze, x, y + 1)) out.push({ x: x, y: y + 1 });
    if (mazeCellOpen(maze, x, y - 1)) out.push({ x: x, y: y - 1 });
    return out;
  }

  function mazeDistances(maze, start) {
    var total = maze.cols * maze.rows;
    var dist = new Array(total);
    for (var i = 0; i < total; i++) dist[i] = Infinity;
    if (!mazeCellOpen(maze, start.x, start.y)) return dist;
    var startIndex = mazeIndex(maze, start.x, start.y);
    var queue = [startIndex];
    var head = 0;
    dist[startIndex] = 0;
    while (head < queue.length) {
      var idx = queue[head++];
      var x = idx % maze.cols;
      var y = Math.floor(idx / maze.cols);
      var near = mazeNeighbors(maze, x, y);
      for (var n = 0; n < near.length; n++) {
        var next = mazeIndex(maze, near[n].x, near[n].y);
        if (dist[next] === Infinity) {
          dist[next] = dist[idx] + 1;
          queue.push(next);
        }
      }
    }
    return dist;
  }

  function mazePathExists(maze) {
    var dist = mazeDistances(maze, maze.home);
    return dist[mazeIndex(maze, maze.foe.x, maze.foe.y)] < Infinity;
  }

  function createMazeGrid(rng, opts) {
    opts = opts || {};
    var cols, rows;
    if (opts.mazeCols && opts.mazeRows) {
      cols = clamp(Math.floor(Number(opts.mazeCols)), MAZE_MIN_SIZE, MAZE_MAX_SIZE);
      rows = clamp(Math.floor(Number(opts.mazeRows)), MAZE_MIN_SIZE, MAZE_MAX_SIZE);
    } else {
      cols = MAZE_MIN_SIZE + Math.floor(rng.next() * (MAZE_MAX_SIZE - MAZE_MIN_SIZE + 1));
      rows = MAZE_MIN_SIZE + Math.floor(rng.next() * (MAZE_MAX_SIZE - MAZE_MIN_SIZE + 1));
    }
    var largest = Math.max(cols, rows);
    var mazeLabel = largest <= 12 ? 'Cozy' : largest <= 17 ? 'Winding' : largest <= 21 ? 'Grand' : 'Labyrinth';
    var grid = new Array(cols * rows);
    for (var g = 0; g < grid.length; g++) grid[g] = false;
    var directions = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }];
    var stack = [{ x: 1, y: 1 }];
    grid[mazeIndex({ cols: cols, rows: rows }, 1, 1)] = true;
    while (stack.length) {
      var cur = stack[stack.length - 1];
      for (var d = directions.length - 1; d > 0; d--) {
        var swap = Math.floor(rng.next() * (d + 1));
        var tmp = directions[d];
        directions[d] = directions[swap];
        directions[swap] = tmp;
      }
      var picked = null;
      for (var i = 0; i < directions.length; i++) {
        var nx = cur.x + directions[i].x;
        var ny = cur.y + directions[i].y;
        if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && !grid[ny * cols + nx]) {
          picked = { x: nx, y: ny, wx: cur.x + directions[i].x / 2, wy: cur.y + directions[i].y / 2 };
          break;
        }
      }
      if (picked) {
        grid[picked.wy * cols + picked.wx] = true;
        grid[picked.y * cols + picked.x] = true;
        stack.push({ x: picked.x, y: picked.y });
      } else {
        stack.pop();
      }
    }
    var entryRow = Math.floor(rows / 2);
    if (entryRow % 2 === 0) entryRow++;
    if (entryRow >= rows) entryRow = rows - 2;
    function openCell(x, y) { if (x >= 0 && y >= 0 && x < cols && y < rows) grid[y * cols + x] = true; }
    openCell(0, entryRow);
    openCell(1, entryRow);
    openCell(cols - 2, entryRow);
    openCell(cols - 1, entryRow);
    var loopTarget = 3 + Math.floor(rng.range(0, 4));
    var loopTries = cols * rows;
    while (loopTries-- > 0 && loopTarget > 0) {
      var lx = 1 + Math.floor(rng.next() * (cols - 2));
      var ly = 1 + Math.floor(rng.next() * (rows - 2));
      if (grid[ly * cols + lx]) continue;
      var horizontal = lx > 0 && lx < cols - 1 && grid[ly * cols + lx - 1] && grid[ly * cols + lx + 1];
      var vertical = ly > 0 && ly < rows - 1 && grid[(ly - 1) * cols + lx] && grid[(ly + 1) * cols + lx];
      if (horizontal || vertical) {
        grid[ly * cols + lx] = true;
        loopTarget--;
      }
    }
    var maze = {
      cols: cols,
      rows: rows,
      grid: grid,
      home: { x: 0, y: entryRow },
      foe: { x: cols - 1, y: entryRow },
      label: mazeLabel,
      shifts: 0,
      lastShift: -999
    };
    if (!mazePathExists(maze)) {
      for (var rx = 1; rx < cols - 1; rx++) grid[entryRow * cols + rx] = true;
    }
    var shiftMin = opts.mazeShiftEvery ? Math.max(5, Number(opts.mazeShiftEvery)) : 12;
    maze.shiftEvery = shiftMin;
    maze.shiftTimer = shiftMin + rng.range(0, 4);
    maze.warning = false;
    maze.warned = false;
    maze.playerPath = [];
    maze.loops = 0;
    return maze;
  }

  function mazePathCells(maze, start, goal) {
    var total = maze.cols * maze.rows;
    var prev = new Array(total);
    var seen = new Array(total);
    for (var i = 0; i < total; i++) { prev[i] = -1; seen[i] = false; }
    if (!mazeCellOpen(maze, start.x, start.y) || !mazeCellOpen(maze, goal.x, goal.y)) return [];
    var startIdx = mazeIndex(maze, start.x, start.y);
    var goalIdx = mazeIndex(maze, goal.x, goal.y);
    var queue = [startIdx];
    var head = 0;
    seen[startIdx] = true;
    while (head < queue.length) {
      var idx = queue[head++];
      if (idx === goalIdx) break;
      var near = mazeNeighbors(maze, idx % maze.cols, Math.floor(idx / maze.cols));
      for (var n = 0; n < near.length; n++) {
        var next = mazeIndex(maze, near[n].x, near[n].y);
        if (!seen[next]) { seen[next] = true; prev[next] = idx; queue.push(next); }
      }
    }
    if (!seen[goalIdx]) return [];
    var path = [];
    var cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      path.push({ x: cur % maze.cols, y: Math.floor(cur / maze.cols) });
      cur = prev[cur];
    }
    path.push({ x: start.x, y: start.y });
    return path.reverse();
  }

  function refreshMazeDistances(state) {
    state.maze.playerDist = mazeDistances(state.maze, state.maze.foe);
    state.maze.enemyDist = mazeDistances(state.maze, state.maze.home);
    state.maze.playerPath = mazePathCells(state.maze, state.maze.home, state.maze.foe);
    var loops = 0;
    for (var y = 1; y < state.maze.rows - 1; y++) {
      for (var x = 1; x < state.maze.cols - 1; x++) {
        if (!mazeCellOpen(state.maze, x, y)) continue;
        if (mazeNeighbors(state.maze, x, y).length >= 3) loops++;
      }
    }
    state.maze.loops = loops;
  }

  function createMazeMatch(opts) {
    var playerElement = ELEMENTS[opts.player] ? opts.player : 'fire';
    var seed = (opts.seed === undefined || opts.seed === null) ? Math.floor(Date.now() % 2147483647) : (Number(opts.seed) >>> 0);
    var rng = makeRng(seed);
    var enemyChoices = ELEMENT_ORDER.filter(function (id) { return id !== playerElement; });
    var enemyElement = ELEMENTS[opts.enemy] && opts.enemy !== playerElement ? opts.enemy : rng.choose(enemyChoices);
    var playerKingdom = kingdomFor(playerElement);
    var enemyKingdom = kingdomFor(enemyElement);
    var maze = createMazeGrid(rng, opts);
    var state = {
      mode: 'maze', seed: seed, rng: rng, playerElement: playerElement, enemyElement: enemyElement,
      kingdoms: { player: playerKingdom, enemy: enemyKingdom },
      maze: maze,
      base: { player: CORE_MAX, enemy: CORE_MAX }, baseMax: { player: CORE_MAX, enemy: CORE_MAX },
      gates: { player: createGates(1), enemy: createGates(1) },
      gateMax: GATE_MAX, coreMax: CORE_MAX,
      energy: 6, aiEnergy: 5, maxEnergy: 10,
      playerRate: 0.7, aiRate: 0.56,
      units: [], effects: [], feed: [], feedId: 1,
      laneCount: 1, laneNames: ['Maze Gate'], lanes: [0],
      elapsed: 0, time: 0, paused: false, eventOffer: null, result: null,
      spawnCd: 0, spawnMax: SPAWN_MAX,
      aiTimer: 2.1, wildTimer: 30 + rng.range(0, 8), eventTimer: 26 + rng.range(0, 5),
      eliteTimer: 24 + rng.range(0, 6),
      finalBounceAt: FINAL_BOUNCE_AT, finalBounce: false,
      abilityCd: 0, abilityMax: ELEMENTS[playerElement].ability.cooldown,
      buffs: {
        player: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 },
        enemy: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 }
      },
      warned: { player: false, enemy: false },
      stats: { spawned: 0, kills: 0, abilities: 0, events: 0, gates: 0, shifts: 0 },
      nextId: 1, selectedType: 'pip'
    };
    refreshMazeDistances(state);
    addFeed(state, playerKingdom.name + ' vs ' + enemyKingdom.name + ' in a ' + maze.cols + '×' + maze.rows + ' shifting maze. Tap the maze to send a pal — walls move every ~' + Math.round(maze.shiftEvery) + 's.');
    return state;
  }

  var TOWER_TOTAL_WAVES = 8;
  var TOWER_TYPES = {
    pip: { id: 'pip', name: 'Spark Spire', role: 'Rapid single target', damageType: 'rapid', hint: 'Cheap, fast, best against single runners.', cost: 3, damage: 18, range: 3.0, cooldown: 0.5, splash: 0, chain: 0 },
    chonk: { id: 'chonk', name: 'Stone Bastion', role: 'Slow splash mortar', damageType: 'splash', hint: 'Splash damage, best against bunched-up brutes.', cost: 5, damage: 52, range: 2.6, cooldown: 1.25, splash: 0.7, chain: 0 },
    zap: { id: 'zap', name: 'Storm Coil', role: 'Long-range chain', damageType: 'chain', hint: 'Long range chain lightning, best against long straights.', cost: 4, damage: 30, range: 4.0, cooldown: 0.85, splash: 0, chain: 0.6 }
  };
  // One clear specialisation per tower, chosen after it is built. The point is
  // that a tower's job changes visibly, not that its numbers go up a bit.
  var TOWER_MODULES = {
    laser: { id: 'laser', name: 'Laser', icon: '🔆', color: '#7BE0FF', costMult: 1.15, desc: '+25% damage, +0.5 range and ignores armour.' },
    slow: { id: 'slow', name: 'Slow', icon: '❄️', color: '#9BD7FF', costMult: 1.0, desc: 'Chills enemies 45% for 1.6s, plus 15% damage and a little range.' },
    aoe: { id: 'aoe', name: 'AOE', icon: '💥', color: '#FFB86B', costMult: 1.1, desc: 'Every shot splashes a wide area around the target.' },
    troops: { id: 'troops', name: 'Troops', icon: '🐣', color: '#B6F08A', costMult: 1.25, desc: 'Sends a little Hearth Guard down the route to fight.' }
  };

  // Siege archetypes: base type plus armour, aura and leak behaviour.
  var TOWER_ENEMIES = {
    runner: { kind: 'runner', type: 'pip', name: 'Siege Runner', emoji: '🏃', hp: 1, speed: 1.25, armor: 1, leak: 1, tip: 'Fast and flimsy.' },
    brute: { kind: 'brute', type: 'chonk', name: 'Iron Brute', emoji: '🛡️', hp: 1.45, speed: 0.7, armor: 0.78, leak: 1.4, tip: 'Armoured: rapid towers barely scratch it.' },
    shielder: { kind: 'shielder', type: 'zap', name: 'Ward Shielder', emoji: '🔮', hp: 1.05, speed: 0.95, armor: 1, leak: 1.1, shield: 0.7, tip: 'Shields nearby pals — pop it first.' },
    boss: { kind: 'boss', type: 'chonk', name: 'Siege Titan', emoji: '👹', hp: 5.0, speed: 0.58, armor: 0.86, leak: 3.2, shield: 0.9, tip: 'Boss: ignore it and your core pays.' }
  };
  var TOWER_PATH = [
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }, { x: 8, y: 1 },
    { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 },
    { x: 7, y: 4 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 },
    { x: 4, y: 5 }, { x: 4, y: 6 },
    { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }
  ];
  // Twelve pads, each hugging a bend or a straight so placement matters.
  var TOWER_PAD_CELLS = [
    { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 7, y: 2 }, { x: 9, y: 2 },
    { x: 9, y: 3 }, { x: 9, y: 5 },
    { x: 5, y: 3 }, { x: 7, y: 3 },
    { x: 3, y: 2 }, { x: 5, y: 7 }, { x: 8, y: 7 }, { x: 11, y: 5 }
  ];

  function getTowerStats(elementId, typeId) {
    var base = TOWER_TYPES[typeId], el = ELEMENTS[elementId];
    if (!base || !el) return null;
    var mods = el.stats || {};
    return {
      id: typeId, name: base.name, role: base.role, cost: base.cost,
      damageType: base.damageType, hint: base.hint,
      damage: Math.round(base.damage * (mods.atk || 1)),
      range: base.range,
      cooldown: base.cooldown * (mods.cooldown || 1),
      splash: base.splash || 0, chain: base.chain || 0
    };
  }

  function getTowerRoster(elementId) {
    return ['pip', 'chonk', 'zap'].map(function (id) { return getTowerStats(elementId, id); });
  }

  function createTowerMatch(opts) {
    var playerElement = ELEMENTS[opts.player] ? opts.player : 'fire';
    var seed = (opts.seed === undefined || opts.seed === null) ? Math.floor(Date.now() % 2147483647) : (Number(opts.seed) >>> 0);
    var rng = makeRng(seed);
    var enemyChoices = ELEMENT_ORDER.filter(function (id) { return id !== playerElement; });
    var enemyElement = ELEMENTS[opts.enemy] && opts.enemy !== playerElement ? opts.enemy : rng.choose(enemyChoices);
    var playerKingdom = kingdomFor(playerElement);
    var enemyKingdom = kingdomFor(enemyElement);
    var pads = TOWER_PAD_CELLS.map(function (cell, index) {
      return { id: index + 1, x: cell.x, y: cell.y, tower: null };
    });
    var laneNames = pads.map(function (pad) { return 'Pad ' + pad.id; });
    var state = {
      mode: 'tower', seed: seed, rng: rng, playerElement: playerElement, enemyElement: enemyElement,
      kingdoms: { player: playerKingdom, enemy: enemyKingdom },
      base: { player: CORE_MAX, enemy: CORE_MAX }, baseMax: { player: CORE_MAX, enemy: CORE_MAX },
      gates: { player: createGates(pads.length), enemy: createGates(pads.length) },
      gateMax: GATE_MAX, coreMax: CORE_MAX,
      energy: 14, aiEnergy: 0, maxEnergy: 16,
      playerRate: 0.18, aiRate: 0,
      units: [], effects: [], feed: [], feedId: 1,
      laneCount: pads.length, laneNames: laneNames, lanes: pads.map(function (pad) { return pad.id - 1; }),
      elapsed: 0, time: 0, paused: false, eventOffer: null, result: null,
      spawnCd: 0, spawnMax: SPAWN_MAX,
      aiTimer: 9999, wildTimer: 9999, eventTimer: 9999,
      finalBounceAt: 99999, finalBounce: false,
      abilityCd: 0, abilityMax: ELEMENTS[playerElement].ability.cooldown,
      buffs: {
        player: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 },
        enemy: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 }
      },
      warned: { player: false, enemy: false },
      stats: { spawned: 0, kills: 0, abilities: 0, events: 0, gates: 0, towers: 0, waves: 0, leaks: 0 },
      nextId: 1, selectedType: 'pip',
      tower: {
        cols: 12, rows: 8, path: TOWER_PATH.slice(), pads: pads,
        totalWaves: TOWER_TOTAL_WAVES, wave: 0, cleared: 0, waveActive: false,
        waveTimer: 12, queue: [], queueTimer: 0,
        towers: 0, kills: 0, spawned: 0, shots: 0, leaks: 0, lastBuilt: null,
        sparkEarned: 0, bestWave: 0,
        streak: 0, bestStreak: 0, waveLeaks: 0, perfectWaves: 0, earlySpark: 0, sold: 0
      }
    };
    addFeed(state, 'TOWER DEFENCE: 12 pads, 14 starting spark. Every siege pal you pop pays spark back — build, level up, specialise, hold ' + TOWER_TOTAL_WAVES + ' waves.');
    return state;
  }

  function towerUpgradeCost(tower) {
    if (!tower) return 0;
    var base = tower.baseCost || TOWER_TYPES[tower.type].cost;
    // Cheap enough that a level is the natural next tap, not a whole wave of saving.
    return Math.max(2, Math.round(base * (0.75 + 0.55 * (tower.level - 1))));
  }

  // Prospective stats for the next level, including the installed module, so the
  // upgrade button can show real gains instead of a mystery price.
  function towerStatsForLevel(tower, level) {
    var damage = Math.round(tower.baseDamage * (1 + 0.75 * (level - 1)));
    var range = Math.round((tower.baseRange + 0.2 * (level - 1)) * 100) / 100;
    var cooldown = Math.round(tower.baseCooldown * (1 - 0.15 * (level - 1)) * 100) / 100;
    return { damage: damage, range: range, cooldown: cooldown };
  }

  function towerUpgradePreview(tower) {
    if (!tower || tower.level >= 3) return null;
    var next = tower.level + 1;
    var stats = towerStatsForLevel(tower, next);
    if (tower.module === 'laser') {
      stats.damage = Math.round(stats.damage * 1.25);
      stats.range = Math.round((stats.range + 0.5) * 100) / 100;
    } else if (tower.module === 'slow') {
      stats.damage = Math.round(stats.damage * 1.15);
      stats.range = Math.round((stats.range + 0.3) * 100) / 100;
    }
    return {
      level: next, cost: towerUpgradeCost(tower),
      damage: stats.damage, range: stats.range, cooldown: stats.cooldown,
      damageGain: stats.damage - tower.damage,
      rangeGain: Math.round((stats.range - tower.range) * 100) / 100
    };
  }

  function towerModuleCost(tower, moduleId) {
    var module = TOWER_MODULES[moduleId];
    if (!module || !tower) return 0;
    return Math.max(2, Math.round((tower.baseCost || 3) * module.costMult));
  }

  function applyTowerModule(tower) {
    if (!tower || !tower.module) return tower;
    if (tower.module === 'laser') {
      tower.damage = Math.round(tower.damage * 1.25);
      tower.range = Math.round((tower.range + 0.5) * 100) / 100;
      tower.armorPierce = true;
      tower.damageType = 'laser';
    } else if (tower.module === 'slow') {
      tower.damage = Math.round(tower.damage * 1.15);
      tower.range = Math.round((tower.range + 0.3) * 100) / 100;
      tower.slowPower = 0.55;
      tower.slowTime = 1.6;
    } else if (tower.module === 'aoe') {
      tower.splash = Math.max(tower.splash || 0, 0.85);
      tower.splashRadius = 1.25;
    } else if (tower.module === 'troops') {
      tower.troopTimer = tower.troopTimer || 1.2;
      tower.troopEvery = 7;
    }
    return tower;
  }

  function installTowerModule(state, padIndex, moduleId) {
    if (!state || state.result) return { ok: false, msg: 'The siege is over.', reason: 'ended' };
    if (state.mode !== 'tower' || !state.tower) return { ok: false, msg: 'Modules are a Tower Defence upgrade.', reason: 'mode' };
    var pad = state.tower.pads[padIndex];
    if (!pad || !pad.tower) return { ok: false, msg: 'Build a tower before upgrading it.', reason: 'empty' };
    var tower = pad.tower;
    if (tower.module) return { ok: false, msg: 'That tower already has its ' + TOWER_MODULES[tower.module].name + ' upgrade.', reason: 'module' };
    var module = TOWER_MODULES[moduleId];
    if (!module) return { ok: false, msg: 'Unknown upgrade.', reason: 'type' };
    var cost = towerModuleCost(tower, moduleId);
    if (state.energy < cost) return { ok: false, msg: 'Need ' + cost + ' spark for ' + module.name + '.', reason: 'energy', needed: Math.ceil(cost - state.energy) };
    state.energy -= cost;
    tower.module = moduleId;
    tower.spent = (tower.spent || tower.baseCost) + cost;
    applyTowerModule(tower);
    addEffect(state, 'towerUpgrade', { gx: pad.x, gy: pad.y, color: module.color, life: 0.9, level: tower.level, module: moduleId });
    addFeed(state, tower.name + ' gains ' + module.name + ': ' + module.desc);
    return { ok: true, module: moduleId, msg: module.icon + ' ' + module.name + ' installed!' };
  }

  // Consecutive kills pay more; a leak breaks the streak. Clearing a wave without
  // leaks pays the largest bonus, so spending spark is a risk you choose.
  function towerBounty(state) {
    var streak = state.tower ? state.tower.streak : 0;
    if (streak >= 40) return 1.6;
    if (streak >= 20) return 1.4;
    if (streak >= 8) return 1.2;
    return 1;
  }

  function towerEarlyBonus(state) {
    if (!state || !state.tower) return 0;
    return Math.min(4, Math.max(1, Math.round(state.tower.waveTimer / 3)));
  }

  // How many path tiles a pad's range actually covers: positioning, measured.
  function towerCoverage(state, padIndex, range) {
    if (!state || !state.tower) return 0;
    var pad = state.tower.pads[padIndex];
    if (!pad) return 0;
    var reach = range || (pad.tower ? pad.tower.range : 0);
    if (!reach) return 0;
    var count = 0;
    state.tower.path.forEach(function (cell) {
      var dx = cell.x - pad.x, dy = cell.y - pad.y;
      if (Math.sqrt(dx * dx + dy * dy) <= reach) count++;
    });
    return count;
  }

  function sellTower(state, padIndex) {
    if (!state || state.result) return { ok: false, msg: 'The siege is over.', reason: 'ended' };
    if (state.mode !== 'tower' || !state.tower) return { ok: false, msg: 'Only Tower Defence has towers to sell.', reason: 'mode' };
    var pad = state.tower.pads[padIndex];
    if (!pad || !pad.tower) return { ok: false, msg: 'That pad is empty.', reason: 'empty' };
    var tower = pad.tower;
    var refund = Math.max(2, Math.round((tower.spent || tower.baseCost || 3) * 0.75));
    state.energy = Math.min(state.maxEnergy, state.energy + refund);
    state.tower.towers = Math.max(0, state.tower.towers - 1);
    state.tower.sold++;
    addEffect(state, 'towerSell', { gx: pad.x, gy: pad.y, color: '#FFE156', life: 0.7, amount: refund });
    addFeed(state, tower.name + ' sold for +' + refund + '⚡. Rebuild somewhere better.');
    pad.tower = null;
    return { ok: true, refund: refund, msg: '+' + refund + '⚡ refunded' };
  }

  function towerWaveComposition(wave) {
    var count = 3 + wave * 2;
    var queue = [];
    for (var i = 0; i < count; i++) {
      var kind = 'runner';
      if (wave >= 2 && i % 4 === 2) kind = 'shielder';
      if (wave >= 3 && i % 4 === 3) kind = 'brute';
      if (wave >= 5 && i % 6 === 0) kind = 'brute';
      if (wave >= 6 && i % 7 === 5) kind = 'shielder';
      var boss = (wave === 4 || wave === TOWER_TOTAL_WAVES) && i === count - 1;
      if (boss) kind = 'boss';
      queue.push({ kind: kind, type: TOWER_ENEMIES[kind].type, boss: boss });
    }
    var types = { pip: 0, zap: 0, chonk: 0 };
    var kinds = { runner: 0, shielder: 0, brute: 0, boss: 0 };
    queue.forEach(function (unit) { types[unit.type]++; kinds[unit.kind]++; });
    return {
      wave: wave, count: count, queue: queue, types: types, kinds: kinds,
      boss: wave === 4 || wave === TOWER_TOTAL_WAVES,
      tip: wave === 4 || wave === TOWER_TOTAL_WAVES
        ? 'BOSS WAVE: one Siege Titan, and it leaks much harder.'
        : kinds.brute ? 'Iron Brutes are coming: bring splash damage.' : kinds.shielder ? 'Ward Shielders protect the pack: pick them off first.' : 'Fast runners, nothing armoured.'
    };
  }

  function getTowerWavePreview(state) {
    if (!state || !state.tower || state.tower.cleared >= state.tower.totalWaves) return null;
    return towerWaveComposition(state.tower.wave + 1);
  }

  function buildTower(state, padIndex, typeId) {
    if (!state || state.result) return { ok: false, msg: 'The siege is over.', reason: 'ended' };
    if (state.mode !== 'tower' || !state.tower) return { ok: false, msg: 'Tower building is only available in Tower Defence.', reason: 'mode' };
    var pad = state.tower.pads[padIndex];
    if (!pad) return { ok: false, msg: 'That build pad does not exist.', reason: 'pad' };
    if (pad.tower) {
      var tower = pad.tower;
      if (tower.level >= 3) return { ok: false, msg: 'That tower is already max level.', reason: 'max' };
      var upgradeCost = towerUpgradeCost(tower);
      if (state.energy < upgradeCost) return { ok: false, msg: 'Need ' + upgradeCost + ' spark to upgrade.', reason: 'energy', needed: Math.ceil(upgradeCost - state.energy) };
      state.energy -= upgradeCost;
      tower.spent = (tower.spent || tower.baseCost) + upgradeCost;
      tower.level++;
      tower.upgradeCost = tower.level >= 3 ? 0 : towerUpgradeCost(tower);
      var levelStats = towerStatsForLevel(tower, tower.level);
      tower.damage = levelStats.damage;
      tower.range = levelStats.range;
      tower.cooldown = levelStats.cooldown;
      if (tower.splash) tower.splash = Math.min(1.1, tower.splash + 0.12);
      if (tower.chain) tower.chain = Math.min(0.95, tower.chain + 0.1);
      applyTowerModule(tower);
      addEffect(state, 'towerUpgrade', { gx: pad.x, gy: pad.y, color: ELEMENTS[tower.element].light, life: 0.8, level: tower.level });
      addFeed(state, tower.name + ' → Lv ' + tower.level + ' (' + tower.damage + ' dmg, covers ' + towerCoverage(state, padIndex) + ' tiles).');
      return { ok: true, upgraded: true, msg: tower.name + ' Lv ' + tower.level + '!' };
    }
    var info = getTowerStats(state.playerElement, typeId);
    if (!info) return { ok: false, msg: 'That tower does not exist.', reason: 'type' };
    if (state.energy < info.cost) return { ok: false, msg: 'Need ' + info.cost + ' spark to build.', reason: 'energy', needed: Math.ceil(info.cost - state.energy) };
    state.energy -= info.cost;
    var built = {
      type: typeId, element: state.playerElement, name: info.name, role: info.role,
      level: 1, baseDamage: info.damage, baseRange: info.range, baseCooldown: info.cooldown,
      baseCost: info.cost, spent: info.cost, module: null,
      damage: info.damage, range: info.range, cooldown: info.cooldown, cd: 0.1,
      splash: info.splash, chain: info.chain, upgradeCost: towerUpgradeCost({ type: typeId, level: 1, baseCost: info.cost })
    };
    pad.tower = built;
    state.tower.towers++;
    state.stats.towers++;
    state.tower.lastBuilt = padIndex;
    addEffect(state, 'towerBuild', { gx: pad.x, gy: pad.y, color: ELEMENTS[built.element].light, life: 0.8 });
    addFeed(state, info.name + ' built on pad ' + pad.id + '. ' + info.role + '.');
    return { ok: true, msg: info.name + ' built!' };
  }

  function startTowerWave(state, early) {
    var t = state.tower;
    if (t.waveActive || t.cleared >= t.totalWaves) return false;
    t.wave++;
    var comp = towerWaveComposition(t.wave);
    t.waveActive = true;
    t.queue = comp.queue;
    t.queueTimer = 0.25;
    t.waveLeaks = 0;
    var earlyGain = 0;
    if (early && t.waveTimer > 0.5) {
      earlyGain = towerEarlyBonus(state);
      state.energy = Math.min(state.maxEnergy, state.energy + earlyGain);
      t.earlySpark += earlyGain;
      addFeed(state, 'Early wave start! +' + earlyGain + ' spark for the risk.');
    }
    state.stats.waves++;
    addFeed(state, 'WAVE ' + t.wave + ' OF ' + t.totalWaves + ' incoming. ' + comp.count + ' siege pals!');
    addEffect(state, 'towerWave', { text: 'WAVE ' + t.wave, color: ELEMENTS[state.enemyElement].light, life: 1.5 });
    return true;
  }

  function spawnTowerEnemy(state, typeId, boss, kindId) {
    var kind = TOWER_ENEMIES[kindId] ? kindId : (boss ? 'boss' : typeId === 'chonk' ? 'brute' : typeId === 'zap' ? 'shielder' : 'runner');
    var archetype = TOWER_ENEMIES[kind];
    var type = archetype.type;
    var stats = getStats(state.enemyElement, type);
    if (!stats) return null;
    var t = state.tower;
    var scale = 1 + (t.wave - 1) * 0.26;
    var hp = Math.round(stats.hp * scale * archetype.hp);
    var unit = {
      id: state.nextId++, side: 'enemy', lane: 0, type: type,
      kind: kind, archetype: archetype,
      element: state.enemyElement, name: archetype.name, role: archetype.tip, shape: stats.shape,
      pathIndex: 0, pathT: 0, hp: hp, maxHp: hp,
      speed: (1.0 + stats.speed * 6) * archetype.speed, stun: 0, hitFlash: 0, age: 0, boss: !!boss,
      armor: archetype.armor || 1, shield: archetype.shield || 1, leakScale: archetype.leak || 1,
      radius: stats.radius, x: 0, yOffset: 0
    };
    state.units.push(unit);
    t.spawned++;
    var start = t.path[0];
    addEffect(state, 'towerSpawn', { gx: start.x, gy: start.y, color: ELEMENTS[unit.element].light, life: 0.5 });
    return unit;
  }

  function towerUnitPosition(unit) {
    var path = unit.path || TOWER_PATH;
    var index = clamp(unit.pathIndex || 0, 0, path.length - 1);
    var next = path[Math.min(index + 1, path.length - 1)];
    var here = path[index];
    var t = clamp(unit.pathT || 0, 0, 1);
    return { x: here.x + (next.x - here.x) * t, y: here.y + (next.y - here.y) * t };
  }

  function towerTargetFor(state, tower, pad) {
    var best = null, bestProgress = -1;
    for (var i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      if (unit.hp <= 0 || unit.side === 'player') continue;
      var pos = towerUnitPosition(unit);
      var dx = pos.x - pad.x, dy = pos.y - pad.y;
      if (Math.sqrt(dx * dx + dy * dy) > tower.range) continue;
      var progress = unit.pathIndex + unit.pathT;
      if (progress > bestProgress) { best = unit; bestProgress = progress; }
    }
    return best;
  }

  function towerShieldFor(state, enemy) {
    var shield = enemy.shield || 1;
    for (var i = 0; i < state.units.length; i++) {
      var ally = state.units[i];
      if (ally === enemy || ally.hp <= 0 || ally.kind !== 'shielder') continue;
      var a = towerUnitPosition(ally), b = towerUnitPosition(enemy);
      var dx = a.x - b.x, dy = a.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 2.2) shield = Math.min(shield, ally.shield || 0.7);
    }
    return shield;
  }

  function towerHitDamage(state, tower, enemy, multiplier) {
    var attack = attackMultiplier(tower.element, enemy.element);
    var guard = defenseMultiplier(enemy.element);
    var armor = tower.armorPierce ? 1 : (enemy.armor || 1);
    var shield = towerShieldFor(state, enemy);
    var amount = Math.max(1, Math.round(tower.damage * attack * guard * (multiplier || 1) * armor * shield));
    enemy.hp -= amount;
    enemy.hitFlash = 0.18;
    if (tower.slowTime) {
      enemy.slowTime = Math.max(enemy.slowTime || 0, tower.slowTime);
      enemy.slowPower = tower.slowPower;
    }
    return { amount: amount, strong: attack > 1, weak: attack < 1 };
  }

  function updateTowerCombat(state, dt) {
    var t = state.tower;
    for (var p = 0; p < t.pads.length; p++) {
      var pad = t.pads[p];
      var tower = pad.tower;
      if (!tower) continue;
      tower.cd = Math.max(0, tower.cd - dt);
      if (tower.cd > 0) continue;
      var target = towerTargetFor(state, tower, pad);
      if (!target) continue;
      var targetPos = towerUnitPosition(target);
      var hit = towerHitDamage(state, tower, target, 1);
      tower.cd = tower.cooldown;
      t.shots++;
      addEffect(state, 'towerShot', {
        fromGx: pad.x, fromGy: pad.y, gx: targetPos.x, gy: targetPos.y,
        color: ELEMENTS[tower.element].light, life: 0.2, towerType: tower.type, strong: hit.strong, weak: hit.weak
      });
      if (tower.splash) {
        for (var s = 0; s < state.units.length; s++) {
          var other = state.units[s];
          if (other === target || other.hp <= 0 || other.side === 'player') continue;
          var otherPos = towerUnitPosition(other);
          var ddx = otherPos.x - targetPos.x, ddy = otherPos.y - targetPos.y;
          if (Math.sqrt(ddx * ddx + ddy * ddy) <= 0.9) {
            towerHitDamage(state, tower, other, tower.splash);
            addEffect(state, 'towerHit', { gx: otherPos.x, gy: otherPos.y, color: ELEMENTS[tower.element].light, life: 0.22 });
          }
        }
      }
      if (tower.chain) {
        var chained = null, chainDist = Infinity;
        for (var c = 0; c < state.units.length; c++) {
          var candidate = state.units[c];
          if (candidate === target || candidate.hp <= 0 || candidate.side === 'player') continue;
          var candidatePos = towerUnitPosition(candidate);
          var cdx = candidatePos.x - targetPos.x, cdy = candidatePos.y - targetPos.y;
          var dist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (dist <= 2.4 && dist < chainDist) { chained = candidate; chainDist = dist; }
        }
        if (chained) {
          var chainedPos = towerUnitPosition(chained);
          towerHitDamage(state, tower, chained, tower.chain);
          addEffect(state, 'towerChain', {
            fromGx: targetPos.x, fromGy: targetPos.y, gx: chainedPos.x, gy: chainedPos.y,
            color: ELEMENTS[tower.element].light, life: 0.24
          });
        }
      }
      addEffect(state, 'towerHit', { gx: targetPos.x, gy: targetPos.y, color: ELEMENTS[tower.element].light, life: 0.24 });
    }
  }

  function cleanupTowerEnemies(state) {
    var alive = [];
    for (var i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      if (unit.hp > 0) { alive.push(unit); continue; }
      var pos = towerUnitPosition(unit);
      if (unit.side === 'player') {
        addEffect(state, 'towerPoof', { gx: pos.x, gy: pos.y, color: ELEMENTS[state.playerElement].light, life: 0.4 });
        continue;
      }
      state.tower.kills++;
      state.stats.kills++;
      var bounty = towerBounty(state);
      var reward = Math.max(1, Math.round((unit.boss ? 5 : unit.kind === 'brute' ? 2 : 1) * bounty));
      state.energy = Math.min(state.maxEnergy, state.energy + reward);
      state.tower.sparkEarned += reward;
      state.tower.streak++;
      state.tower.bestStreak = Math.max(state.tower.bestStreak, state.tower.streak);
      addEffect(state, 'towerSpark', { gx: pos.x, gy: pos.y, text: '+' + reward + '⚡', color: '#FFE156', life: 0.9 });
      addEffect(state, 'towerPoof', { gx: pos.x, gy: pos.y, color: ELEMENTS[unit.element].light, life: 0.55, boss: unit.boss });
    }
    state.units = alive;
  }

  function updateTowerEnemies(state, dt) {
    var t = state.tower;
    var path = t.path;
    var survivors = [];
    for (var i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      if (unit.hp <= 0) continue;
      if (unit.side === 'player') { survivors.push(unit); continue; }
      unit.age += dt;
      unit.hitFlash = Math.max(0, unit.hitFlash - dt);
      unit.slowTime = Math.max(0, (unit.slowTime || 0) - dt);
      if (unit.stun > 0) {
        unit.stun = Math.max(0, unit.stun - dt);
        survivors.push(unit);
        continue;
      }
      unit.pathT += unit.speed * dt * (unit.slowTime > 0 ? (unit.slowPower || 0.55) : 1);
      while (unit.pathT >= 1 && unit.pathIndex < path.length - 1) {
        unit.pathT -= 1;
        unit.pathIndex++;
      }
      if (unit.pathIndex >= path.length - 1) {
        var leak = Math.round((10 + t.wave * 3) * (unit.leakScale || 1));
        state.base.player = Math.max(0, state.base.player - leak);
        t.leaks++;
        state.stats.leaks++;
        t.waveLeaks++;
        if (t.streak > 0) t.streak = 0;
        var end = path[path.length - 1];
        addEffect(state, 'towerLeak', { gx: end.x, gy: end.y, color: ELEMENTS[state.enemyElement].light, life: 0.8, amount: leak });
        if (t.leaks === 1 || t.leaks % 3 === 0) addFeed(state, 'A siege pal reached your core! -' + leak + ' core.');
        continue;
      }
      survivors.push(unit);
    }
    state.units = survivors;
    if (!state.result && state.base.player <= 0) finishTowerMatch(state, 'enemy');
  }

  function finishTowerMatch(state, winner) {
    if (state.result) return;
    var win = winner === 'player';
    var t = state.tower;
    state.result = {
      winner: winner, mode: 'tower',
      reason: win
        ? 'Your elemental towers held every siege wave. The rival portal goes quiet!'
        : 'The rival siege broke through your bastion core.',
      seconds: Math.round(state.elapsed),
      kills: t.kills, spawned: t.spawned, gates: 0, laneCount: state.laneCount,
      maze: null, finalBounce: false, playerBase: Math.max(0, Math.round(state.base.player)), enemyBase: 0,
      tower: {
        wave: t.wave, totalWaves: t.totalWaves, cleared: t.cleared, kills: t.kills, leaks: t.leaks, towers: t.towers, shots: t.shots,
        bestStreak: t.bestStreak, perfectWaves: t.perfectWaves, sparkEarned: t.sparkEarned, sold: t.sold
      }
    };
    state.paused = true;
    addFeed(state, win ? 'SIEGE BROKEN! Your bastion holds.' : 'THE SIEGE BROKE THROUGH.');
  }

  function towerPathIndexNear(state, pad) {
    var best = 0, bestDist = Infinity;
    state.tower.path.forEach(function (cell, index) {
      var dx = cell.x - pad.x, dy = cell.y - pad.y;
      var d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = index; }
    });
    return best;
  }

  function spawnTowerTroop(state, tower, pad) {
    var mine = state.units.filter(function (u) { return u.side === 'player'; }).length;
    if (mine >= 5) return null;
    var stats = getStats(state.playerElement, 'pip');
    var level = tower.level || 1;
    var guardHp = 44 + level * 20;
    var guard = {
      id: state.nextId++, side: 'player', type: 'pip', element: state.playerElement,
      name: 'Hearth Guard', role: 'Troop', shape: stats.shape,
      pathIndex: towerPathIndexNear(state, pad), pathT: 0.4,
      hp: guardHp, maxHp: guardHp, atk: 12 + level * 7, speed: 0.85, range: 0.55, cooldown: 0.7,
      cd: 0.15, stun: 0, hitFlash: 0, age: 0, troop: true, life: 30
    };
    state.units.push(guard);
    var pos = towerUnitPosition(guard);
    addEffect(state, 'towerSpawn', { gx: pos.x, gy: pos.y, color: ELEMENTS[state.playerElement].light, life: 0.5 });
    addFeed(state, tower.name + ' sends a Hearth Guard onto the route.');
    return guard;
  }

  function updateTowerTroops(state, dt) {
    state.tower.pads.forEach(function (pad) {
      var tower = pad.tower;
      if (!tower || tower.module !== 'troops') return;
      tower.troopTimer = (tower.troopTimer || 0) - dt;
      if (tower.troopTimer <= 0) {
        spawnTowerTroop(state, tower, pad);
        tower.troopTimer = tower.troopEvery || 7;
      }
    });
  }

  function updateTowerAllies(state, dt) {
    var survivors = [];
    for (var i = 0; i < state.units.length; i++) {
      var ally = state.units[i];
      if (ally.side !== 'player') { survivors.push(ally); continue; }
      if (ally.hp <= 0) continue;
      ally.age += dt;
      ally.life -= dt;
      ally.hitFlash = Math.max(0, ally.hitFlash - dt);
      ally.cd = Math.max(0, ally.cd - dt);
      if (ally.life <= 0) continue;
      var here = towerUnitPosition(ally);
      var target = null, bestDist = Infinity;
      for (var j = 0; j < state.units.length; j++) {
        var foe = state.units[j];
        if (foe.side === 'player' || foe.hp <= 0) continue;
        var there = towerUnitPosition(foe);
        var dx = there.x - here.x, dy = there.y - here.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= ally.range && dist < bestDist) { target = foe; bestDist = dist; }
      }
      if (target && ally.cd <= 0) {
        target.hp -= ally.atk;
        target.hitFlash = 0.2;
        ally.cd = ally.cooldown;
        var hitAt = towerUnitPosition(target);
        addEffect(state, 'towerHit', { gx: hitAt.x, gy: hitAt.y, color: ELEMENTS[state.playerElement].light, life: 0.22 });
      } else if (!target) {
        ally.pathT -= ally.speed * dt;
        while (ally.pathT < 0 && ally.pathIndex > 0) { ally.pathT += 1; ally.pathIndex--; }
        ally.pathT = Math.max(0, ally.pathT);
      }
      survivors.push(ally);
    }
    state.units = survivors;
  }

  function updateTowerMode(state, dt) {
    var t = state.tower;
    if (t.waveActive) {
      if (t.queue.length) {
        t.queueTimer -= dt;
        if (t.queueTimer <= 0) {
          var next = t.queue.shift();
          spawnTowerEnemy(state, next.type, next.boss, next.kind);
          t.queueTimer = next.kind === 'boss' ? 1.1 : 0.55;
        }
      }
      updateTowerEnemies(state, dt);
      updateTowerAllies(state, dt);
      if (!state.result) updateTowerCombat(state, dt);
      cleanupTowerEnemies(state);
      updateTowerTroops(state, dt);
      var enemiesLeft = state.units.some(function (u) { return u.side !== 'player'; });
      if (!state.result && !t.queue.length && !enemiesLeft) {
        t.waveActive = false;
        t.cleared++;
        t.bestWave = Math.max(t.bestWave, t.cleared);
        var cleanliness = t.waveLeaks === 0 ? 4 : t.waveLeaks <= 2 ? 2 : 0;
        var clearBonus = 4 + cleanliness;
        if (t.waveLeaks === 0) t.perfectWaves++;
        state.energy = Math.min(state.maxEnergy, state.energy + clearBonus);
        if (t.cleared >= t.totalWaves) {
          finishTowerMatch(state, 'player');
        } else {
          t.waveTimer = 10;
          addFeed(state, 'WAVE ' + t.wave + ' CLEARED' + (t.waveLeaks === 0 ? ' — NO LEAKS!' : ' (' + t.waveLeaks + ' leaked)') + ' +' + clearBonus + '⚡. Kills paid ' + t.sparkEarned + ' so far.');
        }
      }
    } else if (t.cleared < t.totalWaves) {
      t.waveTimer -= dt;
      if (t.waveTimer <= 0) startTowerWave(state, false);
    }
    if (!state.result && state.base.player <= 0) finishTowerMatch(state, 'enemy');
    if (state.effects.length) {
      state.effects.forEach(function (e) { e.life -= dt; });
      state.effects = state.effects.filter(function (e) { return e.life > 0; });
    }
    return state;
  }

  function useTowerAbility(state) {
    var el = state.playerElement;
    var ability = ELEMENTS[el].ability;
    var color = ELEMENTS[el].light;
    var enemies = state.units.filter(function (u) { return u.hp > 0 && u.side !== 'player'; });
    if (ability.id === 'heal') {
      state.base.player = Math.min(state.baseMax.player, state.base.player + 85);
      addEffect(state, 'towerHeal', { gx: 11, gy: 6, color: color, life: 1.2 });
    } else if (ability.id === 'snare') {
      enemies.forEach(function (u) { u.stun = Math.max(u.stun, 2.6); });
      addEffect(state, 'towerSnare', { color: color, life: 1.2 });
    } else if (ability.id === 'gust') {
      enemies.forEach(function (u) {
        u.hp -= 16; u.hitFlash = 0.2;
        u.pathT = Math.max(0, u.pathT - 0.28);
        u.stun = Math.max(u.stun, 1.2);
      });
      addEffect(state, 'towerGust', { color: color, life: 1.1 });
    } else if (ability.id === 'meteor') {
      enemies.forEach(function (u) { u.hp -= 42; u.hitFlash = 0.2; });
      addEffect(state, 'towerMeteor', { color: color, life: 1.2 });
    } else if (ability.id === 'sunbeam') {
      enemies.forEach(function (u) { u.hp -= 30; u.hitFlash = 0.2; });
      addEffect(state, 'towerBeam', { color: color, life: 1.1 });
    } else if (ability.id === 'siphon') {
      enemies.forEach(function (u) { u.hp -= 24; u.hitFlash = 0.2; });
      state.base.player = Math.min(state.baseMax.player, state.base.player + 24);
      addEffect(state, 'towerSiphon', { color: color, life: 1.2 });
    }
    cleanupTowerEnemies(state);
    state.abilityCd = state.abilityMax;
    state.stats.abilities++;
    addFeed(state, ability.name + '! ' + ability.desc);
    return { ok: true, msg: ability.name + '!' };
  }

  // Tower Clash is a spider web of hubs, not three straight roads. Every hub is a
  // node, every strand is a route, and pals walk the strands, switching at hubs.
  var CLASH_LANES = 3;
  var CLASH_TOWER_HP = 200;
  var CLASH_MASTER_HP = 300;
  var CLASH_CORE_MAX = 2400;
  // Slow baseline income keeps the opening readable; captured towers are the
  // real economy, so map control ramps a push instead of raw time doing it.
  var CLASH_BASE_RATE = 0.5;
  var CLASH_TOWER_RATE = 0.16;
  var CLASH_MASTER_ID = 3;
  var CLASH_HOME = { player: 0, enemy: 6 };
  var CLASH_HUBS = [
    { id: 0, name: 'Home Keep', x: 0.075, lane: 1, kind: 'keep', owner: 'player' },
    { id: 1, name: 'North-West', x: 0.31, lane: 0, kind: 'tower', owner: 'neutral' },
    { id: 2, name: 'South-West', x: 0.31, lane: 2, kind: 'tower', owner: 'neutral' },
    { id: 3, name: 'Master Tower', x: 0.5, lane: 1, kind: 'master', owner: 'neutral' },
    { id: 4, name: 'North-East', x: 0.69, lane: 0, kind: 'tower', owner: 'neutral' },
    { id: 5, name: 'South-East', x: 0.69, lane: 2, kind: 'tower', owner: 'neutral' },
    { id: 6, name: 'Rival Keep', x: 0.925, lane: 1, kind: 'keep', owner: 'enemy' }
  ];
  // Two forward rails meet at the Master, then split again toward the rival
  // keep. There are no cross-rails and no direct Master-to-keep shortcut, so
  // every push moves forward along the side its owner chose.
  var CLASH_STRANDS = [
    [0, 1], [0, 2],
    [1, 3], [2, 3],
    [3, 4], [3, 5],
    [4, 6], [5, 6]
  ];
  var CLASH_ROUTES = {
    player: { north: [1, 3, 4, 6], south: [2, 3, 5, 6] },
    enemy: { north: [4, 3, 1, 0], south: [5, 3, 2, 0] }
  };

  function createClashTowers() {
    return CLASH_HUBS.map(function (hub) {
      var master = hub.kind === 'master';
      var keep = hub.kind === 'keep';
      var hp = master ? CLASH_MASTER_HP : CLASH_TOWER_HP;
      return {
        id: hub.id, lane: hub.id, name: hub.name, kind: hub.kind,
        x: hub.x, laneIndex: hub.lane, owner: hub.owner,
        hp: keep ? 1 : hp, max: keep ? 1 : hp,
        cd: 0,
        damage: keep ? 20 : master ? 17 : 11,
        range: keep ? 0.095 : master ? 0.085 : 0.062,
        pulse: 0
      };
    });
  }

  function createClashMatch(opts) {
    var playerElement = ELEMENTS[opts.player] ? opts.player : 'fire';
    var seed = (opts.seed === undefined || opts.seed === null) ? Math.floor(Date.now() % 2147483647) : (Number(opts.seed) >>> 0);
    var rng = makeRng(seed);
    var enemyChoices = ELEMENT_ORDER.filter(function (id) { return id !== playerElement; });
    var enemyElement = ELEMENTS[opts.enemy] && opts.enemy !== playerElement ? opts.enemy : rng.choose(enemyChoices);
    var playerKingdom = kingdomFor(playerElement);
    var enemyKingdom = kingdomFor(enemyElement);
    var towers = createClashTowers();
    var state = {
      mode: 'clash', seed: seed, rng: rng, playerElement: playerElement, enemyElement: enemyElement,
      kingdoms: { player: playerKingdom, enemy: enemyKingdom },
      base: { player: CLASH_CORE_MAX, enemy: CLASH_CORE_MAX }, baseMax: { player: CLASH_CORE_MAX, enemy: CLASH_CORE_MAX },
      gates: { player: createGates(CLASH_LANES), enemy: createGates(CLASH_LANES) },
      gateMax: GATE_MAX, coreMax: CLASH_CORE_MAX,
      energy: 6, aiEnergy: 6, maxEnergy: 12,
      playerRate: CLASH_BASE_RATE, aiRate: CLASH_BASE_RATE,
      units: [], effects: [], feed: [], feedId: 1,
      laneCount: CLASH_LANES, laneNames: ['North strand', 'Master strand', 'South strand'], lanes: [0, 1, 2],
      elapsed: 0, time: 0, paused: false, eventOffer: null, result: null,
      spawnCd: 0, spawnMax: SPAWN_MAX,
      aiTimer: 2, wildTimer: 9999, eventTimer: 9999,
      finalBounceAt: 99999, finalBounce: false,
      abilityCd: 0, abilityMax: ELEMENTS[playerElement].ability.cooldown,
      buffs: {
        player: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 },
        enemy: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 }
      },
      warned: { player: false, enemy: false },
      stats: { spawned: 0, kills: 0, abilities: 0, events: 0, gates: 0, towers: 0 },
      nextId: 1, selectedType: 'pip',
      clash: {
        towers: towers, strands: CLASH_STRANDS,
        captures: { player: 0, enemy: 0 }, towerKills: 0,
        masterWarned: { player: false, enemy: false }
      }
    };
    addFeed(state, 'TOWER CLASH: pick NORTH or SOUTH. Both rails meet at the Master; break a tower to take it, and the Master opens the keep.');
    return state;
  }

  function clashHubFor(state, id) {
    return state && state.clash && state.clash.towers ? state.clash.towers[id] : null;
  }

  function clashTowerFor(state, lane) {
    return clashHubFor(state, lane);
  }

  function clashOwnedCount(state, side) {
    if (!state || !state.clash) return 0;
    var count = 0;
    state.clash.towers.forEach(function (tower) { if (tower.owner === side && tower.kind !== 'keep') count++; });
    return count;
  }

  function clashOuterOwned(state, side) {
    return state.clash.towers.some(function (tower) {
      return tower.kind !== 'master' && tower.kind !== 'keep' && tower.owner === side;
    });
  }

  function clashNeighbours(state, id) {
    var out = [];
    CLASH_STRANDS.forEach(function (pair) {
      if (pair[0] === id) out.push(pair[1]);
      else if (pair[1] === id) out.push(pair[0]);
    });
    return out;
  }

  // Shortest strand path between two hubs, as a list of hub ids.
  function clashPath(state, fromId, toId) {
    if (fromId === toId) return [fromId];
    var prev = {}, seen = {}, queue = [fromId];
    seen[fromId] = true;
    while (queue.length) {
      var id = queue.shift();
      var links = clashNeighbours(state, id);
      for (var i = 0; i < links.length; i++) {
        var next = links[i];
        if (seen[next]) continue;
        seen[next] = true;
        prev[next] = id;
        if (next === toId) {
          var path = [toId], step = toId;
          while (step !== fromId) { step = prev[step]; path.unshift(step); }
          return path;
        }
        queue.push(next);
      }
    }
    return null;
  }

  function clashHomeId(side) {
    return side === 'player' ? CLASH_HOME.player : CLASH_HOME.enemy;
  }

  function clashRouteIds(side, route) {
    var table = CLASH_ROUTES[side] || CLASH_ROUTES.player;
    return table[route === 'south' ? 'south' : 'north'];
  }

  // The first tower on a chosen rail that is not ours. This is the only target
  // a route can send to, so units never turn around to chase a side tower.
  function clashRouteTarget(state, side, route) {
    var ids = clashRouteIds(side, route);
    for (var i = 0; i < ids.length; i++) {
      var tower = clashHubFor(state, ids[i]);
      if (tower && tower.owner !== side) return tower.id;
    }
    return side === 'player' ? CLASH_HOME.enemy : CLASH_HOME.player;
  }

  function clashRouteTargetScore(state, side, route) {
    var id = clashRouteTarget(state, side, route);
    var tower = clashHubFor(state, id);
    if (!tower) return 99;
    if (tower.kind === 'keep') return -100;
    // Prefer the weaker next tower; neutral towers are slightly safer pushes.
    return tower.hp / tower.max + (tower.owner === 'neutral' ? 0 : 0.12);
  }

  // Both sides can pick a rail. The rival evaluates both and takes the softer
  // one, with a small random tie-break so it does not play the same line every time.
  function clashSuggestedRoute(state, side) {
    var north = clashRouteTargetScore(state, side, 'north');
    var south = clashRouteTargetScore(state, side, 'south');
    if (Math.abs(north - south) < 0.08) return 'north';
    return north < south ? 'north' : 'south';
  }

  function clashAiRoute(state) {
    var north = clashRouteTargetScore(state, 'enemy', 'north');
    var south = clashRouteTargetScore(state, 'enemy', 'south');
    if (Math.abs(north - south) < 0.08) return state.rng.next() < 0.5 ? 'north' : 'south';
    return north < south ? 'north' : 'south';
  }

  // The first hub on the chosen rail that is not ours. Pals keep pushing
  // forward along that rail instead of piling up on the last hub clicked.
  function clashAdvanceObjective(state, side, fromId, route) {
    if (route) {
      var routeTarget = clashRouteTarget(state, side, route);
      if (routeTarget !== null && routeTarget !== undefined) return routeTarget;
    }
    var keepId = side === 'player' ? CLASH_HOME.enemy : CLASH_HOME.player;
    var master = clashHubFor(state, CLASH_MASTER_ID);
    var targetId = master && master.owner !== side ? CLASH_MASTER_ID : keepId;
    var path = clashPath(state, fromId, targetId);
    if (!path) return null;
    for (var i = 1; i < path.length; i++) {
      var hub = clashHubFor(state, path[i]);
      if (hub && hub.owner !== side) return hub.id;
    }
    return targetId;
  }

  // The owned hub closest to the target: this is what gives captured towers their
  // forward-spawn value, and why the order you take hubs in matters.
  function clashSpawnHub(state, side, targetId) {
    var best = null, bestLen = Infinity;
    state.clash.towers.forEach(function (tower) {
      if (tower.owner !== side) return;
      var path = clashPath(state, tower.id, targetId);
      if (!path) return;
      if (path.length < bestLen) { bestLen = path.length; best = tower; }
    });
    return best;
  }

  // Spawn from the nearest owned hub on the chosen rail, never from a stronger
  // hub on the other rail. This is what keeps a south push moving south.
  function clashRouteSpawnHub(state, side, route, targetId) {
    var ids = [clashHomeId(side)].concat(clashRouteIds(side, route));
    var best = null, bestLen = Infinity;
    ids.forEach(function (id) {
      var tower = clashHubFor(state, id);
      if (!tower || tower.owner !== side) return;
      var path = clashPath(state, tower.id, targetId);
      if (!path) return;
      if (path.length < bestLen) { bestLen = path.length; best = tower; }
    });
    return best || clashSpawnHub(state, side, targetId);
  }

  function clashTargetsFor(state, side) {
    var out = [];
    state.clash.towers.forEach(function (tower) {
      if (tower.kind === 'keep') return;
      if (tower.owner === side) return;
      var linked = clashNeighbours(state, tower.id).some(function (id) {
        var neighbour = clashHubFor(state, id);
        return neighbour && neighbour.owner === side;
      });
      if (linked) out.push(tower.id);
    });
    return out;
  }

  function clashUnitPosition(state, unit) {
    var path = unit.hubPath;
    if (!path || path.length < 2 || unit.hubAt >= path.length - 1) {
      var hub = path ? clashHubFor(state, path[path.length - 1]) : null;
      return hub ? { x: hub.x, lane: hub.laneIndex } : { x: unit.x, lane: unit.laneIndex !== undefined ? unit.laneIndex : unit.lane };
    }
    var a = clashHubFor(state, path[unit.hubAt]);
    var b = clashHubFor(state, path[unit.hubAt + 1]);
    var t = clamp(unit.hubT || 0, 0, 1);
    return { x: a.x + (b.x - a.x) * t, lane: a.laneIndex + (b.laneIndex - a.laneIndex) * t };
  }

  function clashDistance(a, b) {
    var dx = a.x - b.x;
    var dy = (a.lane - b.lane) * 0.45;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clashRecommendedTarget(state, side) {
    side = side || 'player';
    return clashRouteTarget(state, side, clashSuggestedRoute(state, side));
  }

  function spawnClashUnit(state, side, targetId, typeId, options) {
    options = options || {};
    targetId = Number(targetId);
    var target = clashHubFor(state, targetId);
    if (!target) return { ok: false, msg: 'Choose a rail on the web.', reason: 'lane' };
    var route = options.route === 'south' ? 'south' : options.route === 'north' ? 'north'
      : targetId === 2 || targetId === 5 ? 'south'
        : targetId === 1 || targetId === 4 ? 'north'
          : clashSuggestedRoute(state, side);
    var stats = getStats(side === 'player' ? state.playerElement : state.enemyElement, typeId);
    if (!stats) return { ok: false, msg: 'That pal does not exist.', reason: 'type' };
    var sameSide = state.units.filter(function (u) { return u.side === side; }).length;
    if (sameSide >= 42) return { ok: false, msg: 'The web is full of pals!', reason: 'full' };
    var free = !!options.free;
    var energyKey = side === 'player' ? 'energy' : 'aiEnergy';
    if (!free && side === 'player') {
      if (state.spawnCd > 0) return { ok: false, msg: 'Spawn is recharging.', reason: 'cooldown', remaining: state.spawnCd };
      if (state.energy < stats.cost) return { ok: false, msg: 'Need ' + stats.cost + ' spark.', reason: 'energy', needed: Math.ceil(stats.cost - state.energy) };
    }
    if (!free) {
      if (state[energyKey] < stats.cost) return { ok: false, msg: 'Not enough spark.', reason: 'energy' };
      state[energyKey] -= stats.cost;
    }
    var start = clashRouteSpawnHub(state, side, route, targetId);
    if (!start) return { ok: false, msg: 'You hold no hub to spawn from.', reason: 'lane' };
    // If the chosen hub is already ours (or falls while we walk), keep pushing
    // toward the next hostile hub instead of stopping there.
    var objective = targetId;
    if (target.owner === side && target.kind !== 'keep') {
      var nextObjective = clashAdvanceObjective(state, side, targetId, route);
      if (nextObjective && nextObjective !== targetId) objective = nextObjective;
    }
    var path = clashPath(state, start.id, objective);
    if (!path) return { ok: false, msg: 'No strand leads there.', reason: 'lane' };
    if (side === 'player' && !free) state.spawnCd = state.spawnMax;
    var forward = start.id !== clashHomeId(side);
    var hp = Math.round(stats.hp);
    var unit = {
      id: state.nextId++, side: side, lane: start.laneIndex, laneIndex: start.laneIndex,
      type: typeId, clash: true,
      element: side === 'player' ? state.playerElement : state.enemyElement,
      name: stats.name, role: stats.role, shape: stats.shape,
      x: start.x, yOffset: state.rng.range(-0.012, 0.012),
      hubPath: path, hubAt: 0, hubT: 0, targetHub: objective, route: route, blockedHub: null,
      hp: hp, maxHp: hp, atk: stats.atk,
      speed: stats.speed, range: stats.range, cooldown: stats.cooldown,
      radius: stats.radius, lifesteal: stats.lifesteal,
      cd: state.rng.range(0.05, 0.3), age: 0, stun: 0, hitFlash: 0
    };
    state.units.push(unit);
    addEffect(state, 'spawn', { lane: unit.lane, x: unit.x, color: ELEMENTS[unit.element].light, life: 0.6, side: side, clash: true });
    if (side === 'player') state.stats.spawned++;
    return { ok: true, unit: unit, forward: forward, path: path };
  }

  function damageClashTower(state, tower, attackerSide, amount) {
    if (!tower || tower.owner === attackerSide || tower.kind === 'keep') return false;
    if (tower.hp <= 0) return false;
    amount = Math.max(1, Math.round(amount));
    tower.hp = Math.max(0, tower.hp - amount);
    tower.pulse = 1;
    var color = ELEMENTS[attackerSide === 'player' ? state.playerElement : state.enemyElement].light;
    addEffect(state, 'clashTowerHit', { lane: tower.laneIndex, x: tower.x, side: attackerSide, color: color, life: 0.45, amount: amount, master: tower.kind === 'master' });
    if (tower.hp > 0) return true;
    // One rule: breaking a tower takes it. No separate hold phase.
    captureClashTower(state, tower, attackerSide);
    return true;
  }

  function captureClashTower(state, tower, side) {
    var color = ELEMENTS[side === 'player' ? state.playerElement : state.enemyElement].light;
    tower.owner = side;
    tower.hp = Math.round(tower.max * 0.6);
    tower.cd = 0;
    state.clash.captures[side]++;
    state.clash.towerKills++;
    state.stats.towers = state.clash.towerKills;
    addEffect(state, 'clashCapture', { lane: tower.laneIndex, x: tower.x, side: side, color: color, life: 0.9, master: tower.kind === 'master' });
    addFeed(state, (side === 'player' ? 'You captured ' : 'Rival captured ') + tower.name + '!');
    if (tower.kind === 'master') addEffect(state, 'banner', { text: 'MASTER TOWER!', color: color, life: 1.6 });
    return true;
  }

  function damageClashBase(state, attackerSide, lane, amount, sourceColor) {
    var targetSide = attackerSide === 'player' ? 'enemy' : 'player';
    amount = Math.max(1, Math.round(amount));
    state.base[targetSide] = Math.max(0, state.base[targetSide] - amount);
    addEffect(state, 'baseHit', { side: targetSide, lane: lane, color: sourceColor || '#FFFFFF', life: 0.55, amount: amount });
    addText(state, lane, targetSide === 'enemy' ? 0.93 : 0.07, '-' + amount, '#FFFFFF');
    if (!state.warned[targetSide] && state.base[targetSide] <= state.baseMax[targetSide] * 0.5) {
      state.warned[targetSide] = true;
      addFeed(state, (targetSide === 'player' ? 'Your' : 'Rival') + ' keep is below half!');
    }
    if (state.base[targetSide] <= 0) finishClashMatch(state, attackerSide === 'player' ? 'player' : 'enemy');
  }

  function finishClashMatch(state, winner) {
    if (state.result) return;
    var win = winner === 'player';
    var master = clashHubFor(state, CLASH_MASTER_ID);
    state.result = {
      winner: winner, mode: 'clash',
      reason: win
        ? 'Your pals strung the web together and cracked the rival keep!'
        : 'The rival walked the web and cracked your keep.',
      seconds: Math.round(state.elapsed),
      kills: state.stats.kills, spawned: state.stats.spawned, gates: 0, laneCount: 3,
      maze: null, finalBounce: false,
      playerBase: Math.max(0, Math.round(state.base.player)), enemyBase: Math.max(0, Math.round(state.base.enemy)),
      clash: {
        captures: state.clash.captures,
        towerKills: state.clash.towerKills,
        playerTowers: clashOwnedCount(state, 'player'),
        enemyTowers: clashOwnedCount(state, 'enemy'),
        master: master ? master.owner : 'neutral'
      }
    };
    state.paused = true;
    addFeed(state, win ? 'KEEP BROKEN! The web is yours.' : 'YOUR KEEP FELL.');
  }

  function clashWarn(state, unit) {
    if (!state.clash.masterWarned[unit.side]) {
      state.clash.masterWarned[unit.side] = true;
      addFeed(state, unit.side === 'player'
        ? 'The Master Tower still guards the rival keep. Capture it to break through!'
        : 'Your Master Tower is holding the home keep.');
    }
  }

  function clashAttackHub(state, unit, hub) {
    if (!hub || hub.owner === unit.side) return false;
    if (hub.kind === 'keep') {
      var master = clashHubFor(state, CLASH_MASTER_ID);
      if (!(master && master.owner === unit.side)) {
        clashWarn(state, unit);
        return false;
      }
      if (unit.cd > 0) return false;
      var keepHit = unitDamage(state, unit, unit.side === 'player' ? state.enemyElement : state.playerElement);
      unit.cd = unit.cooldown;
      // The keep is a fortress, not a piñata: troops chip it, they do not delete it.
      damageClashBase(state, unit.side, hub.laneIndex, Math.max(1, Math.round(keepHit.amount * 0.35)), damageColor(keepHit));
      return true;
    }
    if (hub.hp <= 0) return false;
    if (unit.cd > 0) return false;
    var towerHit = Math.max(1, Math.round(unit.atk * state.buffs[unit.side].damage));
    unit.cd = unit.cooldown;
    damageClashTower(state, hub, unit.side, towerHit);
    return true;
  }

  function advanceClashUnit(state, unit, dt) {
    var path = unit.hubPath;
    if (unit.blockedHub !== null && unit.blockedHub !== undefined) {
      var held = clashHubFor(state, unit.blockedHub);
      if (held && held.owner !== unit.side) {
        unit.x = held.x; unit.lane = held.laneIndex; unit.laneIndex = held.laneIndex;
        clashAttackHub(state, unit, held);
        return;
      }
      unit.blockedHub = null;
    }
    if (!path || path.length < 2) {
      var only = path ? clashHubFor(state, path[0]) : null;
      if (only) {
        unit.x = only.x; unit.lane = only.laneIndex; unit.laneIndex = only.laneIndex;
        clashAttackHub(state, unit, only);
      }
      return;
    }
    if (unit.hubAt >= path.length - 1) {
      var endHub = clashHubFor(state, path[path.length - 1]);
      unit.x = endHub.x;
      unit.lane = endHub.laneIndex;
      unit.laneIndex = endHub.laneIndex;
      if (endHub.owner === unit.side && endHub.kind !== 'keep') {
        var nextGoal = clashAdvanceObjective(state, unit.side, endHub.id, unit.route);
        if (nextGoal && nextGoal !== endHub.id) {
          var nextPath = clashPath(state, endHub.id, nextGoal);
          if (nextPath && nextPath.length > 1) {
            unit.hubPath = nextPath;
            unit.hubAt = 0;
            unit.hubT = 0;
            unit.targetHub = nextGoal;
            return;
          }
        }
      }
      clashAttackHub(state, unit, endHub);
      return;
    }
    var from = clashHubFor(state, path[unit.hubAt]);
    var to = clashHubFor(state, path[unit.hubAt + 1]);
    var edge = Math.max(0.06, Math.hypot(to.x - from.x, (to.laneIndex - from.laneIndex) * 0.45));
    var speed = unit.speed * 1.45 * state.buffs[unit.side].speed;
    unit.hubT += speed * dt / edge;
    if (unit.hubT >= 1) {
      unit.hubT = 0;
      unit.hubAt++;
      unit.x = to.x;
      unit.lane = to.laneIndex;
      unit.laneIndex = to.laneIndex;
      clashAttackHub(state, unit, to);
      if (to.owner !== unit.side) unit.blockedHub = to.id;
      return;
    }
    var pos = clashUnitPosition(state, unit);
    unit.x = pos.x;
    unit.lane = pos.lane;
    unit.laneIndex = to.laneIndex;
  }

  function updateClashTowers(state, dt) {
    var towers = state.clash.towers;
    for (var i = 0; i < towers.length; i++) {
      var tower = towers[i];
      tower.pulse = Math.max(0, (tower.pulse || 0) - dt * 2);
      if (tower.kind === 'keep') {
        // Keeps defend themselves, so a rush has to survive the doorstep.
        tower.cd = Math.max(0, tower.cd - dt);
        if (tower.cd <= 0) {
          var gateTarget = null, gateDist = Infinity;
          for (var k = 0; k < state.units.length; k++) {
            var intruder = state.units[k];
            if (intruder.side === tower.owner || intruder.hp <= 0) continue;
            var gateRange = clashDistance({ x: tower.x, lane: tower.laneIndex }, intruder);
            if (gateRange <= tower.range && gateRange < gateDist) { gateTarget = intruder; gateDist = gateRange; }
          }
          if (gateTarget) {
            var gateElement = tower.owner === 'player' ? state.playerElement : state.enemyElement;
            gateTarget.hp -= tower.damage;
            gateTarget.hitFlash = 0.2;
            tower.cd = 0.85;
            addEffect(state, 'clashBolt', {
              lane: tower.laneIndex, x: gateTarget.x, from: tower.x,
              color: ELEMENTS[gateElement].light, life: 0.26
            });
            addText(state, tower.laneIndex, gateTarget.x, '-' + tower.damage, ELEMENTS[gateElement].light);
          }
        }
        continue;
      }
      if (tower.owner === 'neutral') continue;
      tower.cd = Math.max(0, tower.cd - dt);
      var ownerElement = tower.owner === 'player' ? state.playerElement : state.enemyElement;
      if (tower.cd <= 0) {
        var target = null, bestDist = Infinity;
        for (var t = 0; t < state.units.length; t++) {
          var foe = state.units[t];
          if (foe.side === tower.owner || foe.hp <= 0) continue;
          var dist = clashDistance({ x: tower.x, lane: tower.laneIndex }, foe);
          if (dist <= tower.range && dist < bestDist) { target = foe; bestDist = dist; }
        }
        if (target) {
          var dmg = Math.max(1, Math.round(tower.damage * attackMultiplier(ownerElement, target.element)));
          target.hp -= dmg;
          target.hitFlash = 0.2;
          tower.cd = tower.kind === 'master' ? 0.85 : 1.15;
          addEffect(state, 'clashBolt', {
            lane: tower.laneIndex, x: target.x, from: tower.x,
            color: ELEMENTS[ownerElement].light, life: 0.26
          });
          addText(state, tower.laneIndex, target.x, '-' + dmg, ELEMENTS[ownerElement].light);
        }
      }
    }
  }

  function updateClashUnits(state, dt) {
    var i;
    for (i = 0; i < state.units.length; i++) {
      var timed = state.units[i];
      timed.age += dt;
      timed.hitFlash = Math.max(0, timed.hitFlash - dt);
      timed.cd = Math.max(0, timed.cd - dt);
      if (timed.stun > 0) timed.stun = Math.max(0, timed.stun - dt);
    }
    for (i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      if (unit.hp <= 0 || unit.stun > 0) continue;
      var target = null, bestDist = Infinity;
      for (var j = 0; j < state.units.length; j++) {
        var other = state.units[j];
        if (other.side === unit.side || other.hp <= 0) continue;
        var dist = clashDistance(unit, other);
        if (dist < bestDist) { target = other; bestDist = dist; }
      }
      if (target && bestDist <= unit.range + unit.radius + target.radius) {
        if (unit.cd <= 0) {
          var hit = unitDamage(state, unit, target.element);
          target.hp -= hit.amount;
          target.hitFlash = 0.2;
          unit.cd = unit.cooldown;
          if (unit.lifesteal > 0) unit.hp = Math.min(unit.maxHp, unit.hp + hit.amount * unit.lifesteal);
          addEffect(state, unit.shape === 'zap' ? 'bolt' : 'hit', {
            lane: unit.lane, x: target.x, from: unit.x,
            color: ELEMENTS[unit.element].light, life: 0.32, strong: hit.strong, weak: hit.weak
          });
          addText(state, unit.lane, target.x, '-' + hit.amount, damageColor(hit));
          if (target.hp <= 0) {
            addEffect(state, 'poof', { lane: target.lane, x: target.x, color: ELEMENTS[target.element].color, life: 0.55 });
            if (unit.side === 'player') state.stats.kills++;
          }
        }
        continue;
      }
      advanceClashUnit(state, unit, dt);
    }
    var survivors = [];
    for (i = 0; i < state.units.length; i++) if (state.units[i].hp > 0) survivors.push(state.units[i]);
    state.units = survivors;
  }

  // The rival picks a rail too. It garrisons the keep when it is under attack,
  // otherwise it evaluates both routes and pushes the softer one.
  function chooseClashTarget(state) {
    var enemyKeep = clashHubFor(state, CLASH_HOME.enemy);
    var siege = state.units.filter(function (unit) {
      return unit.side === 'player' && unit.hp > 0 && enemyKeep &&
        clashDistance({ x: enemyKeep.x, lane: enemyKeep.laneIndex }, unit) < 0.1;
    }).length;
    if (siege >= 2 && state.rng.next() < 0.7) {
      return { id: CLASH_HOME.enemy, route: clashSuggestedRoute(state, 'enemy') };
    }
    var route = clashAiRoute(state);
    return { id: clashRouteTarget(state, 'enemy', route), route: route };
  }

  function updateClashMode(state, dt) {
    state.aiTimer -= dt;
    if (state.aiTimer <= 0) {
      var type = chooseAiType(state);
      var choice = chooseClashTarget(state);
      var ai = spawnClashUnit(state, 'enemy', choice.id, type, { route: choice.route });
      state.aiTimer = ai.ok ? (2.0 + state.rng.range(0, 1.1)) : 0.6;
    }
    updateClashTowers(state, dt);
    updateClashUnits(state, dt);
    if (!state.result) {
      if (state.base.player <= 0) finishClashMatch(state, 'enemy');
      else if (state.base.enemy <= 0) finishClashMatch(state, 'player');
    }
    if (state.effects.length) {
      state.effects.forEach(function (e) { e.life -= dt; });
      state.effects = state.effects.filter(function (e) { return e.life > 0; });
    }
    return state;
  }

  function useClashAbility(state) {
    var el = state.playerElement;
    var ability = ELEMENTS[el].ability;
    var color = ELEMENTS[el].light;
    var enemies = state.units.filter(function (u) { return u.side === 'enemy' && u.hp > 0; });
    var enemyTowers = state.clash.towers.filter(function (t) { return t.owner === 'enemy' && t.kind !== 'keep'; });
    var playerTowers = state.clash.towers.filter(function (t) { return t.owner === 'player' && t.kind !== 'keep'; });
    if (ability.id === 'meteor') {
      enemies.forEach(function (u) { u.hp -= 42; u.hitFlash = 0.2; });
      enemyTowers.forEach(function (t) { damageClashTower(state, t, 'player', 28); });
      addEffect(state, 'meteor', { life: 1.1, color: color });
    } else if (ability.id === 'heal') {
      state.base.player = Math.min(state.baseMax.player, state.base.player + 80);
      playerTowers.forEach(function (t) { if (t.hp > 0) t.hp = Math.min(t.max, t.hp + 40); });
      addEffect(state, 'heal', { lane: 1, x: 0.12, color: color, life: 1.1 });
    } else if (ability.id === 'snare') {
      enemies.forEach(function (u) { u.stun = Math.max(u.stun, 2.6); });
      addEffect(state, 'snare', { life: 1.1, color: color });
    } else if (ability.id === 'gust') {
      enemies.forEach(function (u) {
        u.hp -= 18;
        u.hitFlash = 0.2;
        u.stun = Math.max(u.stun, 1.2);
        u.hubT = Math.max(0, (u.hubT || 0) - 0.2);
      });
      addEffect(state, 'gust', { life: 1.0, color: color });
    } else if (ability.id === 'sunbeam') {
      enemies.forEach(function (u) { u.hp -= 30; u.hitFlash = 0.2; });
      enemyTowers.forEach(function (t) { damageClashTower(state, t, 'player', 20); });
      addEffect(state, 'beam', { life: 1.0, color: color });
    } else if (ability.id === 'siphon') {
      enemies.forEach(function (u) { u.hp -= 26; u.hitFlash = 0.2; });
      state.base.player = Math.min(state.baseMax.player, state.base.player + 26);
      addEffect(state, 'siphon', { life: 1.1, color: color });
    }
    state.units = state.units.filter(function (u) { return u.hp > 0; });
    state.abilityCd = state.abilityMax;
    state.stats.abilities++;
    addFeed(state, ability.name + '! ' + ability.desc);
    return { ok: true, msg: ability.name + '!' };
  }

  function createMatch(opts) {
    opts = opts || {};
    if (opts.mode === 'clash') return createClashMatch(opts);
    if (opts.mode === 'tower') return createTowerMatch(opts);
    if (opts.mode === 'maze') return createMazeMatch(opts);
    var playerElement = ELEMENTS[opts.player] ? opts.player : 'fire';
    var seed = (opts.seed === undefined || opts.seed === null) ? Math.floor(Date.now() % 2147483647) : (Number(opts.seed) >>> 0);
    var rng = makeRng(seed);
    var enemyChoices = ELEMENT_ORDER.filter(function (id) { return id !== playerElement; });
    var enemyElement = ELEMENTS[opts.enemy] && opts.enemy !== playerElement ? opts.enemy : rng.choose(enemyChoices);
    var playerKingdom = kingdomFor(playerElement);
    var enemyKingdom = kingdomFor(enemyElement);
    var laneCount = opts.lanes ? clamp(Math.floor(Number(opts.lanes)), 3, 5) : 3 + Math.floor(rng.next() * 3);
    var laneNames = getLaneNames(laneCount);
    var lanes = [];
    for (var i = 0; i < laneCount; i++) lanes.push(i);
    var state = {
      mode: 'lanes', seed: seed, rng: rng, playerElement: playerElement, enemyElement: enemyElement,
      kingdoms: { player: playerKingdom, enemy: enemyKingdom },
      base: { player: CORE_MAX, enemy: CORE_MAX }, baseMax: { player: CORE_MAX, enemy: CORE_MAX },
      gates: { player: createGates(laneCount), enemy: createGates(laneCount) },
      gateMax: GATE_MAX, coreMax: CORE_MAX,
      energy: 6, aiEnergy: 5, maxEnergy: 10,
      playerRate: 0.7, aiRate: 0.56,
      units: [], effects: [], feed: [], feedId: 1,
      laneCount: laneCount, laneNames: laneNames, lanes: lanes,
      elapsed: 0, time: 0, paused: false, eventOffer: null, result: null,
      spawnCd: 0, spawnMax: SPAWN_MAX,
      aiTimer: 1.9, wildTimer: 30 + rng.range(0, 8), eventTimer: 26 + rng.range(0, 5),
      finalBounceAt: FINAL_BOUNCE_AT, finalBounce: false,
      abilityCd: 0, abilityMax: ELEMENTS[playerElement].ability.cooldown,
      buffs: {
        player: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 },
        enemy: { damage: 1, speed: 1, damageTime: 0, speedTime: 0 }
      },
      warned: { player: false, enemy: false },
      stats: { spawned: 0, kills: 0, abilities: 0, events: 0, gates: 0 },
      nextId: 1, selectedType: 'pip'
    };
    addFeed(state, playerKingdom.name + ' marches on ' + enemyKingdom.name + '! ' + laneCount + ' platform lanes. Crack a gate, then pop the core!');
    return state;
  }

  function getSpawnStatus(state, typeId) {
    if (!state) return { ready: false, cooldown: 0, max: SPAWN_MAX, progress: 0, reason: 'none', cost: 0, energy: 0 };
    typeId = typeId || state.selectedType || 'pip';
    var info = getStats(state.playerElement, typeId) || { cost: 2 };
    var cd = Math.max(0, state.spawnCd || 0);
    var enough = state.energy >= info.cost;
    var ready = cd <= 0 && enough;
    var progress;
    if (ready) progress = 1;
    else if (cd > 0) progress = 1 - cd / (state.spawnMax || SPAWN_MAX);
    else progress = clamp(state.energy / info.cost, 0, 1);
    return {
      ready: ready,
      cooldown: cd,
      max: state.spawnMax || SPAWN_MAX,
      progress: clamp(progress, 0, 1),
      cost: info.cost,
      energy: state.energy,
      needed: Math.max(0, Math.ceil(info.cost - state.energy)),
      reason: cd > 0 ? 'cooldown' : !enough ? 'energy' : ''
    };
  }

  function spawnMazeUnit(state, side, typeId, options) {
    options = options || {};
    var stats = getStats(side === 'player' ? state.playerElement : state.enemyElement, typeId);
    if (!stats) return { ok: false, msg: 'That pal does not exist.', reason: 'type' };
    var sameSide = state.units.filter(function (u) { return u.side === side; }).length;
    if (sameSide >= 40) return { ok: false, msg: 'The maze is full of pals!', reason: 'full' };
    var free = !!options.free;
    var energyKey = side === 'player' ? 'energy' : 'aiEnergy';
    if (!free && side === 'player') {
      if (state.spawnCd > 0) {
        return { ok: false, msg: 'Spawn is recharging.', reason: 'cooldown', remaining: state.spawnCd };
      }
      if (state.energy < stats.cost) {
        return { ok: false, msg: 'Need ' + stats.cost + ' spark.', reason: 'energy', needed: Math.ceil(stats.cost - state.energy) };
      }
    }
    if (!free) {
      if (state[energyKey] < stats.cost) return { ok: false, msg: 'Not enough spark.', reason: 'energy' };
      state[energyKey] -= stats.cost;
    }
    if (side === 'player' && !free) state.spawnCd = state.spawnMax;
    var cell = side === 'player' ? state.maze.home : state.maze.foe;
    var unit = {
      id: state.nextId++, side: side, lane: 0, type: typeId,
      element: side === 'player' ? state.playerElement : state.enemyElement,
      name: stats.name, role: stats.role, shape: stats.shape,
      x: side === 'player' ? 0.12 : 0.88, yOffset: 0,
      gx: cell.x, gy: cell.y, nx: null, ny: null, mt: 0,
      hp: stats.hp, maxHp: stats.hp, atk: stats.atk,
      speed: stats.speed, range: stats.range, cooldown: stats.cooldown,
      radius: stats.radius, lifesteal: stats.lifesteal,
      cd: state.rng.range(0.05, 0.3), age: 0, stun: 0, hitFlash: 0
    };
    state.units.push(unit);
    addEffect(state, 'spawn', {
      gx: cell.x + 0.5, gy: cell.y + 0.5, color: ELEMENTS[unit.element].light,
      life: 0.6, side: side, maze: true
    });
    if (side === 'player') state.stats.spawned++;
    return { ok: true, unit: unit };
  }

  function spawnFor(state, side, lane, typeId, options) {
    options = options || {};
    if (!state || state.result) return { ok: false, msg: 'The match is over.', reason: 'ended' };
    if (state.mode === 'clash') return spawnClashUnit(state, side, lane, typeId, options);
    if (state.mode === 'tower') return { ok: false, msg: 'Tower Defence uses build pads, not pal spawns.', reason: 'mode' };
    if (state.mode === 'maze') return spawnMazeUnit(state, side, typeId, options);
    lane = Number(lane);
    if (lane < 0 || lane >= state.laneCount) return { ok: false, msg: 'Choose a lane first.', reason: 'lane' };
    var stats = getStats(side === 'player' ? state.playerElement : state.enemyElement, typeId);
    if (!stats) return { ok: false, msg: 'That pal does not exist.', reason: 'type' };
    var sameSide = state.units.filter(function (u) { return u.side === side; }).length;
    if (sameSide >= Math.max(36, state.laneCount * 8)) return { ok: false, msg: 'The lane is full of pals!', reason: 'full' };
    var free = !!options.free;
    var energyKey = side === 'player' ? 'energy' : 'aiEnergy';
    if (!free && side === 'player') {
      if (state.spawnCd > 0) {
        return { ok: false, msg: 'Spawn is recharging.', reason: 'cooldown', remaining: state.spawnCd };
      }
      if (state.energy < stats.cost) {
        return { ok: false, msg: 'Need ' + stats.cost + ' spark.', reason: 'energy', needed: Math.ceil(stats.cost - state.energy) };
      }
    }
    if (!free) {
      if (state[energyKey] < stats.cost) return { ok: false, msg: 'Not enough spark.', reason: 'energy' };
      state[energyKey] -= stats.cost;
    }
    if (side === 'player' && !free) state.spawnCd = state.spawnMax;
    var x = side === 'player' ? 0.095 + state.rng.range(0, 0.012) : 0.905 - state.rng.range(0, 0.012);
    var unit = {
      id: state.nextId++, side: side, lane: lane, type: typeId,
      element: side === 'player' ? state.playerElement : state.enemyElement,
      name: stats.name, role: stats.role, shape: stats.shape,
      x: x, yOffset: state.rng.range(-0.012, 0.012),
      hp: stats.hp, maxHp: stats.hp, atk: stats.atk,
      speed: stats.speed, range: stats.range, cooldown: stats.cooldown,
      radius: stats.radius, lifesteal: stats.lifesteal,
      cd: state.rng.range(0.05, 0.3), age: 0, stun: 0, hitFlash: 0
    };
    state.units.push(unit);
    addEffect(state, 'spawn', {
      lane: lane, x: x, color: ELEMENTS[unit.element].light,
      life: 0.6, side: side
    });
    if (side === 'player') state.stats.spawned++;
    return { ok: true, unit: unit };
  }

  function spawn(state, lane, typeId, options) {
    return spawnFor(state, 'player', lane, typeId || state.selectedType, options || {});
  }

  function nearestTarget(state, unit) {
    var best = null, bestDist = Infinity;
    for (var i = 0; i < state.units.length; i++) {
      var other = state.units[i];
      if (other.side === unit.side || other.lane !== unit.lane || other.hp <= 0) continue;
      var ahead = unit.side === 'player' ? other.x >= unit.x : other.x <= unit.x;
      if (!ahead) continue;
      var dist = Math.abs(other.x - unit.x);
      if (dist < bestDist) { best = other; bestDist = dist; }
    }
    return best;
  }

  function unitDamage(state, unit, defenderElement) {
    var attack = attackMultiplier(unit.element, defenderElement);
    var guard = defenseMultiplier(defenderElement);
    var amount = Math.max(1, Math.round(unit.atk * state.buffs[unit.side].damage * attack * guard));
    return { amount: amount, attack: attack, guard: guard, strong: attack > 1, weak: attack < 1 };
  }

  function damageColor(result) {
    if (result.strong) return '#D8FF9B';
    if (result.weak) return '#FFC0AA';
    return '#FFF7D6';
  }

  function damageGate(state, attackerSide, lane, amount, sourceColor) {
    var targetSide = attackerSide === 'player' ? 'enemy' : 'player';
    var gate = state.gates[targetSide] && state.gates[targetSide][lane];
    if (!gate || gate.hp <= 0) return false;
    gate.hp = Math.max(0, gate.hp - amount);
    addEffect(state, 'gateHit', {
      lane: lane, side: targetSide, color: sourceColor || ELEMENTS[attackerSide === 'player' ? state.playerElement : state.enemyElement].light,
      life: 0.5, amount: Math.round(amount)
    });
    addText(state, lane, targetSide === 'enemy' ? 0.84 : 0.16, '-' + Math.round(amount), '#FFE6A3');
    if (gate.hp <= 0) {
      if (attackerSide === 'player') state.stats.gates++;
      if (state.mode === 'maze') {
        addFeed(state, (targetSide === 'enemy' ? 'Rival ' : 'Your ') + 'maze gate popped open!');
      } else {
        addFeed(state, (targetSide === 'enemy' ? 'Rival ' : 'Your ') + state.laneNames[lane].toUpperCase() + ' gate popped open!');
      }
      addEffect(state, 'gateBreak', {
        lane: lane, side: targetSide,
        color: ELEMENTS[targetSide === 'player' ? state.playerElement : state.enemyElement].light,
        life: 0.8
      });
    }
    return true;
  }

  function damageBase(state, attackerSide, lane, amount, sourceColor) {
    var targetSide = attackerSide === 'player' ? 'enemy' : 'player';
    var defenderElement = targetSide === 'player' ? state.playerElement : state.enemyElement;
    amount = Math.max(1, Math.round(amount * (state.finalBounce ? 1.35 : 1)));
    state.base[targetSide] = Math.max(0, state.base[targetSide] - amount);
    addEffect(state, 'baseHit', {
      side: targetSide, lane: lane, color: sourceColor || ELEMENTS[defenderElement].light,
      life: 0.55, amount: Math.round(amount)
    });
    addText(state, lane, targetSide === 'enemy' ? 0.92 : 0.08, '-' + Math.round(amount), '#FFFFFF');
    if (!state.warned[targetSide] && state.base[targetSide] <= state.baseMax[targetSide] * 0.5) {
      state.warned[targetSide] = true;
      addFeed(state, (targetSide === 'player' ? 'Your' : 'Rival') + ' core is below half! The gates can\'t hide it now.');
    }
    if (state.base[targetSide] <= 0) {
      finishMatch(state, attackerSide === 'player' ? 'player' : 'enemy');
    }
  }

  function finishMatch(state, winner) {
    if (state.result) return;
    var win = winner === 'player';
    state.result = {
      winner: winner,
      mode: state.mode,
      reason: win
        ? (state.mode === 'maze'
          ? (state.finalBounce ? 'The Final Bounce split the shifting maze wide open!' : 'You outfoxed the shifting maze and popped the rival core!')
          : (state.finalBounce ? 'The Final Bounce cracked the rival core wide open!' : 'You broke through and popped the rival core!'))
        : (state.finalBounce ? 'The Final Bounce cracked your core. Bounce back!' : 'The rival broke your last gate and popped your core.'),
      seconds: Math.round(state.elapsed),
      kills: state.stats.kills,
      spawned: state.stats.spawned,
      gates: state.stats.gates,
      laneCount: state.laneCount,
      maze: state.maze ? { cols: state.maze.cols, rows: state.maze.rows, label: state.maze.label, shifts: state.maze.shifts } : null,
      finalBounce: state.finalBounce,
      playerBase: Math.max(0, Math.round(state.base.player)),
      enemyBase: Math.max(0, Math.round(state.base.enemy))
    };
    state.paused = true;
  }

  function advanceUnit(state, unit, lane, direction, dt) {
    unit.x += direction * unit.speed * state.buffs[unit.side].speed * dt;
    unit.x = clamp(unit.x, 0.02, 0.98);
  }

  function updateUnits(state, dt) {
    var i;
    for (i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      u.age += dt;
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.cd = Math.max(0, u.cd - dt);
      if (u.stun > 0) u.stun = Math.max(0, u.stun - dt);
    }

    for (var lane = 0; lane < state.laneCount; lane++) {
      for (i = 0; i < state.units.length; i++) {
        var unit = state.units[i];
        if (unit.lane !== lane || unit.hp <= 0 || unit.stun > 0) continue;
        var target = nearestTarget(state, unit);
        if (target) {
          var dist = Math.abs(target.x - unit.x);
          var inRange = dist <= unit.range + unit.radius + target.radius;
          if (inRange && unit.cd <= 0) {
            var hit = unitDamage(state, unit, target.element);
            target.hp -= hit.amount;
            target.hitFlash = 0.2;
            unit.cd = unit.cooldown;
            if (unit.lifesteal > 0) unit.hp = Math.min(unit.maxHp, unit.hp + hit.amount * unit.lifesteal);
            addEffect(state, unit.shape === 'zap' ? 'bolt' : 'hit', {
              lane: lane, from: unit.x, x: target.x,
              color: ELEMENTS[unit.element].light, life: 0.32,
              strong: hit.strong, weak: hit.weak
            });
            addText(state, lane, target.x, '-' + hit.amount, damageColor(hit));
            if (target.hp <= 0) {
              addEffect(state, 'poof', {
                lane: lane, x: target.x, color: ELEMENTS[target.element].color, life: 0.55
              });
              if (unit.side === 'player') state.stats.kills++;
            }
          } else if (!inRange) {
            advanceUnit(state, unit, lane, unit.side === 'player' ? 1 : -1, dt);
          }
          continue;
        }

        var enemySide = unit.side === 'player' ? 'enemy' : 'player';
        var enemyGate = state.gates[enemySide][lane];
        if (enemyGate.hp > 0) {
          var gateX = GATE_X[enemySide];
          var atGate = unit.side === 'player' ? unit.x >= gateX : unit.x <= gateX;
          if (atGate) {
            unit.x = gateX;
            if (unit.cd <= 0) {
              var gateHit = unitDamage(state, unit, enemySide === 'player' ? state.playerElement : state.enemyElement);
              unit.cd = unit.cooldown;
              damageGate(state, unit.side, lane, gateHit.amount, damageColor(gateHit));
            }
          } else {
            advanceUnit(state, unit, lane, unit.side === 'player' ? 1 : -1, dt);
          }
          continue;
        }

        var coreX = CORE_X[enemySide];
        var atCore = unit.side === 'player' ? unit.x >= coreX : unit.x <= coreX;
        if (atCore) {
          unit.x = coreX;
          if (unit.cd <= 0) {
            var coreHit = unitDamage(state, unit, enemySide === 'player' ? state.playerElement : state.enemyElement);
            unit.cd = unit.cooldown;
            damageBase(state, unit.side, lane, coreHit.amount, damageColor(coreHit));
            if (state.result) return;
          }
        } else {
          advanceUnit(state, unit, lane, unit.side === 'player' ? 1 : -1, dt);
        }
      }
    }

    var survivors = [];
    for (i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0) survivors.push(state.units[i]);
    }
    state.units = survivors;
  }

  function updateBuffs(state, dt) {
    ['player', 'enemy'].forEach(function (side) {
      var b = state.buffs[side];
      if (b.damageTime > 0) {
        b.damageTime = Math.max(0, b.damageTime - dt);
        if (b.damageTime === 0) b.damage = 1;
      }
      if (b.speedTime > 0) {
        b.speedTime = Math.max(0, b.speedTime - dt);
        if (b.speedTime === 0) b.speed = 1;
      }
    });
  }

  function triggerFinalBounce(state) {
    if (state.finalBounce || state.result) return;
    state.finalBounce = true;
    state.gates.player.forEach(function (g) { g.hp = 0; });
    state.gates.enemy.forEach(function (g) { g.hp = 0; });
    addFeed(state, 'FINAL BOUNCE! Every gate cracked. The cores are exposed!');
    addEffect(state, 'banner', { text: 'FINAL BOUNCE!', color: '#FFE156', life: 2.2 });
    addEffect(state, 'finalBounce', { life: 1.5, color: '#FFE156' });
  }

  function chooseAiType(state) {
    var roll = state.rng.next();
    if (state.aiEnergy >= 4 && roll < 0.35) return 'chonk';
    if (state.aiEnergy >= 3 && roll < 0.8) return 'zap';
    return 'pip';
  }

  function chooseAiLane(state) {
    var counts = [];
    for (var i = 0; i < state.laneCount; i++) counts.push(0);
    state.units.forEach(function (u) {
      if (u.side === 'player') counts[u.lane] += 1;
    });
    var max = Math.max.apply(null, counts);
    if (max > 0 && state.rng.next() < 0.68) {
      var options = [];
      counts.forEach(function (n, i) { if (n === max) options.push(i); });
      return state.rng.choose(options);
    }
    return Math.floor(state.rng.next() * state.laneCount);
  }

  function triggerWildSpawn(state) {
    var laneA = Math.floor(state.rng.next() * state.laneCount);
    var laneB = Math.floor(state.rng.next() * state.laneCount);
    spawnFor(state, 'player', laneA, 'pip', { free: true });
    spawnFor(state, 'enemy', laneB, 'pip', { free: true });
    addFeed(state, 'WILD SPAWN! A free pal bounced into each side.');
    addEffect(state, 'banner', { text: 'WILD SPAWN!', color: '#FFE156', life: 1.4 });
    state.wildTimer = 36 + state.rng.range(0, 8);
  }

  function eachLane(state, fn) {
    for (var i = 0; i < state.laneCount; i++) fn(i);
  }

  function enemyGateOpen(state) {
    for (var i = 0; i < state.gates.enemy.length; i++) {
      if (state.gates.enemy[i].hp <= 0) return true;
    }
    return false;
  }

  function healBuildings(state, side, coreAmount, gateAmount) {
    state.base[side] = Math.min(state.baseMax[side], state.base[side] + coreAmount);
    state.gates[side].forEach(function (g) {
      g.hp = Math.min(g.max, g.hp + gateAmount);
    });
  }

  var EVENTS = [
    {
      id: 'pip_party', title: 'Pip Party!', emoji: '🎉', color: '#FF7A59',
      desc: 'A free Pip bounces into every lane.',
      apply: function (state) { eachLane(state, function (l) { spawnFor(state, 'player', l, 'pip', { free: true }); }); }
    },
    {
      id: 'spark_shower', title: 'Sparkle Shower', emoji: '✨', color: '#F6C945',
      desc: 'Gain 5 spark now and 2 extra maximum spark.',
      apply: function (state) { state.maxEnergy += 2; state.energy = Math.min(state.maxEnergy, state.energy + 5); addEffect(state, 'banner', { text: '+5 SPARK', color: '#FFE156', life: 1.2 }); }
    },
    {
      id: 'meteor_plop', title: 'Meteor Plop', emoji: '☄️', color: '#FF6B35',
      desc: 'Crack every rival gate. Any lane already open also takes 40 core damage.',
      apply: function (state) {
        eachLane(state, function (l) {
          var gate = state.gates.enemy[l];
          if (gate.hp > 0) damageGate(state, 'player', l, 35, '#FFD166');
          else if (!state.result) damageBase(state, 'player', l, 40, '#FFD166');
        });
        addEffect(state, 'meteor', { life: 0.9, color: '#FFD166' });
        if (state.base.enemy <= 0) finishMatch(state, 'player');
      }
    },
    {
      id: 'snack_time', title: 'Snack Time', emoji: '🍄', color: '#55B852',
      desc: 'Heal your core by 70 and every gate by 35.',
      apply: function (state) {
        healBuildings(state, 'player', 70, 35);
        addEffect(state, 'heal', { lane: Math.floor(state.laneCount / 2), x: 0.3, color: '#B8F59C', life: 0.9 });
      }
    },
    {
      id: 'zoom_boots', title: 'Zoom Boots', emoji: '👟', color: '#82C7F2',
      desc: 'Your pals move 40% faster for 12 seconds.',
      apply: function (state) { state.buffs.player.speed = 1.4; state.buffs.player.speedTime = 12; addEffect(state, 'banner', { text: 'ZOOM!', color: '#B8F3FF', life: 1.2 }); }
    },
    {
      id: 'power_pepper', title: 'Power Pepper', emoji: '🌶️', color: '#FF7A59',
      desc: 'Your pals deal 35% more damage for 12 seconds.',
      apply: function (state) { state.buffs.player.damage = 1.35; state.buffs.player.damageTime = 12; addEffect(state, 'banner', { text: 'SPICY!', color: '#FFD166', life: 1.2 }); }
    },
    {
      id: 'big_friend', title: 'Big Friend', emoji: '🛡️', color: '#9367D8',
      desc: 'A free Chonk joins every one of your lanes.',
      apply: function (state) { eachLane(state, function (l) { spawnFor(state, 'player', l, 'chonk', { free: true }); }); }
    },
    {
      id: 'lucky_star', title: 'Lucky Star', emoji: '⭐', color: '#F6C945',
      desc: 'Zap every rival pal for 25 and gain 3 spark.',
      apply: function (state) {
        state.units.forEach(function (u) { if (u.side === 'enemy') { u.hp -= 25; u.hitFlash = 0.2; } });
        state.energy = Math.min(state.maxEnergy, state.energy + 3);
        addEffect(state, 'star', { life: 0.9, color: '#FFF6B8' });
      }
    }
  ];

  function eventById(id) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
    return null;
  }

  function offerEvent(state) {
    if (state.result || state.eventOffer) return state;
    var pool = EVENTS.slice();
    var first = Math.floor(state.rng.next() * pool.length);
    var a = pool.splice(first, 1)[0];
    var second = Math.floor(state.rng.next() * pool.length);
    var b = pool[second];
    state.eventOffer = [a.id, b.id];
    state.paused = true;
    addFeed(state, 'SPAWN EVENT! Pick a bonus.');
    return state;
  }

  function chooseEvent(state, id) {
    if (!state.eventOffer || state.result) return { ok: false, msg: 'No event is waiting.' };
    if (state.eventOffer.indexOf(id) < 0) return { ok: false, msg: 'That bonus is not on offer.' };
    var ev = eventById(id);
    if (!ev) return { ok: false, msg: 'That bonus is missing.' };
    state.eventOffer = null;
    state.paused = false;
    state.stats.events++;
    ev.apply(state);
    state.eventTimer = 30 + state.rng.range(0, 8);
    addFeed(state, ev.title + ': ' + ev.desc);
    return { ok: true, msg: ev.title + '!' };
  }

  function skipEvent(state) {
    if (!state.eventOffer) return { ok: false, msg: 'No event is waiting.' };
    state.eventOffer = null;
    state.paused = false;
    state.energy = Math.min(state.maxEnergy, state.energy + 3);
    state.eventTimer = 30 + state.rng.range(0, 8);
    addFeed(state, 'You skipped the event and gained 3 spark.');
    return { ok: true, msg: 'Skipped. +3 spark.' };
  }

  function abilityFor(elementId) { return ELEMENTS[elementId].ability; }

  function useAbility(state) {
    if (!state || state.result) return { ok: false, msg: 'The match is over.' };
    if (state.paused) return { ok: false, msg: 'Finish the current event first.' };
    if (state.abilityCd > 0) return { ok: false, msg: 'Your buddy is still catching their breath.' };
    if (state.mode === 'clash') return useClashAbility(state);
    if (state.mode === 'tower') return useTowerAbility(state);
    var el = state.playerElement;
    var ability = ELEMENTS[el].ability;
    var enemies = state.units.filter(function (u) { return u.side === 'enemy'; });
    var friends = state.units.filter(function (u) { return u.side === 'player'; });
    var opened = enemyGateOpen(state);

    if (ability.id === 'meteor') {
      eachLane(state, function (l) {
        if (state.gates.enemy[l].hp > 0) damageGate(state, 'player', l, 30, ELEMENTS[el].light);
      });
      if (opened || enemyGateOpen(state)) {
        damageBase(state, 'player', Math.floor(state.laneCount / 2), 55, ELEMENTS[el].light);
      }
      addEffect(state, 'meteor', { life: 1.1, color: ELEMENTS[el].light });
    } else if (ability.id === 'heal') {
      friends.forEach(function (u) { u.hp = Math.min(u.maxHp, u.hp + 60); });
      healBuildings(state, 'player', 75, 25);
      addEffect(state, 'heal', { lane: 0, x: 0.35, color: ELEMENTS[el].light, life: 1.1 });
      addEffect(state, 'heal', { lane: state.laneCount - 1, x: 0.35, color: ELEMENTS[el].light, life: 1.1 });
    } else if (ability.id === 'snare') {
      enemies.forEach(function (u) { u.stun = Math.max(u.stun, 2.2); });
      addEffect(state, 'snare', { life: 1.1, color: ELEMENTS[el].light });
    } else if (ability.id === 'gust') {
      enemies.forEach(function (u) {
        u.hp -= 18; u.hitFlash = 0.2;
        if (state.mode === 'maze') {
          u.stun = Math.max(u.stun, 1.5);
          u.mt = 0; u.nx = null; u.ny = null;
        } else {
          u.x = clamp(u.x + 0.06, 0.1, 0.98);
        }
      });
      addEffect(state, 'gust', { life: 1.0, color: ELEMENTS[el].light });
    } else if (ability.id === 'sunbeam') {
      eachLane(state, function (l) {
        if (state.gates.enemy[l].hp > 0) damageGate(state, 'player', l, 24, ELEMENTS[el].light);
      });
      if (opened || enemyGateOpen(state)) {
        damageBase(state, 'player', Math.floor(state.laneCount / 2), 48, ELEMENTS[el].light);
      }
      addEffect(state, 'beam', { life: 1.0, color: ELEMENTS[el].light });
    } else if (ability.id === 'siphon') {
      enemies.forEach(function (u) { u.hp -= 30; u.hitFlash = 0.2; });
      friends.forEach(function (u) { u.hp = Math.min(u.maxHp, u.hp + 30); });
      healBuildings(state, 'player', 30, 10);
      addEffect(state, 'siphon', { life: 1.1, color: ELEMENTS[el].light });
    }
    state.abilityCd = state.abilityMax;
    state.stats.abilities++;
    addFeed(state, ability.name + '! ' + ability.desc);
    return { ok: true, msg: ability.name + '!' };
  }

  function mazeUnitPosition(unit) {
    var nx = unit.nx === undefined || unit.nx === null ? unit.gx : unit.nx;
    var ny = unit.ny === undefined || unit.ny === null ? unit.gy : unit.ny;
    var t = unit.mt || 0;
    return { x: unit.gx + (nx - unit.gx) * t, y: unit.gy + (ny - unit.gy) * t };
  }

  function mazeLineClear(maze, from, to) {
    var ax = Math.round(from.x), ay = Math.round(from.y);
    var bx = Math.round(to.x), by = Math.round(to.y);
    if (ax === bx) {
      var y0 = Math.min(ay, by), y1 = Math.max(ay, by);
      for (var y = y0; y <= y1; y++) if (!mazeCellOpen(maze, ax, y)) return false;
      return true;
    }
    if (ay === by) {
      var x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
      for (var x = x0; x <= x1; x++) if (!mazeCellOpen(maze, x, ay)) return false;
      return true;
    }
    return false;
  }

  function mazeTargetFor(state, unit) {
    var best = null;
    var bestDist = Infinity;
    var from = mazeUnitPosition(unit);
    var range = unit.type === 'zap' ? 2.25 : 1.15;
    for (var i = 0; i < state.units.length; i++) {
      var other = state.units[i];
      if (other.side === unit.side || other.hp <= 0) continue;
      var to = mazeUnitPosition(other);
      var dx = Math.abs(to.x - from.x);
      var dy = Math.abs(to.y - from.y);
      var dist = dx + dy;
      if (dist > range) continue;
      if (!mazeLineClear(state.maze, from, to)) continue;
      if (dist < bestDist) { best = other; bestDist = dist; }
    }
    return best;
  }

  function chooseMazeStep(state, unit) {
    var maze = state.maze;
    var dist = unit.side === 'player' ? maze.playerDist : maze.enemyDist;
    var curIndex = mazeIndex(maze, unit.gx, unit.gy);
    var current = dist[curIndex];
    if (!isFinite(current) || current <= 0) return false;
    var options = [];
    var near = mazeNeighbors(maze, unit.gx, unit.gy);
    for (var i = 0; i < near.length; i++) {
      var value = dist[mazeIndex(maze, near[i].x, near[i].y)];
      if (value < current) options.push(near[i]);
    }
    if (!options.length) return false;
    var pick = options[Math.floor(state.rng.next() * options.length)];
    unit.nx = pick.x;
    unit.ny = pick.y;
    unit.mt = 0.0001;
    return true;
  }

  function advanceMazeUnit(state, unit, dt) {
    if (unit.mt <= 0 || unit.nx === null || unit.ny === null) return false;
    unit.mt += unit.speed * state.buffs[unit.side].speed * 13 * dt;
    if (unit.mt >= 1) {
      unit.gx = unit.nx;
      unit.gy = unit.ny;
      unit.nx = null;
      unit.ny = null;
      unit.mt = 0;
      return true;
    }
    return false;
  }

  function updateMazeUnits(state, dt) {
    var i;
    for (i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      u.age += dt;
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.cd = Math.max(0, u.cd - dt);
      if (u.stun > 0) u.stun = Math.max(0, u.stun - dt);
    }

    for (i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      if (unit.hp <= 0 || unit.stun > 0) continue;
      if (unit.mt > 0) {
        advanceMazeUnit(state, unit, dt);
        continue;
      }

      var target = mazeTargetFor(state, unit);
      if (target) {
        if (unit.cd <= 0) {
          var hit = unitDamage(state, unit, target.element);
          target.hp -= hit.amount;
          target.hitFlash = 0.2;
          unit.cd = unit.cooldown;
          if (unit.lifesteal > 0) unit.hp = Math.min(unit.maxHp, unit.hp + hit.amount * unit.lifesteal);
          var from = mazeUnitPosition(unit);
          var to = mazeUnitPosition(target);
          addEffect(state, 'mazeHit', {
            gx: to.x, gy: to.y, color: ELEMENTS[unit.element].light,
            life: 0.32, strong: hit.strong, weak: hit.weak, ranged: unit.type === 'zap'
          });
          if (unit.type === 'zap') {
            addEffect(state, 'mazeBolt', {
              fromGx: from.x, fromGy: from.y, gx: to.x, gy: to.y,
              color: ELEMENTS[unit.element].light, life: 0.24
            });
          }
          addEffect(state, 'text', {
            gx: to.x, gy: to.y, text: '-' + hit.amount,
            color: damageColor(hit), life: 0.72, maze: true
          });
          if (target.hp <= 0) {
            if (unit.side === 'player') state.stats.kills++;
            addEffect(state, 'mazePoof', {
              gx: to.x, gy: to.y, color: ELEMENTS[target.element].light, life: 0.6
            });
          }
        }
        continue;
      }

      var enemySide = unit.side === 'player' ? 'enemy' : 'player';
      var objective = unit.side === 'player' ? state.maze.foe : state.maze.home;
      if (unit.gx === objective.x && unit.gy === objective.y) {
        var gate = state.gates[enemySide][0];
        if (unit.cd <= 0) {
          var buildingHit = unitDamage(state, unit, enemySide === 'player' ? state.playerElement : state.enemyElement);
          unit.cd = unit.cooldown;
          if (gate.hp > 0) {
            damageGate(state, unit.side, 0, buildingHit.amount, damageColor(buildingHit));
          } else {
            damageBase(state, unit.side, 0, buildingHit.amount, damageColor(buildingHit));
            if (state.result) return;
          }
        }
        continue;
      }

      chooseMazeStep(state, unit);
    }

    var survivors = [];
    for (i = 0; i < state.units.length; i++) if (state.units[i].hp > 0) survivors.push(state.units[i]);
    state.units = survivors;
  }

  function mazeCellsReachable(maze, from, to) {
    if (!mazeCellOpen(maze, from.x, from.y)) return false;
    var dist = mazeDistances(maze, from);
    return isFinite(dist[mazeIndex(maze, to.x, to.y)]);
  }

  function mazeUnitsCanReach(state) {
    var maze = state.maze;
    for (var i = 0; i < state.units.length; i++) {
      var unit = state.units[i];
      var goal = unit.side === 'player' ? maze.foe : maze.home;
      if (!mazeCellsReachable(maze, { x: unit.gx, y: unit.gy }, goal)) return false;
    }
    return true;
  }

  // A shift is a real reroute, not a cosmetic jiggle: corridors open, the live
  // route is deliberately cut, and the new route is validated end to end.
  function shiftMazeWalls(state) {
    if (!state || !state.maze || state.result) return false;
    var maze = state.maze;
    var grid = maze.grid;
    var snapshot = grid.slice();
    var oldPath = (maze.playerPath || []).slice();
    var oldLen = Math.max(1, oldPath.length);
    // Keep the maze maze-shaped over a long match: shifts may renew the route,
    // but never gradually turn the board into an open field.
    if (!maze.routeFloor) maze.routeFloor = Math.max(8, Math.round(oldLen * 0.7));
    var guarded = {};
    function guard(x, y) {
      if (x >= 0 && y >= 0 && x < maze.cols && y < maze.rows) guarded[y * maze.cols + x] = true;
    }
    guard(maze.home.x, maze.home.y);
    guard(maze.foe.x, maze.foe.y);
    state.units.forEach(function (u) {
      guard(u.gx, u.gy);
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) guard(u.gx + dx, u.gy + dy);
      if (u.nx !== null && u.ny !== null) guard(u.nx, u.ny);
    });

    var grand = (maze.shifts + 1) % 3 === 0;

    var oldSet = {};
    oldPath.forEach(function (c) { oldSet[c.y * maze.cols + c.x] = true; });

    function routePath() { return mazePathCells(maze, maze.home, maze.foe); }

    // How much of the old front line survives? 0 = brand new war, 1 = identical.
    function routeOverlap(path) {
      if (!path || !path.length) return 1;
      var shared = 0;
      path.forEach(function (c) { if (oldSet[c.y * maze.cols + c.x]) shared++; });
      return shared / Math.max(oldPath.length, path.length);
    }

    function shuffle(list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(state.rng.next() * (i + 1));
        var t = list[i]; list[i] = list[j]; list[j] = t;
      }
      return list;
    }

    // 1) Cut the live route first. With no fresh shortcuts yet, each cut is felt:
    //    sample the route and keep the cut that makes the new route least familiar.
    var closed = 0;
    var cutRounds = grand ? 5 : 3;
    for (var round = 0; round < cutRounds; round++) {
      var path = routePath();
      if (!path.length) break;
      var candidates = path.slice(1, -1)
        .map(function (c) { return c.y * maze.cols + c.x; })
        .filter(function (idx) { return grid[idx] && !guarded[idx]; });
      shuffle(candidates);
      var sample = candidates.slice(0, 22);
      var bestCut = -1;
      var bestScore = routeOverlap(path);
      sample.forEach(function (idx) {
        grid[idx] = false;
        var next = routePath();
        if (next.length) {
          var score = routeOverlap(next);
          if (score < bestScore) { bestScore = score; bestCut = idx; }
        }
        grid[idx] = true;
      });
      if (bestCut < 0) break;
      grid[bestCut] = false;
      closed++;
    }

    // 2) Now open corridors, but only where they add loops without restoring the
    //    old front line. A rejected opening is simply reverted.
    var opened = 0;
    var openTarget = grand ? 12 : 7;
    var baseline = routeOverlap(routePath());
    var wallCells = [];
    for (var wy = 1; wy < maze.rows - 1; wy++) {
      for (var wx = 1; wx < maze.cols - 1; wx++) {
        var wIdx = wy * maze.cols + wx;
        if (grid[wIdx] || guarded[wIdx]) continue;
        if (mazeNeighbors(maze, wx, wy).length >= 2) wallCells.push(wIdx);
      }
    }
    shuffle(wallCells);
    for (var ot = 0; ot < 80 && opened < openTarget && wallCells.length; ot++) {
      var openIdx = wallCells.pop();
      if (grid[openIdx]) continue;
      grid[openIdx] = true;
      var opened_path = routePath();
      var nextOverlap = routeOverlap(opened_path);
      if (opened_path.length && opened_path.length >= maze.routeFloor && nextOverlap <= Math.min(0.75, baseline + 0.06)) {
        opened++;
        baseline = nextOverlap;
      } else {
        grid[openIdx] = false;
      }
    }

    refreshMazeDistances(state);

    // 4) Guarantee every pal still has a way out; a shift must reroute, never strand.
    if (!mazePathExists(maze) || maze.playerPath.length < maze.routeFloor || !mazeUnitsCanReach(state)) {
      for (var g = 0; g < grid.length; g++) grid[g] = snapshot[g];
      refreshMazeDistances(state);
      maze.shiftTimer = 4;
      maze.warning = false;
      maze.warned = false;
      addFeed(state, 'The maze shudders, then settles back. No clean reroute this time.');
      return false;
    }
    if (!closed && !opened) {
      maze.shiftTimer = 6;
      return false;
    }

    var newLen = maze.playerPath.length;
    var delta = newLen - oldLen;
    var freshPercent = Math.round((1 - routeOverlap(maze.playerPath)) * 100);
    maze.shifts++;
    maze.lastShift = state.elapsed;
    maze.shiftTimer = maze.shiftEvery + state.rng.range(0, 3);
    maze.warning = false;
    maze.warned = false;
    state.stats.shifts++;
    addFeed(state, (grand ? 'GRAND SHIFT! ' : 'THE MAZE SHIFTS! ') + closed + ' wall' + (closed === 1 ? '' : 's') + ' closed, ' + opened + ' corridor' + (opened === 1 ? '' : 's') + ' opened. Route ' + oldLen + ' → ' + newLen + ' tiles · ' + freshPercent + '% new.');
    addEffect(state, 'mazeShift', { life: 1.4, color: '#FFE56A' });
    if (grand) {
      addEffect(state, 'banner', { text: 'GRAND SHIFT!', color: '#FFE56A', life: 1.7 });
      addFeed(state, 'New corridors and a new front line. Re-read the gold route.');
    }
    return true;
  }

  function updateMazeMode(state, dt) {
    state.aiTimer -= dt;
    if (state.aiTimer <= 0) {
      var type = chooseAiType(state);
      var ai = spawnFor(state, 'enemy', 0, type, {});
      state.aiTimer = ai.ok ? (2.3 + state.rng.range(0, 1.4)) : 0.5;
    }
    state.eliteTimer -= dt;
    if (state.eliteTimer <= 0) {
      var raider = spawnFor(state, 'enemy', 0, 'chonk', { free: true }).unit;
      if (raider) {
        raider.elite = true;
        raider.maxHp = Math.round(raider.hp * 1.9);
        raider.hp = raider.maxHp;
        raider.speed *= 1.12;
        addFeed(state, 'RIVAL RAIDER! An armoured Chonk is charging the maze. Focus it down!');
        addEffect(state, 'banner', { text: 'RIVAL RAIDER!', color: '#FFB0A0', life: 1.5 });
      }
      state.eliteTimer = 26 + state.rng.range(0, 8);
    }
    state.wildTimer -= dt;
    if (state.wildTimer <= 0) triggerWildSpawn(state);
    state.eventTimer -= dt;
    if (state.eventTimer <= 0) {
      offerEvent(state);
      return state;
    }
    state.maze.shiftTimer -= dt;
    if (!state.maze.warning && state.maze.shiftTimer <= 3 && state.maze.shiftTimer > 0) {
      state.maze.warning = true;
      addFeed(state, 'The maze walls are stirring… next shift in ' + Math.ceil(state.maze.shiftTimer) + 's.');
      addEffect(state, 'mazeWarning', { life: 1.2, color: '#FFE56A' });
    }
    if (state.maze.shiftTimer <= 0) shiftMazeWalls(state);
    updateMazeUnits(state, dt);
    if (!state.result) {
      if (state.base.player <= 0) finishMatch(state, 'enemy');
      else if (state.base.enemy <= 0) finishMatch(state, 'player');
    }
    if (state.effects.length) {
      state.effects.forEach(function (e) { e.life -= dt; });
      state.effects = state.effects.filter(function (e) { return e.life > 0; });
    }
    return state;
  }

  function update(state, dt) {
    if (!state || state.result || state.paused) return state;
    dt = clamp(Number(dt) || 0, 0, 0.05);
    state.time += dt;
    state.elapsed += dt;
    state.spawnCd = Math.max(0, state.spawnCd - dt);
    state.abilityCd = Math.max(0, state.abilityCd - dt);
    var incomeRate = state.playerRate;
    if (state.mode === 'clash' && state.clash) incomeRate += CLASH_TOWER_RATE * clashOwnedCount(state, 'player');
    state.energy = Math.min(state.maxEnergy, state.energy + incomeRate * dt);
    var aiIncome = state.aiRate;
    if (state.mode === 'clash' && state.clash) aiIncome += CLASH_TOWER_RATE * clashOwnedCount(state, 'enemy');
    state.aiEnergy = Math.min(state.maxEnergy, state.aiEnergy + aiIncome * dt);
    updateBuffs(state, dt);

    if (!state.finalBounce && state.elapsed >= state.finalBounceAt) triggerFinalBounce(state);
    if (state.mode === 'clash') return updateClashMode(state, dt);
    if (state.mode === 'tower') return updateTowerMode(state, dt);
    if (state.mode === 'maze') return updateMazeMode(state, dt);

    state.aiTimer -= dt;
    if (state.aiTimer <= 0) {
      var type = chooseAiType(state);
      var lane = chooseAiLane(state);
      var ai = spawnFor(state, 'enemy', lane, type, {});
      state.aiTimer = ai.ok ? (2.3 + state.rng.range(0, 1.4)) : 0.5;
    }

    state.wildTimer -= dt;
    if (state.wildTimer <= 0) triggerWildSpawn(state);

    state.eventTimer -= dt;
    if (state.eventTimer <= 0) {
      offerEvent(state);
      return state;
    }

    updateUnits(state, dt);
    if (!state.result) {
      if (state.base.player <= 0) finishMatch(state, 'enemy');
      else if (state.base.enemy <= 0) finishMatch(state, 'player');
    }
    if (state.effects.length) {
      state.effects.forEach(function (e) { e.life -= dt; });
      state.effects = state.effects.filter(function (e) { return e.life > 0; });
    }
    return state;
  }

  LW.ELEMENTS = ELEMENTS;
  LW.KINGDOMS = KINGDOMS;
  LW.ELEMENT_ORDER = ELEMENT_ORDER;
  LW.ELEMENT_BEATS = ELEMENT_BEATS;
  LW.TYPES = TYPES;
  LW.EVENTS = EVENTS;
  LW.LANES = LANES;
  LW.CORE_MAX = CORE_MAX;
  LW.GATE_MAX = GATE_MAX;
  LW.SPAWN_MAX = SPAWN_MAX;
  LW.FINAL_BOUNCE_AT = FINAL_BOUNCE_AT;
  LW.MAZE_MIN_SIZE = MAZE_MIN_SIZE;
  LW.MAZE_MAX_SIZE = MAZE_MAX_SIZE;
  LW.TOWER_TYPES = TOWER_TYPES;
  LW.TOWER_ENEMIES = TOWER_ENEMIES;
  LW.clashOuterOwned = clashOuterOwned;
  LW.clashHubFor = clashHubFor;
  LW.clashPath = clashPath;
  LW.clashSpawnHub = clashSpawnHub;
  LW.clashTargetsFor = clashTargetsFor;
  LW.clashDistance = function (a, b) { return clashDistance(a, b); };
  LW.CLASH_HUBS = CLASH_HUBS;
  LW.CLASH_STRANDS = CLASH_STRANDS;
  LW.TOWER_TOTAL_WAVES = TOWER_TOTAL_WAVES;
  LW.TOWER_PATH = TOWER_PATH;
  LW.getTowerWavePreview = getTowerWavePreview;
  LW.CLASH_LANES = CLASH_LANES;
  LW.CLASH_TOWER_HP = CLASH_TOWER_HP;
  LW.CLASH_MASTER_HP = CLASH_MASTER_HP;
  LW.CLASH_CORE_MAX = CLASH_CORE_MAX;
  LW.CLASH_BASE_RATE = CLASH_BASE_RATE;
  LW.CLASH_TOWER_RATE = CLASH_TOWER_RATE;
  LW.CLASH_MASTER_ID = CLASH_MASTER_ID;
  LW.clashTowerFor = clashTowerFor;
  LW.clashRecommendedTarget = clashRecommendedTarget;
  LW.clashRouteTarget = function (state, side, route) { return clashRouteTarget(state, side, route); };
  LW.clashSuggestedRoute = function (state, side) { return clashSuggestedRoute(state, side); };
  LW.clashRouteSpawnHub = function (state, side, route, targetId) { return clashRouteSpawnHub(state, side, route, targetId); };
  LW.clashOwnedCount = clashOwnedCount;
  LW.getTowerStats = getTowerStats;
  LW.getTowerRoster = getTowerRoster;
  LW.buildTower = buildTower;
  LW.sellTower = sellTower;
  LW.TOWER_MODULES = TOWER_MODULES;
  LW.towerUpgradePreview = towerUpgradePreview;
  LW.installTowerModule = installTowerModule;
  LW.towerModuleCost = towerModuleCost;
  LW.spawnTowerTroop = spawnTowerTroop;
  LW.towerUpgradeCost = towerUpgradeCost;
  LW.towerCoverage = towerCoverage;
  LW.towerBounty = towerBounty;
  LW.towerEarlyBonus = towerEarlyBonus;
  LW.startTowerWave = startTowerWave;
  LW.spawnTowerEnemy = spawnTowerEnemy;
  LW.towerUnitPosition = towerUnitPosition;
  LW.createMazeGrid = createMazeGrid;
  LW.mazeIndex = mazeIndex;
  LW.mazeCellOpen = mazeCellOpen;
  LW.mazeDistances = mazeDistances;
  LW.mazePathExists = mazePathExists;
  LW.shiftMazeWalls = shiftMazeWalls;
  LW.createMatch = createMatch;
  LW.kingdomFor = kingdomFor;
  LW.getLaneNames = getLaneNames;
  LW.getRoster = getRoster;
  LW.getStats = getStats;
  LW.getSpawnStatus = getSpawnStatus;
  LW.strongAgainst = strongAgainst;
  LW.weakAgainst = weakAgainst;
  LW.attackMultiplier = attackMultiplier;
  LW.defenseMultiplier = defenseMultiplier;
  LW.matchup = matchup;
  LW.spawn = spawn;
  LW.spawnFor = spawnFor;
  LW.update = update;
  LW.useAbility = useAbility;
  LW.abilityFor = abilityFor;
  LW.chooseEvent = chooseEvent;
  LW.skipEvent = skipEvent;
  LW.eventById = eventById;
  LW.offerEvent = offerEvent;
  LW.finishMatch = finishMatch;
  LW.triggerFinalBounce = triggerFinalBounce;
  ZAC.LW = LW;
})(typeof globalThis !== 'undefined' ? globalThis : this);
