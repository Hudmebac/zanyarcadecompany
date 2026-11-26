# ZANY ARCADE COMPANY

**Small games. Big sparks.**

The public hub for **Zany Arcade Company (Z.A.C.)**, Zac's one-person game company. It links the games that live in this repository and the games and app with their own external stages.

**Live site:** https://zany-arcade-company-mvnp9r.freebuff.site/

**GitHub Pages:** https://hudmebac.github.io/zanyarcadecompany/

**Company GitHub:** https://github.com/Hudmebac/zanyarcadecompany

| Project | Type | Where it lives | Open |
| --- | --- | --- | --- |
| **Elemental Little Wars** | Game | This repository | `play.html` |
| **Down, Down, Down** | Game | External Netlify stage | https://downdowndown.netlify.app/ |
| **ZenZac** | App — calm toolkit | External Netlify stage | https://zenzac.netlify.app/ |

*Elemental Little Wars* is a bright, single-player battle with a side-on platform look. Pick an elemental kingdom, choose **Simple Lanes**, a **Shifting Maze**, **Tower Defence** or **Tower Clash**, then march element-shaped pals across the platforms, crack the rival gatehouse, and pop the exposed core — hold a switchback siege, or capture the towers and take the Master Tower.

*Down, Down, Down* is an endless descent through cloud ledges. Pick a Downward Kid, steer, jump, glide and dash, and see how deep you can fall before the storm catches up.

*ZenZac* is an app, not a game: a practical toolkit for parents and carers of children with ADHD, autism or both. It brings a profile quiz, house rules, breathing tools, routines, a feelings journal and a searchable library of practical guides into one calm place. No adverts, no sign-up, and progress stays on the device.

No jump button in the Little Wars. No installs, accounts or build step required to open any of them.

## Run

### Windows

Double-click **`start.bat`** in the project folder. It checks for Node.js, starts the local server and opens **http://localhost:8080** in your default browser. The hub is the homepage; choose **Elemental Little Wars** to play. Keep the window open while playing; close it or press `Ctrl+C` to stop the server.

### From a terminal

```bash
cd F:/LittleWars
npm start
```

Open **http://localhost:8080** for the **arcade hub**, or **http://localhost:8080/play.html** to go straight to *Elemental Little Wars*. You can also open `index.html` or `play.html` directly; the local server is only for convenience and the browser test.

## The website

The company site is static, needs no build step and is served by the same local server:

- **http://localhost:8080/** — the **Zany Arcade Company hub**: two games, the ZenZac app, their status and direct links.
- **http://localhost:8080/site/studio.html** — the **Studio**: the name's origin, the house rules, a note from Zac and the full catalogue, including the dedicated **DownDownDown** and **ZenZac** buttons.
- **http://localhost:8080/site/lore.html** — *The Lore of Elemental Little Wars*: the Splintering, the Core Compact, all six kingdoms, the element cycle, the six buddies and the four battlefields.
- **http://localhost:8080/site/codex.html** — the supporting **Field Guide**: quick-reference tables for kingdoms, buddies and pal roles, the Compact's numbers, and a glossary.

`site/index.html` is a small redirect to the lore page, so old `/site/` links keep working. The start screen links back to the hub and to the lore, and every site page links back to **Elemental Little Wars** with **Play**. The pages live in `site/` and share one self-contained stylesheet, `site/site.css`; they can also be opened directly from disk.

The live site publishes the hub at `/`, *Elemental Little Wars* at `/play`, and the site pages at `/site/lore`, `/site/studio` and `/site/codex`. **Down, Down, Down** and **ZenZac** stay on their own Netlify URLs.

## Build and publish

```bash
npm run build:site
```

This writes a clean static bundle to `dist/`: the hub at the root, *Elemental Little Wars* at `/play.html`, and the lore, field guide and studio under `/site/`. The bundle is what gets published; no server-side code is needed. The external **DownDownDown** and **ZenZac** links stay external.

The included **Publish Zany Arcade Company** GitHub Actions workflow runs this build and deploys `dist/` to GitHub Pages on every push to `main`. `netlify.toml` points Netlify at the same build and publish directory.

### Zany Arcade Company (Z.A.C.)

Everything in this project sits under **Zany Arcade Company**, Zac's one-person game company, written **Z.A.C.** for short:

- **Z** is for **Zany** — bright, brisk, slightly silly games.
- **A** is for **Arcade** — pick up and play, no installs, no accounts.
- **C** is for **Company** — one person, a desk, a notebook and a rule about finishing things.

