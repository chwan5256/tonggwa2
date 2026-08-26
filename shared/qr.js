/* ==========================================================================
   통합과학2 수업 웹앱 · QR 코드 (외부 라이브러리 없음)

   학생이 주소를 타이핑하지 않고 카메라로 들어오게 하려고 만들었습니다.
   외부 스크립트를 불러오면 학교 망에서 막힐 수 있어 직접 그립니다.

   범위 — 필요한 만큼만 구현했습니다.
     · 바이트 모드(8비트)만. 주소는 전부 ASCII 입니다.
     · 오류 정정 수준 M (약 15% 손상까지 복구). 교실 스크린·인쇄 모두 충분합니다.
     · 버전 1~10 (최대 213바이트). 자료실 주소는 60자 안팎입니다.

   ⚠ 이 파일은 눈으로 보고 맞다고 판단하지 않았습니다.
      그린 결과를 실제 QR 디코더(OpenCV)로 읽어 원래 문자열이 나오는지
      버전 1~10 전부에 대해 기계로 확인했습니다.
   ========================================================================== */
const QR = (() => {

/* ---------- 갈루아체 GF(256) ----------
   QR 의 오류 정정(리드-솔로몬)은 이 체 위에서 계산합니다.
   생성원 2, 기약다항식 0x11D 입니다.                                */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function initGF(){
  let x = 1;
  for(let i = 0; i < 255; i++){
    EXP[i] = x; LOG[x] = i;
    x <<= 1;
    if(x & 0x100) x ^= 0x11D;
  }
  for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

/* 생성 다항식 — 오류 정정 부호 n개짜리 */
function genPoly(n){
  let g = [1];
  for(let i = 0; i < n; i++){
    const next = new Array(g.length + 1).fill(0);
    for(let j = 0; j < g.length; j++){
      next[j]     ^= mul(g[j], 1);
      next[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

/* 데이터 블록 하나의 오류 정정 부호를 구합니다 (다항식 나눗셈의 나머지). */
function ecc(data, n){
  const g = genPoly(n);
  const r = new Array(data.length + n).fill(0);
  for(let i = 0; i < data.length; i++) r[i] = data[i];
  for(let i = 0; i < data.length; i++){
    const c = r[i];
    if(!c) continue;
    for(let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c);
  }
  return r.slice(data.length);
}

/* ---------- 버전표 (오류 정정 수준 M) ----------
   [ 전체 부호어 수, 블록당 EC 부호어 수, 1군 블록 수, 1군 데이터 부호어,
     2군 블록 수, 2군 데이터 부호어 ]                                   */
const V = {
   1:[ 26, 10, 1, 16, 0,  0],
   2:[ 44, 16, 1, 28, 0,  0],
   3:[ 70, 26, 1, 44, 0,  0],
   4:[100, 18, 2, 32, 0,  0],
   5:[134, 24, 2, 43, 0,  0],
   6:[172, 16, 4, 27, 0,  0],
   7:[196, 18, 4, 31, 0,  0],
   8:[242, 22, 2, 38, 2, 39],
   9:[292, 22, 3, 36, 2, 37],
  10:[346, 26, 4, 43, 1, 44]
};

/* 정렬 무늬 중심 좌표 (버전 2 이상) */
const ALIGN = {
  1:[], 2:[6,18], 3:[6,22], 4:[6,26], 5:[6,30],
  6:[6,34], 7:[6,22,38], 8:[6,24,42], 9:[6,26,46], 10:[6,28,50]
};

/* 형식 정보 — (EC 수준 M = 0b00, 마스크 0~7) 15비트, BCH 부호 + 0x5412 마스킹.
   미리 계산해 두는 대신 규격대로 그때그때 만듭니다.                     */
function formatBits(mask){
  const data = (0b00 << 3) | mask;          /* M 은 0b00 */
  let v = data << 10;
  for(let i = 4; i >= 0; i--){
    if(v & (1 << (i + 10))) v ^= 0b10100110111 << i;
  }
  return ((data << 10) | v) ^ 0b101010000010010;
}

/* 버전 정보 — 버전 7 이상에서만 넣습니다. 18비트 골레이 부호. */
function versionBits(ver){
  let v = ver << 12;
  for(let i = 5; i >= 0; i--){
    if(v & (1 << (i + 12))) v ^= 0b1111100100101 << i;
  }
  return (ver << 12) | v;
}

/* ---------- 마스크 ---------- */
const MASK = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
  (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0
];

/* ---------- 본체 ---------- */
function encode(text){
  const bytes = new TextEncoder().encode(String(text));

  /* 담을 수 있는 가장 작은 버전을 고릅니다. */
  let ver = 0;
  for(let v = 1; v <= 10; v++){
    const [, ecN, b1, d1, b2, d2] = V[v];
    const cap = b1 * d1 + b2 * d2;
    /* 모드 4비트 + 길이(버전 1~9 는 8비트, 10 은 16비트) */
    const lenBits = v < 10 ? 8 : 16;
    if(bytes.length + Math.ceil((4 + lenBits) / 8) <= cap){ ver = v; break; }
  }
  if(!ver) throw new Error('주소가 너무 깁니다 (버전 10 초과)');

  const [, ecN, b1, d1, b2, d2] = V[ver];
  const totalData = b1 * d1 + b2 * d2;
  const lenBits = ver < 10 ? 8 : 16;

  /* 비트열 만들기 */
  const bits = [];
  const push = (val, n) => { for(let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);                 /* 바이트 모드 */
  push(bytes.length, lenBits);
  bytes.forEach(b => push(b, 8));

  /* 종료 부호 최대 4비트, 그다음 바이트 경계까지 0 채우기 */
  for(let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
  while(bits.length % 8) bits.push(0);

  /* 남은 자리는 0xEC · 0x11 을 번갈아 채웁니다 (규격) */
  const data = [];
  for(let i = 0; i < bits.length; i += 8){
    let b = 0;
    for(let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }
  const PAD = [0xEC, 0x11];
  for(let i = 0; data.length < totalData; i++) data.push(PAD[i % 2]);

  /* 블록으로 나누고 각 블록의 오류 정정 부호를 구합니다. */
  const dBlocks = [], eBlocks = [];
  let at = 0;
  for(let i = 0; i < b1; i++){ dBlocks.push(data.slice(at, at + d1)); at += d1; }
  for(let i = 0; i < b2; i++){ dBlocks.push(data.slice(at, at + d2)); at += d2; }
  dBlocks.forEach(b => eBlocks.push(ecc(b, ecN)));

  /* 블록을 가로로 번갈아 읽어 최종 부호어 순서를 만듭니다. */
  const out = [];
  const maxD = Math.max(d1, d2 || 0);
  for(let i = 0; i < maxD; i++)
    dBlocks.forEach(b => { if(i < b.length) out.push(b[i]); });
  for(let i = 0; i < ecN; i++)
    eBlocks.forEach(b => out.push(b[i]));

  /* ---------- 격자에 놓기 ---------- */
  const N = ver * 4 + 17;
  const m = Array.from({ length: N }, () => new Array(N).fill(null));  /* null = 아직 빈칸 */
  const fixed = Array.from({ length: N }, () => new Array(N).fill(false));

  const put = (r, c, v) => { m[r][c] = v ? 1 : 0; fixed[r][c] = true; };

  /* 위치 검출 무늬 3개 + 분리자 */
  [[0,0],[N-7,0],[0,N-7]].forEach(([r0, c0]) => {
    for(let r = -1; r <= 7; r++) for(let c = -1; c <= 7; c++){
      const rr = r0 + r, cc = c0 + c;
      if(rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      const on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      put(rr, cc, on);
    }
  });

  /* 타이밍 무늬 */
  for(let i = 8; i < N - 8; i++){ put(6, i, i % 2 === 0); put(i, 6, i % 2 === 0); }

  /* 정렬 무늬 — 위치 검출 무늬와 겹치는 자리는 건너뜁니다. */
  const ap = ALIGN[ver];
  ap.forEach(r0 => ap.forEach(c0 => {
    if((r0 === 6 && c0 === 6) || (r0 === 6 && c0 === N - 7) || (r0 === N - 7 && c0 === 6)) return;
    for(let r = -2; r <= 2; r++) for(let c = -2; c <= 2; c++)
      put(r0 + r, c0 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
  }));

  /* 늘 검은 한 점 */
  put(N - 8, 8, true);

  /* 형식 정보 자리를 미리 잡아 둡니다 (값은 마스크를 고른 뒤에 씁니다). */
  const fmtCells = [];
  for(let i = 0; i <= 5; i++) fmtCells.push([8, i]);
  fmtCells.push([8, 7], [8, 8], [7, 8]);
  for(let i = 9; i <= 14; i++) fmtCells.push([14 - i, 8]);
  /* 두 번째 사본 — 행과 열을 헷갈리기 쉬운 자리입니다.
     비트 0~7 은 오른쪽 위 검출 무늬 아래의 **행 8** (열 N-1 → N-8),
     비트 8~14 는 왼쪽 아래 검출 무늬 옆의 **열 8** (행 N-7 → N-1).
     늘 검은 한 점 (N-8, 8) 은 이 15칸과 별개입니다.
     둘을 맞바꾸면 자유 칸이 하나 늘어 데이터가 통째로 한 비트씩 밀립니다. */
  const fmtCells2 = [];
  for(let i = 0; i <= 7; i++)  fmtCells2.push([8, N - 1 - i]);
  for(let i = 8; i <= 14; i++) fmtCells2.push([N - 15 + i, 8]);
  fmtCells.concat(fmtCells2).forEach(([r, c]) => { fixed[r][c] = true; if(m[r][c] === null) m[r][c] = 0; });

  /* 버전 정보 자리 (버전 7 이상) */
  if(ver >= 7){
    const vb = versionBits(ver);
    for(let i = 0; i < 18; i++){
      const b = (vb >> i) & 1;
      const r = Math.floor(i / 3), c = i % 3;
      put(r, N - 11 + c, b);
      put(N - 11 + c, r, b);
    }
  }

  /* 데이터 비트를 지그재그로 채웁니다 (오른쪽 아래에서 위로, 두 칸씩). */
  let bi = 0;
  const bitAt = i => (i >> 3) < out.length ? (out[i >> 3] >> (7 - (i & 7))) & 1 : 0;
  let up = true;
  for(let c = N - 1; c > 0; c -= 2){
    if(c === 6) c--;                                   /* 세로 타이밍 열은 건너뜁니다 */
    for(let k = 0; k < N; k++){
      const r = up ? N - 1 - k : k;
      for(let s = 0; s < 2; s++){
        const cc = c - s;
        if(fixed[r][cc]) continue;
        m[r][cc] = bi < out.length * 8 ? bitAt(bi) : 0;
        bi++;
      }
    }
    up = !up;
  }

  /* ---------- 마스크 고르기 ----------
     여덟 개를 모두 씌워 보고 벌점이 가장 낮은 것을 씁니다. 규격대로입니다.

     ⚠ 여기서 한 번 잘못 짚었던 것을 적어 둡니다.
       버전 7 짜리 자료 하나에서 마스크 2 만 판독에 실패하기에 '마스크 2 가 나쁘다'고
       결론짓고 빼 보았는데, 다른 자료에서는 마스크 0 이 실패하고 마스크 2 는 읽혔습니다.
       나쁜 마스크가 있는 것이 아니라 **읽는 쪽(OpenCV 기본 검출기)이 자료에 따라 약한** 것이었습니다.
       표본 하나로 규칙을 만들면 안 됩니다. 그래서 규격대로 벌점만 보고 고릅니다.
       실제 학생이 쓰는 휴대전화 스캐너(ZXing 계열)로는 여덟 마스크 모두 읽힙니다. */
  let best = null, bestScore = Infinity;
  for(let k = 0; k < 8; k++){
    const g = m.map((row, r) => row.map((v, c) => fixed[r][c] ? v : (v ^ (MASK[k](r, c) ? 1 : 0))));
    const fb = formatBits(k);
    fmtCells.forEach(([r, c], i) => { g[r][c] = (fb >> (14 - i)) & 1; });
    fmtCells2.forEach(([r, c], i) => { g[r][c] = (fb >> i) & 1; });
    g[N - 8][8] = 1;                                   /* 늘 검은 한 점 */
    const sc = penalty(g, N);
    if(sc < bestScore){ bestScore = sc; best = g; }
  }
  return { size: N, ver, mods: best };
}

/* 규격의 벌점 네 가지 */
function penalty(g, N){
  let p = 0;

  /* ① 같은 색이 5칸 이상 이어짐 */
  for(let i = 0; i < N; i++){
    for(const dir of [0, 1]){
      let run = 1;
      for(let j = 1; j < N; j++){
        const a = dir ? g[j][i] : g[i][j];
        const b = dir ? g[j - 1][i] : g[i][j - 1];
        if(a === b) run++;
        else { if(run >= 5) p += run - 2; run = 1; }
      }
      if(run >= 5) p += run - 2;
    }
  }

  /* ② 2×2 같은 색 덩어리 */
  for(let r = 0; r < N - 1; r++) for(let c = 0; c < N - 1; c++){
    const v = g[r][c];
    if(v === g[r][c + 1] && v === g[r + 1][c] && v === g[r + 1][c + 1]) p += 3;
  }

  /* ③ 위치 검출 무늬를 닮은 줄 (1:1:3:1:1 + 여백 4) */
  const PAT1 = [1,0,1,1,1,0,1,0,0,0,0];
  const PAT2 = [0,0,0,0,1,0,1,1,1,0,1];
  const hit = (arr) => arr.join('') === PAT1.join('') || arr.join('') === PAT2.join('');
  for(let i = 0; i < N; i++) for(let j = 0; j + 11 <= N; j++){
    if(hit(g[i].slice(j, j + 11))) p += 40;
    const col = []; for(let k = 0; k < 11; k++) col.push(g[j + k][i]);
    if(hit(col)) p += 40;
  }

  /* ④ 검은 칸 비율이 50% 에서 멀수록 */
  let dark = 0;
  for(let r = 0; r < N; r++) for(let c = 0; c < N; c++) dark += g[r][c];
  const pct = dark * 100 / (N * N);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return p;
}

/* ---------- 그리기 ---------- */
/* SVG 문자열로 돌려줍니다. 인쇄해도 또렷하고, 화면 크기에 맞춰 늘어납니다.
   여백(quiet zone) 4칸은 규격이 요구합니다 — 없으면 못 읽는 기기가 있습니다. */
function svg(text, opts){
  opts = opts || {};
  const { size, mods } = encode(text);
  const q = 4, total = size + q * 2;
  const fg = opts.fg || '#000', bg = opts.bg || '#fff';

  let d = '';
  for(let r = 0; r < size; r++){
    let c = 0;
    while(c < size){
      if(!mods[r][c]){ c++; continue; }
      let w = 1;
      while(c + w < size && mods[r][c + w]) w++;      /* 가로로 이어 붙여 조각 수를 줄입니다 */
      d += `M${c + q} ${r + q}h${w}v1h-${w}z`;
      c += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
         `shape-rendering="crispEdges" role="img" aria-label="${
           String(opts.label || '접속 주소 QR 코드').replace(/[<>&"]/g, '')}">` +
         `<rect width="${total}" height="${total}" fill="${bg}"/>` +
         `<path d="${d}" fill="${fg}"/></svg>`;
}

/* 요소 안에 바로 그려 넣습니다. */
function into(host, text, opts){
  const el = typeof host === 'string' ? document.querySelector(host) : host;
  if(!el) return;
  try{ el.innerHTML = svg(text, opts); }
  catch(e){ el.textContent = 'QR 을 만들지 못했습니다: ' + e.message; }
}

return { encode, svg, into };
})();

if(typeof module === 'object' && module.exports) module.exports = QR;
