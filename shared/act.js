/* ==========================================================================
   통합과학2 수업 웹앱 · 학생 활동 엔진
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.

   제공 활동
     ACT.cloze(sel, items)   빈칸 채우기 — 즉시 채점, 전송하지 않음
     ACT.place(sel, cfg)     그림 위 숫자·낱말 놓기
     ACT.sort(sel, cfg)      카드 분류
     ACT.order(sel, cfg)     순서 맞추기
     ACT.note(sel, cfg)      서술형 + 스스로 점검
     ACT.report(sel, cfg)    오늘 한 것 모아 보기 + PDF 저장

   원칙
     · 채점은 전부 학생 기기 안에서 끝납니다. 정답 판정이 서버로 가지 않습니다.
     · 선생님 화면의 '분포'를 위해 **무엇을 골랐는지만** 익명으로 보냅니다.
       보내는 것 : 차시 코드 · 문항 코드 · 고른 선택지 · (서술형이면) 짧은 문장 · 반
       보내지 않는 것 : 이름 · 학번 · 맞았는지 틀렸는지
     · **이름은 이 기기 밖으로 절대 나가지 않습니다.** PDF와 기록표에만 씁니다.
     · 손가락으로도 되게 만듭니다. 끌어놓기 대신 '고르고 → 놓기'를 씁니다.
   ========================================================================== */
