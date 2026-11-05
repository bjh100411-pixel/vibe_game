export class Projectile {
  constructor(x,y,vx,vy,damage,opts={}){
    Object.assign(this,{x,y,vx,vy,damage,r:opts.r||5,life:opts.life||2.5,owner:opts.owner||'player',pierce:opts.pierce||0,hit:new Set(),crit:!!opts.crit,burn:!!opts.burn,laser:!!opts.laser,range:opts.range||600,kind:opts.kind||'orb',color:opts.color||'#e8d6a8',aoe:opts.aoe||0});
    this.startX=x;this.startY=y;
  }
  update(dt,game){this.x+=this.vx*dt;this.y+=this.vy*dt;this.life-=dt;if(Math.hypot(this.x-this.startX,this.y-this.startY)>this.range)this.life=0;}
  draw(ctx){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=this.laser?18:12;ctx.shadowColor=this.color;ctx.fillStyle=this.color;
    if(this.laser){const len=Math.hypot(this.vx,this.vy)||1;ctx.strokeStyle=this.color;ctx.lineWidth=4*(this.r/5);ctx.globalAlpha=.78;ctx.beginPath();ctx.moveTo(this.x-this.vx/len*54,this.y-this.vy/len*54);ctx.lineTo(this.x+this.vx/len*8,this.y+this.vy/len*8);ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(this.x,this.y,5,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(this.x-this.vx*.016,this.y-this.vy*.016,this.r*1.7,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
}
