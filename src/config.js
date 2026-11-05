export const CONFIG = {
  width: 1280, height: 720,
  arena: { left: 188, top: 91, right: 1092, bottom: 634 },
  roomsPerStage: 4, stageCount: 5, totalRooms: 20,
  rarity: { S: 0.05, A: 0.25, B: 0.70 },
  colors: { B: '#b58a55', A: '#80a6d4', S: '#b18adb' },
  debug: false
};

export const STAGES = [
  { id: 1, name: '잿빛 지하묘지', subtitle: 'ASHEN CATACOMBS', palette: ['#171923','#252431','#62503d'], ambient: '#a47c54' },
  { id: 2, name: '핏빛 예배당', subtitle: 'CHAPEL OF VEINS', palette: ['#21151d','#36202a','#85434a'], ambient: '#c15a62' },
  { id: 3, name: '망각의 수림', subtitle: 'FORGOTTEN GROVE', palette: ['#111c1a','#1b3029','#54775b'], ambient: '#8db584' },
  { id: 4, name: '검은 용광로', subtitle: 'THE BLACK FURNACE', palette: ['#211914','#38261e','#a45c37'], ambient: '#ed9253' },
  { id: 5, name: '심연의 왕좌', subtitle: 'THRONE OF THE ABYSS', palette: ['#141321','#252039','#71619b'], ambient: '#b99de8' }
];

export const ENEMY_SCALING = {
  roomHp: 0.045, roomDamage: 0.026, roomSpeed: 0.008,
  powerInfluence: 0.22, minFactor: 0.82, maxFactor: 2.35,
  attackInfluence: 0.16, defenseInfluence: 0.13
};