const ACT = (() => {

/* ---------- 익명 전송 ----------
   선생님 진행 화면의 응답 분포를 위해서만 보냅니다.
   fetch 의 no-cors 로 던지고 답은 받지 않습니다(fire-and-forget).
   Apps Script 는 CORS 머리글을 주지 않아 답을 읽으려 하면 막히는데,
   우리는 애초에 답이 필요 없으므로 이 방식이 맞습니다.
   text/plain 을 쓰는 이유는 preflight(OPTIONS) 를 만들지 않기 위해서입니다. */
function send(o){
  const api = (typeof LESSON === 'object' && LESSON && LESSON.api) || '';
  if(!api) return;
  if(location.hash === '#t') return;          /* 교사 진행 화면은 보내지 않습니다 */

  const body = {
    lesson: (typeof LESSON === 'object' && LESSON.code) || '',
    item:   String(o.item   || '').slice(0, 40),
    choice: String(o.choice || '').slice(0, 20),
    text:   String(o.text   || '').slice(0, 300),
    /* 반만 붙입니다. 이름은 붙이지 않습니다 — 이 줄을 고치지 마세요. */
    cls:    (typeof ME === 'object' && ME && ME.cls) ? ME.cls() : ''
  };
  try{
    fetch(api, { method:'POST', mode:'no-cors',
                 headers:{ 'Content-Type':'text/plain;charset=utf-8' },
                 body: JSON.stringify(body) }).catch(() => {});
  }catch(e){}
}

/* ---------- 기록 ---------- */
const REC = { items: [] };
const KEY = () => 'tg-act-' + (location.pathname.replace(/\W+/g, '-'));

function put(o){
  const i = REC.items.findIndex(x => x.id === o.id);
  if(i < 0) REC.items.push(o); else REC.items[i] = o;
  try{ localStorage.setItem(KEY(), JSON.stringify(REC.items)); }catch(e){}
  /* '방금 바뀐 항목'을 함께 실어 보냅니다.
     같은 id 는 제자리 교체되므로 '배열의 마지막 = 방금 바뀐 것'이 아닙니다. */
  document.dispatchEvent(new CustomEvent('act:change', { detail: o }));
}
function saved(){
  try{ return JSON.parse(localStorage.getItem(KEY()) || '[]'); }catch(e){ return []; }
}
const esc = s => String(s == null ? '' : s)
  .replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
const secOf = el => {
  const s = el.closest('section.step');
  return s ? (s.dataset.nav || s.id) : '';
};

/* lib.js 의 객관식 결과도 함께 모읍니다 */
document.addEventListener('tg:quiz', e => {
  const d = e.detail;
  const item = 'quiz-' + d.host + '-' + d.i;
  put({ id:item, sec:d.sec, kind:'객관식', q:d.stem, my:d.picked, ans:d.answer, ok:d.ok });
  /* 맞았는지(ok)는 보내지 않습니다. 무엇을 골랐는지만 보냅니다. */
  send({ item, choice: d.picked });
});

/* 진도 기록 — 몇 문항을 풀었고 어디까지 봤는지 (기기 안에만) */
document.addEventListener('act:change', e => {
  if(typeof ME !== 'object' || !ME || !ME.mark) return;
  const code = (typeof LESSON === 'object' && LESSON.code) || '';
  const it = e.detail;
  if(!code || !it) return;
  ME.mark(code, it.id, countAsk(), it.sec || '');
});

/* ---------- 진도의 분모 ----------
   기록은 '빈칸 하나'·'슬롯 하나'·'카드 한 장' 단위로 남습니다.
   그래서 분모도 같은 단위로 세야 합니다.
   문장 덩어리(.ci)를 세면 분모가 실제보다 작아져
   절반만 풀어도 '다 풀었습니다'가 떠 버립니다.
   각 활동이 만들 때 스스로 등록한 수를 쓰고, 없으면 DOM 으로 셉니다. */
let ASK_N = 0;
function askAdd(n){ ASK_N += Number(n) || 0; }
function countAsk(){
  /* 객관식은 lib.js 의 TG.quiz 가 그리므로 여기서 등록되지 않습니다.
     화면에 그려진 문항 수를 그때그때 세어 더합니다. */
  const quiz = document.querySelectorAll('.qi').length;
  if(ASK_N || quiz) return ASK_N + quiz;
  return document.querySelectorAll('.blank, .noteg, .sortg .card, .slot, [data-ask]').length || 0;
}

/* ==========================================================================
   빈칸 채우기
   items: [{ t:'온실기체가 흡수하는 것은 {{0}} 이다.',
             blanks:[{ opts:['태양복사','지구복사'], ans:1, fb:'…' }] }]
   ========================================================================== */
function cloze(sel, items){
  const host = document.querySelector(sel);
  if(!host) return;
  askAdd(items.reduce((n, it) => n + (it.blanks ? it.blanks.length : 0), 0));
  host.classList.add('cloze');
  host.innerHTML = items.map((it, i) => {
    let n = -1;
    const body = esc(it.t).replace(/\{\{(\d+)\}\}/g, (_, k) => {
      n++;
      return `<button class="blank" data-i="${i}" data-k="${k}" type="button"
                aria-label="빈칸 ${+k + 1}"><span>?</span></button>`;
    });
    return `<div class="ci" data-i="${i}">
      <p class="s"><span class="n">${i + 1}</span><span class="tx">${body}</span></p>
      <div class="pick" role="listbox" hidden></div>
      <p class="fb" hidden></p>
    </div>`;
  }).join('');

  let open = null;

  host.addEventListener('click', ev => {
    const bl = ev.target.closest('.blank');
    if(bl){ openPicker(bl); return; }
    const op = ev.target.closest('.pk');
    if(op) choose(op);
  });
  document.addEventListener('click', ev => {
    if(!open) return;
    if(ev.target.closest('.blank') || ev.target.closest('.pick')) return;
    host.querySelectorAll('.pick').forEach(b => b.hidden = true);
    host.querySelectorAll('.blank').forEach(b => b.classList.remove('act'));
    open = null;
  });

  function openPicker(bl){
    const ci = bl.closest('.ci'), i = +bl.dataset.i, k = +bl.dataset.k;
    const box = ci.querySelector('.pick');
    if(open && open.bl === bl){ box.hidden = true; open = null; return; }
    open = { bl, i, k };
    box.innerHTML = items[i].blanks[k].opts
      .map((o, j) => `<button class="pk" type="button" role="option" data-j="${j}">${esc(o)}</button>`).join('');
    box.hidden = false;
    /* 빈칸 바로 아래에 붙입니다 */
    box.style.left = Math.max(8, bl.offsetLeft) + 'px';
    box.style.top  = (bl.offsetTop + bl.offsetHeight + 7) + 'px';
    ci.querySelectorAll('.blank').forEach(b => b.classList.toggle('act', b === bl));
  }

  function choose(op){
    if(!open) return;
    const { bl, i, k } = open;
    const j = +op.dataset.j, b = items[i].blanks[k];
    const ok = j === b.ans;
    bl.innerHTML = `<span>${esc(b.opts[j])}</span>`;
    bl.className = 'blank ' + (ok ? 'right' : 'wrong');
    const ci = bl.closest('.ci');
    ci.querySelector('.pick').hidden = true;
    open = null;

    const fb = ci.querySelector('.fb');
    if(!ok){
      fb.className = 'fb wrong';
      fb.innerHTML = `<b>다시 볼 지점.</b> ${b.fb || ''} 정답은 <b>${esc(b.opts[b.ans])}</b>입니다.`;
      fb.hidden = false;
      setTimeout(() => {
        bl.innerHTML = `<span>${esc(b.opts[b.ans])}</span>`;
        bl.className = 'blank fixed';
      }, 1500);
    } else {
      fb.className = 'fb right';
      if(b.fb){ fb.innerHTML = `<b>맞았습니다.</b> ${b.fb}`; fb.hidden = false; }
      setTimeout(() => { bl.className = 'blank fixed'; }, 900);
    }

    put({ id:`cloze-${sel}-${i}-${k}`, sec:secOf(host), kind:'빈칸',
          q:items[i].t.replace(/\{\{\d+\}\}/g, '____'),
          my:b.opts[j], ans:b.opts[b.ans], ok });
  }
}

/* ==========================================================================
   그림 위에 놓기
   cfg = { chips:['30','50','70'], slots:[{ el:'#sl1', ans:'30', fb:'' }, …] }
   슬롯은 HTML 에 <button class="slot" id="sl1"></button> 로 미리 둡니다.
   ========================================================================== */
function place(sel, cfg){
  askAdd((cfg && cfg.slots ? cfg.slots.length : 0));
  const host = document.querySelector(sel);
  if(!host) return;
  const tray = document.createElement('div');
  tray.className = 'tray';
  tray.innerHTML = `<span class="lb">숫자를 고른 뒤, 그림의 빈칸을 누르세요</span>` +
    cfg.chips.map(c => `<button class="pill chip" type="button" data-v="${esc(c)}">${esc(c)}</button>`).join('');
  host.appendChild(tray);

  let sel_ = null;
  tray.addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if(!c) return;
    sel_ = (sel_ === c) ? null : c;
    tray.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === sel_));
  });

  cfg.slots.forEach((s, i) => {
    const el = document.querySelector(s.el);
    if(!el) return;
    el.addEventListener('click', () => {
      if(!sel_){ el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); return; }
      const v = sel_.dataset.v, ok = String(v) === String(s.ans);
      el.textContent = v;
      el.className = 'slot ' + (ok ? 'right' : 'wrong');
      if(!ok) setTimeout(() => { el.textContent = s.ans; el.className = 'slot fixed'; }, 1300);
      sel_.classList.remove('on'); sel_ = null;
      put({ id:`place-${sel}-${i}`, sec:secOf(host), kind:'그림 채우기',
            q:s.q || s.el, my:v, ans:s.ans, ok });
    });
  });
}