The initials spell Zac, which is also the founder's name and entirely deliberate. The mark is separate from the letters: six coloured dots in a ring — fire, light, earth, water, air, dark — around the hearth at the centre.

- **Start screen:** the header reads *Zany Arcade Company · A Zac creation*.
- **Site and guide:** the wordmark, the spark mark and the page titles use the studio brand, and the studio page carries the founder's note and house rules.
- **Favicon:** the six-dot mark on the site pages; the game keeps its own star.

## The six kingdoms

Every element has its own home kingdom, matching landscape and spawn gate. Your chosen element sets your side of the battlefield; the rival brings their own kingdom with them.

| Element | Kingdom | Battlefield | Spawn gate |
| --- | --- | --- | --- |
| Fire | **Volcano Forge** | A warm caldera with a friendly lava fountain | Lava Vent |
| Water | **Sapphire Lake** | A bright mirror-lake full of lily pads and bubbles | Tidewell |
| Earth | **Mud Mountain** | A lumpy mountain dotted with friendly mud puddles | Mud Burrow |
| Air | **Cloudtop Skyhold** | A sky island drifted into a pile of fluffy clouds | Cloud Chute |
| Light | **Radiant Heaven** | Golden stairs, soft clouds and a very shiny gate | Sun Gate |
| Dark | **Moonlit Underworld** | A cozy underworld of crystals and purple fireflies | Shade Well |

The start screen shows each kingdom and its spawn point. In battle, the top HUD names both home kingdoms, each fort has a kingdom label, and the canvas draws the two landscapes behind their platforms.

## Battle modes

The start screen has four real battlefields:

- **Simple Lanes** — the fast classic: **3, 4 or 5 straight raised platforms**, one gatehouse per lane. Pals walk straight ahead; no jumping or lane switching.
- **Shifting Maze** — a randomly generated **8×8 up to 25×25 platform labyrinth**, including rectangles such as **8×15, 10×10 and 15×10**. Your pals pathfind through winding corridors, meet rival pals in the maze, and race for the single rival gate. Every **12–15 seconds** the maze **moves walls**, and a shift is a genuine reroute: it opens corridors first, then **cuts three to five tiles of the live route** (six on a **GRAND SHIFT**, every third shift), choosing cuts that make the new route as unfamiliar as possible. New corridors are only kept if they do not restore the old front line, so each shift typically replaces **60–90%** of the route and moves the war to a different set of corridors. Every pal recalculates, no shift may strand a pal, and the board pulses for **3 seconds first**. The HUD shows size, shift countdown and current route length in tiles, and a **minimap plus gold breadcrumb trail** always shows the live route.
- **Tower Defence** — a fixed **12×8 switchback siege route** with **12 build pads**. You open with **14 spark**; kills fund more, a **kill streak raises the bounty** (×1.2 / ×1.4 / ×1.6) and a leak resets it, so the economy rewards clean play. Build, upgrade to level 3, sell for a **75% refund** to reposition, watch the range rings and the **path-tile coverage count**, and hold **8 escalating waves** with **bosses on waves 4 and 8**.
- **Tower Clash** — a **seven-hub web with two directional rails**. Both sides choose **NORTH** or **SOUTH**; the rails meet at the Master, then split toward the rival keep. Break a tower to take it, then push the next one on your chosen rail.

Simple Lanes and Shifting Maze share the element cycle, spark economy, spawn events, gates, cores and Final Bounce. Tower Defence reuses elemental combat and buddy powers in a survival format. Tower Clash turns the same pals into a route-capture push.

## Tower Defence

The third battlefield is a compact siege survival mode rather than a lane race. The route is a fixed **12×8 switchback** with **25 path tiles** and **12 build pads** hugging every straight and bend; rival pals enter at the top-left portal and walk the whole route toward your bastion core at the bottom-right.

