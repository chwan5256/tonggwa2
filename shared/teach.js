/* ==========================================================================
   통합과학2 수업 웹앱 · 교사용 진행 화면
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.

   여는 법 : 차시 주소 뒤에 #t 를 붙이거나, 페이지에서 T 키를 누릅니다.
   조작    : ← →  단계 이동 · Space 다음 · F 전체화면 · R 응답판 · Esc 나가기
   시간    : 각 <section class="step"> 에 data-min="5" 를 적어 두면
             그 절의 배정 시간을 재고, 넘기면 알려 줍니다.
   원칙    : 이 화면에는 정답표를 두지 않습니다. 정답과 해설은 학생 화면이
             즉시 보여주므로, 교사는 여기서 '분포'만 봅니다.
   ========================================================================== */
(() => {

const CSS = `
:root[data-teach]{--teach-pad:clamp(24px,4vw,64px)}
:root[data-teach] body{font-size:clamp(18px,1.35vw,22px);padding-top:64px;background:var(--ground)}
:root[data-teach] .topbar,
:root[data-teach] .mast,
:root[data-teach] footer{display:none}
:root[data-teach] main .wrap{max-width:1340px;padding:0 var(--teach-pad)}
:root[data-teach] section.step{display:none;border:0;padding:26px 0 96px}
:root[data-teach] section.step.tshow{display:block;animation:tin .28s ease}
@keyframes tin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
:root[data-teach] h2{font-size:clamp(30px,3.4vw,46px);margin-bottom:18px}
:root[data-teach] .q{font-size:clamp(26px,2.8vw,40px);line-height:1.45}
:root[data-teach] .lead{font-size:1.12em}
:root[data-teach] .figtitle{font-size:1.15em}
:root[data-teach] .opt{font-size:1.02em;padding:14px 18px}
:root[data-teach] .submit{display:none}
@media (prefers-reduced-motion:reduce){:root[data-teach] section.step.tshow{animation:none}}

/* ── 진행 막대 ── */
.tbar-t{position:fixed;inset:0 0 auto 0;height:64px;z-index:90;display:flex;align-items:center;
  gap:12px;padding:0 16px;background:var(--surface);border-bottom:1px solid var(--rule);
  box-shadow:var(--shadow);font-family:var(--sans)}
.tbar-t .grp{display:flex;align-items:center;gap:7px}
.tbar-t .sp{flex:1}
.tbar-t button{font:inherit;font-size:14px;line-height:1;border:1px solid var(--rule);
  background:var(--surface);color:var(--ink-soft);border-radius:9px;padding:9px 12px;cursor:pointer;
  white-space:nowrap}
.tbar-t button:hover{border-color:var(--accent);color:var(--ink)}
.tbar-t button.key{background:var(--accent);border-color:var(--accent);color:#fff}
.tbar-t .pos{font-family:var(--mono);font-size:13px;color:var(--ink-faint);
  font-variant-numeric:tabular-nums;white-space:nowrap}
.tbar-t .ttl{font-weight:600;font-size:15px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;max-width:26vw}

/* 시계 두 개 — 왼쪽이 이 절, 오른쪽이 전체 */
.tclock{display:flex;align-items:center;gap:10px;padding:5px 12px;border-radius:11px;
  background:var(--surface-2);border:1px solid transparent;transition:background .3s,border-color .3s}
.tclock .lb{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;color:var(--ink-faint);
  text-transform:uppercase}
.tclock .v{font-family:var(--mono);font-size:20px;font-weight:500;color:var(--ink);
  font-variant-numeric:tabular-nums;letter-spacing:.02em;min-width:66px;text-align:right}
.tclock .of{font-family:var(--mono);font-size:12.5px;color:var(--ink-faint)}
.tclock.near{background:var(--ochre-wash);border-color:var(--ochre)}
.tclock.near .v{color:var(--ochre)}
.tclock.over{background:var(--danger-wash);border-color:var(--danger)}
.tclock.over .v,.tclock.over .of{color:var(--danger)}
@media (prefers-reduced-motion:reduce){.tclock{transition:none}}

.tprog{position:fixed;top:64px;left:0;height:3px;background:var(--accent);z-index:91;
  transition:width .3s ease;border-radius:0 3px 3px 0}
@media (prefers-reduced-motion:reduce){.tprog{transition:none}}
@media (max-width:1150px){.tbar-t .ttl{display:none}}
@media (max-width:900px){.tclock .lb{display:none}}

/* 시간 초과 알림 */
.ttoast{position:fixed;left:50%;top:82px;transform:translate(-50%,-16px);z-index:95;
  background:var(--danger);color:#fff;font-size:15px;font-weight:600;padding:12px 22px;
  border-radius:11px;box-shadow:var(--shadow);opacity:0;pointer-events:none;
  transition:opacity .3s ease,transform .3s ease}
.ttoast.on{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.ttoast{transition:none}}

/* ── 응답판 ── */
.tresp{position:fixed;top:64px;right:0;bottom:0;width:min(430px,92vw);z-index:89;
  background:var(--surface);border-left:1px solid var(--rule);box-shadow:var(--shadow);
  transform:translateX(101%);transition:transform .26s cubic-bezier(.4,0,.2,1);
  display:flex;flex-direction:column}
.tresp.on{transform:none}
@media (prefers-reduced-motion:reduce){.tresp{transition:none}}
.tresp header{padding:16px 20px 12px;border-bottom:1px solid var(--rule-soft);display:flex;
  align-items:baseline;gap:10px}
.tresp header h3{margin:0;font-size:16px;font-weight:600;font-family:var(--sans)}
.tresp header .n{font-family:var(--mono);font-size:12.5px;color:var(--ink-faint)}
.tresp .body{overflow:auto;padding:16px 20px 28px;flex:1}
.tresp .item{margin-bottom:22px}
.tresp .item h4{margin:0 0 10px;font-family:var(--mono);font-size:12px;letter-spacing:.06em;
  color:var(--ink-faint);font-weight:400}
.trow{display:grid;grid-template-columns:52px 1fr 58px;align-items:center;gap:10px;margin-bottom:7px}
.trow .lb{font-size:15px;font-weight:600;color:var(--ink)}
.trow .tk{height:22px;border-radius:6px;background:var(--surface-2);overflow:hidden}
.trow .tk i{display:block;height:100%;background:var(--accent);border-radius:6px;width:0;
  transition:width .4s cubic-bezier(.4,0,.2,1)}
.trow .pc{font-family:var(--mono);font-size:13px;color:var(--ink-soft);text-align:right;
  font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.trow .tk i{transition:none}}
.tresp .txts{display:grid;gap:8px}
.tresp .txts p{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink-soft);
  background:var(--surface-2);border-radius:9px;padding:10px 13px}
.tresp .empty{font-size:14px;color:var(--ink-faint);line-height:1.75}
.tresp .ft{padding:12px 20px;border-top:1px solid var(--rule-soft);display:flex;gap:10px;
  align-items:center;font-size:13px;color:var(--ink-faint)}
.tresp .ft button{font:inherit;font-size:13px;border:1px solid var(--rule);background:var(--surface);
  color:var(--ink-soft);border-radius:8px;padding:7px 12px;cursor:pointer}
`;

/* ---------- 상태 ---------- */
let on = false, idx = 0, secs = [], respOpen = false, poll = null;
let bar, prog, resp, toast;
let t0 = null, running = false, elapsed = 0;   // 전체 시계
let secStart = null, warned = false;           // 절 시계
const TOTAL = 50 * 60;

const root = document.documentElement;
const cfg  = () => (typeof LESSON === 'object' && LESSON) || {};
const code = () => cfg().code ||
  (location.pathname.match(/\/(u\d)\/(\d\d)-/) || []).slice(1, 3).join('-') || '';
const now  = () => Date.now() / 1000;
const mmss = v => {
  const neg = v < 0; v = Math.abs(Math.floor(v));
  return (neg ? '−' : '') + String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
};

/* ---------- 화면 만들기 ---------- */
function build(){
  const st = document.createElement('style'); st.textContent = CSS;
  document.head.appendChild(st);

  bar = document.createElement('div');
  bar.className = 'tbar-t';
  bar.innerHTML = `
    <div class="grp">
      <button type="button" data-a="prev" title="이전 (←)">◀</button>
      <button type="button" data-a="next" class="key" title="다음 (→)">다음 ▶</button>
    </div>
    <span class="pos" id="tpos">1 / 1</span>
    <span class="ttl" id="tttl"></span>
    <span class="sp"></span>
    <div class="tclock" id="tsec">
      <span class="lb">이 절</span>
      <span class="v" id="tsecv">--:--</span>
      <span class="of" id="tsecof"></span>
    </div>
    <div class="tclock" id="tall">
      <span class="lb">전체</span>
      <span class="v" id="tallv">00:00</span>
    </div>
    <div class="grp">
      <button type="button" data-a="clock" id="tclockb">시작</button>
      <button type="button" data-a="clockr" title="처음으로">↺</button>
    </div>
    <div class="grp">
      <button type="button" data-a="resp">응답 보기</button>
      <button type="button" data-a="full" title="전체화면 (F)">⛶</button>
      <button type="button" data-a="exit" title="나가기 (Esc)">나가기</button>
    </div>`;
  document.body.appendChild(bar);

  prog = document.createElement('div'); prog.className = 'tprog';
  document.body.appendChild(prog);

  toast = document.createElement('div'); toast.className = 'ttoast';
  document.body.appendChild(toast);

  resp = document.createElement('aside');
  resp.className = 'tresp';
  resp.innerHTML = `
    <header><h3>학생 응답</h3><span class="n" id="tn">—</span></header>
    <div class="body" id="tbody"></div>
    <div class="ft"><span id="tfoot">—</span><span style="flex:1"></span>
      <button type="button" data-a="reload">새로고침</button></div>`;
  document.body.appendChild(resp);

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if(!b) return;
    ({ prev:()=>go(idx-1), next:()=>go(idx+1), exit:off, resp:toggleResp,
       full:fullscreen, clock:toggleClock, clockr:resetClock, reload:load }[b.dataset.a] || (()=>{}))();
  });
}