/* ==========================================================================
   카드 분류
   cfg = { bins:[{id,name}], cards:[{t, bin, why}] }
   ========================================================================== */
function sort(sel, cfg){
  askAdd((cfg && cfg.cards ? cfg.cards.length : 0));
  const host = document.querySelector(sel);
  if(!host) return;
  host.classList.add('sortg');
  host.innerHTML = `
    <div class="deck" id="${id(sel)}-deck">${cfg.cards.map((c, i) =>
      `<button class="pill card" type="button" data-i="${i}">${esc(c.t)}</button>`).join('')}</div>
    <div class="bins">${cfg.bins.map(b => {
      const n = cfg.cards.filter(c => c.bin === b.id).length;
      return `<div class="bin" data-b="${b.id}"><p class="bh">${esc(b.name)}<i>${n}장</i></p>
        <div class="drop"></div></div>`; }).join('')}</div>
    <p class="fb" id="${id(sel)}-fb" hidden></p>`;

  let pick = null;
  const fb = host.querySelector('.fb');

  host.addEventListener('click', e => {
    const c = e.target.closest('.card');
    if(c && !c.disabled){
      pick = (pick === c) ? null : c;
      host.querySelectorAll('.card').forEach(x => x.classList.toggle('on', x === pick));
      return;
    }
    const bin = e.target.closest('.bin');
    if(bin && pick){
      const i = +pick.dataset.i, card = cfg.cards[i];
      const ok = card.bin === bin.dataset.b;
      pick.classList.remove('on');
      pick.classList.add(ok ? 'right' : 'wrong');
      pick.disabled = true;
      if(ok){
        pick.className = 'pill card right';
        bin.querySelector('.drop').appendChild(pick);
        fb.hidden = true;
      } else {
        const right = cfg.bins.find(b => b.id === card.bin);
        fb.innerHTML = `<b>다시 볼 지점.</b> ‘${esc(card.t)}’ 은 <b>${esc(right ? right.name : '')}</b> 입니다. ${esc(card.why || '')}`;
        fb.hidden = false;
        setTimeout(() => {
          pick.className = 'pill card done';
          host.querySelector(`.bin[data-b="${card.bin}"] .drop`).appendChild(pick);
        }, 1500);
      }
      put({ id:`sort-${sel}-${i}`, sec:secOf(host), kind:'분류',
            q:card.t, my:bin.querySelector('.bh').textContent,
            ans:(cfg.bins.find(b => b.id === card.bin) || {}).name, ok });
      pick = null;
    }
  });
}

