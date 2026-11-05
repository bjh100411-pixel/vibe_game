export class AudioManager {
  constructor(){this.ctx=null;this.muted=false;this.musicOn=true;this.master=null;this.musicNodes=[];}
  init(){
    if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC){this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:1;this.master.connect(this.ctx.destination);}}
    if(this.ctx?.state==='suspended')this.ctx.resume();
  }
  toggle(){this.muted=!this.muted;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:1,this.ctx.currentTime,.04);return this.muted;}
  startMusic(){
    this.init();if(!this.ctx||!this.musicOn)return;this.stopMusic();const c=this.ctx;const now=c.currentTime;
    // Quiet, original ambient drone built procedurally (no external audio asset).
    const notes=[{f:55,g:.018,w:'sine'},{f:82.41,g:.010,w:'triangle'},{f:110,g:.006,w:'sine'}];
    for(const n of notes){const o=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();o.type=n.w;o.frequency.value=n.f;filter.type='lowpass';filter.frequency.value=240;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(n.g,now+2.2);o.connect(filter);filter.connect(gain);gain.connect(this.master);o.start(now);this.musicNodes.push({o,gain});}
  }
  stopMusic(){if(!this.ctx)return;const now=this.ctx.currentTime;for(const node of this.musicNodes){try{node.gain.gain.cancelScheduledValues(now);node.gain.gain.setTargetAtTime(0,now,.15);node.o.stop(now+1.2);}catch{}}this.musicNodes=[];}
  play(name){if(this.muted)return;this.init();if(!this.ctx)return;const c=this.ctx;
    const now=c.currentTime;const osc=c.createOscillator(),gain=c.createGain();osc.connect(gain);gain.connect(this.master||c.destination);
    const presets={shoot:[520,.045,'triangle',.035],hit:[170,.09,'square',.05],kill:[270,.12,'sawtooth',.045],item:[760,.25,'sine',.06],dash:[390,.13,'triangle',.05],special:[90,.55,'sawtooth',.07],boss:[115,.18,'square',.055],explosion:[65,.2,'sawtooth',.07],hurt:[120,.14,'square',.06],win:[620,.5,'sine',.06]};
    const [freq,dur,wave,vol]=presets[name]||presets.hit;osc.type=wave;osc.frequency.setValueAtTime(freq,now);if(name==='special'||name==='explosion')osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.35),now+dur);gain.gain.setValueAtTime(vol,now);gain.gain.exponentialRampToValueAtTime(.001,now+dur);osc.start(now);osc.stop(now+dur);
  }
}