- **No pal spawning** — you spend spark on towers instead. You start with **14 spark**, and spark does not trickle in fast: **every pop pays spark back** (+1 for a runner, +2 for an Iron Brute, +5 for a boss), multiplied by your **kill streak bounty**.
- **The economy rewards clean defence.** Every kill builds a streak: **8 kills = ×1.2**, **20 = ×1.4**, **40 = ×1.6** bounty. Any leak resets the streak to zero, so letting one runner through costs more than the leak damage.
- **Wave bonuses are a bet.** Clearing a wave pays **+4**, plus **+4 for a leak-free wave** or **+2 for one or two leaks**. Starting early pays **+1 to +4 spark by how much prep you skip**, so the confident play is to call the wave and spend the bonus on the next tower or module.
- **Three tower archetypes**, all in your kingdom's element and colours, each with a clearly different job:
  - **Spark Spire** — 3 spark, **rapid** single-target shots with 3.0 range. Best against single runners.
  - **Stone Bastion** — 5 spark, **splash** mortar that hits a packed group. Best against bunched brutes.
  - **Storm Coil** — 4 spark, **chain** lightning with 4.0 range. Best down long straights.
- **Positioning matters.** Selecting a pad draws its full range, every built tower keeps a faint range ring, and **gold dots mark the path tiles a pad actually covers**.
- **Level up first, specialise once.** Tap a built tower to inspect it: the big **LEVEL ▲** button spans the panel and shows the exact next-level gain and cost (`21→37 DMG · 3.0→3.2 RNG`). Tap that button, or **tap the same pad again**, to buy the level. Levels are cheap and cap at 3, with **+75% base damage per level**, more range and faster fire. Then pick one of four specialisations:
  - 🔆 **Laser** — +25% damage, +0.5 range and **ignores armour**, for long straights and Iron Brutes.
  - ❄️ **Slow** — every hit chills: enemies move **45% slower** for 1.6s, with **+15% damage and +0.3 range** so it is a support pick, not a damage loss. Best at the front of a bend.
  - 💥 **AOE** — every shot splashes a **wide** area, turning any tower into a crowd answer.
  - 🐣 **Troops** — sends a **Hearth Guard** onto the route every 7s to fight the siege hand-to-hand; guards get tougher and hit harder as the tower levels.
  Each choice shows its cost and effect before you spend, the installed module is badged above the tower, and its bonus is kept when you level the tower up.
- **SELL** returns **75% of everything invested** (build, levels and module), so repositioning is a real move rather than a punishment. The specialisation panel shows the live effect tag (DAMAGE · RANGE · PIERCE, SUPPORT · 45% CHILL, DAMAGE · WIDE SPLASH, SUPPORT · HEARTH GUARD).
- **Four siege archetypes** keep the waves varied and demand different answers:
  - **Siege Runner** — fast and flimsy, comes in packs.
  - **Iron Brute** — armoured, so rapid fire is inefficient against it.
  - **Ward Shielder** — projects an aura that cuts damage taken by nearby pals; pop it first.
  - **Siege Titan** — the boss on waves 4 and 8, with heavy armour and a much bigger leak.
- **8 escalating waves** start after a **12-second prep**. Tap **START WAVE** early for **+1 to +4 spark** (the button shows the exact amount); the panel previews the exact next mix (`3🏃 · 1🛡️ · 0🔮`) and its tip. **Bosses arrive on waves 4 and 8.**
- **Leaks hurt the core** — every siege pal that reaches the end deals `10 + 3 × wave` damage, multiplied by its archetype (a boss leak is brutal). There are no player gates to absorb it.
- **Clear all 8 waves to win.** If the 360-health bastion core reaches zero, the siege wins.
- Your **buddy power** becomes a defensive emergency: damage, stun, knockback, healing or lifesteal depending on your element.

## Tower Clash

Tower Clash is the fourth battlefield: **seven hubs joined by a web of strands**, not three straight roads.

- **Two rails, one Master.** North runs **Home → North-West → Master → North-East → Rival Keep**. South runs **Home → South-West → Master → South-East → Rival Keep**. The rails meet at the centre and never cross, so there is no bypass and no walking backward.
- **Both sides choose.** The player taps **NORTH** or **SOUTH**; the rival evaluates both rails and picks the softer one. Choosing a rail sends the next wave down that side and spawns from the nearest owned tower on that same rail.
- **Break it, own it.** A tower flips to your side the moment its health reaches zero. Captured towers keep 60% health and start firing for you.
- **The rail advances itself.** After a tower falls, the next tower on that rail becomes the target; after the Master, it is that side's final tower, then the keep. Switching rails is allowed at any time.
- **Captured hubs keep working the web.** They fire along their strands and become the forward spawn for anything you send through them. The Master Tower fires harder and farther. Both keeps defend their own doorstep with a heavy bolt.
- **The Master opens the rival keep.** The keep only takes damage once you hold the Master; there is no separate chaining rule to remember.
- **Towers are the economy.** Both sides generate a slower `0.5 spark/s` passively; every tower you hold adds `+0.16 spark/s`. Taking map control is how a push snowballs.
- **Win by breaking the rival 2,400-health keep**; lose if your own keep falls. Troops chip the keep rather than delete it, and a stacked push has to survive the keep's defensive fire. Towers are the whole battle: break, take, push.
- Your **buddy power** hits troops and enemy towers, or heals your keep and owned towers, depending on your element.

