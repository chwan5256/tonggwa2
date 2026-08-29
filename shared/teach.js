/* ==========================================================================
   통합과학2 수업 웹앱 · 교사용 진행 화면
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.

   여는 법 : 차시 주소 뒤에 #t 를 붙이거나, 페이지에서 T 키를 누릅니다.
   조작    : ← →  단계 이동 · Space 다음 · F 전체화면 · R 응답판 · Esc 나가기
   시간    : 각 <section class="step"> 에 data-min="5" 를 적어 두면
             그 절의 배정 시간을 재고, 넘기면 알려 줍니다.
             절 시간의 합은 40분입니다. 나머지 10분(출석·환기·기기 접속·마무리)은
             수업 앞뒤로 빼 두었습니다.
   영상    : <div class="teach-only" data-yt="영상ID"> 는 진행 화면에서만 보입니다.
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
.teach-only{display:none}
:root[data-teach] .teach-only{display:block;margin:22px 0}
.ytbox{background:#000;border-radius:14px;overflow:hidden;aspect-ratio:16/9;position:relative}
.ytbox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.ytnone{background:var(--surface-2);border:1px dashed var(--rule);border-radius:14px;
  padding:26px 28px;text-align:center}
.ytnone p{margin:0 0 8px;font-size:16px;font-weight:600;color:var(--ink)}
.ytnone span{font-size:14px;color:var(--ink-soft);line-height:1.7;display:block}
.ytnone code{font-size:13px}
.ytcap{margin:10px 2px 0;font-size:14px;color:var(--ink-faint)}
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
.tbar-t button.key{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.tbar-t .hublink{font-size:14px;line-height:1;border:1px solid var(--rule);border-radius:9px;
  padding:9px 12px;white-space:nowrap;text-decoration:none;color:var(--ink-soft);background:var(--surface)}
.tbar-t .hublink:hover{border-color:var(--accent);color:var(--ink);text-decoration:none}
@media (max-width:900px){.tbar-t .hublink{padding:9px 10px;font-size:0}
  .tbar-t .hublink::before{content:"←";font-size:14px}}
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
  background:var(--danger);color:var(--on-accent);font-size:15px;font-weight:600;padding:12px 22px;
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
.tclsbar{display:flex;flex-wrap:wrap;gap:6px;padding:11px 20px;border-bottom:1px solid var(--rule-soft)}
.tclsbar button{font:inherit;font-size:13px;line-height:1;border:1px solid var(--rule);
  background:var(--surface);color:var(--ink-soft);border-radius:999px;padding:6px 13px;cursor:pointer}
.tclsbar button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}
.tclsbar .cnt{font-size:11px;opacity:.75;margin-left:4px}

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

/* 진행 화면 입장 문 — 교사 페이지와 같은 두 단계(허용 계정 → 비밀번호) */
const DOOR_CSS = `
.tdoor{position:fixed;inset:0;z-index:200;background:var(--ground);display:flex;
  align-items:center;justify-content:center;padding:24px;overflow:auto}
.tdoor[hidden]{display:none}
.tdoor .card{width:100%;max-width:430px;background:var(--surface);border:1px solid var(--rule);
  border-radius:18px;padding:30px 28px 24px;box-shadow:var(--shadow)}
.tdoor h2{font-family:var(--serif);font-size:21px;margin:0 0 8px;border:0;padding:0}
.tdoor .lead{margin:0 0 20px;font-size:14.5px;line-height:1.75;color:var(--ink-soft)}
.tdoor label{display:block;font-size:13px;color:var(--ink-soft);margin:0 0 7px}
.tdoor input{width:100%;font:inherit;font-size:16px;padding:11px 13px;border:1px solid var(--rule);
  border-radius:11px;background:var(--surface);color:var(--ink)}
.tdoor input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-wash)}
.tdoor .fld{margin-bottom:16px}
.tdoor fieldset{border:0;padding:0;margin:0}
.tdoor fieldset[disabled]{opacity:.45}
.tdoor .st{font-size:13.5px;min-height:1.2em;margin:0 0 12px;color:var(--ink-soft)}
.tdoor .st.no{color:var(--danger)}
.tdoor .st.ok{color:var(--accent)}
.tdoor .btn{width:100%;font:inherit;font-size:15px;border:1px solid var(--accent);
  background:var(--accent);color:var(--on-accent);border-radius:11px;padding:11px;cursor:pointer}
.tdoor .btn[disabled]{opacity:.5;cursor:default}
.tdoor .out{display:block;width:100%;margin-top:10px;font:inherit;font-size:13.5px;border:0;
  background:none;color:var(--ink-soft);text-decoration:underline;cursor:pointer;padding:8px}
.tdoor .foot{margin-top:16px;padding-top:14px;border-top:1px solid var(--rule-soft);
  font-size:12.5px;line-height:1.7;color:var(--ink-soft)}
`;

