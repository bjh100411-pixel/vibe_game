import assert from 'node:assert/strict';

// Minimal DOM/Canvas stubs so core flow can be smoke-tested with plain Node.js.
class MockElement {
  constructor(id = '') {
    this.id = id; this.innerHTML = ''; this.textContent = ''; this.style = {};
    this.className = ''; this.children = []; this.dataset = {}; this.listeners = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatch(type, event = {}) { for (const handler of this.listeners[type] || []) handler(event); }
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 124, height: 124 }; }
  appendChild(child) { this.children.push(child); }
  querySelector() { return new MockElement(); }
  querySelectorAll() { return []; }
  setAttribute() {}
}
const elements = new Map();
globalThis.document = {
  body: new MockElement('body'),
  hidden: false,
  getElementById(id) { if (!elements.has(id)) elements.set(id, new MockElement(id)); return elements.get(id); },
  createElement() { return new MockElement(); },
  addEventListener() {}
};
globalThis.window = { addEventListener() {}, matchMedia() { return { matches: false }; } };
globalThis.ResizeObserver = class { observe() {} };
globalThis.requestAnimationFrame = () => {};
const context = new Proxy({ createLinearGradient() { return { addColorStop() {} }; } }, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; }
});
const canvas = new MockElement('game');
canvas.width = 1280; canvas.height = 720;
canvas.getContext = () => context;
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });

const { Game } = await import('../src/core/Game.js');
const { Player } = await import('../src/entities/Player.js');
const { Input } = await import('../src/core/Input.js');
const { Enemy } = await import('../src/entities/Enemy.js');
const { ITEMS } = await import('../src/data/items.js');
const { ENEMIES } = await import('../src/data/enemies.js');
const { BOSSES } = await import('../src/data/bosses.js');
const { CONFIG } = await import('../src/config.js');
const { Boss } = await import('../src/entities/Boss.js');
const { RoomManager } = await import('../src/core/RoomManager.js');
const { RewardSystem } = await import('../src/systems/RewardSystem.js');

assert.equal(ITEMS.length, 37);
assert.equal(ITEMS.filter(item => item.grade === 'B').length, 18);
assert.equal(ITEMS.filter(item => item.grade === 'A').length, 11);
assert.equal(ITEMS.filter(item => item.grade === 'S').length, 8);
assert.equal(Object.keys(ENEMIES).length, 8);
assert.equal(Object.keys(BOSSES).length, 3);
assert.equal(ENEMIES.summoner.rate, 2.8, 'summoner cooldown is increased from 2.2s to 2.8s');
const summonQuotaManager = new RoomManager({});
const originalRandomForQuota = Math.random;
Math.random = () => 0;
const quotaRolls = Array.from({ length: 7 }, () => summonQuotaManager.chooseEnemyType(['summoner', 'grunter']));
Math.random = originalRandomForQuota;
assert.equal(quotaRolls.filter(type => type === 'summoner').length, 2, 'a stage can spawn at most two summoners');
assert.equal(quotaRolls[2], 'grunter', 'summoners are excluded once the stage quota is reached');
const stageResetPlayer = new Player(640, 360);
stageResetPlayer.attachCatalog(ITEMS);
const stageResetGame = {
  player: stageResetPlayer, enemies: [], boss: null, pendingReward: false,
  enemyProjectiles: [], playerProjectiles: [], hazards: [], state: 'playing',
  ui: { hideOverlay() {}, showHud() {} }, updateHud() {}, toast() {}, audio: { play() {} }
};
const stageResetManager = new RoomManager(stageResetGame);
stageResetGame.roomManager = stageResetManager;
stageResetManager.stageIndex = 0;
stageResetManager.summonersSpawned = 2;
stageResetManager.enter(5);
assert.equal(stageResetManager.summonersSpawned, 0, 'summoner quota resets when the next stage begins');