## No-jump platform battles

In Simple Lanes the battlefield is a set of raised stone-and-earth platforms, one per lane. Pals walk straight along their own platform toward the rival side. They cannot jump, change lanes or fall off; lane choice happens when you send them from your kingdom.

- **3, 4 or 5 platforms** are rolled for each match.
- Your **spawn gate** is drawn at the near end of every platform, themed to your kingdom.
- The **rival's spawn gate** sits at the far end, themed to their kingdom.
- Each platform keeps its own gatehouse, health bars and combat lane.
- Floating blocks, landscape landmarks and kingdom motes complete the platform-game presentation.

The Shifting Maze uses the same platform art as raised corridor tiles separated by chunky walls. Tap anywhere inside the maze to send your selected pal; they pathfind automatically. Walls are never allowed to seal the only route or strand a pal mid-crossing, so every shift is checked for reachability from each pal and from the entrances; a shift that would trap someone is rolled back. The cells under and beside pals are protected from cuts, and the route the shift cuts is the one you were watching, which is why the gold trail visibly relocates instead of twitching.

## The win condition

In lanes and maze, each side has a gatehouse layer and a fort core:

- **Simple Lanes** — one gatehouse per platform. Each gatehouse has **120 health**.
- **Shifting Maze** — one gatehouse at the maze exit. It also has **120 health**.
- **The fort core** — the big building behind the gates, with **360 health**.
- **Tower Defence** — one bastion core with **360 health** and **no player gates**. Every siege pal that reaches the end of the route deals **10 + 3×wave** damage. Clear all **8 waves** to win; if the core reaches zero, the siege wins.
- **Tower Clash** — each side has a **2,400-health keep** that fires on anything at its gate. The keep only takes damage once you hold the **Master Tower**. Break towers to extend your spawn line and income: passive spark is **0.5/s**, each tower adds **0.16/s**.

A pal must **break the rival gatehouse on its route** before it can damage the core in lanes and maze. A breached gate stays open until a repair event or buddy power helps. In lanes and maze, the first side to bring the rival **core to zero wins**.

At **2:45**, the **Final Bounce** cracks every remaining gate on both sides, exposing both cores. This guarantees the match resolves and turns the last stretch into a race.

## How to play

1. **Pick a kingdom** — Fire, Water, Earth, Air, Light or Dark. Each has its own home realm, attack, health, speed, guard and buddy power.
2. **Pick a pal** — Pip is cheap, Chonk is tanky, Zap shoots from a distance.
3. **Watch the spawn horn** — the platform panel shows **READY TO SPAWN**, **READY IN 1.3s**, or **NEED X SPARK**. When it is ready, tap any platform.
4. **Crack a gate** — pals fight rival pals, then chew through the lane gatehouse. The lane HUD shows both your gate health and the rival gate health.
5. **Pop the core** — once a lane is open, push through it and hit the core. Watch the top bars and the health labels on the little gatehouses.
6. **Use spark and your buddy power** — spark fills over time; the buddy power is a big free elemental swing on a cooldown.
7. **Choose Spawn Events** — roughly every **30–38 seconds**, the battle pauses and offers two bonuses. Pick one or skip for spark. Wild Spawn waves are also spaced further apart.
8. **Hold the siege (Tower Defence)** — tap a build pad to build the selected tower, then tap it again to level it up (or use the big **LEVEL** button). Each tower takes one speciality; **SELL** refunds 75% so you can reposition. The panel previews the next wave; tap **START WAVE** early for extra spark. Use the buddy power for emergency damage, stun, knockback, healing or lifesteal.
9. **Take the web (Tower Clash)** — pick **NORTH** or **SOUTH**. Pals walk that rail, break its next tower, and it becomes yours. Both rails meet at the Master; take it to open the rival keep. Your rival is choosing a rail too.

## Elemental attack and defence

Elements form a readable cycle:

**Fire › Earth › Air › Water › Light › Dark › Fire**

