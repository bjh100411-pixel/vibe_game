import { ENEMIES } from '../data/enemies.js';

export class Enemy {
  constructor(type,x,y,scale=1,elite=false){
    const data=ENEMIES[type];Object.assign(this,{type,x,y,r:data.r,hp:data.hp*scale,maxHp:data.hp*scale,damage:data.damage*scale,speed:data.speed,range:data.range,rate:data.rate,xp:data.xp,name:data.name,color:data.color,pattern:data.pattern,elite,dead:false,hitFlash:0,lastAttack:Math.random(),stateTimer:Math.random(),charge:0,burnTime:0,burnDps:0,stun:0,aimAngle:0,windup:0});
    if(elite){this.hp*=2.2;this.maxHp=this.hp;this.damage*=1.25;this.speed*=1.12;this.r*=1.23;this.xp*=2;}
  }
  update(dt,game){
    if(this.dead)return;this.hitFlash=Math.max(0,this.hitFlash-dt);this.burnTime=Math.max(0,this.burnTime-dt);this.stun=Math.max(0,this.stun-dt);this.stateTimer-=dt;
    if(this.burnTime>0&&Math.random()<dt*5){game.damageEnemy(this,this.burnDps*.2,'#ff9b57',false);}
    if(this.stun>0)return;
    const p=game.player;let dx=p.x-this.x,dy=p.y-this.y,d=Math.hypot(dx,dy)||1;let nx=dx/d,ny=dy/d;
    this.lastAttack+=dt;
    if(this.pattern==='ranged'||this.pattern==='summon'||this.pattern==='aoe'){
      if(d<this.range*.68){this.x-=nx*this.speed*dt;this.y-=ny*this.speed*dt;}else if(d>this.range*1.08){this.x+=nx*this.speed*.72*dt;this.y+=ny*this.speed*.72*dt;}
      if(this.lastAttack>=this.rate&&d<this.range*1.45){this.lastAttack=0;
        if(this.pattern==='summon'){
          game.spawnAdds(this.x,this.y,1);game.effects.ring(this.x,this.y,54,'#a77dd1');
        }else if(this.pattern==='aoe'){
          game.hazards.push({x:p.x,y:p.y,r:56,time:.75,maxTime:.75,damage:this.damage,color:'#8e82dc'});
        }else game.enemyProjectiles.push(game.makeEnemyProjectile(this.x,this.y,nx,ny,this.damage,this.type==='archer'?300:250));
      }
    }else if(this.pattern==='blink'){
      if(this.stateTimer<=0){
        if(d>170){
          // Teleport to a ring outside the player's 150px safety radius, never onto the player.
          const safeRadius=150,minRadius=safeRadius+this.r+10,maxRadius=minRadius+55;
          const arena=game.arena,obstacles=game.roomManager?.obstacles||[];
          let landing=null,best=null,bestDistance=-1;
          for(let attempt=0;attempt<36;attempt++){
            const angle=Math.random()*Math.PI*2;
            const radius=minRadius+Math.random()*(maxRadius-minRadius);
            const x=Math.max(arena.left+this.r,Math.min(arena.right-this.r,p.x+Math.cos(angle)*radius));
            const y=Math.max(arena.top+this.r,Math.min(arena.bottom-this.r,p.y+Math.sin(angle)*radius));
            const distance=Math.hypot(x-p.x,y-p.y);
            const blocked=obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<o.r+this.r+8);
            if(distance>bestDistance&&!blocked){best={x,y};bestDistance=distance;}
            if(distance>=minRadius&&!blocked){landing={x,y};break;}
          }
          if(!landing&&game.roomManager?.spawnPosition){const edge=game.roomManager.spawnPosition(minRadius);if(Math.hypot(edge.x-p.x,edge.y-p.y)>=minRadius)landing=edge;}
          landing=landing||best||{x:Math.max(arena.left+this.r,Math.min(arena.right-this.r,p.x+minRadius)),y:Math.max(arena.top+this.r,Math.min(arena.bottom-this.r,p.y))};
          this.x=landing.x;this.y=landing.y;this.stateTimer=3.6;
          // Recalculate direction from the new landing point before moving or checking melee range.
          dx=p.x-this.x;dy=p.y-this.y;d=Math.hypot(dx,dy)||1;nx=dx/d;ny=dy/d;
          game.effects?.ring?.(this.x,this.y,26,this.color);
        }else this.stateTimer=1.5;
      }
      this.x+=nx*this.speed*.5*dt;this.y+=ny*this.speed*.5*dt;
      if(d<this.range+10&&this.lastAttack>this.rate){game.hitPlayer(this,this.damage);this.lastAttack=0;}
    }else if(this.pattern==='explode'){
      this.x+=nx*this.speed*dt;this.y+=ny*this.speed*dt;
      if(d<42){game.hazards.push({x:this.x,y:this.y,r:105,time:.32,maxTime:.32,damage:this.damage*1.5,color:'#e78a4c'});this.dead=true;game.effects.burst(this.x,this.y,'#e78a4c',22,190);game.audio.play('explosion');}
    }else{
      let factor=1;if(this.pattern==='dash'&&d>90)factor=1.45;
      this.x+=nx*this.speed*factor*dt;this.y+=ny*this.speed*factor*dt;
      if(d<this.range+this.r+p.r&&this.lastAttack>this.rate){game.hitPlayer(this,this.damage);this.lastAttack=0;}
    }
    this.x=Math.max(game.arena.left+this.r,Math.min(game.arena.right-this.r,this.x));this.y=Math.max(game.arena.top+this.r,Math.min(game.arena.bottom-this.r,this.y));
  }
  draw(ctx){
    if(this.dead)return;ctx.save();
    if(this.elite){ctx.shadowBlur=18;ctx.shadowColor='#e4b763';}
    // ground shadow
    ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(this.x,this.y+this.r*.7,this.r*1.1,this.r*.45,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=this.hitFlash>0?'#fff2de':this.color;ctx.strokeStyle=this.elite?'#e6c17b':'#171821';ctx.lineWidth=this.elite?3:2;
    ctx.beginPath();
    if(this.type==='tank'){
      ctx.roundRect(this.x-this.r*.82,this.y-this.r*.82,this.r*1.64,this.r*1.64,5);
    }else if(this.type==='runner'||this.type==='stalker'){
      ctx.moveTo(this.x,this.y-this.r*1.25);ctx.lineTo(this.x+this.r,this.y);ctx.lineTo(this.x,this.y+this.r*1.15);ctx.lineTo(this.x-this.r,this.y);ctx.closePath();
    }else if(this.type==='archer'){
      ctx.moveTo(this.x,this.y-this.r*1.15);ctx.lineTo(this.x+this.r,this.y+this.r*.85);ctx.lineTo(this.x-this.r,this.y+this.r*.85);ctx.closePath();
    }else if(this.type==='summoner'||this.type==='mage'){
      for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4;const rr=this.r*(i%2===0?1:.78);const x=this.x+Math.cos(a)*rr,y=this.y+Math.sin(a)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
    }else if(this.type==='bomber'){
      for(let i=0;i<12;i++){const a=-Math.PI/2+i*Math.PI/6;const rr=this.r*(i%2===0?1.18:.86);const x=this.x+Math.cos(a)*rr,y=this.y+Math.sin(a)*rr;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
    }else{ctx.arc(this.x,this.y,this.r,0,Math.PI*2);}
    ctx.fill();ctx.stroke();
    ctx.fillStyle='#16141b';ctx.beginPath();ctx.arc(this.x-this.r*.32,this.y-2,2.3,0,Math.PI*2);ctx.arc(this.x+this.r*.32,this.y-2,2.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f0c0aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(this.x-4,this.y+this.r*.32);ctx.lineTo(this.x+4,this.y+this.r*.32);ctx.stroke();
    ctx.restore();
    if(this.hp<this.maxHp||this.elite){const w=this.r*2.3;ctx.fillStyle='#231b24';ctx.fillRect(this.x-w/2,this.y-this.r-10,w,4);ctx.fillStyle=this.elite?'#e5bb68':'#bf5a65';ctx.fillRect(this.x-w/2,this.y-this.r-10,w*Math.max(0,this.hp/this.maxHp),4);}
    if(this.elite){ctx.fillStyle='#f1d39a';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('ELITE',this.x,this.y-this.r-17);}
  }
}