const bossRewardPlayer = new Player(0, 0);
bossRewardPlayer.attachCatalog(ITEMS);
const bossRewardSystem = new RewardSystem({ player: bossRewardPlayer });
const guaranteedBossChoices = bossRewardSystem.makeBossChoices();
assert.equal(guaranteedBossChoices.length, 3, 'boss reward offers three choices');
assert.ok(guaranteedBossChoices.every(item => item.grade === 'S' && item.kind !== 'stat'), 'boss reward choices are exclusively S-grade relics');
for (const item of ITEMS.filter(item => item.grade === 'S' && !item.stackable)) bossRewardPlayer.addItem(item);
const fallbackBossChoices = bossRewardSystem.makeBossChoices();
assert.ok(fallbackBossChoices.length >= 1 && fallbackBossChoices.every(item => item.grade === 'S'), 'boss still guarantees an S relic when all unique S relics are owned');
assert.ok(fallbackBossChoices.some(item => item.id === 'sovereign_ember'), 'repeatable boss-only S relic is available as the fallback');
assert.ok(!bossRewardSystem.makeChoices().some(item => item.id === 'sovereign_ember'), 'boss-only fallback does not appear in ordinary room rewards');

// Device detection and touch controls: coarse-pointer devices get the joystick/action buttons.
const desktopInput = new Input(canvas);
assert.equal(desktopInput.isMobile, false, 'desktop pointer keeps the original input mode');
window.matchMedia = query => ({ matches: query === '(pointer: coarse)' });
const mobileInput = new Input(canvas);
assert.equal(mobileInput.isMobile, true, 'coarse pointer is detected as mobile');
const stick = elements.get('virtual-joystick');
stick.dispatch('pointerdown', { pointerId: 17, clientX: 100, clientY: 62, preventDefault() {} });
const stickMove = mobileInput.getMoveVector();
assert.ok(stickMove.x > 0.95 && Math.abs(stickMove.y) < 0.001, 'virtual joystick produces a normalized rightward movement vector');
stick.dispatch('pointerup', { pointerId: 17 });
assert.deepEqual(mobileInput.getMoveVector(), { x: 0, y: 0 }, 'releasing the joystick stops movement');
elements.get('mobile-dash').dispatch('pointerdown', { preventDefault() {}, stopPropagation() {} });
assert.equal(mobileInput.consumeDash(), true, 'mobile dash button triggers the dash input');
elements.get('mobile-special').dispatch('pointerdown', { preventDefault() {}, stopPropagation() {} });
assert.equal(mobileInput.consumeSpecial(), true, 'mobile special button triggers the special input');

// Mobile targeting selects the closest living target; desktop still aims at the cursor.
const mobileAimPlayer = new Player(300, 300);
const mobileAimGame = { state: 'paused', arena: CONFIG.arena, enemies: [{x:500,y:300,dead:false},{x:340,y:380,dead:false}], boss: {x:315,y:310,dead:false} };
mobileAimPlayer.update(1/60, mobileInput, mobileAimGame);
assert.ok(Math.abs(mobileAimPlayer.facing - Math.atan2(10,15)) < 0.001, 'mobile auto-aim points at the nearest living target, including bosses');

// The diamond-shaped stalker teleports to a ring outside a 150px player safety radius.
const stalker = new Enemy('stalker', 920, 360, 1, false);
stalker.stateTimer = 0; stalker.lastAttack = 0;
const blinkGame = {
  player: { x: 520, y: 360, r: 15 },
  arena: CONFIG.arena,
  roomManager: { obstacles: [], spawnPosition(minDistance) { return { x: 520 + minDistance, y: 360 }; } },
  effects: { ring() {} },
  hitPlayer() {}
};
const originalRandom = Math.random;
Math.random = () => 0;
try { stalker.update(0, blinkGame); } finally { Math.random = originalRandom; }
const stalkerLandingDistance = Math.hypot(stalker.x - blinkGame.player.x, stalker.y - blinkGame.player.y);
assert.ok(stalkerLandingDistance >= 175, 'stalker teleport must land outside the player safety radius plus collision margin');
assert.ok(stalkerLandingDistance <= 231, 'stalker normally teleports to the nearby outer ring');
assert.deepEqual(CONFIG.rarity, { S: 0.05, A: 0.25, B: 0.70 });