/* ---------- 단계 이동 ---------- */
function go(i){
  idx = Math.max(0, Math.min(secs.length - 1, i));
  secs.forEach((s, k) => s.classList.toggle('tshow', k === idx));
  document.getElementById('tpos').textContent = `${idx + 1} / ${secs.length}`;
  document.getElementById('tttl').textContent = secs[idx].dataset.nav || '';
  prog.style.width = ((idx + 1) / secs.length * 100).toFixed(1) + '%';
  secStart = now(); warned = false;
  showToast('');
  tick();
  window.scrollTo(0, 0);
  if(location.hash !== '#t') location.hash = 't';
}

/* ---------- 시계 ---------- */
function showToast(msg){
  toast.textContent = msg;
  toast.classList.toggle('on', !!msg);
  if(msg) setTimeout(() => toast.classList.remove('on'), 4200);
}

function tick(){
  /* 전체 */
  const all = elapsed + (running ? now() - t0 : 0);
  document.getElementById('tallv').textContent = mmss(all);
  document.getElementById('tall').classList.toggle('over', all > TOTAL);

  /* 이 절 */
  const box = document.getElementById('tsec');
  const vEl = document.getElementById('tsecv'), ofEl = document.getElementById('tsecof');
  const min = secs.length ? Number(secs[idx].dataset.min || 0) : 0;

  if(!min || secStart == null){
    box.className = 'tclock';
    vEl.textContent = '--:--'; ofEl.textContent = '';
    return;
  }
  const spent = now() - secStart, left = min * 60 - spent;
  vEl.textContent = mmss(left);
  ofEl.textContent = '/ ' + min + '분';
  box.className = 'tclock' + (left < 0 ? ' over' : left < 60 ? ' near' : '');

  if(left < 0 && !warned){
    warned = true;
    showToast(`‘${secs[idx].dataset.nav || ''}’ 배정 ${min}분을 넘겼습니다`);
  }
}

