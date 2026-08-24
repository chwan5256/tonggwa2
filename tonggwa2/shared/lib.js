/* ==========================================================================
   통합과학2 수업 웹앱 · 공통 스크립트
   한 번 확정하고 고정합니다. 차시별로 수정하지 않습니다.
   제공 기능:  TG.theme()   테마 전환 버튼
              TG.nav()     상단 절 이동 + 현재 위치 표시
              TG.quiz()    즉시 피드백 객관식
              TG.chart()   선 그래프 (호버 크로스헤어 + 툴팁)
   ========================================================================== */
const TG = (() => {

/* ---------- 테마 ---------- */
function theme(btnId){
  const root = document.documentElement, b = document.getElementById(btnId);
  if(!b) return;
  let cur = 'system';
  try{ cur = localStorage.getItem('tg-theme') || 'system'; }catch(e){}
  const apply = v => {
    if(v === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', v);
    b.textContent = v === 'system' ? '시스템' : (v === 'dark' ? '다크' : '라이트');
    try{ localStorage.setItem('tg-theme', v); }catch(e){}
    document.dispatchEvent(new CustomEvent('tg:theme'));
  };
  apply(cur);
  b.addEventListener('click', () => {
    cur = cur === 'system' ? 'light' : (cur === 'light' ? 'dark' : 'system');
    apply(cur);
  });
}

/* ---------- 상단 절 이동 ---------- */
function nav(navSel){
  const nv = document.querySelector(navSel);
  if(!nv) return;
  const secs = [...document.querySelectorAll('section.step[id]')];
  nv.innerHTML = secs.map(s =>
    `<a href="#${s.id}" data-s="${s.id}">${s.dataset.nav || s.id}</a>`).join('');
  const links = [...nv.querySelectorAll('a')];
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if(e.isIntersecting){
        links.forEach(a => a.classList.toggle('on', a.dataset.s === e.target.id));
      }
    });
  }, { rootMargin:'-60px 0px -70% 0px', threshold:0 });
  secs.forEach(s => io.observe(s));
}

/* ---------- 즉시 피드백 객관식 ----------
   items: [{ stem, opts:[...], ans:0, fb:{ right:'', wrong:['','',...] } }]
*/
function quiz(sel, items){
  const host = document.querySelector(sel);
  if(!host) return;
  host.classList.add('quiz');
  host.innerHTML = items.map((it, i) => `
    <div class="qi" data-i="${i}">
      <p class="stem"><span class="no">${i+1}</span><span>${it.stem}</span></p>
      <div class="opts">${it.opts.map((o, j) =>
        `<button class="opt" data-j="${j}"><span class="mk">${'①②③④⑤'[j]}</span><span>${o}</span></button>`
      ).join('')}</div>
    </div>`).join('');

  host.addEventListener('click', ev => {
    const btn = ev.target.closest('.opt');
    if(!btn || btn.disabled) return;
    const qi = btn.closest('.qi'), i = +qi.dataset.i, j = +btn.dataset.j, it = items[i];
    const ok = j === it.ans;
    qi.querySelectorAll('.opt').forEach(o => { o.disabled = true; });
    btn.classList.add(ok ? 'right' : 'wrong');
    if(!ok) qi.querySelector(`.opt[data-j="${it.ans}"]`).classList.add('right');
    const msg = ok ? it.fb.right : (it.fb.wrong[j] || it.fb.wrong[0] || '');
    const p = document.createElement('p');
    p.className = 'fb ' + (ok ? 'right' : 'wrong');
    p.innerHTML = `<b>${ok ? '맞았습니다.' : '다시 볼 지점.'}</b> ${msg}`;
    qi.appendChild(p);
  });
}