// Every boss has a distinct signature attack set; later bosses have more HP and a stronger final boss multiplier.
assert.ok(BOSSES.bloodKnight.patterns.includes('fan'));
assert.ok(BOSSES.furnaceBeast.patterns.includes('ember_ring'));
assert.ok(BOSSES.abyssSovereign.patterns.includes('void_cross') && BOSSES.abyssSovereign.patterns.includes('void_pulse'));
const { getEnemyScale } = await import('../src/systems/Difficulty.js');
const scalePlayer = new Player(0, 0); scalePlayer.attachCatalog(ITEMS);
assert.ok(getEnemyScale(scalePlayer, 16, 'boss').hp > getEnemyScale(scalePlayer, 8, 'boss').hp, 'later bosses gain more health');
assert.ok(getEnemyScale(scalePlayer, 20, 'boss').hp > getEnemyScale(scalePlayer, 16, 'boss').hp * 1.2, 'final boss receives an extra health increase');

assert.equal(new Player(0, 0).attack, 13.5, 'base attack damage is slightly reduced');
assert.equal(new Player(0, 0).fireRate, 2.05, 'base attack speed is increased for more frequent shots');

// Former attack-range relics now increase projectile size, not travel distance.
const sizeItemTest = new Player(0, 0);
sizeItemTest.attachCatalog(ITEMS);
const hunterMark = ITEMS.find(item => item.id === 'hunter_mark');
const glassOrb = ITEMS.find(item => item.id === 'glass_orb');
assert.equal(hunterMark.effect.projectileSize, 0.15);
assert.equal(hunterMark.desc, '공격 투사체 크기 +15%.');
assert.equal(glassOrb.effect.projectileSize, 0.10);
assert.equal(glassOrb.effect.range, undefined);
sizeItemTest.addItem(hunterMark);
assert.equal(sizeItemTest.projectileSize, 1.15, 'hunter mark increases projectile size by 15%');
sizeItemTest.addItem(glassOrb);
assert.equal(sizeItemTest.projectileSize, 1.25, 'glass orb adds another 10% projectile size');
assert.equal(sizeItemTest.projectileSpeed, 550, 'glass orb retains its projectile speed bonus');
assert.equal(sizeItemTest.range, undefined, 'legacy projectile range stat is removed');
assert.ok(ENEMIES.runner.speed <= 105, 'fast enemies are slowed for easier aiming');

// Boss attack warnings and their executed hit geometry must stay in sync.
const bossGame = {
  player: { x: 650, y: 330, r: 14 },
  arena: { left: 80, right: 1200, top: 70, bottom: 650 },
  time: 0,
  enemyProjectiles: [],
  hazards: [],
  audio: { play() {} },
  effects: { ring() {} },
  toast() {},
  hitPlayer() {},
  makeEnemyProjectile(x, y, nx, ny, damage, speed, r, color) {
    return { x, y, nx, ny, damage, speed, r, color };
  },
  spawnAdds() {}
};
const chargeBoss = new Boss(BOSSES.bloodKnight);
chargeBoss.x = 300; chargeBoss.y = 330; chargeBoss.lastPattern = 100;
chargeBoss.preparePattern(bossGame, bossGame.player);
const lockedChargeWarning = chargeBoss.warning;
const initialPreview = { x: lockedChargeWarning.x2, y: lockedChargeWarning.y2 };
assert.equal(lockedChargeWarning.time, 0.72, 'boss warning duration is shortened');
assert.ok(Math.abs(initialPreview.x - 820) < 0.001, 'initial charge preview tracks the player direction');
bossGame.player.x = 650; bossGame.player.y = 520;
chargeBoss.update(0.35, bossGame);
assert.ok(chargeBoss.warning.y2 > initialPreview.y, 'charge preview follows the player while the warning is visible');
bossGame.player.x = 570; bossGame.player.y = 570;
chargeBoss.update(0.38, bossGame);
const finalChargePreview = { x: chargeBoss.charge.x, y: chargeBoss.charge.y };
assert.equal(chargeBoss.x, 300, 'boss holds its origin while warning');
assert.ok(chargeBoss.charge, 'charge starts after the warning expires');
for (let i = 0; i < 90 && chargeBoss.charge; i++) chargeBoss.update(1 / 60, bossGame);
assert.ok(Math.abs(chargeBoss.x - finalChargePreview.x) < 0.01, 'boss follows the last previewed charge endpoint');
assert.ok(Math.abs(chargeBoss.y - finalChargePreview.y) < 0.01, 'boss locks the final preview direction after the warning disappears');

