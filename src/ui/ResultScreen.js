export class ResultScreen {
  constructor(game){this.game=game;this.root=document.getElementById('overlay');}
  show(win){
    const g=this.game,p=g.player,room=g.roomManager.room;
    const items=[...p.items.entries()].map(([id,count])=>`${p.catalog(id)?.name||id}${count>1?` ×${count}`:''}`).join(' · ')||'획득한 유물 없음';
    const finalStats=`ATK ${p.getAttackPower().toFixed(1)} · SPD ${p.fireRate.toFixed(2)} · DEF ${p.defense.toFixed(1)} · CRIT ${Math.round(p.crit*100)}% · MOVE ${Math.round(p.move)} · DODGE ${Math.round(p.dodge*100)}%`;
    this.game.ui.showHud(false);
    this.root.innerHTML=`<div class="modal"><div class="eyebrow">${win?'THE ABYSS HAS FALLEN':'YOUR SOUL FADES'}</div><div class="game-title" style="font-size:44px">${win?'VICTORY':'GAME OVER'}</div><div class="ornament"></div><div class="section-title">${win?'심연의 왕좌를 정복했다':'잿빛 장막에 삼켜졌다'}</div><div class="result-stats"><div class="result-stat"><small>${win?'CLEAR TIME':'SURVIVAL TIME'}</small><b>${g.formatTime(g.elapsed)}</b></div><div class="result-stat"><small>ROOM REACHED</small><b>${room} / 20</b></div><div class="result-stat"><small>ENEMIES SLAIN</small><b>${p.kills}</b></div><div class="result-stat"><small>TOTAL DAMAGE</small><b>${Math.round(p.damageDealt)}</b></div><div class="result-stat"><small>FINAL HP</small><b>${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}</b></div><div class="result-stat"><small>RELICS</small><b>${[...p.items.values()].reduce((a,b)=>a+b,0)}</b></div></div><div class="result-loot"><b style="color:#d8bd8d">사망 여부: ${win?'사망 없음':'사망함'} · 최종 스테이지: ${Math.ceil(room/4)} / 5</b><br><b style="color:#d8bd8d">최종 능력치</b><br>${finalStats}<br><b style="color:#d8bd8d">획득 유물</b><br>${items}</div><div class="btn-row"><button class="game-btn" id="again">다시 시작</button><button class="game-btn secondary" id="home">메인 메뉴</button></div></div>`;
    this.root.querySelector('#again').onclick=()=>this.game.start();
    this.root.querySelector('#home').onclick=()=>this.game.toMenu();
  }
}
