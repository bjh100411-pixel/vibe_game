export class Player {
  constructor(x,y){
    this.x=x; this.y=y; this.r=15; this.base={maxHp:100,attack:13.5,fireRate:2.05,move:220,crit:.05,critDamage:1.6,defense:0,dodge:.02,projectileSize:1,projectileSpeed:500,xp:1};
    this.hp=100; this.maxHp=100; this.attack=13.5; this.fireRate=2.05; this.move=220; this.crit=.05; this.critDamage=1.6; this.defense=0; this.dodge=.02; this.projectileSize=1; this.projectileSpeed=500; this.xpGain=1;
    this.items=new Map(); this.upgrades={}; this.xp=0; this.level=1; this.xpNext=100;
    this.lastShot=-10; this.dashCooldown=0; this.dashTime=0; this.specialCooldown=0; this.invuln=0; this.knockX=0; this.knockY=0; this.facing=0;
    this.dashBuffTime=0; this.spiritShotTimer=0; this.spiritX=x+42; this.spiritY=y-28; this.spiritVX=42; this.spiritVY=-28; this.boostStacks=0; this.boostFlash=0; this.pulseTimer=8; this.damageTaken=0; this.damageDealt=0; this.kills=0; this.healOnRoom=0;
  }
  has(id){return (this.items.get(id)||0)>0;}
  stacksFor(effectKey){
    let n=0; for(const [id,count] of this.items){const item=this.catalog(id); if(item?.effect?.[effectKey]) n+=count;} return n;
  }
  catalog(id){return this.itemCatalog?.find(x=>x.id===id);}
  attachCatalog(items){this.itemCatalog=items;}
  addItem(item){
    const old=this.items.get(item.id)||0;
    if(old>0&&!item.stackable) return false;
    this.items.set(item.id,old+1);
    if(item.effect?.heal) this.heal(item.effect.heal);
    if(item.effect?.sacrifice){this.upgrades.maxHp=(this.upgrades.maxHp||0)-.2;}
    this.recalculate(); return true;
  }
  addStat(stat){
    let healAmount=0;
    for(const [k,v] of Object.entries(stat)){
      if(k==='heal'){healAmount+=v;continue;}
      this.upgrades[k]=(this.upgrades[k]||0)+v;
    }
    this.recalculate();
    if(healAmount)this.heal(healAmount);
  }
  recalculate(){
    const sum={};
    for(const [id,count] of this.items){const it=this.catalog(id);if(!it)continue;for(const [k,v] of Object.entries(it.effect||{})){if(typeof v==='number')sum[k]=(sum[k]||0)+v*count;}}
    const up=this.upgrades;
    this.maxHp=Math.max(1,Math.round(this.base.maxHp*(1+(sum.maxHp||0)+(up.maxHp||0))*Math.pow(1.1,this.boostStacks)));
    this.attack=this.base.attack*(1+(sum.attack||0)+(up.attack||0))*Math.pow(1.1,this.boostStacks);
    this.fireRate=this.base.fireRate*(1+(sum.fireRate||0)+(up.fireRate||0));
    this.move=this.base.move*(1+(sum.move||0)+(up.move||0))*Math.pow(1.1,this.boostStacks);
    this.crit=Math.min(.75,this.base.crit+(sum.crit||0)+(up.crit||0));
    this.critDamage=this.base.critDamage+(sum.critDamage||0)+(up.critDamage||0);
    this.defense=this.base.defense+(sum.defense||0)+(up.defense||0);
    this.dodge=Math.min(.55,this.base.dodge+(sum.dodge||0));
    this.projectileSize=1+(sum.projectileSize||0);
    this.projectileSpeed=500*(1+(sum.projectileSpeed||0));
    this.xpGain=1+(sum.xp||0);
    this.healOnRoom=sum.roomHeal||0;
    this.effectTotals=sum;
    this.hp=Math.min(this.hp,this.maxHp);
  }
  heal(amount){this.hp=Math.min(this.maxHp,this.hp+amount);}
  getAttackPower(){
    let mult=1;
    if(this.effectTotals?.lowHpAttack && this.hp/this.maxHp<.4){const missing=1-this.hp/this.maxHp;mult+=this.effectTotals.lowHpAttack*(missing/.6);}
    if(this.dashBuffTime>0) mult+=this.effectTotals?.dashBuff||0;
    return this.attack*mult;
  }
  takeDamage(amount,sourceX,sourceY){
    if(this.invuln>0)return 0;
    if(Math.random()<this.dodge)return 0;
    const dmg=Math.max(1,Math.round(amount-this.defense*.65));
    this.hp=Math.max(0,this.hp-dmg);this.damageTaken+=dmg;this.invuln=.72;
    const dx=this.x-sourceX,dy=this.y-sourceY,l=Math.hypot(dx,dy)||1;
    this.knockX=dx/l*190;this.knockY=dy/l*190;
    return dmg;
  }
  gainXp(amount){
    this.xp+=amount*this.xpGain;let leveled=false;
    while(this.xp>=this.xpNext){this.xp-=this.xpNext;this.level++;this.xpNext=Math.round(this.xpNext*1.22+20);this.addStat({maxHp:.04,attack:.025});leveled=true;}
    return leveled;
  }
  update(dt,input,game){
    this.invuln=Math.max(0,this.invuln-dt);this.boostFlash=Math.max(0,this.boostFlash-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.specialCooldown=Math.max(0,this.specialCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.dashBuffTime=Math.max(0,this.dashBuffTime-dt);
    this.pulseTimer-=dt;
    const movement=input.getMoveVector?input.getMoveVector():{x:(input.keys.KeyD?1:0)-(input.keys.KeyA?1:0),y:(input.keys.KeyS?1:0)-(input.keys.KeyW?1:0)};
    let dx=movement.x,dy=movement.y;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
    const targets=[...(game.enemies||[]).filter(e=>!e.dead),...(game.boss&&!game.boss.dead?[game.boss]:[])];
    // Mobile devices automatically aim at the nearest living target. Desktop keeps cursor aiming.
    if(input.isMobile){
      let nearest=null,nearestDistance=Infinity;
      for(const target of targets){const distance=(target.x-this.x)**2+(target.y-this.y)**2;if(distance<nearestDistance){nearestDistance=distance;nearest=target;}}
      if(nearest)this.facing=Math.atan2(nearest.y-this.y,nearest.x-this.x);
    }else if(input.mouse){
      this.facing=Math.atan2(input.mouse.y-this.y,input.mouse.x-this.x);
    }
    const hasTargets=targets.length>0;
    if(input.consumeDash()&&this.dashCooldown<=0){
      let vx=dx,vy=dy;if(!len){vx=Math.cos(this.facing);vy=Math.sin(this.facing);}
      this.knockX=vx*480;this.knockY=vy*480;this.dashTime=.15;this.dashCooldown=2.1;this.invuln=Math.max(this.invuln,.38);
      if(this.has('afterimage'))this.dashBuffTime=2;
      game.effects.burst(this.x,this.y,'#a6d9ed',14,150);
      game.audio.play('dash');
    }
    if(this.dashTime>0){this.x+=this.knockX*dt;this.y+=this.knockY*dt;}
    else{
      this.x+=dx*this.move*dt+this.knockX*dt;this.y+=dy*this.move*dt+this.knockY*dt;
      this.knockX*=Math.pow(.02,dt);this.knockY*=Math.pow(.02,dt);
    }
    this.x=Math.max(game.arena.left+this.r,Math.min(game.arena.right-this.r,this.x));
    this.y=Math.max(game.arena.top+this.r,Math.min(game.arena.bottom-this.r,this.y));
    if(game.state==='playing'&&hasTargets)this.tryShoot(game);
    if(input.consumeSpecial()&&this.specialCooldown<=0&&game.state==='playing')this.special(game);
    if(this.has('cataclysm')&&this.pulseTimer<=0){this.pulseTimer=8;game.areaDamage(this.x,this.y,380,this.getAttackPower()*3.2,'#c19af0');game.effects.ring(this.x,this.y,380,'#b08be8');game.audio.play('special');}
  }
  tryShoot(game){
    const now=game.time;const gap=1/Math.max(.3,this.fireRate);
    if(now-this.lastShot<gap)return;this.lastShot=now;
    const angle=this.facing;const count=1+(this.effectTotals?.multishot||0);const spread=count>1?.14:0;
    const baseDmg=this.getAttackPower();
    const isCrit=Math.random()<this.crit;const dmg=baseDmg*(isCrit?this.critDamage:1);
    const offsets=count===1?[0]:Array.from({length:count},(_,i)=>(i-(count-1)/2)*spread);
    for(const off of offsets){const a=angle+off;game.playerProjectiles.push(game.makeProjectile(this.x+Math.cos(a)*17,this.y+Math.sin(a)*17,Math.cos(a)*this.projectileSpeed,Math.sin(a)*this.projectileSpeed,dmg,{crit:isCrit,pierce:this.has('void_lance')?5:0,r:5*this.projectileSize,range:560,burn:Math.random()<(this.effectTotals?.burnChance||0),laser:this.has('void_lance')}));}
    game.effects.slash(this.x+Math.cos(angle)*24,this.y+Math.sin(angle)*24,angle,isCrit?'#ffe6a2':'#d7d0c1');
    game.audio.play('shoot');
  }
  special(game){
    this.specialCooldown=12;const radius=205;game.areaDamage(this.x,this.y,radius,this.getAttackPower()*2.65,'#8dd4dc',true);game.effects.ring(this.x,this.y,radius,'#a5e4e6');game.effects.burst(this.x,this.y,'#b7eff0',30,260);game.shake=10;game.audio.play('special');game.toast('영혼 폭발!', '#b7eff0');
  }
}