const fanBoss = new Boss(BOSSES.bloodKnight);
fanBoss.x = 300; fanBoss.y = 330; fanBoss.patternIndex = 1;
fanBoss.preparePattern(bossGame, { x: 600, y: 330 });
assert.equal(fanBoss.warning.projectileAngles.length, 6, 'fan warning displays every projectile ray');
assert.ok(Math.abs(fanBoss.warning.spread - 0.5) < 0.001, 'fan preview spread matches the outer projectile angles');
fanBoss.executePattern(bossGame, bossGame.player, fanBoss.warning);
assert.equal(bossGame.enemyProjectiles.length, 6, 'fan attack fires exactly the rays shown in its warning');

// The final boss's cross telegraph and attack both cover all four directions.
const crossBoss = new Boss(BOSSES.abyssSovereign);
crossBoss.x = 600; crossBoss.y = 300;
crossBoss.preparePattern(bossGame, { x: 760, y: 300 });
assert.equal(crossBoss.warning.crossDirections.length, 4, 'void cross announces four outward arms');
assert.equal(crossBoss.warning.crossProjectileAngles.length, 12, 'void cross previews all 12 projectile paths');
bossGame.enemyProjectiles = [];
crossBoss.executePattern(bossGame, bossGame.player, crossBoss.warning);
assert.equal(bossGame.enemyProjectiles.length, 12, 'void cross fires all 12 previewed projectiles');
for (const direction of crossBoss.warning.crossDirections) {
  const inArm = bossGame.enemyProjectiles.filter(projectile => {
    const angle = Math.atan2(projectile.ny, projectile.nx);
    const delta = Math.atan2(Math.sin(angle - direction), Math.cos(angle - direction));
    return Math.abs(delta) <= 0.056;
  });
  assert.equal(inArm.length, 3, 'each of the four cross arms fires three projectiles');
}

// The furnace beast gains two new telegraphed attacks, including three delayed volleys.
assert.ok(BOSSES.furnaceBeast.patterns.includes('fire_pillars'));
assert.ok(BOSSES.furnaceBeast.patterns.includes('ember_barrage'));
const furnaceBoss = new Boss(BOSSES.furnaceBeast);
furnaceBoss.x = 520; furnaceBoss.y = 260; furnaceBoss.patternIndex = 4;
furnaceBoss.preparePattern(bossGame, { x: 720, y: 360 });
assert.equal(furnaceBoss.warning.type, 'fire_pillars');
const pillarZones = furnaceBoss.warning.zones.map(z => ({ x: z.x, y: z.y, r: z.r }));
bossGame.hazards = [];
furnaceBoss.executePattern(bossGame, bossGame.player, furnaceBoss.warning);
assert.equal(bossGame.hazards.length, pillarZones.length, 'each previewed fire pillar becomes a hazard');
assert.deepEqual(bossGame.hazards.map(z => ({ x: z.x, y: z.y, r: z.r })), pillarZones, 'fire pillar hit zones match their preview');
const barrageBoss = new Boss(BOSSES.furnaceBeast);
barrageBoss.x = 520; barrageBoss.y = 260; barrageBoss.patternIndex = 5;
barrageBoss.preparePattern(bossGame, { x: 720, y: 360 });
assert.equal(barrageBoss.warning.type, 'ember_barrage');
assert.equal(barrageBoss.warning.barrageVolleys.length, 3);
assert.ok(barrageBoss.warning.barrageVolleys.every(volley => volley.length === 5));
bossGame.enemyProjectiles = [];
barrageBoss.executePattern(bossGame, bossGame.player, barrageBoss.warning);
barrageBoss.update(0.75, bossGame);
assert.equal(bossGame.enemyProjectiles.length, 15, 'all three telegraphed ember salvos fire');