- **Strong attack**: +30% damage.
- **Weak attack**: −22% damage.
- **Guard**: every element has its own incoming-damage multiplier. Earth is the sturdiest, Air the most fragile, Fire hits hard but takes more.
- **Buildings use the defender's element too**, so your elemental choice matters against gates and the core, not just unit fights.

The start screen shows each buddy's **strong target and guard value**. In battle, the centre chip and platform hint show your current matchup.

Every elemental pal's body matches its element: Fire is a flame, Water a droplet, Earth a mossy rock, Air a cloud, Light a star and Dark a crescent moon. Pip, Chonk and Zap change the silhouette's size and role rather than replacing it with the same generic blob.

| Buddy | Element | Strong against | Guard | Power |
| --- | --- | --- | --- | --- |
| Cinder | Fire | Earth | 1.05× damage taken | Meteor Plop |
| Splash | Water | Light | 0.94× | Bubble Bath |
| Sprout | Earth | Air | 0.82× | Vine Tangle |
| Breeze | Air | Water | 1.08× | Big Whoosh |
| Sunny | Light | Dark | 0.96× | Sun Beam |
| Murk | Dark | Fire | 0.99× | Shadow Sip |

## Buildings and lane feedback

- **Top HUD:** both fort cores with exact health, bars and home kingdom names.
- **Lane / maze HUD:** per-platform gate bars and numbers for **your gate** and the **rival gate**. In maze mode the panel shows one maze entrance button, the maze dimensions and both gate bars. Open gates are highlighted.
- **Tower HUD:** a 3×3 build-pad grid with tower level and next cost, held-wave count, live wave progress, a next-wave preview, a **START WAVE** button and bastion core health. Tap any pad or press **1–9**.
- **Clash HUD:** two route cards (**NORTH** and **SOUTH**) showing each rail's towers and next target, a keep-status chip and forward-spawn status. The board draws both rails, with the selected one brighter.
- **Canvas gatehouses:** each platform has a little gatehouse with its own health bar. Broken gates become open arches.
- **Core readout:** each main fort shows its remaining core percentage, heart and kingdom label.
- **Readiness meter:** the platform panel visibly fills as the spawn horn recharges, then says **READY**.
- **Stable feed:** gate breaks, core warnings, events and Final Bounce are logged without rebuilding or flickering the message list. Repeated spawn toasts were removed.

## Controls

| Input | Action |
| --- | --- |
| Choose a mode card | Pick Simple Lanes, Shifting Maze, Tower Defence or Tower Clash |
| Click a pal card / Q W E | Select Pip, Chonk or Zap |
| Click a platform / 1 2 3 4 5 | Spawn in the selected platform lane |
| Click the maze / S or Enter | Spawn at the maze entrance |
| Click a build pad / 1–9 | Build or upgrade the selected tower (Tower Defence) |
| Enter in Tower Defence | Start the next wave early for +2 spark |
| Click a tower on the web | Send pals along the Tower Clash web to that hub |
| Q W E in Tower Defence | Select Spark Spire, Stone Bastion or Storm Coil |
| Space | Buddy power |
| Escape | Pause |
| ☰ menu / Escape | Pause, how to play, restart, change kingdom, main menu, sound, lore |

## Spawn pacing

- The player has a **1.35-second spawn horn cooldown**; spark is still the main cost.
- The rival spawns on a slower 2.3–3.7 second cadence.
- Spawn Events start after about **26–31 seconds**, then every **30–38 seconds**.
- Wild Spawns start after about **30–38 seconds**, then every **36–44 seconds**.
- The feed no longer announces every ordinary spawn, and failed taps update the readiness panel instead of stacking error toasts.

## Architecture

```
index.html          Zany Arcade Company hub: game cards, external DownDownDown link and studio links
play.html           Elemental Little Wars game shell, kingdom HUD, overlays, platform panel, kingdom picker and mode picker
styles.css          bright toy-box visual system, kingdom labels, mode cards, gate bars, readiness meter and responsive HUD
src/lw-core.js      six kingdoms, element silhouettes, random lanes, rectangular shifting mazes, tower siege waves, tower clash routes, pathfinding, element cycle, gates, cores, combat, AI, events, Final Bounce
src/lw-render.js    platform battlefield, maze corridors and walls, tower siege route, clash towers, kingdom landscapes, spawn gates, gatehouses, forts, elemental pals and effects
src/lw-app.js       start screen, four-mode picker, spawning, tower building, clash captures, HUD, wave controls, event cards, pause and results
src/audio.js        procedural chiptune and effects
src/main.js         boot
tests/run.js        headless simulation tests
tests/browser-smoke.js  headless Chrome interaction test
server.js           tiny static server for the hub, game and site
scripts/build-site.js  copies the static public bundle into dist/
deploy/             static hosting manifest and assets worker
site/               lore, field guide and studio pages (static, shares site/site.css)
archive/            archived source of the previous globe-strategy build
```

