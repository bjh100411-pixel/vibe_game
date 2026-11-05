import { CONFIG, STAGES } from '../config.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Input } from './Input.js';
import { Effects } from './Effects.js';
import { AudioManager } from './Audio.js';
import { RoomManager } from './RoomManager.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { getEnemyScale } from '../systems/Difficulty.js';
import { ITEMS } from '../data/items.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { RewardScreen } from '../ui/RewardScreen.js';
import { ResultScreen } from '../ui/ResultScreen.js';

export class Game {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.arena=CONFIG.arena;this.input=new Input(canvas);this.effects=new Effects();this.audio=new AudioManager();
    this.ui=new HUD();this.menu=new Menu(this);this.rewardScreen=new RewardScreen(this);this.resultScreen=new ResultScreen(this);this.rewards=new RewardSystem(this);this.roomManager=new RoomManager(this);
    this.player=null;this.enemies=[];this.boss=null;this.playerProjectiles=[];this.enemyProjectiles=[];this.hazards=[];
    this.state='menu';this.elapsed=0;this.time=0;this.totalKills=0;this.shake=0;this.healedMilestones=new Set();this.lastBoostKill=0;this.hudTick=0;this.pendingReward=false;this.last=0;this.lastSpawn=0;
    this.stageSeed=0;this.difficultyLabel='';this.toastTimer=null;this.healedMilestones=new Set();this.lastBoostKill=0;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(document.getElementById('game-shell'));this.resize();
    document.getElementById('pause-btn').addEventListener('click',()=>this.pause());
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
    this.menu.menu();requestAnimationFrame(t=>this.frame(t));
  }
  resize(){/* Canvas keeps a fixed logical resolution; CSS handles the viewport fit. */}
  start(){
    this.audio.init();this.input.clear();this.elapsed=0;this.time=0;this.totalKills=0;this.shake=0;this.healedMilestones=new Set();this.lastBoostKill=0;this.pendingReward=false;this.enemies=[];this.boss=null;this.playerProjectiles=[];this.enemyProjectiles=[];this.hazards=[];this.effects=new Effects();
    this.player=new Player(640,360);this.player.attachCatalog(ITEMS);this.audio.startMusic();this.roomManager=new RoomManager(this);this.roomManager.enter(1);this.menu.hide();this.ui.show(true);this.ui.update(this);
  }
  toMenu(){this.state='menu';this.audio.stopMusic();this.input.clear();this.ui.show(false);this.menu.menu();}
  pause(){if(this.state==='playing'||this.state==='reward'){this.pausedFrom=this.state;this.state='paused';this.menu.pause();}}
  resume(){if(this.state==='paused'){this.state=this.pausedFrom||'playing';if(this.state==='reward')this.rewardScreen.show(this.rewards.last,this.roomManager.room);else this.menu.hide();}}
  toast(message,color){const el=document.getElementById('toast');el.textContent=message;el.style.color=color||'#e8d2a9';el.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('show'),1700);}
  formatTime(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  updateHud(){if(this.player)this.ui.update(this);}
  makeProjectile(x,y,vx,vy,damage,opts={}){return new Projectile(x,y,vx,vy,damage,{...opts,owner:'player',color:opts.laser?'#bce9f5':opts.crit?'#ffe19a':'#e4cf9b'});}
  makeEnemyProjectile(x,y,nx,ny,damage,speed=250,r=5,color='#db8490'){return new Projectile(x,y,nx*speed,ny*speed,damage,{owner:'enemy',r,life:3,color,kind:'enemy'});}
  spawnAdds(x,y,count=1,forcedType=null){
    const room=this.roomManager.room;const stage=Math.floor((room-1)/4);const pool=['grunter','runner','stalker'];const scale=getEnemyScale(this.player,room,'normal');
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;const type=forcedType||pool[Math.floor(Math.random()*pool.length)];const e=new Enemy(type,x+Math.cos(a)*56,y+Math.sin(a)*56,scale.hp*.78,false);e.damage*=scale.damage;this.enemies.push(e);}
  }
  areaDamage(x,y,radius,damage,color='#8ed8da',knockback=false){
    for(const e of this.enemies){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<radius+e.r){this.damageEnemy(e,damage*(1-.35*d/radius),color,true);if(knockback){const l=d||1;e.x+=(e.x-x)/l*35;e.y+=(e.y-y)/l*35;}}}
    if(this.boss&&!this.boss.dead&&Math.hypot(this.boss.x-x,this.boss.y-y)<radius+this.boss.r)this.damageBoss(damage*.8,color);
  }
  damageEnemy(enemy,damage,color='#f4e1c1',crit=false){
    if(enemy.dead)return;const amount=Math.max(1,Math.round(damage));enemy.hp-=amount;enemy.hitFlash=.09;this.player.damageDealt+=amount;this.effects.text(enemy.x,enemy.y-enemy.r-7,`${crit?'✦ ':''}${amount}`,crit?'#ffe59b':color,crit?15:12);this.effects.burst(enemy.x,enemy.y,color,crit?6:3,75);
    if(enemy.hp<=0){enemy.dead=true;this.totalKills++;this.player.kills++;this.player.gainXp(enemy.xp);this.checkKillBoost();if(this.player.effectTotals?.onKillHeal)this.player.heal(this.player.effectTotals.onKillHeal);
      if(this.player.has('detonation'))this.areaDamage(enemy.x,enemy.y,92,this.player.attack*1.65,'#ed9859');
      if(this.player.has('phantom_oath')&&Math.random()<(this.player.effectTotals?.cloneChance||0)){const a=Math.random()*Math.PI*2;this.playerProjectiles.push(this.makeProjectile(this.player.x,this.player.y,Math.cos(a)*360,Math.sin(a)*360,this.player.attack*.65,{r:5*this.player.projectileSize,range:500}));}
      this.effects.burst(enemy.x,enemy.y,enemy.color,13,145);this.effects.text(enemy.x,enemy.y-20,'+', '#e4d2ad',12);this.audio.play('kill');
    }else this.audio.play('hit');
  }
  damageBoss(damage,color='#f1c2a3'){
    if(!this.boss||this.boss.dead)return;const amount=Math.max(1,Math.round(damage));this.boss.hp-=amount;this.boss.hitFlash=.08;this.player.damageDealt+=amount;this.effects.text(this.boss.x+(Math.random()-.5)*26,this.boss.y-this.boss.r-10,amount,'#ffe5ab',13);
    if(this.boss.hp<=0){this.boss.hp=0;this.boss.dead=true;this.player.kills++;this.totalKills++;this.checkKillBoost();this.effects.burst(this.boss.x,this.boss.y,this.boss.color,60,260);this.effects.ring(this.boss.x,this.boss.y,270,'#e9c17e');this.shake=18;this.audio.play('win');}
  }
  checkKillBoost(){
    const milestone=Math.floor(this.totalKills/15);
    if(milestone>(this.lastBoostKill||0)){
      this.lastBoostKill=milestone;const p=this.player;const oldMax=p.maxHp;p.boostStacks++;p.recalculate();p.hp=Math.min(p.maxHp,p.hp+(p.maxHp-oldMax)+p.maxHp*.10);p.boostFlash=3.2;
      this.effects.burst(p.x,p.y,'#ff4b24',34,210);this.effects.ring(p.x,p.y,78,'#ff6a2c');this.toast(`분노의 불꽃! 공격력 · 이동속도 · 최대 체력 +10%`, '#ff7042');this.audio.play('special');
    }
  }
  applyRoomMilestoneHeal(){
    const room=this.roomManager.room;if(room%5!==0||this.healedMilestones.has(room))return;
    this.healedMilestones.add(room);const before=this.player.hp;this.player.heal(25);const actual=this.player.hp-before;this.effects.text(this.player.x,this.player.y-38,`+${actual} HP`,'#8de0a5',18);this.effects.burst(this.player.x,this.player.y,'#8de0a5',18,125);this.toast(`체크포인트 회복 +${actual} HP`, '#8de0a5');
  }
  hitPlayer(source,damage){
    if(!this.player||this.state!=='playing')return;const amount=this.player.takeDamage(damage,source.x,source.y);if(amount>0){this.effects.text(this.player.x,this.player.y-25,`-${amount}`,'#ff777e',15);this.effects.burst(this.player.x,this.player.y,'#d85c63',9,120);this.shake=5;this.audio.play('hurt');}
    else if(this.player.invuln<=0)this.effects.text(this.player.x,this.player.y-25,'DODGE','#9bd9dc',11);
  }
  completeRoom(){
    if(this.state!=='playing'||this.pendingReward)return;this.pendingReward=true;
    if(this.player.healOnRoom)this.player.heal(this.player.healOnRoom);this.applyRoomMilestoneHeal();
    if(this.roomManager.room>=CONFIG.totalRooms){this.win();return;}
    this.state='reward';const choices=this.rewards.makeChoices();this.rewardScreen.show(choices,this.roomManager.room);this.updateHud();this.audio.play('item');
  }
  win(){if(this.roomManager?.room===20)this.applyRoomMilestoneHeal();this.state='victory';this.elapsed=Math.max(0,this.elapsed);this.pendingReward=false;this.audio.stopMusic();this.ui.show(false);this.resultScreen.show(true);this.audio.play('win');}
  gameOver(){if(this.state==='gameover'||this.state==='victory')return;this.state='gameover';this.audio.stopMusic();this.ui.show(false);this.pendingReward=false;this.resultScreen.show(false);}
  update(dt){
    if(this.input.consumeEscape()){
      if(this.state==='playing'||this.state==='reward')this.pause();else if(this.state==='paused')this.resume();
    }
    if(this.state==='playing'||this.state==='reward')this.elapsed+=dt;
    this.time+=dt;this.effects.update(dt);this.shake=Math.max(0,this.shake-dt*22);
    if(this.state==='reward'){this.hudTick+=dt;if(this.hudTick>.25){this.hudTick=0;this.updateHud();}return;}
    if(this.state!=='playing')return;
    this.player.update(dt,this.input,this);
    // Keep the player clear of random room props.
    for(const o of this.roomManager.obstacles){const dx=this.player.x-o.x,dy=this.player.y-o.y,d=Math.hypot(dx,dy)||1,min=this.player.r+o.r;if(d<min){this.player.x=o.x+dx/d*min;this.player.y=o.y+dy/d*min;}}
    for(const e of this.enemies)e.update(dt,this);if(this.boss&&!this.boss.dead)this.boss.update(dt,this);
    this.updateProjectiles(dt);this.updateHazards(dt);this.updateSpirit(dt);
    this.enemies=this.enemies.filter(e=>!e.dead);
    if(this.player.hp<=0){this.gameOver();return;}
    if(this.boss?.dead){if(this.roomManager.room===20)this.win();else this.completeRoom();return;}
    if(!this.boss&&this.enemies.length===0)this.completeRoom();
    this.hudTick+=dt;if(this.hudTick>.12){this.hudTick=0;this.updateHud();}
  }
  projectileBlockedByWall(b,oldX,oldY){
    for(const o of this.roomManager.obstacles||[]){const dx=b.x-oldX,dy=b.y-oldY,l2=dx*dx+dy*dy;const t=l2?Math.max(0,Math.min(1,((o.x-oldX)*dx+(o.y-oldY)*dy)/l2)):0;const px=oldX+t*dx,py=oldY+t*dy;if(Math.hypot(px-o.x,py-o.y)<o.r*.92+b.r)return true;}return false;
  }
  updateProjectiles(dt){
    for(const b of this.playerProjectiles){const ox=b.x,oy=b.y;b.update(dt,this);if(this.projectileBlockedByWall(b,ox,oy)){b.life=0;continue;}if(b.life<=0)continue;
      for(const e of this.enemies){if(e.dead||b.hit.has(e))continue;if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){b.hit.add(e);this.damageEnemy(e,b.damage,b.color,b.crit);if(b.crit&&this.player.has('frozen_moment')){for(const foe of this.enemies){if(!foe.dead&&Math.hypot(foe.x-e.x,foe.y-e.y)<165)foe.stun=1.25;}}if(b.burn){e.burnTime=3.2;e.burnDps=4+(this.player.effectTotals?.burnDamage||0);}
          if(this.player.effectTotals?.chainChance&&Math.random()<this.player.effectTotals.chainChance){const target=this.enemies.filter(x=>!x.dead&&x!==e&&Math.hypot(x.x-e.x,x.y-e.y)<190).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];if(target){this.effects.line(e.x,e.y,target.x,target.y,'#9ce7f2',.2);this.damageEnemy(target,b.damage*(this.player.effectTotals.chainDamage||.5),'#9ce7f2');}}
          if(b.pierce>0)b.pierce--;else{b.life=0;break;}
        }}
      if(this.boss&&!this.boss.dead&&b.life>0&&!b.hitBoss&&Math.hypot(b.x-this.boss.x,b.y-this.boss.y)<b.r+this.boss.r){b.hitBoss=true;this.damageBoss(b.damage,b.color);if(b.burn){this.boss.burnTime=3.2;this.boss.burnDps=4+(this.player.effectTotals?.burnDamage||0);}if(b.pierce>0)b.pierce--;else b.life=0;}
    }
    this.playerProjectiles=this.playerProjectiles.filter(b=>b.life>0&&b.x>this.arena.left-30&&b.x<this.arena.right+30&&b.y>this.arena.top-30&&b.y<this.arena.bottom+30);
    for(const b of this.enemyProjectiles){const ox=b.x,oy=b.y;b.update(dt,this);if(this.projectileBlockedByWall(b,ox,oy)){b.life=0;continue;}if(b.life<=0)continue;if(Math.hypot(b.x-this.player.x,b.y-this.player.y)<b.r+this.player.r){this.hitPlayer({x:b.x,y:b.y},b.damage);b.life=0;}}
    this.enemyProjectiles=this.enemyProjectiles.filter(b=>b.life>0&&b.x>this.arena.left-45&&b.x<this.arena.right+45&&b.y>this.arena.top-45&&b.y<this.arena.bottom+45);
  }
  updateHazards(dt){
    for(const h of this.hazards){h.time-=dt;if(!h.hit&&h.time<.16){h.hit=true;if(Math.hypot(this.player.x-h.x,this.player.y-h.y)<h.r+this.player.r)this.hitPlayer(h,h.damage);this.effects.ring(h.x,h.y,h.r,h.color);this.effects.burst(h.x,h.y,h.color,14,140);}}
    this.hazards=this.hazards.filter(h=>h.time>0);
  }
  updateSpirit(dt){
    const p=this.player;if(!p?.has('orbit_wisp'))return;
    // The spirit wanders independently around the whole arena, gently changing its destination.
    if(!p.spiritTarget||Math.hypot(p.spiritTarget.x-p.spiritX,p.spiritTarget.y-p.spiritY)<24||Math.random()<dt*.22){
      p.spiritTarget={x:this.arena.left+45+Math.random()*(this.arena.right-this.arena.left-90),y:this.arena.top+45+Math.random()*(this.arena.bottom-this.arena.top-90)};
    }
    const dx=p.spiritTarget.x-p.spiritX,dy=p.spiritTarget.y-p.spiritY,d=Math.hypot(dx,dy)||1;
    p.spiritVX+=(dx/d*145-p.spiritVX)*Math.min(1,dt*2.1);p.spiritVY+=(dy/d*145-p.spiritVY)*Math.min(1,dt*2.1);
    p.spiritX=Math.max(this.arena.left+18,Math.min(this.arena.right-18,p.spiritX+p.spiritVX*dt));
    p.spiritY=Math.max(this.arena.top+18,Math.min(this.arena.bottom-18,p.spiritY+p.spiritVY*dt));
    p.spiritShotTimer-=dt;
    if(p.spiritShotTimer<=0){
      const targets=[...this.enemies.filter(e=>!e.dead),...(this.boss&&!this.boss.dead?[this.boss]:[])];
      const target=targets.sort((a,b)=>Math.hypot(a.x-p.spiritX,a.y-p.spiritY)-Math.hypot(b.x-p.spiritX,b.y-p.spiritY))[0];
      if(target){const a=Math.atan2(target.y-p.spiritY,target.x-p.spiritX);this.playerProjectiles.push(this.makeProjectile(p.spiritX,p.spiritY,Math.cos(a)*390,Math.sin(a)*390,p.attack*.48,{r:7,range:620,spirit:true}));this.effects.burst(p.spiritX,p.spiritY,'#a9eaf0',3,42);p.spiritShotTimer=.82;}
      else p.spiritShotTimer=.18;
    }
  }
  frame(t){const dt=Math.min(.033,(t-this.last)/1000||0);this.last=t;this.update(dt);this.draw();requestAnimationFrame(x=>this.frame(x));}
  draw(){
    const c=this.ctx,stage=this.roomManager.stage||STAGES[0],a=this.arena;c.save();if(this.shake>0)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    c.clearRect(0,0,CONFIG.width,CONFIG.height);
    const bg=c.createLinearGradient(0,0,0,720);bg.addColorStop(0,stage.palette[0]);bg.addColorStop(.55,stage.palette[1]);bg.addColorStop(1,'#0b0c12');c.fillStyle=bg;c.fillRect(0,0,1280,720);
    // Decorative stage mist and floor.
    c.save();c.globalAlpha=.18;c.fillStyle=stage.ambient;for(let i=0;i<14;i++){const x=(i*177+this.time*8)%1280,y=(i*97+Math.sin(this.time*.2+i)*35)%720;c.beginPath();c.arc(x,y,45+(i%4)*12,0,Math.PI*2);c.fill();}c.restore();
    c.fillStyle='#0c0e15';c.fillRect(a.left-10,a.top-10,a.right-a.left+20,a.bottom-a.top+20);
    c.fillStyle='#171923';c.fillRect(a.left,a.top,a.right-a.left,a.bottom-a.top);
    // Floor tiles
    c.strokeStyle='#ffffff0b';c.lineWidth=1;for(let x=a.left+20;x<a.right;x+=58){c.beginPath();c.moveTo(x,a.top);c.lineTo(x,a.bottom);c.stroke();}for(let y=a.top+20;y<a.bottom;y+=58){c.beginPath();c.moveTo(a.left,y);c.lineTo(a.right,y);c.stroke();}
    c.strokeStyle=stage.ambient+'88';c.lineWidth=2;c.strokeRect(a.left,a.top,a.right-a.left,a.bottom-a.top);
    // Stage corner runes
    c.fillStyle=stage.ambient+'77';c.font='17px serif';c.fillText('✧',a.left+15,a.top+23);c.fillText('✧',a.right-35,a.top+23);c.fillText('✧',a.left+15,a.bottom-10);c.fillText('✧',a.right-35,a.bottom-10);
    for(const o of this.roomManager.obstacles||[]){c.fillStyle='#08090e88';c.beginPath();c.ellipse(o.x,o.y+o.r*.55,o.r*1.25,o.r*.5,0,0,Math.PI*2);c.fill();c.fillStyle=o.type==='pillar'?'#4a4652':'#575047';c.strokeStyle='#847760';c.lineWidth=2;c.beginPath();c.roundRect(o.x-o.r*.7,o.y-o.r*.8,o.r*1.4,o.r*1.6,5);c.fill();c.stroke();c.fillStyle='#aaa080';c.globalAlpha=.45;c.fillRect(o.x-4,o.y-o.r*.6,8,3);c.globalAlpha=1;}
    // Hazards telegraph area
    for(const h of this.hazards){c.save();const warn=Math.max(.08,Math.min(1,h.time/.85));c.globalAlpha=.16+.2*(1-warn);c.fillStyle=h.color;c.beginPath();c.arc(h.x,h.y,h.r,0,Math.PI*2);c.fill();c.globalAlpha=.65;c.strokeStyle=h.color;c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();c.arc(h.x,h.y,h.r*(.93+Math.sin(this.time*12)*.025),0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();}
    for(const b of this.playerProjectiles)b.draw(c);for(const b of this.enemyProjectiles)b.draw(c);
    for(const e of this.enemies)e.draw(c);if(this.boss&&!this.boss.dead)this.boss.draw(c);
    if(this.player){this.drawPlayer(c);if(this.player.has('orbit_wisp')){const p=this.player;c.save();c.globalCompositeOperation='lighter';c.shadowBlur=24;c.shadowColor='#8eeaf2';c.fillStyle='#c5f7f5';c.strokeStyle='#6bc9d8';c.lineWidth=2;c.beginPath();c.arc(p.spiritX,p.spiritY,10+Math.sin(this.time*7)*1.5,0,Math.PI*2);c.fill();c.stroke();c.globalAlpha=.45;c.beginPath();c.arc(p.spiritX,p.spiritY,17+Math.sin(this.time*4)*2,0,Math.PI*2);c.stroke();c.restore();}}
    this.effects.draw(c);
    // room label / empty gate
    c.fillStyle='#e5d6b099';c.font='10px monospace';c.textAlign='center';c.fillText(this.roomManager.type==='boss'?'BOSS CHAMBER':this.roomManager.type==='elite'?'ELITE ENCOUNTER':'CLEANSING CHAMBER',640, a.bottom+18);c.textAlign='left';
    c.restore();
  }
  drawPlayer(c){const p=this.player;c.save();
    if(p.boostStacks>0){const pulse=.65+.35*Math.sin(this.time*13);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.45*pulse;c.shadowBlur=25;c.shadowColor='#ff3b16';c.strokeStyle='#ff5727';c.lineWidth=4;for(let i=0;i<9;i++){const a=this.time*2+i*Math.PI*2/9;const rr=p.r+8+Math.sin(this.time*11+i)*5;c.beginPath();c.moveTo(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr);c.lineTo(p.x+Math.cos(a+.16)* (rr+13+Math.random()*3),p.y+Math.sin(a+.16)*(rr+13));c.stroke();}c.restore();}if(p.invuln>0&&Math.floor(this.time*18)%2===0)c.globalAlpha=.35;
    c.fillStyle='#0009';c.beginPath();c.ellipse(p.x,p.y+13,18,8,0,0,Math.PI*2);c.fill();
    c.fillStyle='#302739';c.beginPath();c.moveTo(p.x-12,p.y+8);c.lineTo(p.x-16,p.y+21);c.lineTo(p.x+12,p.y+21);c.lineTo(p.x+12,p.y+8);c.closePath();c.fill();
    c.fillStyle=p.dashTime>0?'#d8f3f3':'#d0c1a7';c.strokeStyle='#4b3b43';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#17141d';c.beginPath();c.arc(p.x+Math.cos(p.facing)*6-3,p.y+Math.sin(p.facing)*6-2,2.3,0,Math.PI*2);c.arc(p.x+Math.cos(p.facing)*6+3,p.y+Math.sin(p.facing)*6-2,2.3,0,Math.PI*2);c.fill();
    c.strokeStyle='#e6bd78';c.lineWidth=3;c.beginPath();c.moveTo(p.x+Math.cos(p.facing)*10,p.y+Math.sin(p.facing)*10);c.lineTo(p.x+Math.cos(p.facing)*23,p.y+Math.sin(p.facing)*23);c.stroke();
    if(p.invuln>0){c.strokeStyle='#9edbe0aa';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,p.r+5,0,Math.PI*2);c.stroke();}
    c.restore();
  }
}