/* ==========================================================================
   서술형 + 스스로 점검
   cfg = { prompt, ph, model, checks:[ '…', '…' ] }
   ========================================================================== */
function note(sel, cfg){
  const host = document.querySelector(sel);
  if(!host) return;
  askAdd(1);
  const uid = id(sel);
  host.classList.add('noteg');
  host.innerHTML = `
    <p class="pr">${cfg.prompt}</p>
    <textarea id="${uid}-ta" placeholder="${esc(cfg.ph || '여기에 쓰세요')}"></textarea>
    <div class="btnrow"><button class="btn" type="button" id="${uid}-go">다 썼습니다</button></div>
    <div class="after" id="${uid}-af" hidden>
      <div class="model"><p class="mh">모범 답안의 뼈대</p>${cfg.model}</div>
      <p class="ch">내 답안과 견주어 보세요. 들어 있으면 체크합니다.</p>
      <div class="checks">${cfg.checks.map((c, i) =>
        `<label><input type="checkbox" data-i="${i}"><span>${c}</span></label>`).join('')}</div>
    </div>`;

  const ta = document.getElementById(uid + '-ta');
  const record = () => {
    const got = [...host.querySelectorAll('.checks input')].filter(x => x.checked).length;
    put({ id:'note-' + sel, sec:secOf(host), kind:'서술형',
          q:cfg.prompt.replace(/<[^>]+>/g, ''), my:ta.value.trim(),
          ans:`스스로 점검 ${got}/${cfg.checks.length}`, ok:got === cfg.checks.length });
  };
  document.getElementById(uid + '-go').addEventListener('click', () => {
    if(!ta.value.trim()){ ta.focus(); return; }
    document.getElementById(uid + '-af').hidden = false;
    /* 선생님 화면에 문장 몇 개를 익명으로 띄웁니다. 이름은 붙지 않습니다. */
    send({ item:'note-' + sel, text: ta.value.trim().slice(0, 300) });
    record();
  });
  host.addEventListener('change', e => { if(e.target.matches('.checks input')) record(); });
}

