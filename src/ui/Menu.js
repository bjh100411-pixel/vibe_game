import { ENEMIES } from '../data/enemies.js';
import { BOSSES } from '../data/bosses.js';
import { ITEMS } from '../data/items.js';

export class Menu{
  constructor(game){this.game=game;this.root=document.getElementById('overlay');}
  hide(){this.root.innerHTML='';}
  menu(){
    this.game.ui.showHud(false);
    const controls=this.game.input.isMobile
      ? '<div class="control-line"><b>조이스틱</b> 왼쪽 이동</div><div class="control-line"><b>자동 공격</b> 가장 가까운 적 조준</div><div class="control-line"><b>회피 버튼</b> 대시</div><div class="control-line"><b>필살기</b> 영혼 폭발</div><div class="control-line"><b>Ⅱ 버튼</b> 일시정지</div><div class="control-line"><b>목표</b> 20개 방 생존</div>'
      : '<div class="control-line"><b>W A S D</b> 이동</div><div class="control-line"><b>마우스</b> 조준 · 공격</div><div class="control-line"><b>SPACE</b> 회피 대시</div><div class="control-line"><b>Q</b> 영혼 폭발</div><div class="control-line"><b>ESC</b> 일시정지</div><div class="control-line"><b>목표</b> 20개 방 생존</div>';
    this.root.innerHTML=`<div class="modal"><div class="eyebrow">A DARK FANTASY ROGUELIKE</div><div class="game-title">ASHEN VEIL</div><div class="ornament"></div><div class="subtitle">잿빛 장막 아래, 살아남은 자만이 왕좌에 오른다.<br>방을 돌파하고 유물을 모아 심연의 군주를 쓰러뜨려라.</div><div class="controls">${controls}</div><div class="btn-row"><button class="game-btn" id="start-game">게임 시작</button><button class="game-btn secondary" id="settings-btn">사운드 설정</button></div><div class="subtitle" style="font-size:10px;margin-bottom:0">5 STAGES · 20 ROOMS · 36 RELICS · 3 BOSSES</div></div>`;
    this.root.querySelector('#start-game').onclick=()=>this.game.start();
    this.root.querySelector('#settings-btn').onclick=()=>this.settings();
  }
  settings(){
    this.root.innerHTML=`<div class="modal"><div class="eyebrow">SYSTEM</div><div class="section-title">사운드 설정</div><div class="subtitle">배경 앰비언트와 전투 효과음은 브라우저 오디오로 생성됩니다.</div><div class="btn-row"><button class="game-btn secondary" id="mute-toggle">${this.game.audio.muted?'소리 켜기':'소리 끄기'}</button><button class="game-btn" id="back">돌아가기</button></div></div>`;
    this.root.querySelector('#mute-toggle').onclick=()=>{const muted=this.game.audio.toggle();this.root.querySelector('#mute-toggle').textContent=muted?'소리 켜기':'소리 끄기';};
    this.root.querySelector('#back').onclick=()=>this.menu();
  }
  pause(tab='items'){
    const relicCount=[...(this.game.player?.items?.values()||[])].reduce((sum,n)=>sum+n,0);
    this.root.innerHTML=`<div class="modal wide pause-modal"><div class="eyebrow">PAUSED · FIELD ARCHIVE</div><div class="section-title">시간이 멈췄다</div><div class="subtitle">획득한 유물을 확인하거나 적과 보스의 정보를 살펴볼 수 있습니다.</div><div class="pause-tabs"><button class="pause-tab" id="tab-items" type="button">획득 아이템 <span>${relicCount}</span></button><button class="pause-tab" id="tab-codex" type="button">적 도감 <span>${Object.keys(ENEMIES).length+Object.keys(BOSSES).length}</span></button></div><div id="pause-content" class="pause-content"></div><div class="btn-row"><button class="game-btn" id="resume">계속하기</button><button class="game-btn secondary" id="restart">처음부터</button><button class="game-btn danger" id="home">메인 메뉴</button></div></div>`;
    this.root.querySelector('#tab-items').onclick=()=>this.renderPauseTab('items');
    this.root.querySelector('#tab-codex').onclick=()=>this.renderPauseTab('codex');
    this.root.querySelector('#resume').onclick=()=>this.game.resume();
    this.root.querySelector('#restart').onclick=()=>this.game.start();
    this.root.querySelector('#home').onclick=()=>this.game.toMenu();
    this.renderPauseTab(tab);
  }
  renderPauseTab(tab='items'){
    const itemTab=this.root.querySelector('#tab-items');
    const codexTab=this.root.querySelector('#tab-codex');
    const content=this.root.querySelector('#pause-content');
    if(!content)return;
    itemTab?.classList.toggle('active',tab==='items');
    codexTab?.classList.toggle('active',tab==='codex');
    if(tab==='items'){
      const player=this.game.player;
      const entries=[...(player?.items?.entries()||[])];
      const total=entries.reduce((sum,[,count])=>sum+count,0);
      const cards=entries.map(([id,count])=>{
        const item=player.catalog?.(id)||ITEMS.find(x=>x.id===id);
        if(!item)return '';
        return `<article class="owned-item-card grade-${item.grade}"><div class="owned-item-icon">${item.icon}</div><div class="owned-item-copy"><div class="owned-item-heading"><b>${item.name}</b><span class="owned-item-grade">${item.grade} GRADE</span></div><p>${item.desc}</p><small>${item.stackable?'중복 획득 가능':'중복 획득 불가'}</small></div><span class="owned-item-count">×${count}</span></article>`;
      }).join('');
      content.innerHTML=`<section class="owned-items-section"><div class="archive-heading"><h3>현재 보유 유물</h3><span>${entries.length}종 · 총 ${total}개</span></div>${cards?`<div class="owned-items-grid">${cards}</div>`:'<div class="archive-empty"><b>아직 획득한 아이템이 없습니다.</b><span>방을 클리어하고 보상을 선택해 유물을 모아보세요.</span></div>'}</section>`;
      return;
    }
    const enemyAbility={
      grunter:'플레이어를 추격해 근접 공격한다.',archer:'거리를 유지하며 직선 투사체를 발사한다.',runner:'멀리 있을 때 이동 속도가 크게 증가해 돌진한다.',tank:'느리지만 높은 체력과 강한 근접 공격을 가진다.',bomber:'플레이어에게 접근한 뒤 폭발해 주변에 큰 피해를 준다.',summoner:'거리를 유지하며 주기적으로 추가 적을 소환한다.',mage:'플레이어 위치에 잠시 후 폭발하는 마법 장판을 생성한다.',stalker:'플레이어 주변 안전 반경 바깥쪽으로 순간이동한 뒤 근접 공격한다.'
    };
    const enemyCards=Object.entries(ENEMIES).map(([id,e])=>`<article class="codex-card"><div class="codex-icon" style="color:${e.color}">${e.icon}</div><div class="codex-copy"><b>${e.name}</b><p>${enemyAbility[id]}</p><small>체력 ${e.hp} · 공격력 ${e.damage} · 경험치 ${e.xp}</small></div></article>`).join('');
    const bossAbility={
      bloodKnight:'돌진: 예고 중 플레이어 방향을 추적한 뒤 마지막 방향으로 돌진 · 혈월 부채꼴: 여러 발의 탄환을 넓게 발사 · 낙하 강타: 플레이어 위치에 원형 충격파',
      furnaceBeast:'잿불 고리: 사방으로 화염탄 발사 · 화염우: 여러 지점에 폭발 장판 생성 · 화염 기둥과 연속 잿불 탄막 · 하수인 소환',
      abyssSovereign:'공허 십자포: 네 방향으로 탄막 발사 · 공허 파동: 원형 탄막과 중심 충격파 · 돌진 · 그림자 하수인 소환 · 부채꼴 탄막'
    };
    const bossCards=Object.values(BOSSES).map(b=>`<article class="codex-card boss-codex"><div class="codex-icon" style="color:${b.color}">♛</div><div class="codex-copy"><b>${b.name}</b><p>${bossAbility[b.id]}</p><small>기본 체력 ${b.hp} · 공격력 ${b.damage}</small></div></article>`).join('');
    content.innerHTML=`<section class="codex-section"><h3>일반 적 도감 <span>${Object.keys(ENEMIES).length}종</span></h3><div class="codex-grid">${enemyCards}</div></section><section class="codex-section"><h3>보스 도감 <span>${Object.keys(BOSSES).length}종</span></h3><div class="codex-grid boss-grid">${bossCards}</div></section>`;
  }
}