/* ---------- 상태 ---------- */
let on = false, idx = 0, secs = [], respOpen = false, poll = null;
let bar, prog, resp, toast;
/* 교사 화면의 [진행 화면 열기] 로 왔는지.
   ★ 이 값은 **통행 근거가 아닙니다.** 학생도 주소창에 ?t=1 을 칠 수 있습니다.
   문을 자동으로 띄울지 결정하는 데에만 씁니다. 통행은 아래 door() 가 정합니다. */
const CAME_FROM_TEACHER = /[?&]t=1/.test(location.search) ||
  (document.referrer || '').includes('teacher.html');

let CLS_PICK = '';                             // '' = 전체 반
let CLS_LIST = [];                             // 서버에서 받은 반 목록
let t0 = null, running = false, elapsed = 0;   // 전체 시계
let secStart = null, warned = false;           // 절 시계
const TOTAL = 40 * 60;   /* 실제 수업 40분 · 출석·환기·접속·마무리 10분은 따로 */

const root = document.documentElement;
const cfg  = () => (typeof LESSON === 'object' && LESSON) || {};

/* 교사 화면에서 받아 둔 통행증. 있으면 학생이 쓴 문장까지 볼 수 있고,
   없으면 선택지 분포만 봅니다. 학생 기기에는 이 값이 없습니다.        */