/* ==========================================================================
   오늘 한 것 모아 보기 + PDF 저장
   ========================================================================== */
/* 위에서 한 번 넣어 둔 반·이름을 가져옵니다. 없으면 빈 칸으로 둡니다. */
function meLabel(){
  if(typeof ME !== 'object' || !ME || !ME.get) return '';
  const m = ME.get();
  return m ? [m.cls, m.name].filter(Boolean).join(' ') : '';
}

function report(sel, cfg){
  const host = document.querySelector(sel);
  if(!host) return;
  const uid = id(sel);
  host.innerHTML = `
    <div class="rep">
      <div class="rrow">
        <label for="${uid}-nm">이름 <span>(내 파일에만 쓰입니다. 전송되지 않습니다)</span></label>
        <input id="${uid}-nm" type="text" value="${esc(meLabel())}"
               placeholder="예: 1학년 3반 홍길동" autocomplete="off">
      </div>
      <div class="stat" id="${uid}-st"></div>
      <div class="btnrow">
        <button class="btn" type="button" id="${uid}-pdf">PDF로 저장</button>
        <button class="btn ghost" type="button" id="${uid}-see">내가 쓴 것 보기</button>
      </div>
      <div class="prev" id="${uid}-pv" hidden></div>
    </div>
    <div id="tg-print" aria-hidden="true"></div>`;

  const st = document.getElementById(uid + '-st');
  const pv = document.getElementById(uid + '-pv');

  /* 위쪽 '내 정보'에서 반·이름을 뒤늦게 넣어도 이 칸이 따라옵니다. */
  document.addEventListener('tg:me', () => {
    const el = document.getElementById(uid + '-nm');
    if(el && !el.value.trim()) el.value = meLabel();
  });

  function refresh(){
    const g = REC.items.filter(x => x.ok != null);
    const ok = g.filter(x => x.ok).length;
    st.innerHTML = `<b>${REC.items.length}</b>개 활동 · 한 번에 맞힌 것 <b>${ok}</b>개`;
  }
  document.addEventListener('act:change', refresh);
  refresh();

  function table(){
    const bySec = {};
    REC.items.forEach(x => (bySec[x.sec || '기타'] = bySec[x.sec || '기타'] || []).push(x));
    return Object.entries(bySec).map(([s, rows]) => `
      <h3>${esc(s)}</h3>
      <table><thead><tr><th>활동</th><th>문항</th><th>내 답</th><th>정답</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${esc(r.kind)}</td>
        <td>${esc(r.q).slice(0, 120)}</td>
        <td class="${r.ok === false ? 'x' : ''}">${esc(r.my)}</td>
        <td>${esc(r.ans)}</td></tr>`).join('')}</tbody></table>`).join('');
  }

  document.getElementById(uid + '-see').addEventListener('click', () => {
    pv.hidden = !pv.hidden;
    if(!pv.hidden) pv.innerHTML = REC.items.length ? table()
      : '<p class="empty">아직 푼 것이 없습니다. 위로 올라가 활동을 해 보세요.</p>';
  });

  /* 인쇄 창을 바로 띄우면 '대상'이 실제 프린터로 잡혀 있어
     아무 일도 일어나지 않은 것처럼 보입니다. 두 단계를 먼저 알려 줍니다. */
  function askPdf(){
    let mask = document.getElementById('tg-pdfmask');
    if(!mask){
      mask = document.createElement('div');
      mask.id = 'tg-pdfmask';
      mask.className = 'pdfmask';
      mask.innerHTML = `<div class="pdfbox" role="dialog" aria-modal="true" aria-label="PDF로 저장하는 방법">
        <h3>PDF로 저장하는 방법</h3>
        <p class="lead2">잠시 뒤 <b>인쇄 창</b>이 열립니다. 두 가지만 확인하세요.</p>
        <ol>
          <li>왼쪽 <b>대상(프린터)</b>을 <b>‘PDF로 저장’</b>으로 바꿉니다</li>
          <li>아래 <b>저장</b>을 누르고 파일 이름을 정합니다</li>
        </ol>
        <p class="hint"><b>아이패드·크롬북</b>이라면 공유 단추에서 ‘프린트’를 고른 뒤,
          미리보기를 두 손가락으로 벌리면 PDF로 저장할 수 있습니다.<br>
          창이 안 열리면 키보드 <b>Ctrl</b>+<b>P</b>(맥은 <b>⌘</b>+<b>P</b>)를 눌러도 됩니다.</p>
        <div class="row">
          <button class="btn ghost" type="button" data-x="no">닫기</button>
          <button class="btn" type="button" data-x="go">인쇄 창 열기</button>
        </div>
      </div>`;
      document.body.appendChild(mask);
      mask.addEventListener('click', e => {
        if(e.target === mask || e.target.dataset.x === 'no'){ mask.hidden = true; return; }
        if(e.target.dataset.x === 'go'){ mask.hidden = true; makePdf(); }
      });
      document.addEventListener('keydown', e => {
        if(e.key === 'Escape' && !mask.hidden) mask.hidden = true;
      });
    }
    mask.hidden = false;
    mask.querySelector('[data-x="go"]').focus();
  }

  function makePdf(){
    const nm = document.getElementById(uid + '-nm').value.trim() || meLabel();
    const d = new Date();
    const ymd = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
    document.getElementById('tg-print').innerHTML = `
      <div class="phd">
        <p class="pk2">${esc(cfg.school || '')} · ${esc(cfg.term || '')}</p>
        <h1>${esc(cfg.title || document.title)}</h1>
        <p class="pm">${esc(cfg.std || '')} · ${esc(cfg.topic || '')}</p>
        <p class="pn">${nm ? '이름 ' + esc(nm) + ' · ' : ''}${ymd}</p>
      </div>
      ${REC.items.length ? table() : '<p>기록된 활동이 없습니다.</p>'}
      <p class="pf">이 문서는 학생 본인의 기기에서 만들어졌습니다. 답안은 어디에도 전송되지 않았습니다.</p>`;
    /* 접혀 있던 것을 모두 펴고 인쇄합니다 */
    document.querySelectorAll('details').forEach(d => d.open = true);
    /* 저장되는 파일 이름은 문서 제목을 따라갑니다 */
    const old = document.title;
    document.title = [(cfg.title || old).replace(/[\\/:*?"<>|]/g, ' '), nm].filter(Boolean).join('_');
    window.print();
    setTimeout(() => { document.title = old; }, 1200);
  }
  document.getElementById(uid + '-pdf').addEventListener('click', askPdf);

  /* 새로고침해도 남아 있게 */
  const old = saved();
  if(old.length){ REC.items = old; refresh(); }

  /* 아래 고정 막대 — 어디서든 바로 받을 수 있게 */
  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.innerHTML = `<div class="wrap">
    <span class="info" id="${uid}-di">이 페이지의 <b>모든 내용과 내가 푼 기록</b>을 한 파일로 받습니다</span>
    <button class="btn ghost" type="button" id="${uid}-up">위로</button>
    <button class="btn" type="button" id="${uid}-dl">PDF 받기</button>
  </div>`;
  document.body.appendChild(dock);
  document.getElementById(uid + '-up')
    .addEventListener('click', () => host.scrollIntoView({ behavior:'smooth', block:'start' }));
  document.getElementById(uid + '-dl').addEventListener('click', askPdf);

  document.addEventListener('act:change', () => {
    const g = REC.items.filter(x => x.ok != null);
    document.getElementById(uid + '-di').innerHTML =
      `푼 활동 <b>${REC.items.length}</b>개 · 한 번에 맞힌 것 <b>${g.filter(x => x.ok).length}</b>개`;
  });
}

let seq = 0;
function id(){ return 'a' + (++seq); }

return { cloze, place, sort, note, report, put, send, countAsk,
         items: () => REC.items };
})();
