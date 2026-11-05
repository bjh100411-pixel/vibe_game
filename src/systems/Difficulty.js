import { ENEMY_SCALING } from '../config.js';
export function evaluatePower(player){
  const attack=player.attack/10, rate=player.fireRate, hp=player.maxHp/100, defense=player.defense/3, move=player.move/220;
  const relicCount=[...player.items.values()].reduce((a,b)=>a+b,0);
  const rare=[...player.items].reduce((s,[id,n])=>{const it=player.catalog(id);return s+(it?.grade==='S'?0.18:it?.grade==='A'?0.09:0.035)*n;},0);
  return Math.max(.7,attack*.34+rate*.18+hp*.13+defense*.08+move*.07+1.0*.20+rare+Math.min(.12,relicCount*.012));
}
export function getEnemyScale(player,room,type='normal'){
  const power=evaluatePower(player),cfg=ENEMY_SCALING;
  const stage=Math.floor((room-1)/4);
  const roomFactor=1+(room-1)*(cfg.roomHp*1.18)+stage*.12;
  const growth=1+(power-1)*cfg.powerInfluence;
  const hpFactor=Math.max(cfg.minFactor,Math.min(cfg.maxFactor,roomFactor*growth));
  const defenseBias=Math.max(0,(player.defense/5)-1)*cfg.defenseInfluence;
  const attackBias=Math.max(0,(player.attack/10)-1)*cfg.attackInfluence;
  const damageFactor=Math.max(.86,Math.min(1.85,(1+(room-1)*cfg.roomDamage+stage*.055)*(1+(power-1)*.12+defenseBias+attackBias*.3)));
  if(type==='boss'){const bossStep=1+Math.max(0,Math.floor((room-1)/8))*.12;const finalBoss=room>=20?1.875:1;return {hp:hpFactor*1.48*bossStep*finalBoss,damage:damageFactor*1.08,speed:1};}
  return {hp:hpFactor,damage:damageFactor,speed:Math.min(1.22,1+(room-1)*cfg.roomSpeed+Math.max(0,power-1)*.04)};
}
