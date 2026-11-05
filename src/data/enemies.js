export const ENEMIES = {
  grunter: {name:'묘지의 망자',icon:'☠',hp:32,damage:9,speed:56,range:30,rate:1.25,xp:12,r:15,color:'#87918b',pattern:'melee'},
  archer: {name:'핏빛 추적자',icon:'♟',hp:25,damage:8,speed:37,range:245,rate:1.8,xp:14,r:14,color:'#b66c72',pattern:'ranged'},
  runner: {name:'굶주린 사냥개',icon:'◆',hp:21,damage:7,speed:103,range:27,rate:1.1,xp:11,r:12,color:'#c18b5e',pattern:'dash'},
  tank: {name:'무덤의 수호자',icon:'▰',hp:92,damage:16,speed:28,range:39,rate:1.8,xp:22,r:21,color:'#77859a',pattern:'tank'},
  bomber: {name:'불씨 기생체',icon:'✹',hp:24,damage:22,speed:69,range:25,rate:2.5,xp:16,r:13,color:'#d28a55',pattern:'explode'},
  summoner: {name:'저주술사',icon:'♜',hp:52,damage:7,speed:27,range:220,rate:2.2,xp:24,r:17,color:'#9a7ac2',pattern:'summon'},
  mage: {name:'심연의 사제',icon:'✦',hp:43,damage:12,speed:33,range:200,rate:2.5,xp:20,r:16,color:'#7d84c7',pattern:'aoe'},
  stalker: {name:'그림자 잠복자',icon:'◈',hp:38,damage:14,speed:80,range:34,rate:1.55,xp:19,r:15,color:'#7a7398',pattern:'blink'}
};
export const ENEMY_POOLS = [
  ['grunter','runner','archer'],
  ['grunter','runner','archer','bomber'],
  ['grunter','archer','runner','tank','bomber','summoner'],
  ['archer','tank','bomber','summoner','mage','stalker'],
  ['tank','bomber','summoner','mage','stalker','archer']
];