/* ---------- 선 그래프 ----------
   cfg = { series:[{name,color,pts:[[x,y],…],label?}],
           xLabel, yLabel, xFmt, yFmt, yMin, yMax, xMin, xMax, hline?:{y,text} }
   반환: { update(series), destroy() }
*/
function chart(canvas, cfg){
  const box = canvas.parentElement;
  let tip = box.querySelector('.tip');
  if(!tip){ tip = document.createElement('div'); tip.className = 'tip'; box.appendChild(tip); }
  const ctx = canvas.getContext('2d');
  let S = cfg.series, hoverX = null;
  const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const fmtX = cfg.xFmt || (v => String(v));
  const fmtY = cfg.yFmt || (v => String(Math.round(v * 10) / 10));
  const fmtT = cfg.tipFmt || fmtY;   /* 툴팁은 축보다 자세히 표시할 수 있습니다 */

  let W = 0, H = 0, P = { l:56, r:22, t:14, b:42 }, xs, ys;

  function bounds(){
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    S.forEach(s => s.pts.forEach(([x, y]) => {
      if(x < xmin) xmin = x; if(x > xmax) xmax = x;
      if(y < ymin) ymin = y; if(y > ymax) ymax = y;
    }));
    if(cfg.xMin != null) xmin = cfg.xMin; if(cfg.xMax != null) xmax = cfg.xMax;
    if(cfg.yMin != null) ymin = cfg.yMin; if(cfg.yMax != null) ymax = cfg.yMax;
    else { const pad = (ymax - ymin) * 0.12 || 1; ymin -= pad; ymax += pad; }
    if(cfg.yMin != null && cfg.yMax == null){ const pad = (ymax - ymin) * 0.10 || 1; ymax += pad; }
    return { xmin, xmax, ymin, ymax };
  }

  function resize(){
    const w = box.clientWidth || 600;
    W = w; H = Math.max(240, Math.min(430, Math.round(w * 0.52)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function ticks(min, max, n){
    const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag, step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const out = []; for(let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
    return out;
  }

  function draw(){
    const b = bounds();
    xs = x => P.l + (x - b.xmin) / (b.xmax - b.xmin || 1) * (W - P.l - P.r);
    ys = y => H - P.b - (y - b.ymin) / (b.ymax - b.ymin || 1) * (H - P.t - P.b);
    const grid = cssv('--chart-grid'), axis = cssv('--chart-axis'),
          faint = cssv('--ink-faint'), soft = cssv('--ink-soft'), surf = cssv('--chart-surface');
    ctx.clearRect(0, 0, W, H);

    /* 격자 + 눈금 */
    ctx.font = '12px ' + cssv('--mono').replace(/"/g, '') + ', monospace';
    ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    ticks(b.ymin, b.ymax, 5).forEach(v => {
      const y = Math.round(ys(v)) + .5;
      ctx.strokeStyle = grid; ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke();
      ctx.fillStyle = faint; ctx.textAlign = 'right'; ctx.fillText(fmtY(v), P.l - 10, y);
    });
    ctx.textBaseline = 'top';
    ticks(b.xmin, b.xmax, 6).forEach(v => {
      const x = Math.round(xs(v)) + .5;
      ctx.strokeStyle = grid; ctx.beginPath(); ctx.moveTo(x, P.t); ctx.lineTo(x, H - P.b); ctx.stroke();
      ctx.fillStyle = faint; ctx.textAlign = 'center'; ctx.fillText(fmtX(v), x, H - P.b + 9);
    });
    /* 축 */
    ctx.strokeStyle = axis; ctx.beginPath();
    ctx.moveTo(P.l + .5, P.t); ctx.lineTo(P.l + .5, H - P.b + .5); ctx.lineTo(W - P.r, H - P.b + .5); ctx.stroke();
    /* 축 이름 */
    ctx.fillStyle = soft; ctx.font = '12.5px ' + cssv('--sans').replace(/"/g, '') + ', sans-serif';
    if(cfg.xLabel){ ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(cfg.xLabel, W - P.r, H - 4); }
    if(cfg.yLabel){ ctx.save(); ctx.translate(13, P.t); ctx.rotate(-Math.PI/2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(cfg.yLabel, 0, 0); ctx.restore(); }

    /* 참조선 */
    if(cfg.hline){
      const y = Math.round(ys(cfg.hline.y)) + .5;
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke(); ctx.restore();
      if(cfg.hline.text){ ctx.fillStyle = faint; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.font = '12px ' + cssv('--sans').replace(/"/g, '') + ', sans-serif';
        ctx.fillText(cfg.hline.text, P.l + 6, y - 4); }
    }

    /* 선 */
    S.forEach(s => {
      const c = s.color.startsWith('--') ? cssv(s.color) : s.color;
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => i ? ctx.lineTo(xs(x), ys(y)) : ctx.moveTo(xs(x), ys(y)));
      ctx.stroke();
      /* 끝점 강조 */
      const last = s.pts[s.pts.length - 1];
      if(last){
        ctx.fillStyle = surf; ctx.beginPath(); ctx.arc(xs(last[0]), ys(last[1]), 6, 0, 7); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(xs(last[0]), ys(last[1]), 4.5, 0, 7); ctx.fill();
      }
    });

    /* 호버 크로스헤어 */
    if(hoverX != null){
      const rows = [];
      S.forEach(s => {
        let best = null, bd = Infinity;
        s.pts.forEach(p => { const d = Math.abs(xs(p[0]) - hoverX); if(d < bd){ bd = d; best = p; } });
        if(best) rows.push({ s, p: best });
      });
      if(rows.length){
        const px = xs(rows[0].p[0]);
        ctx.save(); ctx.strokeStyle = axis; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(px + .5, P.t); ctx.lineTo(px + .5, H - P.b); ctx.stroke(); ctx.restore();
        rows.forEach(r => {
          const c = r.s.color.startsWith('--') ? cssv(r.s.color) : r.s.color;
          ctx.fillStyle = surf; ctx.beginPath(); ctx.arc(xs(r.p[0]), ys(r.p[1]), 7, 0, 7); ctx.fill();
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(xs(r.p[0]), ys(r.p[1]), 5, 0, 7); ctx.fill();
        });
        tip.innerHTML = `<span class="tk">${fmtX(rows[0].p[0])}</span>` + rows.map(r => {
          const c = r.s.color.startsWith('--') ? cssv(r.s.color) : r.s.color;
          return `<span class="tr"><i style="background:${c}"></i>${r.s.name} <b>${fmtT(r.p[1])}</b></span>`;
        }).join('');
        tip.style.opacity = 1;
        const tw = tip.offsetWidth, left = Math.min(Math.max(px + 14, 4), W - tw - 4);
        tip.style.left = left + 'px'; tip.style.top = (P.t + 6) + 'px';
      }
    } else tip.style.opacity = 0;
  }

  const move = e => {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    hoverX = (cx < P.l - 12 || cx > W - P.r + 12) ? null : cx;
    draw();
  };
  const leave = () => { hoverX = null; draw(); };
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseleave', leave);
  canvas.addEventListener('touchstart', move, { passive:true });
  canvas.addEventListener('touchmove', move, { passive:true });
  canvas.addEventListener('touchend', leave);
  const ro = new ResizeObserver(resize); ro.observe(box);
  document.addEventListener('tg:theme', draw);
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', draw);
  resize();

  return { update(series){ S = series; draw(); } };
}

return { theme, nav, quiz, chart };
})();