function toggleClock(){
  if(running){ elapsed += now() - t0; running = false; }
  else { t0 = now(); running = true; if(secStart == null) secStart = now(); }
  document.getElementById('tclockb').textContent = running ? '멈춤' : '시작';
  tick();
}
function resetClock(){
  running = false; elapsed = 0; t0 = null; secStart = now(); warned = false;
  document.getElementById('tclockb').textContent = '시작';
  tick();
}

/* ---------- 전체화면 ---------- */
function fullscreen(){
  if(document.fullscreenElement) document.exitFullscreen();
  else if(root.requestFullscreen) root.requestFullscreen();
}

/* ---------- 응답판 ---------- */
function toggleResp(){
  respOpen = !respOpen;
  resp.classList.toggle('on', respOpen);
  if(respOpen){ load(); poll = setInterval(load, 12000); }
  else { clearInterval(poll); poll = null; }
}

const LABEL = {
  'ox-elnino': 'O/X · 엘니뇨는 지구온난화 때문에 생긴다',
  'check'    : '이해도 체크'
};

function load(){
  const body = document.getElementById('tbody');
  const api = cfg().api;
  if(!api){
    body.innerHTML = `<p class="empty">전송 주소가 아직 연결되지 않았습니다.<br>
      차시 파일 아래쪽 <code>LESSON.api</code> 에 Apps Script 웹 앱 주소를 넣어 주세요.</p>`;
    return;
  }
  if(typeof TG2 === 'undefined'){
    body.innerHTML = `<p class="empty"><code>shared/gate.js</code> 가 함께 올라가지 않았습니다.</p>`;
    return;
  }
  TG2.jsonp(api, { mode:'stats', lesson: code(), since: 180 })
    .then(render)
    .catch(() => {
      body.innerHTML = `<p class="empty">불러오지 못했습니다.<br><br>
        ① Apps Script 에서 <b>배포 관리 → 편집 → 새 버전</b>으로 다시 배포했는지<br>
        ② 액세스 권한이 <b>‘링크가 있는 모든 사용자’</b>인지<br>
        두 가지를 확인해 주세요.</p>`;
    });
}

