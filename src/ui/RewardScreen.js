export class RewardScreen {
  constructor(game){this.game=game;this.root=document.getElementById('overlay');}
  show(choices,room){
    this.game.ui.showHud(true);
    this.root.innerHTML=`<div class="modal wide"><div class="eyebrow">ROOM ${String(room).padStart(2,'0')} CLEARED</div><div class="section-title">전리품을 선택하라</div><div class="subtitle">유물 하나를 선택해야 다음 방으로 이동할 수 있습니다. 선택에 따라 전투 방식이 달라집니다.</div><div class="reward-grid">${choices.map((x,i)=>`<button class="reward-card grade-${x.grade}" data-pick="${i}"><span class="reward-grade">${x.grade} · ${x.kind==='stat'?'GROWTH':'RELIC'}</span><span class="reward-icon">${x.icon}</span><span class="reward-name">${x.name}</span><span class="reward-desc">${x.desc}</span><span class="reward-tag">선택하여 획득 →</span></button>`).join('')}</div></div>`;
    this.root.querySelectorAll('[data-pick]').forEach(button=>button.addEventListener('click',()=>{
      const option=choices[Number(button.dataset.pick)];
      if(this.game.rewards.choose(option))this.root.innerHTML='';
    }));
  }
}
