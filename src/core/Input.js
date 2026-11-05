export class Input {
  constructor(canvas){
    this.canvas=canvas;
    this.keys={};
    this.mouse={x:640,y:360};
    this.mouseDown=false;
    this.dashPressed=false;
    this.specialPressed=false;
    this.escapePressed=false;
    this.joystick={x:0,y:0,active:false,pointerId:null};
    this.isMobile=this.detectMobile();

    if(this.isMobile){
      document.body?.classList?.add('mobile-device');
      this.bindMobileControls();
    }

    window.addEventListener('keydown',e=>{
      this.keys[e.code]=true;
      if(e.code==='Space'){e.preventDefault();this.dashPressed=true;}
      if(e.code==='KeyQ')this.specialPressed=true;
      if(e.code==='Escape')this.escapePressed=true;
    });
    window.addEventListener('keyup',e=>{this.keys[e.code]=false;});
    canvas.addEventListener('mousemove',e=>{
      const r=canvas.getBoundingClientRect();
      this.mouse.x=(e.clientX-r.left)*canvas.width/r.width;
      this.mouse.y=(e.clientY-r.top)*canvas.height/r.height;
    });
    canvas.addEventListener('mousedown',e=>{if(e.button===0)this.mouseDown=true;});
    window.addEventListener('mouseup',e=>{if(e.button===0)this.mouseDown=false;});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }

  detectMobile(){
    const coarse=typeof window.matchMedia==='function'&&window.matchMedia('(pointer: coarse)').matches;
    const touchHover=typeof navigator!=='undefined'&&navigator.maxTouchPoints>0&&typeof window.matchMedia==='function'&&window.matchMedia('(hover: none)').matches;
    return Boolean(coarse||touchHover);
  }

  bindMobileControls(){
    const stick=document.getElementById('virtual-joystick');
    const knob=document.getElementById('joystick-knob');
    const dash=document.getElementById('mobile-dash');
    const special=document.getElementById('mobile-special');

    const updateStick=e=>{
      if(this.joystick.pointerId!==e.pointerId)return;
      const rect=stick.getBoundingClientRect();
      const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
      const max=rect.width*.31;
      let dx=e.clientX-cx,dy=e.clientY-cy;
      const distance=Math.hypot(dx,dy);
      if(distance>max){dx=dx/distance*max;dy=dy/distance*max;}
      let x=dx/max,y=dy/max;
      const magnitude=Math.hypot(x,y);
      if(magnitude<.12){x=0;y=0;}
      this.joystick.x=x;this.joystick.y=y;this.joystick.active=true;
      if(knob)knob.style.transform=`translate(${dx}px, ${dy}px)`;
    };
    const releaseStick=e=>{
      if(e.pointerId!==undefined&&this.joystick.pointerId!==e.pointerId)return;
      this.joystick.x=0;this.joystick.y=0;this.joystick.active=false;this.joystick.pointerId=null;
      if(knob)knob.style.transform='translate(0, 0)';
    };

    stick?.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(this.joystick.pointerId!==null)return;
      this.joystick.pointerId=e.pointerId;
      stick.setPointerCapture?.(e.pointerId);
      updateStick(e);
    });
    stick?.addEventListener('pointermove',updateStick);
    stick?.addEventListener('pointerup',releaseStick);
    stick?.addEventListener('pointercancel',releaseStick);
    stick?.addEventListener('lostpointercapture',releaseStick);

    dash?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.dashPressed=true;});
    special?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.specialPressed=true;});
    for(const button of [dash,special]){
      button?.addEventListener('contextmenu',e=>e.preventDefault());
    }
  }

  getMoveVector(){
    if(this.isMobile&&this.joystick.active)return {x:this.joystick.x,y:this.joystick.y};
    let x=(this.keys.KeyD?1:0)-(this.keys.KeyA?1:0);
    let y=(this.keys.KeyS?1:0)-(this.keys.KeyW?1:0);
    const len=Math.hypot(x,y);
    if(len>1){x/=len;y/=len;}
    return {x,y};
  }

  consumeDash(){const v=this.dashPressed;this.dashPressed=false;return v;}
  consumeSpecial(){const v=this.specialPressed;this.specialPressed=false;return v;}
  consumeEscape(){const v=this.escapePressed;this.escapePressed=false;return v;}
  clear(){
    this.keys={};this.mouseDown=false;this.dashPressed=false;this.specialPressed=false;this.escapePressed=false;
    this.joystick.x=0;this.joystick.y=0;this.joystick.active=false;this.joystick.pointerId=null;
    const knob=document.getElementById('joystick-knob');if(knob)knob.style.transform='translate(0, 0)';
  }
}