function teacherPin(){
  try{
    const v = JSON.parse(localStorage.getItem('tg2.teacher.pass') || 'null');
    return (v && v.until > Date.now() && v.pin) ? v.pin : '';
  }catch(e){ return ''; }
}
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
  const hub = (typeof LESSON === 'object' && LESSON && LESSON.hub) || '../../';
  bar.innerHTML = `
    <div class="grp">
      <a class="hublink" href="${hub}" title="자료실 첫 화면으로">← 자료실</a>
    </div>
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
    <div class="tclsbar" id="tcls"></div>
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

  /* 반 고르개 — 어느 반 응답만 볼지 */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cls-pick]');
    if(!b) return;
    CLS_PICK = b.dataset.clsPick;
    load();
  });
}

/* 반 단추 — 서버가 알려 준 반 목록과, 지금 실제로 응답이 들어온 반을 함께 보여 줍니다.
   숫자는 그 반에서 들어온 응답 수입니다(전체 반을 보고 있을 때만 채워집니다).   */
function clsBar(byCls){
  const host = document.getElementById('tcls');
  if(!host) return;
  const names = [...new Set(CLS_LIST.concat(Object.keys(byCls)))];
  if(!names.length){ host.innerHTML = ''; return; }
  const n = c => (byCls && byCls[c]) ? `<span class="cnt">${byCls[c]}</span>` : '';
  /* '(반 없음)' 도 숨기지 않고 그대로 둡니다.
     숨기면 전체 수와 반별 수의 합이 맞지 않아, 그 차이가 어디서 왔는지
     화면 어디에서도 알 수 없게 됩니다.                                  */
  host.innerHTML =
    `<button type="button" data-cls-pick="" class="${CLS_PICK ? '' : 'on'}">전체</button>` +
    names.map(c => `<button type="button" data-cls-pick="${esc(c)}"
      class="${CLS_PICK === c ? 'on' : ''}">${esc(c)}${CLS_PICK ? '' : n(c)}</button>`).join('');
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
  TG2.jsonp(api, { mode:'stats', lesson: code(), since: 180, cls: CLS_PICK, pin: teacherPin() })
    .then(d => {
      /* 옛 배포는 모르는 요청도 응답 집계로 흘려보내며 ok:true 를 돌려줍니다.
         그대로 그리면 '전체 통계'를 '3반 통계'라고 적어 보여 주게 됩니다. */
      if(!d || d.mode !== 'stats' || Number(d.ver) < TG2.NEED_VER){
        document.getElementById('tbody').innerHTML =
          `<p class="empty"><b>옛 배포입니다.</b><br>
            Apps Script 에서 <b>배포 관리 → 편집 → 새 버전</b>으로 다시 배포해 주세요.<br>
            그 전까지는 반별로 나누어 볼 수 없습니다.</p>`;
        document.getElementById('tn').textContent = '—';
        document.getElementById('tfoot').textContent = '옛 배포 · 반별 보기 잠김';
        const cb = document.getElementById('tcls'); if(cb) cb.innerHTML = '';
        return;
      }
      render(d);
    })
    .catch(() => {
      body.innerHTML = `<p class="empty">불러오지 못했습니다.<br><br>
        ① Apps Script 에서 <b>배포 관리 → 편집 → 새 버전</b>으로 다시 배포했는지<br>
        ② 액세스 권한이 <b>‘링크가 있는 모든 사용자’</b>인지<br>
        두 가지를 확인해 주세요.</p>`;
    });
}

function render(d){
  const body = document.getElementById('tbody');
  document.getElementById('tn').textContent = (d.total || 0) + '개 응답';
  document.getElementById('tfoot').textContent =
    '최근 3시간 · 12초마다 갱신' + (CLS_PICK ? ' · ' + CLS_PICK : ' · 전체 반') +
    (d.locked && d.textN ? ' · 문장 ' + d.textN + '개 잠김' : '');
  clsBar(d.byCls || {});

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

/* ---------- 입장 문 ----------
   진행 화면에는 [응답 보기]가 있어 **학생이 쓴 문장이 그대로 보입니다.**
   그래서 교사 페이지와 똑같이 ① 허용된 계정 ② 비밀번호 두 단계를 거칩니다.
   통과하면 교사 페이지와 같은 통행증(tg2.teacher.pass · 12시간)을 저장하므로,
   교사 페이지에서 이미 들어온 기기에서는 문이 뜨지 않습니다.            */
let doorEl = null, doorBusy = false;

function doorOpen(){
  if(!doorEl){
    const st = document.createElement('style'); st.textContent = DOOR_CSS;
    document.head.appendChild(st);
    doorEl = document.createElement('div');
    doorEl.className = 'tdoor';
    doorEl.setAttribute('role', 'dialog');
    doorEl.setAttribute('aria-modal', 'true');
    doorEl.setAttribute('aria-labelledby', 'tdH');
    document.body.appendChild(doorEl);
  }
  doorEl.hidden = false;
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('body > :not(.tdoor)').forEach(el => el.setAttribute('inert', ''));
  doorEl.innerHTML = `<div class="card">
    <h2 id="tdH" tabindex="-1">수업 진행 화면</h2>
    <p class="lead">이 화면에는 <b>학생이 쓴 답안</b>이 그대로 보입니다.
      그래서 <b>선생님만</b> 들어올 수 있습니다. 학생은 <a href="../../">자료실</a>로 돌아가 주세요.</p>
    <div class="fld">
      <label for="tdMail">허용된 계정 주소</label>
      <input type="email" id="tdMail" autocomplete="username" placeholder="이름@namkang.sen.hs.kr">
    </div>
    <p class="st" id="tdS1"></p>
    <button class="btn" type="button" id="tdB1">확인</button>
    <fieldset id="tdF2" disabled style="margin-top:18px">
      <div class="fld">
        <label for="tdPw">비밀번호</label>
        <input type="password" id="tdPw" autocomplete="current-password">
      </div>
      <p class="st" id="tdS2"></p>
      <button class="btn" type="button" id="tdB2">들어가기</button>
    </fieldset>
    <button class="out" type="button" id="tdOut">← 자료실로 돌아가기</button>
    <p class="foot">비밀번호는 교사 페이지의 것과 같습니다. 한 번 들어오면 이 브라우저에서 <b>12시간</b> 기억합니다.</p>
  </div>`;
  setTimeout(() => { try{ doorEl.querySelector('#tdH').focus(); }catch(e){} }, 60);

  const $$ = id => doorEl.querySelector('#' + id);
  const say = (el, c, t) => { el.className = 'st ' + c; el.textContent = t; };
  let mail = '';

  $$('tdOut').addEventListener('click', () => { location.href = cfg().hub || '../../'; });

  $$('tdB1').addEventListener('click', () => {
    if(doorBusy) return;
    const v = ($$('tdMail').value || '').trim().toLowerCase();
    if(!v){ say($$('tdS1'), 'no', '계정 주소를 넣어 주세요.'); return; }
    doorBusy = true; say($$('tdS1'), '', '확인하는 중…');
    TG2.chkWho(cfg().api, v).then(w => {
      doorBusy = false;
      /* null = 구글에 닿지 못함. 그때만 파일에 적힌 예비 목록으로 봅니다. */
      const ok = w === true ||
        (w === null && TG2.FALLBACK_WHO.map(x => x.toLowerCase()).includes(v));
      if(!ok){ say($$('tdS1'), 'no', '허용된 계정이 아닙니다.'); return; }
      mail = v;
      say($$('tdS1'), 'ok', w === null ? '구글에 닿지 못해 예비 목록으로 확인했습니다.' : '확인했습니다.');
      $$('tdF2').disabled = false;
      $$('tdPw').focus();
    });
  });

  $$('tdB2').addEventListener('click', () => {
    if(doorBusy) return;
    const v = $$('tdPw').value || '';
    if(!v){ say($$('tdS2'), 'no', '비밀번호를 넣어 주세요.'); return; }
    doorBusy = true; say($$('tdS2'), '', '확인하는 중…');
    TG2.checkPin(cfg().api, v).then(k => {
      if(k === true) return true;
      if(k === false) return false;
      /* 구글에 닿지 못했을 때만 지문으로 확인합니다. */
      return TG2.sha256(v).then(h => h === TG2.FALLBACK_PIN_HASH);
    }).then(pass => {
      doorBusy = false;
      if(!pass){ say($$('tdS2'), 'no', '비밀번호가 맞지 않습니다.'); return; }
      try{ localStorage.setItem('tg2.teacher.pass', JSON.stringify(
        { me: mail, pin: v, until: Date.now() + 12 * 3600 * 1000 })); }catch(e){}
      say($$('tdS2'), 'ok', '들어갑니다.');
      doorClose();
      setTimeout(() => onMode(), 120);
    });
  });

  [$$('tdMail'), $$('tdPw')].forEach((el, i) =>
    el.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); $$(i ? 'tdB2' : 'tdB1').click(); } }));
}

function doorClose(){
  if(doorEl) doorEl.hidden = true;
  document.body.style.overflow = '';
  document.querySelectorAll('body > [inert]').forEach(el => el.removeAttribute('inert'));
}

/* ---------- 켜기 / 끄기 ---------- */
function onMode(){
  if(on) return;
  /* 절이 하나도 없으면(닫힌 차시라 안내문만 남은 경우) 들어가지 않습니다.
     그냥 들어가면 secs[0] 이 없어 예외가 나고 화면이 빈 채로 멈춥니다. */
  if(!document.querySelector('section.step')) return;
  /* 통행증이 없으면 문을 엽니다. ?t=1 이나 referrer 는 통행 근거가 아닙니다. */
  if(!teacherPin()){ doorOpen(); return; }
  if(!bar) build();
  on = true;
  root.setAttribute('data-teach', '');
  secs = [...document.querySelectorAll('section.step')];
  mountVideos();
  loadCls();
  go(0); tick();
}

/* 반 목록 — 응답판의 반 단추를 채웁니다. */
function loadCls(){
  if(typeof TG2 === 'undefined' || !cfg().api) return;
  TG2.state(cfg().api).then(st => {
    CLS_LIST = (st && st.cls) || [];
    if(respOpen) load();
  });
}
/* ---------- 영상 (진행 화면에서만) ---------- */
let VID = null;
function mountVideos(){
  if(VID === null && typeof TG2 !== 'undefined' && cfg().api){
    VID = {};                       /* 두 번 부르지 않게 먼저 막아 둡니다 */
    TG2.vids(cfg().api).then(v => { VID = v || {}; redrawVideos(); });
  }
  redrawVideos();
}
function redrawVideos(){
  document.querySelectorAll('.teach-only[data-yt]').forEach((box, n) => {
    const key = code() + '|' + n;
    const saved = (VID && VID[key]) || '';
    const attr = (box.dataset.yt || '').trim();
    const sig = key + ':' + (saved || attr);
    if(box.dataset.done === sig) return;
    box.dataset.done = sig;
    const id = saved || attr;
    const cap = box.dataset.cap || '';
    const find = box.dataset.find || '';
    box.innerHTML = id
      ? `<div class="ytbox"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0"
           title="${cap.replace(/"/g,'')}" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
           allowfullscreen loading="lazy"></iframe></div>` +
        (cap ? `<p class="ytcap">${cap}</p>` : '')
      : `<div class="ytnone"><p>${cap || '영상 자리'}</p>
           <span>아직 주소를 넣지 않았습니다. 유튜브에서 <b>${find || '관련 영상'}</b> 으로 찾은 뒤,
           <b>교사 페이지 → 수업 영상</b>에서 주소를 붙여 넣으세요.
           <br>이 자리의 번호는 <code>${key}</code> 입니다.</span></div>`;
  });
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