// Spirit relic creates a roaming companion that fires its own projectiles instead of contact damage.
const spiritPlayer = new Player(640, 360); spiritPlayer.attachCatalog(ITEMS); spiritPlayer.addItem(ITEMS.find(item => item.id === 'orbit_wisp'));
const spiritGame = { player: spiritPlayer, arena: CONFIG.arena, enemies: [{ x: 780, y: 360, r: 14, dead: false }], boss: null, playerProjectiles: [], makeProjectile: (...args) => ({ args }), effects: { burst() {} } };
const gameForSpirit = new Game(canvas);
gameForSpirit.player = spiritPlayer; gameForSpirit.arena = CONFIG.arena; gameForSpirit.enemies = spiritGame.enemies; gameForSpirit.boss = null; gameForSpirit.playerProjectiles = []; gameForSpirit.makeProjectile = spiritGame.makeProjectile; gameForSpirit.effects = spiritGame.effects;
gameForSpirit.updateSpirit(1.0);
assert.ok(gameForSpirit.playerProjectiles.length > 0, 'wandering spirit automatically fires a projectile at nearby enemies');

const growthTest = new Player(0, 0);
growthTest.attachCatalog(ITEMS);
growthTest.addStat({ maxHp: 0.15, heal: 15 });
assert.equal(growthTest.maxHp, 115);
assert.equal(growthTest.hp, 115, 'max-HP reward also applies its heal');
growthTest.addItem(ITEMS.find(item => item.id === 'blood_contract'));
assert.ok(growthTest.maxHp < 115, 'blood contract sacrifices max HP');

window.matchMedia = () => ({ matches: false });
const game = new Game(canvas);
game.draw();
game.start();
assert.equal(game.state, 'playing');
assert.equal(game.roomManager.room, 1);
assert.ok(game.enemies.length >= 3);
assert.equal(game.player.roomSafeTimer, undefined, 'there is no stage-entry shield timer');
assert.ok(game.enemies.every(enemy => Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) >= 270), 'room-entry enemies spawn outside the player exclusion radius');
const safeSpawn = game.roomManager.spawnPosition(270);
assert.ok(Math.hypot(safeSpawn.x - game.player.x, safeSpawn.y - game.player.y) >= 270, 'spawn selector respects the no-spawn radius');

// 15-kill boost: attack, movement and max HP each gain 10%, with a visible aura timer.
const beforeBoost = { attack: game.player.attack, move: game.player.move, maxHp: game.player.maxHp };
game.totalKills = 15; game.checkKillBoost();
assert.ok(Math.abs(game.player.attack / beforeBoost.attack - 1.1) < 0.001);
assert.ok(Math.abs(game.player.move / beforeBoost.move - 1.1) < 0.001);
assert.ok(Math.abs(game.player.maxHp / beforeBoost.maxHp - 1.1) < 0.001);
assert.ok(game.player.boostStacks === 1 && game.player.boostFlash > 0);

// Five-room milestone grants a guaranteed +25 HP, capped at max HP.
game.roomManager.room = 5; game.player.hp = 50; game.applyRoomMilestoneHeal();
assert.equal(game.player.hp, 75);

