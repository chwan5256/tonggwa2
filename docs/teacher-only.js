/* ==========================================================================
   docs/ 의 교사용 문서 앞에 세우는 허들
   교사 화면(teacher.html)·진행 화면(#t)이 저장하는 통행증(tg2.teacher.pass · 12시간)이
   있어야 문서를 보여 줍니다. 없으면 교사 화면으로 보냅니다.

   ⚠ 정적 사이트라 '잠금'이 아니라 '허들'입니다. 주소를 아는 사람은 파일을 받아 볼 수 있습니다.
     그래서 이 폴더에도 평가 문항·정답·채점기준표는 두지 않습니다(README §1).
   ========================================================================== */
(() => {
  const API = "https://script.google.com/macros/s/AKfycbxGwVShBta72VSwPeJxaVDRWyEgv6Nl2tNsGNjdf_0AIKeI86oDrx806MAwoNJgezStNw/exec";
  const KEY = 'tg2.teacher.pass';
  const root = document.documentElement;
  root.style.visibility = 'hidden';            /* 확인 전에는 내용을 보이지 않습니다 */

  let v = null;
  try{ v = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  const ok = !!(v && v.until > Date.now() && v.pin && v.me);

  function block(){
    const go = () => {
      document.body.innerHTML = `
        <div style="max-width:520px;margin:12vh auto;padding:32px 30px;border:1px solid #DFD9CF;border-radius:14px;
                    background:#fff;font-family:'IBM Plex Sans KR',sans-serif;color:#191E22;line-height:1.7">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;color:#8A5A22">교사 전용 문서</p>
          <h1 style="margin:0 0 12px;font-size:24px">교사 화면에서 먼저 들어와 주세요</h1>
          <p style="margin:0 0 20px;color:#525A62">이 문서는 교사 화면에 들어온 브라우저에서만 열립니다(12시간 유지).
            학생은 <a href="../">학생 자료실</a>로 돌아가 주세요.</p>
          <a href="../teacher.html" style="display:inline-block;background:#1D5E6B;color:#fff;text-decoration:none;
             padding:11px 20px;border-radius:9px;font-weight:600">교사 화면으로 가기</a>
        </div>`;
      root.style.visibility = 'visible';
    };
    if(document.body) go(); else addEventListener('DOMContentLoaded', go);
  }

  if(!ok){ block(); return; }

  /* 저장된 통행증을 그대로 믿지 않고 비밀번호를 서버에 한 번 확인합니다.
     서버에 닿지 않으면(학교망·오프라인) 통행증만으로 보여 줍니다. */
  const show = () => { root.style.visibility = 'visible'; };
  const cb = '__tgdoc' + Date.now().toString(36);
  const s = document.createElement('script');
  const t = setTimeout(() => { cleanup(); show(); }, 6000);
  const cleanup = () => { clearTimeout(t); try{ delete window[cb]; }catch(e){} s.remove(); };
  window[cb] = d => {
    cleanup();
    if(d && d.mode === 'checkpin' && d.ok === false){
      try{ localStorage.removeItem(KEY); }catch(e){}
      block(); return;
    }
    show();
  };
  s.onerror = () => { cleanup(); show(); };
  s.src = API + '?mode=checkpin&pin=' + encodeURIComponent(v.pin) + '&callback=' + cb;
  document.head.appendChild(s);
})();