function render(d){
  const body = document.getElementById('tbody');
  document.getElementById('tn').textContent = (d.total || 0) + '명 응답';
  document.getElementById('tfoot').textContent = '최근 3시간 · 12초마다 갱신';

  if(!d.total){
    body.innerHTML = `<p class="empty">아직 응답이 없습니다.<br>학생들이 보내면 여기에 바로 쌓입니다.</p>`;
    return;
  }

  const items = {};
  Object.entries(d.count || {}).forEach(([k, v]) => {
    const [it, ch] = k.split('|');
    (items[it] = items[it] || []).push([ch || '(무응답)', v]);
  });

  let html = '';
  Object.entries(items).forEach(([it, rows]) => {
    const sum = rows.reduce((s, r) => s + r[1], 0);
    rows.sort((a, b) => b[1] - a[1]);
    html += `<div class="item"><h4>${LABEL[it] || it}</h4>` + rows.map(([ch, v]) => {
      const p = Math.round(v / sum * 100);
      return `<div class="trow"><span class="lb">${esc(ch)}</span>
        <span class="tk"><i style="width:${p}%"></i></span>
        <span class="pc">${v}·${p}%</span></div>`;
    }).join('') + `</div>`;
  });

  const texts = (d.texts || []).filter(Boolean).slice(-14).reverse();
  if(texts.length){
    html += `<div class="item"><h4>학생이 쓴 근거 (최근 ${texts.length}개)</h4>
      <div class="txts">${texts.map(t => `<p>${esc(t)}</p>`).join('')}</div></div>`;
  }
  body.innerHTML = html;
}

const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));

/* ---------- 켜기 / 끄기 ---------- */
function onMode(){
  if(on) return;
  if(!bar) build();
  on = true;
  root.setAttribute('data-teach', '');
  secs = [...document.querySelectorAll('section.step')];
  go(0); tick();
}
function off(){
  on = false;
  root.removeAttribute('data-teach');
  secs.forEach(s => s.classList.remove('tshow'));
  if(respOpen) toggleResp();
  if(location.hash === '#t') history.replaceState(null, '', location.pathname);
}

/* ---------- 키 ---------- */
document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if(typing) return;
  if(!on){ if(e.key === 'T' || e.key === 't') onMode(); return; }
  if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown'){ e.preventDefault(); go(idx + 1); }
  else if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); go(idx - 1); }
  else if(e.key === 'Escape') off();
  else if(e.key === 'f' || e.key === 'F') fullscreen();
  else if(e.key === 'r' || e.key === 'R') toggleResp();
});

setInterval(() => { if(on) tick(); }, 500);
if(location.hash === '#t'){
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', onMode);
  else onMode();
}

})();