Simulation and presentation are separate. The core is deterministic for a given seed and can be tested without a browser. The renderer reads kingdom palettes and landmarks from the core rather than hard-coding a single sky.

## Tests

```bash
npm test
npm run test:browser
```

The **42 tests** cover:

- all six buddies, three pal roles, six unique powers and the element cycle;
- all six kingdoms, their landscapes, palettes and spawn gates;
- deterministic random lane counts and explicit 3/4/5-lane matches;
- spawn readiness, recharge and energy gating;
- distant-enemy movement and lane combat;
- gatehouse health absorbing damage before the core;
- elemental attack and guard multipliers;
- gate repairs, meteor gate damage and protected cores;
- event timing and choices;
- AI spawning;
- Final Bounce opening all gates;
- a complete autonomous match reaching a core result;
- rectangular maze sizes from 8×8 to 25×25, including 8×15 and 15×10;
- tower route, twelve pads, 14 opening spark, cheap level-3 upgrades and the next-level stat preview;
- the kill economy: pops pay spark, brutes pay more, bosses pay most;
- siege archetypes: runner speed, brute armour, shielder auras and boss leaks;
- maze route breadcrumbs, substantial reroutes (cut the live route, reject shortcut openings), grand shifts, the pre-shift warning and the no-stranding guarantee;
- tower economy: kill-streak bounty, leak resets, wave and early-start bonuses, 75% sell refunds, upgrade investment and measured path coverage;
- tower modules: laser range/armour piercing, slow chill plus damage, wide splash and level-scaling Hearth Guard troops (including ally combat that never pays siege spark);
- the Tower Clash rails: two forward routes into the Master, instant tower capture, route-aware spawning, AI rail choice and an autonomous match;
- wave previews, early-start spark and siege spawning and tower fire;
- leak damage, all-wave victory and core-loss defeat;
- tower buddy powers;
- the arcade hub, Studio catalogue, local page links and the external DownDownDown and ZenZac buttons;
- clash setup, neutral towers, captures, forward spawns and tower fire;
- Master Tower keep protection, clash victory/defeat, clash powers and a full autonomous clash result.

The browser smoke test launches headless Chrome, checks the six kingdom cards and selected kingdom, starts a match, verifies the kingdom names in both fort cards and the centre chip, checks the gate bars and core health, spawns in a platform lane, confirms the recharge lockout and **READY IN** indicator, checks that the meteor cracks gates while the closed core stays protected, chooses a Spawn Event, wins by damaging an exposed core, then repeats the start flow until it exercises a **5-lane** match and checks the HUD fits. It also plays a Shifting Maze, then switches to **Tower Defence**, builds a tower, uses the **START WAVE** button, confirms the early spark bonus, siege pals spawn and the tower fires. Finally it plays **Tower Clash**, checks both **NORTH** and **SOUTH** route cards, sends down each rail, confirms the choices target different towers, breaks a tower and confirms it flips immediately, and checks that the north rail advances to the Master and then the rival keep.

## Status and intentional limits

Implemented and playable: six elemental kingdoms with matching platform landscapes and spawn gates, random 3–5 platform lanes, a rectangular **8×8–25×25** shifting maze, a 12×8 tower-defence siege with 12 build pads, a kill-funded spark economy and boss waves, wave previews, early starts and 8 waves, a seven-hub Tower Clash web with two forward rails, both-sides route choice, instant tower capture, route-aware forward spawns, staged gate/core wins, elemental attack and guard, spawn readiness, managed event cadence, six buddies, three pal roles, six powers, eight spawn events, rival AI, wild spawns, pause/help/rematch and bright procedural audio.

Known limits: this is a 2D canvas game with a side-on platform presentation rather than a full side-scrolling platformer. There is deliberately **no jump or lane-switch mechanic**; pals march automatically along their chosen platform. Tower Defence has one hand-authored 12×8 siege map rather than a campaign, and Tower Clash has one seven-hub web. It is single-player only, with no campaign meta-progression or cloud saves, and desktop-first with a responsive mobile HUD.