// Both friendly and hostile projectiles use the same wall blocker.
game.roomManager.obstacles = [{ x: 500, y: 300, r: 24 }];
assert.equal(game.projectileBlockedByWall({ x: 500, y: 300, r: 4 }, 450, 300), true);
assert.equal(game.projectileBlockedByWall({ x: 450, y: 260, r: 4 }, 440, 260), false);
game.roomManager.obstacles = [];
game.roomManager.enter(1);
game.input.mouseDown = false;
game.input.mouse = { x: game.player.x - 100, y: game.player.y };
game.update(1 / 60);
game.draw();
assert.ok(game.player.lastShot >= 0, 'basic attack fires automatically without clicking');
assert.ok(game.player.facing > 3 || game.player.facing < -3, 'aim follows the cursor direction rather than the nearest enemy');
assert.ok(game.playerProjectiles[0]?.vx < 0, 'projectile travels toward the manually aimed cursor direction');
assert.ok(Math.abs(game.playerProjectiles[0]?.damage - game.player.getAttackPower()) < 0.001, 'basic projectile uses the reduced attack stat with any active boosts');

for (const enemy of [...game.enemies]) game.damageEnemy(enemy, 999999);
game.update(0.016);
assert.equal(game.state, 'reward', 'cleared room opens reward selection');
assert.equal(game.rewards.last.length, 3);
game.pause();
assert.equal(game.state, 'paused');
const pauseMarkup = document.getElementById('overlay').innerHTML;
assert.ok(pauseMarkup.includes('id="tab-items"') && pauseMarkup.includes('획득 아이템'), 'ESC pause screen has an acquired-items tab');
assert.ok(pauseMarkup.includes('id="tab-codex"') && pauseMarkup.includes('적 도감'), 'ESC pause screen has an enemy-codex tab');
const frozenTime = game.elapsed;
game.update(1);
assert.equal(game.elapsed, frozenTime, 'timer pauses with game');
game.resume();
assert.equal(game.state, 'reward', 'reward screen returns after pause');
game.rewards.choose(game.rewards.last[0]);
assert.equal(game.state, 'playing');
assert.equal(game.roomManager.room, 2);
assert.equal(game.pendingReward, false);

// Drive every room through the actual room manager and reward system.
for (let room = 2; room <= 20; room++) {
  assert.equal(game.roomManager.room, room);
  assert.ok(game.roomManager.summonersSpawned <= 2, `stage ${Math.floor((room - 1) / 4) + 1} never exceeds two summoners`);
  if (game.boss) game.damageBoss(99999999);
  else for (const enemy of [...game.enemies]) game.damageEnemy(enemy, 999999);
  game.update(0.016);
  if (room === 20) {
    assert.equal(game.state, 'reward', 'final boss now opens its guaranteed S-grade reward before victory');
    assert.ok(game.rewards.last.length >= 1 && game.rewards.last.every(item => item.grade === 'S'), 'final boss offers only S-grade relics');
    assert.ok(document.getElementById('overlay').innerHTML.includes('S급 유물 선택'), 'final boss also shows the guaranteed S-grade reward UI');
    game.rewards.choose(game.rewards.last[0]);
    assert.equal(game.state, 'victory', 'choosing the final boss S relic triggers victory');
    assert.ok(document.getElementById('overlay').innerHTML.includes('VICTORY'), 'final boss reward selection preserves the victory screen');
  } else {
    assert.equal(game.state, 'reward', `room ${room} must offer a reward`);
    if (room === 8 || room === 16) {
      assert.ok(game.rewards.last.length >= 1 && game.rewards.last.every(item => item.grade === 'S' && item.kind !== 'stat'), `boss ${room} guarantees S-grade relic choices`);
      assert.ok(document.getElementById('overlay').innerHTML.includes('S급 유물 선택'), `boss ${room} reward screen is labeled as S-grade selection`);
    }
    game.rewards.choose(game.rewards.last[0]);
    assert.equal(game.roomManager.room, room + 1, 'reward selection opens the next room');
  }
}

game.start();
game.player.hp = 0;
game.update(0.016);
assert.equal(game.state, 'gameover', 'zero HP triggers game over');

console.log('ASHEN VEIL smoke tests passed: data catalog, stats, attack, full 20-room progression, reward flow, pause timer, 3 bosses, victory, game over.');
