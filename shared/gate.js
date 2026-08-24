/* ==========================================================================
   통합과학2 수업 웹앱 · 공통 통신 + 차시 공개 여닫이
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.

   하는 일
     1) TG2.jsonp(url)  — Apps Script 를 CORS 없이 읽습니다
     2) 차시 페이지에서 '아직 열리지 않은 차시'를 가립니다
     3) 자료실(허브)에 공개 상태를 넘겨 줍니다

   ⚠ 이것은 '잠금'이 아니라 '허들'입니다.
      정적 웹사이트에는 서버가 없어 진짜 접근 통제를 걸 수 없습니다.
      주소를 직접 아는 사람은 페이지 소스로 내용을 볼 수 있습니다.
      그래서 평가 문항·정답·채점기준표는 애초에 이 저장소에 올리지 않습니다.
   ========================================================================== */
const TG2 = (() => {

/* ---------- JSONP ----------
   Apps Script 는 fetch 로 읽으면 브라우저가 CORS 로 막습니다.
   <script> 태그로 불러오면 그 제약을 받지 않습니다.               */
let seq = 0;
function jsonp(base, params, timeout){
  return new Promise((resolve, reject) => {
    const cb = '__tg' + (++seq) + '_' + Date.now().toString(36);
    const q = Object.entries(params || {})
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const s = document.createElement('script');
    const kill = () => { delete window[cb]; s.remove(); clearTimeout(t); };
    const t = setTimeout(() => { kill(); reject(new Error('시간 초과')); }, timeout || 8000);

    window[cb] = d => { kill(); resolve(d); };
    s.onerror = () => { kill(); reject(new Error('불러오지 못했습니다')); };
    s.src = base + (base.includes('?') ? '&' : '?') + q + '&callback=' + cb;
    document.head.appendChild(s);
  });
}

/* ---------- 공개 상태 읽기 ----------
   실패하면 '전부 열림'으로 둡니다. 통신이 끊겼다고 수업이 멈추면 안 됩니다.  */
function gates(api){
  if(!api) return Promise.resolve(null);
  return jsonp(api, { mode:'gate' }, 6000)
    .then(d => (d && d.ok) ? (d.open || {}) : null)
    .catch(() => null);
}

function setGate(api, code, open, pin){
  return jsonp(api, { mode:'setgate', code, open: open ? 1 : 0, pin }, 8000);
}

function vids(api){
  if(!api) return Promise.resolve(null);
  return jsonp(api, { mode:'vid' }, 6000)
    .then(d => (d && d.ok) ? (d.vid || {}) : null)
    .catch(() => null);
}

function setVid(api, key, id, pin){
  return jsonp(api, { mode:'setvid', key, id, pin }, 8000);
}

/* 유튜브 주소 어떤 형태든 11글자 영상 ID 만 뽑아냅니다.
   https://youtu.be/XXXXXXXXXXX
   https://www.youtube.com/watch?v=XXXXXXXXXXX&t=10s
   https://www.youtube.com/shorts/XXXXXXXXXXX
   https://www.youtube.com/embed/XXXXXXXXXXX        */
function ytId(s){
  s = String(s || '').trim();
  if(/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function ping(api){
  if(!api) return Promise.resolve({ ok:false, why:'주소가 비어 있습니다' });
  return jsonp(api, { mode:'ping' }, 7000)
    .then(d => (d && d.ok) ? { ok:true, ver:d.ver || 1 }
                           : { ok:false, why:'응답이 이상합니다' })
    .catch(e => ({ ok:false, why: e.message }));
}

function checkPin(api, pin){
  return jsonp(api, { mode:'checkpin', pin }, 7000).catch(() => ({ ok:false }));
}

/* ---------- 차시 페이지 가리기 ---------- */
const LOCK_CSS = `
.tg-lock{max-width:560px;margin:14vh auto;padding:0 24px;text-align:center}
.tg-lock .ic{font-size:44px;line-height:1;margin-bottom:18px;opacity:.5}
.tg-lock h2{font-family:var(--serif);font-size:26px;margin:0 0 12px;border:0;padding:0}
.tg-lock p{color:var(--ink-soft);font-size:16px;line-height:1.75;margin:0 0 10px}
.tg-lock .btn{margin-top:18px}
`;

function lockPage(){
  const st = document.createElement('style'); st.textContent = LOCK_CSS;
  document.head.appendChild(st);
  const m = document.querySelector('main');
  if(!m) return;
  m.innerHTML = `<div class="tg-lock">
    <p class="ic">🔒</p>
    <h2>아직 열리지 않은 차시입니다</h2>
    <p>이 자료는 선생님이 수업 시간에 열어 줍니다. 그때 다시 들어와 주세요.</p>
    <p><a class="btn" href="../../">자료실로 돌아가기</a></p>
  </div>`;
  document.querySelectorAll('.topbar nav').forEach(n => n.innerHTML = '');
}

/* 차시 페이지에서 자동 실행.
   - 교사 진행 화면(#t)이면 검사하지 않습니다.
   - LESSON.code 가 없으면 검사하지 않습니다.                        */
function guard(){
  if(location.hash === '#t') return;
  const L = (typeof LESSON === 'object' && LESSON) || {};
  if(!L.code || !L.api) return;
  gates(L.api).then(g => {
    if(g && g[L.code] === false) lockPage();
  });
}

if(document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', guard);
else guard();

return { jsonp, gates, setGate, vids, setVid, ytId, ping, checkPin, lockPage };
})();
