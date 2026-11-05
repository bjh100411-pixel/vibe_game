import { CONFIG, STAGES } from '../config.js';
import { ENEMIES, ENEMY_POOLS } from '../data/enemies.js';
import { BOSS_ROOMS, roomType, stageForRoom } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { getEnemyScale } from '../systems/Difficulty.js';

export class RoomManager {
  constructor(game){this.game=game;this.room=1;this.stage=STAGES[0];this.type='normal';this.obstacles=[];this.cleared=false;this.stageIndex=-1;this.summonersSpawned=0;}
  enter(room){
    const g=this.game;this.room=room;this.stage=stageForRoom(room);this.type=roomType(room);this.cleared=false;g.pendingReward=false;
    const nextStageIndex=Math.floor((room-1)/4);
    if(nextStageIndex!==this.stageIndex){this.stageIndex=nextStageIndex;this.summonersSpawned=0;}
    g.enemies=[];g.boss=null;g.enemyProjectiles=[];g.playerProjectiles=[];g.hazards=[];
    this.generateLayout();
    if(this.type==='boss'){
      const data=BOSSES[BOSS_ROOMS[room]],scale=getEnemyScale(g.player,room,'boss');
      g.boss=new Boss(data,scale.hp);g.boss.damage*=scale.damage;g.boss.x=640;g.boss.y=330;
      // Keep the boss spawn outside the player's entry exclusion radius; never teleport the player.
      if(Math.hypot(g.player.x-g.boss.x,g.player.y-g.boss.y)<300){const pos=this.spawnPosition(320);g.boss.x=pos.x;g.boss.y=pos.y;}
      g.toast(data.name+' 등장!', '#ef9a9d');g.audio.play('boss');
    }else{
      const count=Math.min(13,3+Math.floor(room*.48)+(this.type==='elite'?2:0));
      const pool=ENEMY_POOLS[this.stage.id-1];const scale=getEnemyScale(g.player,room,'normal');
      for(let i=0;i<count;i++){
        const type=this.chooseEnemyType(pool);const pos=this.spawnPosition();
        const enemy=new Enemy(type,pos.x,pos.y,scale.hp,false);enemy.damage*=scale.damage;enemy.speed*=scale.speed;
        if(this.type==='elite'&&i===0){enemy.elite=true;enemy.hp*=2.2;enemy.maxHp=enemy.hp;enemy.damage*=1.25;enemy.r*=1.2;}
        g.enemies.push(enemy);
      }
      if(room>=6&&room%3===0&&g.enemies.length<14){const pos=this.spawnPosition();const type=this.chooseEnemyType(pool);const elite=new Enemy(type,pos.x,pos.y,scale.hp*1.25,true);elite.damage*=scale.damage;g.enemies.push(elite);}
    }
    g.state='playing';g.ui.hideOverlay();g.ui.showHud(true);g.updateHud();g.toast(`${this.stage.name} · ROOM ${String(room).padStart(2,'0')}`,this.stage.ambient);
  }
  chooseEnemyType(pool){
    const candidates=this.summonersSpawned>=2?pool.filter(type=>type!=='summoner'):pool;
    const safePool=candidates.length?candidates:pool.filter(type=>type!=='summoner');
    const type=safePool[Math.floor(Math.random()*safePool.length)]||'grunter';
    if(type==='summoner')this.summonersSpawned++;
    return type;
  }
  spawnPosition(minDistance=270){
    const a=CONFIG.arena,player=this.game.player;
    const sample=()=>{
      const side=Math.floor(Math.random()*4);let x,y;
      if(side===0){x=a.left+40+Math.random()*(a.right-a.left-80);y=a.top+45;}
      else if(side===1){x=a.right-45;y=a.top+40+Math.random()*(a.bottom-a.top-80);}
      else if(side===2){x=a.left+40+Math.random()*(a.right-a.left-80);y=a.bottom-45;}
      else{x=a.left+45;y=a.top+40+Math.random()*(a.bottom-a.top-80);}
      return {x,y};
    };
    if(!player)return sample();
    let best=null,bestDistance=-1;
    // Sample the room perimeter until the player's no-spawn radius is respected.
    for(let i=0;i<64;i++){
      const pos=sample(),distance=Math.hypot(pos.x-player.x,pos.y-player.y);
      if(distance>bestDistance){best=pos;bestDistance=distance;}
      if(distance>=minDistance)return pos;
    }
    // A fallback chooses the farthest sampled edge point rather than spawning beside the player.
    return best||sample();
  }
  generateLayout(){
    this.obstacles=[];if(this.type==='boss')return;
    const n=2+Math.floor(Math.random()*3);for(let i=0;i<n;i++){
      const x=CONFIG.arena.left+130+Math.random()*(CONFIG.arena.right-CONFIG.arena.left-260);
      const y=CONFIG.arena.top+95+Math.random()*(CONFIG.arena.bottom-CONFIG.arena.top-190);
      if(Math.hypot(x-640,y-360)>110)this.obstacles.push({x,y,r:16+Math.random()*16,type:Math.random()>.5?'pillar':'grave'});
    }
  }
  next(){if(this.room>=CONFIG.totalRooms)return false;this.enter(this.room+1);return true;}
}
