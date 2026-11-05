// Data-driven relic catalog. effects are interpreted by Player/CombatSystem.
export const ITEMS = [
  // B grade — 18
  {id:'iron_heart',name:'철심장',grade:'B',icon:'🫀',desc:'최대 체력 +15%.',effect:{maxHp:0.15},stackable:true},
  {id:'sharpened_edge',name:'연마된 칼날',grade:'B',icon:'⚔️',desc:'공격력 +10%.',effect:{attack:0.10},stackable:true},
  {id:'swift_boots',name:'질풍의 장화',grade:'B',icon:'👢',desc:'이동 속도 +10%.',effect:{move:0.10},stackable:true},
  {id:'quick_trigger',name:'속사의 방아쇠',grade:'B',icon:'⌁',desc:'공격 속도 +10%.',effect:{fireRate:0.10},stackable:true},
  {id:'stone_skin',name:'바위 피부',grade:'B',icon:'🪨',desc:'방어력 +2.',effect:{defense:2},stackable:true},
  {id:'eagle_eye',name:'매의 눈',grade:'B',icon:'🦅',desc:'치명타 확률 +5%.',effect:{crit:0.05},stackable:true},
  {id:'vampire_draught',name:'흡혈 영약',grade:'B',icon:'🧪',desc:'획득 즉시 체력 30 회복.',effect:{heal:30},stackable:true},
  {id:'wind_core',name:'바람의 핵',grade:'B',icon:'💨',desc:'투사체 속도 +15%.',effect:{projectileSpeed:0.15},stackable:true},
  {id:'keen_shard',name:'예리한 파편',grade:'B',icon:'🔻',desc:'치명타 피해 +25%.',effect:{critDamage:0.25},stackable:true},
  {id:'hunter_mark',name:'사냥꾼의 표식',grade:'B',icon:'🎯',desc:'공격 투사체 크기 +15%.',effect:{projectileSize:0.15},stackable:true},
  {id:'leather_vest',name:'낡은 흉갑',grade:'B',icon:'🥋',desc:'방어력 +1, 최대 체력 +5%.',effect:{defense:1,maxHp:0.05},stackable:true},
  {id:'ember_salt',name:'잿불 소금',grade:'B',icon:'🔥',desc:'공격력 +5%, 화상 확률 +8%.',effect:{attack:0.05,burnChance:0.08},stackable:true},
  {id:'soul_bead',name:'영혼 구슬',grade:'B',icon:'🔮',desc:'경험치 획득량 +20%.',effect:{xp:0.20},stackable:true},
  {id:'lucky_coin',name:'뒤집힌 동전',grade:'B',icon:'🪙',desc:'치명타 확률 +3%, 이동 속도 +5%.',effect:{crit:0.03,move:0.05},stackable:true},
  {id:'hunter_bone',name:'사냥개의 뼈',grade:'B',icon:'🦴',desc:'공격력 +7%, 공격 속도 +5%.',effect:{attack:0.07,fireRate:0.05},stackable:true},
  {id:'red_thread',name:'붉은 실타래',grade:'B',icon:'🧵',desc:'회피 확률 +5%.',effect:{dodge:0.05},stackable:true},
  {id:'glass_orb',name:'유리 구슬',grade:'B',icon:'⚪',desc:'투사체 속도 +10%, 공격 투사체 크기 +10%.',effect:{projectileSpeed:0.10,projectileSize:0.10},stackable:true},
  {id:'second_wind',name:'두 번째 숨',grade:'B',icon:'🍃',desc:'방을 클리어할 때 체력 8 회복.',effect:{roomHeal:8},stackable:true},
  // A grade — 11
  {id:'split_bolt',name:'분열하는 탄환',grade:'A',icon:'✣',desc:'기본 공격이 추가 투사체 1발을 발사한다.',effect:{multishot:1},stackable:true},
  {id:'executioner',name:'처형자의 인장',grade:'A',icon:'🗡️',desc:'치명타 피해량 +50%.',effect:{critDamage:0.50},stackable:true},
  {id:'blood_feast',name:'피의 만찬',grade:'A',icon:'🩸',desc:'적 처치 시 체력을 2 회복한다.',effect:{onKillHeal:2},stackable:true},
  {id:'berserker',name:'광전사의 광기',grade:'A',icon:'😈',desc:'체력이 40% 미만이면 공격력 +35%.',effect:{lowHpAttack:0.35},stackable:false},
  {id:'afterimage',name:'잔상의 망토',grade:'A',icon:'👻',desc:'대시 후 2초 동안 공격력 +30%.',effect:{dashBuff:0.30},stackable:false},
  {id:'cinder_brand',name:'잿불 낙인',grade:'A',icon:'♨️',desc:'공격 시 25% 확률로 화상을 입힌다.',effect:{burnChance:0.25,burnDamage:4},stackable:true},
  {id:'detonation',name:'파열의 심장',grade:'A',icon:'💥',desc:'적 처치 시 주변에 폭발을 일으킨다.',effect:{explosion:42},stackable:false},
  {id:'twin_momentum',name:'쌍둥이 가속',grade:'A',icon:'⚡',desc:'공격 속도 +15%, 이동 속도 +12%.',effect:{fireRate:0.15,move:0.12},stackable:true},
  {id:'storm_lens',name:'폭풍의 렌즈',grade:'A',icon:'🌩️',desc:'공격 적중 시 18% 확률로 번개가 연쇄된다.',effect:{chainChance:0.18,chainDamage:0.55},stackable:true},
  {id:'guardian_sigil',name:'수호자의 문장',grade:'A',icon:'🛡️',desc:'최대 체력 +12%, 방어력 +3.',effect:{maxHp:0.12,defense:3},stackable:false},
  {id:'orbit_wisp',name:'유영하는 정령',grade:'A',icon:'🌀',desc:'전장을 자유롭게 떠도는 정령이 적을 찾아 영혼 투사체를 자동 발사한다.',effect:{spiritCompanion:true},stackable:false},
  // S grade — 7
  {id:'thunder_crown',name:'천둥의 왕관',grade:'S',icon:'👑',desc:'모든 공격에 번개가 연쇄되어 추가 피해를 준다.',effect:{chainChance:1,chainDamage:0.75},stackable:false},
  {id:'abyssal_core',name:'심연의 핵',grade:'S',icon:'🕳️',desc:'체력이 낮을수록 공격력이 크게 증가한다.',effect:{lowHpAttack:0.85},stackable:false},
  {id:'cataclysm',name:'종말의 종',grade:'S',icon:'☄️',desc:'일정 시간마다 주변 모든 적에게 폭발 피해.',effect:{pulse:true},stackable:false},
  {id:'phantom_oath',name:'망령의 서약',grade:'S',icon:'🧿',desc:'적 처치 시 20% 확률로 분신 탄환이 생성된다.',effect:{cloneChance:0.20},stackable:false},
  {id:'void_lance',name:'공허의 창',grade:'S',icon:'🔱',desc:'기본 공격이 강력한 관통 창으로 변화한다.',effect:{laser:true,pierce:5,attack:0.25},stackable:false},
  {id:'frozen_moment',name:'정지된 순간',grade:'S',icon:'⌛',desc:'치명타 발생 시 주변 적의 시간이 잠시 멈춘다.',effect:{timeStop:true,crit:0.08},stackable:false},
  {id:'blood_contract',name:'피의 계약',grade:'S',icon:'📜',desc:'최대 체력 20%를 바치고 공격력 +65%.',effect:{sacrifice:true,attack:0.65},stackable:false},
  {id:'sovereign_ember',name:'군주의 잔재',grade:'S',icon:'🔥',desc:'공격력 +12%, 최대 체력 +8%. 보스 보상에서 중복 획득 가능.',effect:{attack:0.12,maxHp:0.08},stackable:true,bossOnly:true}
];

export const STAT_REWARDS = [
  {id:'atk_up',name:'날 선 의지',icon:'⚔️',desc:'공격력 +12%.',grade:'B',kind:'stat',stat:{attack:0.12}},
  {id:'hp_up',name:'생명의 불씨',icon:'❤️',desc:'최대 체력 +15%, 현재 체력 15 회복.',grade:'B',kind:'stat',stat:{maxHp:0.15,heal:15}},
  {id:'speed_up',name:'발놀림',icon:'💨',desc:'이동 속도 +8%.',grade:'B',kind:'stat',stat:{move:0.08}},
  {id:'rate_up',name:'재빠른 손',icon:'⌁',desc:'공격 속도 +10%.',grade:'B',kind:'stat',stat:{fireRate:0.10}},
  {id:'def_up',name:'철벽의 맹세',icon:'🛡️',desc:'방어력 +2.',grade:'B',kind:'stat',stat:{defense:2}},
  {id:'crit_up',name:'급소 간파',icon:'🎯',desc:'치명타 확률 +4%.',grade:'B',kind:'stat',stat:{crit:0.04}}
];

export function getItem(id){ return ITEMS.find(x=>x.id===id); }
