/* ==========================================================================
   통합과학2 수업 웹앱 · 학생 개인 설정 (반 · 이름 · 진도 · 글자 크기)
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.

   ★ 가장 중요한 규칙 ★
   이름은 **이 기기 밖으로 절대 나가지 않습니다.**
   PDF 파일 이름과 학습 기록표에만 쓰이고, 구글로 보내는 응답에는 싣지 않습니다.
   구글로 가는 것은 '반' 뿐이며, 반은 학급 단위라 개인을 가리키지 않습니다.
   이름이 필요한 과제는 이 경로가 아니라 구글 폼·클래스룸으로 보냅니다.
   그 경계선이 이 설계의 안전장치입니다.

   하는 일
     1) ME.get()/ME.ask()   — 반·이름을 한 번만 받아 기기에 저장
     2) ME.mark()/ME.prog() — 차시별 진도(푼 문항 수)와 마지막으로 본 곳
     3) ME.scale()          — 글자 크기 (뒷자리·시력 약한 학생용)
   ========================================================================== */
const ME = (() => {

const K_ME = 'tg2.me', K_PROG = 'tg2.prog', K_SCALE = 'tg2.scale';

/* localStorage 는 사생활 보호 창·저장 차단 설정에서 던집니다.
   그때도 수업은 굴러가야 하므로 전부 감싸고, 실패하면 기억만 못 합니다. */
function read(k, fb){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }catch(e){ return fb; } }
function write(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }

/* ---------- 반 · 이름 ---------- */
let me = read(K_ME, null);
const get = () => me ? { cls: me.cls || '', name: me.name || '' } : null;
const cls  = () => (me && me.cls)  || '';
const name = () => (me && me.name) || '';

function set(c, n){
  me = { cls: String(c || '').trim().slice(0, 12),
         name: String(n || '').trim().slice(0, 20) };
  write(K_ME, me);
  paint();
  document.dispatchEvent(new CustomEvent('tg:me', { detail: get() }));
  return me;
}
function clear(){ try{ localStorage.removeItem(K_ME); }catch(e){} me = null; paint(); }

/* ---------- 진도 ----------
   { "u2-01": { done:["q1","q2"], total:8, at:"sec-3", ts:1724… } }
   done 은 '푼 문항 코드'입니다. 같은 문항을 두 번 풀어도 하나로 셉니다.   */
let prog = read(K_PROG, {});

function mark(code, item, total, at){
  if(!code || !item) return;
  const p = prog[code] || (prog[code] = { done: [], total: 0, at: '', ts: 0 });
  if(!p.done.includes(item)) p.done.push(item);
  if(total) p.total = Math.max(p.total || 0, total);
  if(at) p.at = at;
  p.ts = Date.now();
  write(K_PROG, prog);
}
/* 문항을 풀지 않고 그냥 읽고 지나간 위치도 기억합니다. */
function seen(code, at, total){
  if(!code) return;
  const p = prog[code] || (prog[code] = { done: [], total: 0, at: '', ts: 0 });
  if(at) p.at = at;
  if(total) p.total = Math.max(p.total || 0, total);
  p.ts = Date.now();
  write(K_PROG, prog);
}
const progOf = code => prog[code] || null;
const allProg = () => prog;
function resetProg(code){
  if(code) delete prog[code]; else prog = {};
  write(K_PROG, prog);
}

/* ---------- 글자 크기 ----------
   1 = 보통 · 1.15 = 크게 · 1.3 = 더 크게
   화면 전체를 확대하는 것과 달리 표·그래프의 짜임이 흐트러지지 않습니다. */
const STEPS = [1, 1.15, 1.3];
let scale = Number(read(K_SCALE, 1)) || 1;

function applyScale(){
  document.documentElement.style.setProperty('--tg-scale', scale);
  document.querySelectorAll('[data-scale-btn]').forEach(b => {
    const on = Math.abs(Number(b.dataset.scaleBtn) - scale) < 0.001;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
function setScale(v){
  scale = STEPS.includes(Number(v)) ? Number(v) : 1;
  write(K_SCALE, scale);
  applyScale();
}

/* ---------- 화면 ---------- */
const CSS = `
:root{--tg-scale:1}
.me-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 18px}
.me-who{display:inline-flex;align-items:center;gap:9px;font-size:14px;color:var(--ink-soft);
  border:1px solid var(--rule);border-radius:999px;padding:7px 8px 7px 15px;background:var(--surface)}
.me-who b{color:var(--ink);font-weight:600}
.me-who button{font:inherit;font-size:12.5px;border:1px solid var(--rule);background:var(--surface-2);
  color:var(--ink-soft);border-radius:999px;padding:4px 11px;cursor:pointer}
.me-who button:hover{border-color:var(--accent);color:var(--ink)}
.me-sz{display:inline-flex;align-items:center;gap:6px;margin-left:auto}
.me-sz .lb{font-size:12.5px;color:var(--ink-soft)}
.me-sz button{font:inherit;border:1px solid var(--rule);background:var(--surface);color:var(--ink-soft);
  border-radius:9px;padding:5px 12px;cursor:pointer;line-height:1.1}
.me-sz button:nth-of-type(1){font-size:13px}
.me-sz button:nth-of-type(2){font-size:16px}
.me-sz button:nth-of-type(3){font-size:19px}
.me-sz button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}

/* 반·이름 묻는 창 */
.me-ask{position:fixed;inset:0;z-index:120;background:var(--ground);display:flex;
  align-items:center;justify-content:center;padding:24px;overflow:auto}
.me-ask[hidden]{display:none}
.me-card{width:100%;max-width:420px;background:var(--surface);border:1px solid var(--rule);
  border-radius:18px;padding:32px 30px 26px;box-shadow:var(--shadow)}
.me-card h2{font-family:var(--serif);font-size:22px;margin:0 0 8px;border:0;padding:0}
.me-card .lead{margin:0 0 22px;font-size:14.5px;color:var(--ink-soft);line-height:1.75}
.me-card label{display:block;font-size:13px;color:var(--ink-soft);margin:0 0 7px}
.me-card .fld{margin-bottom:18px}
.me-card input{width:100%;font:inherit;font-size:16px;padding:11px 13px;border:1px solid var(--rule);
  border-radius:11px;background:var(--surface);color:var(--ink)}
.me-card input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-wash)}
.me-cls{display:flex;flex-wrap:wrap;gap:7px}
.me-cls button{font:inherit;font-size:14.5px;border:1px solid var(--rule);background:var(--surface);
  color:var(--ink-soft);border-radius:10px;padding:9px 15px;cursor:pointer}
.me-cls button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}
.me-card .st{font-size:13.5px;color:var(--danger);min-height:1.2em;margin:0 0 12px}
.me-card .foot{margin-top:18px;padding-top:15px;border-top:1px solid var(--rule-soft);
  font-size:12.5px;color:var(--ink-soft);line-height:1.7}
.me-card .later{display:block;width:100%;margin-top:10px;font:inherit;font-size:13.5px;
  border:0;background:none;color:var(--ink-soft);text-decoration:underline;cursor:pointer;padding:8px}
.me-card .later:hover{color:var(--ink)}

@media print{.me-bar .me-sz,.me-who button,.me-ask{display:none !important}}
`;

let styled = false;
function style(){
  if(styled) return; styled = true;
  const st = document.createElement('style'); st.textContent = CSS;
  document.head.appendChild(st);
}

/* 머리말 줄 — 지금 누구인지와 글자 크기 */
function paint(){
  document.querySelectorAll('.me-bar').forEach(bar => {
    const w = bar.querySelector('.me-who');
    if(!w) return;
    w.innerHTML = me
      ? `<span><b>${esc(me.cls)}</b> ${esc(me.name)}</span><button type="button" data-me-edit>바꾸기</button>`
      : `<span>반과 이름을 넣어 두면 편합니다</span><button type="button" data-me-edit>넣기</button>`;
  });
  applyScale();
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* 머리말 줄을 원하는 자리에 꽂습니다. */
function bar(host, clsList){
  style();
  const el = typeof host === 'string' ? document.getElementById(host) : host;
  if(!el) return;
  el.classList.add('me-bar');
  el.innerHTML = `<span class="me-who"></span>
    <span class="me-sz">
      <span class="lb">글자 크기</span>
      <button type="button" data-scale-btn="1"    aria-pressed="false" title="보통">가</button>
      <button type="button" data-scale-btn="1.15" aria-pressed="false" title="크게">가</button>
      <button type="button" data-scale-btn="1.3"  aria-pressed="false" title="더 크게">가</button>
    </span>`;
  if(clsList) CLS = clsList;
  paint();
}

/* ---------- 묻는 창 ---------- */
let CLS = ['1반','2반','3반','4반','5반','6반','7반','8반'];
let dlg = null, pick = '';

function ask(opts){
  style();
  opts = opts || {};
  if(opts.cls && opts.cls.length) CLS = opts.cls;
  pick = cls();

  if(!dlg){
    dlg = document.createElement('div');
    dlg.className = 'me-ask';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'meH');
    document.body.appendChild(dlg);
  }
  dlg.hidden = false;
  document.querySelectorAll('body > :not(.me-ask)').forEach(el => el.setAttribute('inert', ''));
  dlg.innerHTML = `<div class="me-card">
    <h2 id="meH" tabindex="-1">반과 이름</h2>
    <p class="lead">한 번만 넣어 두면 <b>모든 차시</b>에 그대로 쓰입니다.
      받아 가는 PDF 파일 이름과 학습 기록표에 자동으로 들어갑니다.</p>
    <div class="fld">
      <label id="clsLb">반</label>
      <div class="me-cls" role="group" aria-labelledby="clsLb">
        ${CLS.map(c => `<button type="button" data-cls="${esc(c)}"
           class="${c === pick ? 'on' : ''}" aria-pressed="${c === pick}">${esc(c)}</button>`).join('')}
      </div>
    </div>
    <div class="fld">
      <label for="meName">이름</label>
      <input type="text" id="meName" value="${esc(name())}" maxlength="20"
             autocomplete="name" placeholder="예) 최찬환">
    </div>
    <p class="st" id="meSt"></p>
    <button class="btn" type="button" data-me-save style="width:100%">저장</button>
    <button class="later" type="button" data-me-later>나중에 넣을게요</button>
    <p class="foot"><b>이름은 이 기기 밖으로 나가지 않습니다.</b>
      선생님 화면에는 반별 응답 수만 보이고 누가 무엇을 골랐는지는 보이지 않습니다.<br>
      반을 나중에 바꾸면, <b>이미 보낸 답은 앞서 고른 반으로 남습니다.</b></p>
  </div>`;
  setTimeout(() => { try{ dlg.querySelector('#meH').focus(); }catch(e){} }, 60);
}

function close(){
  if(dlg) dlg.hidden = true;
  document.querySelectorAll('body > [inert]').forEach(el => el.removeAttribute('inert'));
}

/* 처음 온 학생에게만 묻습니다.
   이미 넣었거나, 이번 방문에서 '나중에'를 누른 뒤면 조용히 지나갑니다.
   묻는 창이 길을 막아 복습하러 온 학생을 붙잡아 두면 안 됩니다.      */
function skipped(){
  try{ return sessionStorage.getItem('tg2.me.later') === '1'; }catch(e){ return false; }
}
function askOnce(opts){
  if(opts && opts.cls && opts.cls.length) CLS = opts.cls;
  if(!me && !skipped()) ask(opts);
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-cls]');
  if(c && dlg && !dlg.hidden){
    pick = c.dataset.cls;
    dlg.querySelectorAll('[data-cls]').forEach(b => {
      const on = b.dataset.cls === pick;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    return;
  }
  if(e.target.closest('[data-me-save]')){
    const n = (dlg.querySelector('#meName').value || '').trim();
    const st = dlg.querySelector('#meSt');
    if(!pick){ st.textContent = '반을 골라 주세요.'; return; }
    if(!n){ st.textContent = '이름을 넣어 주세요.'; return; }
    set(pick, n); close();
    return;
  }
  if(e.target.closest('[data-me-later]')){
    try{ sessionStorage.setItem('tg2.me.later', '1'); }catch(e2){}
    close(); return;
  }
  if(e.target.closest('[data-me-edit]')){ ask(); return; }
  const s = e.target.closest('[data-scale-btn]');
  if(s){ setScale(s.dataset.scaleBtn); return; }
});

document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && dlg && !dlg.hidden && me) close();
});

applyScale();

return { get, set, clear, cls, name, ask, askOnce, close, bar, paint,
         mark, seen, prog: progOf, allProg, resetProg,
         scale: () => scale, setScale };
})();
