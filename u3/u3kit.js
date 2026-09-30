/* ==========================================================================
   통합과학2 · Ⅲ단원 공용 도구 (u3kit)
   shared/ 의 파일은 '한 번 확정하고 고정'이므로 손대지 않고,
   Ⅲ단원에서 새로 필요한 것만 여기 모았습니다.

   U3.csv(url)                 # 로 시작하는 줄(데이터 카드)을 건너뛰고 객체 배열로 읽기
   U3.hbars(host, rows, opt)   가로 막대 — 값·비율이 모두 같은 rows 에서 나옵니다(§6-3 ①)
   U3.poll(sel, cfg)           투표(한 번만) — 무엇을 골랐는지만 익명으로 보냅니다
   U3.live(lesson, opt)        반 집계 읽기 — Apps Script 의 공개 집계(mode=stats)를 그대로 씁니다
   U3.uniq(lesson, opt)        세 답 조합의 '혼자인 사람 수'만 읽기 (mode=uniq, VER 7)
   U3.clsPick(host, cb)        진행 화면에서 볼 반 고르기
   U3.linreg(pts) · U3.corr(a, b)
   ========================================================================== */
const U3 = (() => {

/* ---------- 한 번만 내기 잠금 ----------
   잠금은 **그날 하루만** 유지됩니다(열쇠에 날짜를 붙임). 다음 날 다른 반이 같은 기기를 써도 다시 낼 수 있습니다.
   선생님이 같은 날 시험해 본 기기를 풀려면 주소 뒤에 ?reset=1 을 붙여 한 번 엽니다. */
const today = () => { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
const lockKey = base => base + '-' + today();
if(/[?&]reset=1\b/.test(location.search)){
  try{ Object.keys(localStorage).filter(k => k.startsWith('u3-')).forEach(k => localStorage.removeItem(k)); }catch(e){}
  history.replaceState(null, '', location.pathname + location.hash);
}

const esc = s => String(s == null ? '' : s)
  .replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));

/* ---------- CSV ---------- */
function csv(url){
  return fetch(url, { cache:'no-store' })
    .then(r => { if(!r.ok) throw new Error('자료 파일 없음'); return r.text(); })
    .then(txt => {
      const lines = txt.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
      const head = lines.shift().split(',').map(s => s.trim());
      return lines.map(l => {
        const c = l.split(',');
        const o = {};
        head.forEach((h, i) => {
          const v = (c[i] || '').trim();
          o[h] = (v !== '' && isFinite(+v)) ? +v : v;
        });
        return o;
      });
    });
}

/* ---------- 가로 막대 ----------
   rows : [{ label, n, hi?:true }]
   opt  : { unit:'명', pct:true, total?:number, fmt?:fn, max?:number }
   막대 길이는 **0을 기준으로 n 에 비례**합니다. 가장 작은 값을 0으로 놓지 않습니다. */
function hbars(host, rows, opt){
  const el = typeof host === 'string' ? document.querySelector(host) : host;
  if(!el) return;
  opt = opt || {};
  const tot = opt.total != null ? opt.total : rows.reduce((s, r) => s + (+r.n || 0), 0);
  const mx  = opt.max != null ? opt.max : Math.max(1, ...rows.map(r => +r.n || 0));
  const fmt = opt.fmt || (v => String(v));
  el.classList.add('hb');
  el.innerHTML = rows.map(r => {
    const n = +r.n || 0;
    const w = mx ? (n / mx * 100) : 0;
    const pct = (opt.pct !== false && tot) ? ` <i>${Math.round(n / tot * 100)}%</i>` : '';
    return `<div class="hr${r.hi ? ' hi' : ''}">
      <span class="hl">${esc(r.label)}</span>
      <span class="hk"><span class="hf" style="width:${w.toFixed(1)}%"></span></span>
      <span class="hv">${fmt(n)}${opt.unit ? '<small>' + esc(opt.unit) + '</small>' : ''}${pct}</span>
    </div>`;
  }).join('');
}

/* ---------- 투표 ----------
   cfg = { item:'mm-1', q:'…', opts:['…','…'], once:true, onPick?:fn }
   · 정답이 없는 문항입니다. 맞았는지를 기록하지 않습니다(ok 없음).
   · 한 기기에서 하루 한 번만 냅니다. 같은 사람이 여러 번 눌러 분포가 부풀지 않게 합니다. */
function poll(sel, cfg){
  const host = document.querySelector(sel);
  if(!host) return;
  const code = (typeof LESSON === 'object' && LESSON.code) || 'x';
  const KEY = lockKey('u3-poll-' + code + '-' + cfg.item);
  let mine = null;
  try{ mine = localStorage.getItem(KEY); }catch(e){}
  if(typeof ACT === 'object' && ACT.reg){
    const sec = host.closest('section.step');
    ACT.reg({ id:cfg.item, sec: sec ? (sec.dataset.nav || sec.id) : '', kind:'투표',
              sel, q:cfg.q, opts:cfg.opts, ans:'' });
  }
  host.classList.add('poll');
  const draw = () => {
    host.innerHTML = `<p class="pq">${cfg.q}</p>
      <div class="po">${cfg.opts.map((o, j) =>
        `<button type="button" class="pill${mine === o ? ' on' : ''}" data-j="${j}"
          ${mine != null && cfg.once !== false ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      <p class="ps">${mine != null
        ? '보냈습니다 · 이름 없이 <b>무엇을 골랐는지만</b> 반 집계에 들어갑니다.'
        : '하나를 고르면 바로 보내집니다. <b>한 번만</b> 고를 수 있습니다.'}</p>`;
  };
  draw();
  host.addEventListener('click', e => {
    const b = e.target.closest('button[data-j]');
    if(!b || b.disabled) return;
    const v = cfg.opts[+b.dataset.j];
    mine = v;
    try{ localStorage.setItem(KEY, v); }catch(e){}
    if(typeof ACT === 'object'){
      const sec = host.closest('section.step');
      ACT.put({ id:'poll-' + cfg.item, sec: sec ? (sec.dataset.nav || sec.id) : '', kind:'투표',
                q:cfg.q.replace(/<[^>]+>/g, ''), my:v, ans:'(정답 없음)' });
      ACT.send({ item:cfg.item, choice:v });
    }
    draw();
    if(cfg.onPick) cfg.onPick(v);
  });
  return { mine: () => mine };
}

/* ---------- 반 집계 읽기 ----------
   Apps Script 의 mode=stats 는 '선택지 분포'를 누구나 읽을 수 있게 열어 둔 창구입니다
   (학생이 쓴 문장은 비밀번호 없이는 나오지 않습니다).
   선택지 분포는 이 창구를 그대로 씁니다. 다만 여러 답을 묶은 '조합'은 사람을 가리킬 수 있어
   공개 창구에서 빠지고(Code.gs PRIVATE_ITEMS), 인원수만 U3.uniq 로 받습니다.
   반환 : { ok, total, by:{ item:{ choice:n } } }                                 */
function live(lesson, opt){
  opt = opt || {};
  const api = (typeof LESSON === 'object' && LESSON.api) || '';
  if(!api || typeof TG2 === 'undefined') return Promise.resolve({ ok:false, why:'연결 주소 없음' });
  const q = { mode:'stats', lesson };
  if(opt.cls) q.cls = opt.cls;
  if(opt.since) q.since = opt.since;
  return TG2.jsonp(api, q, 12000).then(d => {
    if(!d || !d.count) return { ok:false, why:'응답 형식이 다름' };
    const by = {};
    Object.entries(d.count).forEach(([k, n]) => {
      const i = k.indexOf('|');
      const item = k.slice(0, i), ch = k.slice(i + 1);
      (by[item] = by[item] || {})[ch] = n;
    });
    return { ok:true, total:d.total || 0, by };
  }).catch(e => ({ ok:false, why:String(e && e.message || e) }));
}

/* ---------- 조합의 유일성 (Ⅲ-02) ----------
   서버가 '혼자인 사람 수'만 돌려줍니다. 조합 목록은 오지 않습니다. Apps Script VER 7 이상. */
function uniq(lesson, opt){
  opt = opt || {};
  const api = (typeof LESSON === 'object' && LESSON.api) || '';
  if(!api || typeof TG2 === 'undefined') return Promise.resolve({ ok:false, why:'연결 주소 없음' });
  const q = { mode:'uniq', lesson, item:'live-combo' };
  if(opt.cls) q.cls = opt.cls;
  if(opt.since) q.since = opt.since;
  ['season','drop','wake'].forEach(f => { if(opt[f]) q[f] = '1'; });
  return TG2.jsonp(api, q, 12000).then(d => {
    if(!d || d.mode !== 'uniq' || !d.ok) return { ok:false, why: (d && d.stale) ? 'Apps Script 를 새 버전(ver 7)으로 배포해야 합니다' : '응답 형식이 다름' };
    return { ok:true, people:+d.people || 0, k1:+d.k1 || 0, k2:+d.k2 || 0, k3:+d.k3 || 0 };
  }).catch(e => ({ ok:false, why:String(e && e.message || e) }));
}

/* ---------- 진행 화면에서 볼 반 고르기 ----------
   학생은 자기 반(ME.cls)이 기본입니다. 교사 진행 화면(#t)은 반이 없으므로 고르게 합니다. */
function clsPick(host, cb){
  const el = typeof host === 'string' ? document.querySelector(host) : host;
  if(!el) return;
  const mineCls = (typeof ME === 'object' && ME.cls) ? ME.cls() : '';
  let cur = location.hash === '#t' ? '' : mineCls;
  const paint = list => {
    const all = [''].concat(list || []);
    el.innerHTML = `<span class="lb">볼 반</span>` + all.map(c =>
      `<button type="button" class="pill${c === cur ? ' on' : ''}" data-c="${esc(c)}">${c ? esc(c) : '모든 반'}</button>`).join('');
  };
  el.classList.add('clspick');
  paint(mineCls ? [mineCls] : []);
  if(typeof TG2 !== 'undefined' && typeof LESSON === 'object' && LESSON.api){
    TG2.state(LESSON.api).then(st => { if(st && st.cls) paint(st.cls); });
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-c]');
    if(!b) return;
    cur = b.dataset.c;
    el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    cb(cur);
  });
  return { get: () => cur };
}

/* ---------- 통계 ---------- */
function linreg(pts){
  const n = pts.length;
  if(n < 2) return { m:0, b:0 };
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0;
  pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) * (x - mx); });
  const m = sxx ? sxy / sxx : 0;
  return { m, b: my - m * mx };
}
function corr(a, b){
  const n = Math.min(a.length, b.length);
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n, mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for(let i = 0; i < n; i++){ sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return (saa && sbb) ? sab / Math.sqrt(saa * sbb) : 0;
}

return { csv, hbars, poll, live, uniq, clsPick, linreg, corr, esc, lockKey };
})();
