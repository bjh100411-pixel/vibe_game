export class Effects {
  constructor(){this.particles=[];this.texts=[];this.rings=[];this.lines=[];}
  burst(x,y,color,n=10,speed=120){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=speed*(.35+Math.random()*.75);this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.45,max:.8,size:2+Math.random()*3,color});}}
  slash(x,y,a,color){this.particles.push({x,y,vx:Math.cos(a)*30,vy:Math.sin(a)*30,life:.16,max:.16,size:11,color,slash:true,angle:a});}
  ring(x,y,r,color){this.rings.push({x,y,r,life:.4,max:.4,color});}
  line(x1,y1,x2,y2,color,life=.25){this.lines.push({x1,y1,x2,y2,color,life,max:life});}
  text(x,y,text,color='#fff',size=13){this.texts.push({x,y,text:String(text),color,size,life:.72,max:.72});}
  update(dt){for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    for(const t of this.texts){t.y-=26*dt;t.life-=dt;}this.texts=this.texts.filter(t=>t.life>0);
    for(const r of this.rings){r.life-=dt;}this.rings=this.rings.filter(r=>r.life>0);for(const l of this.lines)l.life-=dt;this.lines=this.lines.filter(l=>l.life>0);
  }
  draw(ctx){ctx.save();ctx.globalCompositeOperation='lighter';for(const r of this.rings){ctx.globalAlpha=r.life/r.max;ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r*(1-r.life/r.max)*.25+r.r*.75,0,Math.PI*2);ctx.stroke();}
    for(const p of this.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;if(p.slash){ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillRect(-p.size/2,-1,p.size,3);ctx.setTransform(1,0,0,1,0,0);}else{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}}
    for(const l of this.lines){ctx.globalAlpha=l.life/l.max;ctx.strokeStyle=l.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(l.x1,l.y1);ctx.lineTo(l.x2,l.y2);ctx.stroke();}
    ctx.restore();for(const t of this.texts){ctx.save();ctx.globalAlpha=t.life/t.max;ctx.font=`bold ${t.size}px monospace`;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);ctx.restore();}}
}
