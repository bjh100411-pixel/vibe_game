import { ITEMS, STAT_REWARDS } from '../data/items.js';
import { CONFIG } from '../config.js';
export class RewardSystem {
  constructor(game){this.game=game;this.last=[];}
  pickGrade(){const r=Math.random();return r<CONFIG.rarity.S?'S':r<CONFIG.rarity.S+CONFIG.rarity.A?'A':'B';}
  makeChoices(){
    const p=this.game.player;const out=[];const used=new Set();
    for(let i=0;i<3;i++){
      let option=null;
      for(let tries=0;tries<24&&!option;tries++){
        // Stat options are a reliable common choice; item rarity percentages remain exact for item rolls.
        if(Math.random()<.32){const pool=STAT_REWARDS.filter(x=>!used.has(x.id));if(pool.length)option=pool[Math.floor(Math.random()*pool.length)];}
        if(!option){const grade=this.pickGrade();let pool=ITEMS.filter(x=>x.grade===grade&&!used.has(x.id));pool=pool.filter(x=>!p.has(x.id)||x.stackable);if(pool.length)option=pool[Math.floor(Math.random()*pool.length)];}
      }
      if(!option){const pool=STAT_REWARDS.filter(x=>!used.has(x.id));option=pool[0]||STAT_REWARDS[i%STAT_REWARDS.length];}
      used.add(option.id);out.push(option);
    }
    this.last=out;return out;
  }
  choose(option){
    const p=this.game.player;
    if(option.kind==='stat'){
      p.addStat(option.stat);this.game.toast(`${option.name} 획득 · ${option.desc}`,'#d9b56d');
    }else{
      const item=ITEMS.find(x=>x.id===option.id);if(!item)return;
      const ok=p.addItem(item);if(!ok){this.game.toast('이미 보유한 유물입니다. 다른 보상을 선택하세요.','#e6a58c');return false;}
      this.game.toast(`${item.icon} ${item.name} 획득!` ,item.grade==='S'?'#c7a1f2':item.grade==='A'?'#9ac4eb':'#e2c18d');
      this.game.effects.burst(p.x,p.y,item.grade==='S'?'#b98be7':item.grade==='A'?'#8ab9e6':'#d9b56d',26,190);
    }
    this.game.audio.play('item');
    this.game.roomManager.next();return true;
  }
}
