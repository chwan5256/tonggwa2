/**
 * 통합과학2 수업 웹앱 · 익명 응답 수집 + 수업 운영 설정
 * ---------------------------------------------------------------
 * ▶ 받는 것    : 차시 코드, 문항 코드, 선택지, 짧은 문장
 * ▶ 받지 않는 것 : 학생 이름, 학번, 이메일, 그 밖에 개인을 알아볼 수 있는 것
 *
 * 이름이 필요한 과제는 이 경로를 쓰지 않고 구글 폼·클래스룸으로 보냅니다.
 * 그 경계선이 이 설계의 안전장치입니다.
 * ---------------------------------------------------------------
 * 설치 : 구글 시트 → 확장 프로그램 → Apps Script → 이 코드로 전부 교체
 * 배포 : 배포 → 새 배포 → 유형 '웹 앱'
 *          실행 계정   = 나
 *          액세스 권한 = 링크가 있는 모든 사용자
 *
 * ⚠ 코드를 고친 뒤에는 '배포 관리 → 편집(연필) → 버전: 새 버전 → 배포'를
 *   해야 반영됩니다. 주소는 그대로 유지됩니다.
 * ---------------------------------------------------------------
 * 저장되는 설정 (ScriptProperties)
 *   gate  : { "u2-03": true, … }   차시 공개 여부
 *   vid   : { "u2-02|0": "영상ID", … }
 *   today : "u2-03"                오늘 수업으로 표시할 차시
 *   who   : ["a@b.com", …]         교사 화면에 들어올 수 있는 계정
 *   pin   : "ai2026"               교사 화면 입장 비밀번호
 *   cls   : ["1반","2반", …]        반 목록 (학생이 처음 들어올 때 고릅니다)
 *   clientid : 구글 로그인 클라이언트 ID (아래 '구글로그인_설정' 함수로 넣습니다)
 */

/* ★ 처음 한 번만 쓰이는 기본값입니다.
   교사 화면에서 바꾸면 그때부터는 아래 값이 아니라 저장된 값이 쓰입니다. */
var DEFAULT_PIN = 'ai2026';
var DEFAULT_WHO = ['cadrical@gmail.com', 'chwan5256@namkang.sen.hs.kr'];
var DEFAULT_CLS = ['1반', '2반', '3반', '4반', '5반', '6반', '7반', '8반'];

/* 페이지가 요구하는 최소 버전. 코드에 새 mode 를 더할 때마다 올립니다. */
var VER = 6;

var SHEET = '응답';

/* 서술형 답안을 차시별로 따로 쌓는 시트 이름 앞머리.
   예) '서술형 u2-04'  ← 4차시 서술형만 모입니다. 반으로 정렬해 보면 반별 아카이브가 됩니다. */
var NOTE_PREFIX = '서술형 ';

/* 응답 집계를 할 때 한 번에 읽는 최대 줄 수.
   빈칸·분류까지 모두 쌓이면 시트가 금세 수만 줄이 됩니다.
   전부 읽으면 [응답 보기]가 느려지므로 **맨 아래(최근)부터** 이만큼만 봅니다. */
var STAT_MAX_ROWS = 8000;

/* 비밀번호를 마구 대입하는 것을 막는 아주 단순한 빗장.
   한 시간 안에 열 번 틀리면 십 분 동안 받지 않습니다. */
var TRY_MAX = 10, TRY_WINDOW = 60 * 60 * 1000, TRY_HOLD = 10 * 60 * 1000;

/* ============================================================
   학생 페이지 → 여기 (응답 쓰기)
   ============================================================ */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    /* d.name 같은 것이 실려 와도 절대 적지 않습니다.
       반(cls)은 학급 단위라 개인을 가리키지 않으므로 받습니다.
       이름이 필요한 과제는 이 경로가 아니라 구글 폼·클래스룸으로 갑니다. */
    var now    = new Date();
    var lesson = _safe(d.lesson, 20);
    var item   = _safe(d.item,   40);
    var choice = _safe(d.choice, 60);
    var text   = _safe(d.text,  300);
    var cls    = _safe(d.cls,    12);

    _sheet().appendRow([now, lesson, item, choice, text, cls]);

    /* 서술형(문장이 있는 것)은 **차시별 시트에 한 벌 더** 남깁니다.
       '응답' 시트는 선택지까지 뒤섞여 금세 수만 줄이 되므로,
       나중에 답안을 되읽으려면 차시별로 갈라 두는 편이 훨씬 낫습니다. */
    if (text && lesson) _noteSheet(lesson).appendRow([now, cls, item, text]);

    return _out({ ok: true });
  } catch (err) {
    return _out({ ok: false, error: String(err) });
  }
}

/* 시트는 = + - @ 로 시작하는 글을 '수식'으로 해석합니다.
   학생이 서술형 칸에 =IMPORTXML(...) 을 적으면 교사 계정 권한으로 실행됩니다.
   앞에 작은따옴표를 붙여 반드시 글자로만 남게 합니다. */
function _safe(v, n) {
  var t = String(v == null ? '' : v).slice(0, n);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

/* ============================================================
   페이지 → 여기 (읽기)

   누구나
     ?mode=ping                          연결 시험
     ?mode=state                         차시 공개 상태 + 오늘 수업
     ?mode=gate                          (옛 방식) 공개 상태만
     ?mode=vid                           차시별 영상 주소
     ?mode=stats[&lesson=&cls=&since=]   응답 집계 (기본) · since 분 · 0 이면 전부
     ?mode=chkwho&email=____             이 계정이 교사 화면에 들어올 수 있는지
                                         → 참·거짓만 돌려줍니다. 목록은 알려주지 않습니다.
     ?mode=checkpin&pin=____             비밀번호가 맞는지
     ?mode=gtoken&idtoken=____           구글 로그인 토큰이 진짜인지 + 허용 계정인지
                                         → 구글에 직접 물어 확인합니다(주소만 치는 것과 다릅니다)

   비밀번호가 있어야
     ?mode=who&pin=____                  허용 계정 목록 보기
     ?mode=setwho&list=a@b.com,c@d.com&pin=____
     ?mode=setpin&next=____&pin=____     비밀번호 바꾸기
     ?mode=setcls&list=1반,2반&pin=____  반 목록 바꾸기
     ?mode=setgates&open=u2-01,u2-02&pin=____  차시를 한 번에 열고 닫기
                                         (open 에 적힌 것만 열고 나머지는 전부 닫습니다)
     ?mode=setgate&code=u2-03&open=1&pin=____
     ?mode=settoday&code=u2-03&pin=____  (code 를 비우면 '자동'으로 돌아갑니다)
     ?mode=setvid&key=u2-02|0&id=영상ID&pin=____

   ?callback=fn 을 붙이면 JSONP 로 돌려줍니다 (브라우저 CORS 우회)
   ============================================================ */
function doGet(e) {
  var p = e.parameter || {};
  var out;
  try {
    switch (p.mode) {
      case 'ping':     out = { ok: true, ver: VER }; break;
      case 'state':    out = { ok: true, open: _prop('gate', {}), today: _prop('today', ''),
                               cls: _cls() }; break;
      case 'gate':     out = { ok: true, open: _prop('gate', {}) }; break;
      case 'vid':      out = { ok: true, vid: _prop('vid', {}) }; break;
      case 'chkwho':   out = { ok: _allowed(p.email) }; break;
      case 'gtoken':   out = _gToken(p); break;
      case 'checkpin': out = { ok: _pinOk(p.pin) }; break;
      case 'who':      out = _guard(p, function () { return { ok: true, who: _who() }; }); break;
      case 'setwho':   out = _guard(p, function () { return _setWho(p); }); break;
      case 'setpin':   out = _guard(p, function () { return _setPin(p); }); break;
      case 'setcls':   out = _guard(p, function () { return _setCls(p); }); break;
      case 'setgates': out = _guard(p, function () { return _setGates(p); }); break;
      case 'setgate':  out = _guard(p, function () { return _setGate(p); }); break;
      case 'settoday': out = _guard(p, function () { return _setToday(p); }); break;
      case 'setvid':   out = _guard(p, function () { return _setVid(p); }); break;
      case 'stats':
      case undefined:
      case '':         out = _stats(p); break;
      /* 모르는 요청을 통계로 흘려보내면 ok:true 가 되어 인증이 뚫립니다. */
      default:         out = { ok: false, stale: true, ver: VER,
                               error: '이 배포는 이 요청을 모릅니다 — 새 버전으로 배포해 주세요' };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }

  /* 어떤 요청에 대한 답인지, 어느 버전이 답했는지 반드시 함께 보냅니다.
     옛 배포는 모르는 요청을 응답 집계로 흘려보내며 ok:true 를 돌려주는데,
     이 두 줄이 없으면 페이지가 그것을 '허용'으로 잘못 읽습니다.
     '아니라는 표시'는 옛 배포가 붙여 주지 않으므로, '맞다는 표시'로 가릅니다. */
  if (out && typeof out === 'object') { out.mode = p.mode || 'stats'; out.ver = VER; }
  return _out(out, p.callback);
}

/* ============================================================
   교사 화면 입장 — 계정 + 비밀번호
   ============================================================ */
function _who() {
  var raw = PropertiesService.getScriptProperties().getProperty('who');
  var list = raw ? JSON.parse(raw) : null;
  if (!list || !list.length) list = DEFAULT_WHO;
  return list;
}

function _norm(s) { return String(s || '').trim().toLowerCase(); }

/* ============================================================
   구글 로그인 토큰 확인

   페이지가 스스로 "나 이 계정이야" 라고 말하는 것은 근거가 되지 않습니다.
   (계정 주소는 누구나 칠 수 있습니다.)
   그래서 브라우저가 구글에서 받아 온 **ID 토큰**을 여기로 보내면,
   이 서버가 구글에 직접 물어 진짜인지 확인한 뒤 허용 목록과 대조합니다.

   돌려주는 것 : { ok, allowed, email }
     ok=false      토큰이 가짜이거나 우리 앱의 것이 아님
     allowed=false 진짜 구글 계정이지만 허용 목록에 없음
   ============================================================ */
function _gToken(p) {
  var t = String(p.idtoken || '');
  if (!t) return { ok: false, error: '토큰이 없습니다' };
  try {
    var r = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(t),
      { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return { ok: false, error: '구글이 이 토큰을 모릅니다' };
    var d = JSON.parse(r.getContentText());

    /* 우리 앱을 향해 발급된 토큰인지 확인합니다.
       이 확인을 빼면 아무 사이트에서 받은 토큰이나 통과합니다. */
    var want = _prop('clientid', '');
    if (want && d.aud !== want) return { ok: false, error: '다른 앱에서 발급된 토큰입니다' };
    if (d.email_verified === 'false' || d.email_verified === false)
      return { ok: false, error: '확인되지 않은 계정입니다' };

    return { ok: true, email: d.email || '', allowed: _allowed(d.email) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* 차시별 서술형 시트 */
function _noteSheet(lesson) {
  var name = (NOTE_PREFIX + lesson).slice(0, 90);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(['시각', '반', '문항', '답안']);
    sh.setFrozenRows(1);
    sh.setColumnWidth(4, 560);
    sh.getRange('D:D').setWrap(true);
  }
  return sh;
}

function _allowed(email) {
  var t = _norm(email);
  if (!t) return false;
  return _who().some(function (w) { return _norm(w) === t; });
}

function _setWho(p) {
  var list = String(p.list || '')
    .split(/[,\s;]+/)
    .map(_norm)
    .filter(function (s) { return s && s.indexOf('@') > 0; });

  /* 목록을 통째로 비우면 다시는 들어올 수 없습니다. 한 개는 남깁니다. */
  if (!list.length) return { ok: false, error: '계정을 하나 이상 남겨야 합니다' };

  var uniq = [];
  list.forEach(function (s) { if (uniq.indexOf(s) < 0) uniq.push(s); });

  PropertiesService.getScriptProperties().setProperty('who', JSON.stringify(uniq));
  return { ok: true, who: uniq };
}

function _pin() {
  return PropertiesService.getScriptProperties().getProperty('pin') || DEFAULT_PIN;
}

function _pinOk(v) {
  var sp = PropertiesService.getScriptProperties();
  var st = {};
  try { st = JSON.parse(sp.getProperty('try') || '{}'); } catch (err) { st = {}; }
  var t = Date.now();

  if (st.hold && t < st.hold) return false;                 /* 빗장이 걸린 동안 */
  if (!st.first || t - st.first > TRY_WINDOW) { st.first = t; st.n = 0; }

  if (String(v || '').trim() === String(_pin())) {
    sp.deleteProperty('try');
    return true;
  }

  st.n = (st.n || 0) + 1;
  if (st.n >= TRY_MAX) { st.hold = t + TRY_HOLD; st.n = 0; st.first = t; }
  sp.setProperty('try', JSON.stringify(st));
  return false;
}

function _setPin(p) {
  var next = String(p.next || '').trim();
  if (next.length < 6) return { ok: false, error: '비밀번호는 여섯 글자 이상이어야 합니다' };
  PropertiesService.getScriptProperties().setProperty('pin', next);
  return { ok: true };
}

/* 비밀번호가 맞을 때만 실행합니다. */
function _guard(p, fn) {
  if (!_pinOk(p.pin)) return { ok: false, error: '비밀번호가 맞지 않습니다' };
  return fn();
}

/* ============================================================
   수업 운영 설정
   ============================================================ */
function _prop(key, fallback) {
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof fallback === 'string') return raw;
  try { return JSON.parse(raw); } catch (err) { return fallback; }
}

/* 차시 공개 — 목록에 없는 차시는 manifest.json 의 open 값을 따릅니다. */
function _setGate(p) {
  var code = String(p.code || '').slice(0, 20);
  if (!code) return { ok: false, error: '차시 코드가 없습니다' };

  var g = _prop('gate', {});
  g[code] = (String(p.open) === '1' || String(p.open) === 'true');
  PropertiesService.getScriptProperties().setProperty('gate', JSON.stringify(g));
  return { ok: true, open: g };
}

/* 반 목록 */
function _cls() {
  var raw = PropertiesService.getScriptProperties().getProperty('cls');
  var list = null;
  try { list = raw ? JSON.parse(raw) : null; } catch (err) { list = null; }
  if (!list || !list.length) list = DEFAULT_CLS;
  return list;
}

function _setCls(p) {
  var list = String(p.list || '').split(/[,;]+/)
    .map(function (s) { return String(s).trim().slice(0, 12); })
    .filter(String);
  if (!list.length) return { ok: false, error: '반을 하나 이상 남겨야 합니다' };

  var uniq = [];
  list.forEach(function (s) { if (uniq.indexOf(s) < 0) uniq.push(s); });
  PropertiesService.getScriptProperties().setProperty('cls', JSON.stringify(uniq));
  return { ok: true, cls: uniq };
}

/* 차시 일괄 여닫이 — open 에 적힌 차시만 열고 나머지는 전부 닫습니다.
   한 번에 쓰므로 스위치를 하나씩 누를 때 생기는 어긋남이 없습니다.      */
function _setGates(p) {
  var want = String(p.open || '').split(/[,\s]+/).filter(String);
  var all  = String(p.all  || '').split(/[,\s]+/).filter(String);
  if (!all.length) return { ok: false, error: '차시 목록이 없습니다' };

  /* 지금 목록에 있는 차시만 손댑니다.
     통째로 갈아치우면, 목록에서 뺐지만 파일은 남아 있는 옛 차시의 '닫힘' 기록이
     사라져 주소를 직접 아는 사람에게 열려 버립니다. */
  var g = _prop('gate', {});
  all.forEach(function (c) { g[c.slice(0, 20)] = want.indexOf(c) >= 0; });
  PropertiesService.getScriptProperties().setProperty('gate', JSON.stringify(g));
  return { ok: true, open: g };
}

/* 오늘 수업 — 비우면 '자동'(열린 차시 중 마지막)으로 돌아갑니다. */
function _setToday(p) {
  var code = String(p.code || '').slice(0, 20);
  PropertiesService.getScriptProperties().setProperty('today', code);
  return { ok: true, today: code };
}

/* 차시별 영상 — { "차시코드|자리번호": "영상ID" } */
function _setVid(p) {
  var key = String(p.key || '').slice(0, 30);
  if (!key) return { ok: false, error: '영상 자리를 찾지 못했습니다' };

  var v = _prop('vid', {});
  var id = String(p.id || '').trim();
  if (id) v[key] = id.slice(0, 20); else delete v[key];
  PropertiesService.getScriptProperties().setProperty('vid', JSON.stringify(v));
  return { ok: true, vid: v };
}

/* ============================================================
   응답 집계
   ============================================================ */
function _stats(p) {
  var lesson = p.lesson || '', item = p.item || '';
  var cls    = String(p.cls || '').trim();

  /* since 는 '몇 분 전까지 볼 것인가'입니다. **0 이면 처음부터 전부** 봅니다.
     기본값을 180분으로 두면 지난 시간에 쌓인 답안이 안 보여
     "응답이 없다"로 오해하게 됩니다.                                   */
  var since = (p.since === undefined || p.since === '') ? 0 : Number(p.since);
  var from  = since > 0 ? new Date(Date.now() - since * 60 * 1000) : null;

  var sh   = _sheet();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, total: 0, count: {}, byCls: {}, texts: [], textN: 0, locked: !_pinOk(p.pin), scanned: 0 };

  /* 맨 아래(최근)부터 최대 STAT_MAX_ROWS 줄만 읽습니다 */
  var startRow = Math.max(2, last - STAT_MAX_ROWS + 1);
  var rows = sh.getRange(startRow, 1, last - startRow + 1, 6).getValues();

  var picked = rows.filter(function (r) {
    if (!(r[0] instanceof Date)) return false;
    if (from && r[0] < from) return false;
    if (lesson && r[1] !== lesson) return false;
    if (item   && r[2] !== item)   return false;
    /* 반을 고르지 않았으면 전부. 골랐으면 그 반만.
       반이 적히기 전(v0.6 이하)에 쌓인 줄은 반이 비어 있어 걸러집니다. */
    if (cls    && String(r[5] || '') !== cls) return false;
    return true;
  });

  var count = {};
  picked.forEach(function (r) {
    var k = r[2] + '|' + r[3];
    count[k] = (count[k] || 0) + 1;
  });

  /* 어느 반에서 몇 개가 들어왔는지도 함께 — 반을 고르지 않았을 때 쓸모가 있습니다. */
  var byCls = {};
  picked.forEach(function (r) {
    var c = String(r[5] || '(반 없음)');
    byCls[c] = (byCls[c] || 0) + 1;
  });

  /* 선택지 분포(count)는 막대그래프를 그려야 하므로 누구나 읽을 수 있습니다.
     그러나 **학생이 직접 쓴 문장(texts)** 은 비밀번호가 맞을 때만 돌려줍니다.
     주소만 알면 남의 글을 통째로 읽을 수 있으면 안 됩니다. */
  var mine = _pinOk(p.pin);

  /* 서술형 답안은 **문항·반·시각**과 함께 돌려줍니다.
     그래야 진행 화면에서 문항별로 묶어 보여 줄 수 있습니다.
     비밀번호가 맞을 때만 실어 보냅니다 — 주소만 알면 남의 글을 읽을 수 있으면 안 됩니다. */
  var texts = [];
  if (mine) {
    picked.forEach(function (r) {
      if (!r[4]) return;
      texts.push({
        item: String(r[2] || ''),
        cls:  String(r[5] || ''),
        text: String(r[4]),
        t:    (r[0] instanceof Date) ? r[0].getTime() : 0
      });
    });
    texts = texts.slice(-400);        /* 너무 많으면 화면이 감당하지 못합니다 */
  }

  return {
    ok: true,
    total: picked.length,
    count: count,
    byCls: byCls,
    texts: texts,
    textN: picked.filter(function (r) { return !!r[4]; }).length,
    locked: !mine,
    scanned: rows.length,
    capped: (last - 1) > rows.length,
    since: since
  };
}

/* ============================================================
   도우미
   ============================================================ */
function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['시각', '차시', '문항', '선택', '문장', '반']);
    sh.setFrozenRows(1);
    return sh;
  }
  /* 예전에 만들어진 시트에는 '반' 열이 없습니다. 한 번만 붙입니다.
     이미 쌓인 줄의 반 칸은 비어 있고, 반을 골라 볼 때 걸러집니다. */
  if (sh.getLastColumn() < 6) sh.getRange(1, 6).setValue('반');
  return sh;
}

function _out(obj, callback) {
  var txt = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + txt + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(txt)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 구글 로그인 클라이언트 ID 를 넣습니다.
 * 아래 따옴표 안에 ID 를 붙여 넣고, 편집기에서 이 함수를 **한 번** 실행하세요.
 * (만드는 방법은 README 의 '구글 로그인 붙이기' 절에 적어 두었습니다.)
 *
 * 이 값이 있어야 서버가 "이 토큰이 우리 앱을 향해 발급된 것인가"까지 확인합니다.
 * 비워 두면 토큰이 진짜인지까지만 확인합니다.
 */
function 구글로그인_설정() {
  var CLIENT_ID = '';        // ← 여기에 붙여 넣으세요
  PropertiesService.getScriptProperties().setProperty('clientid', CLIENT_ID);
  Logger.log('클라이언트 ID 를 저장했습니다: ' + (CLIENT_ID || '(비움)'));
}

/**
 * 잠겼을 때 — Apps Script 편집기에서 이 함수를 직접 실행하세요.
 * 다음 세 가지 경우에 모두 씁니다.
 *   · 비밀번호를 잊었을 때
 *   · 내 계정을 목록에서 실수로 지웠을 때
 *   · 비밀번호를 여러 번 틀려 빗장이 걸렸을 때
 * 비밀번호와 계정 목록이 맨 처음 값으로 돌아갑니다.
 */
function 설정초기화() {
  var sp = PropertiesService.getScriptProperties();
  sp.deleteProperty('pin');
  sp.deleteProperty('who');
  sp.deleteProperty('try');
  Logger.log('비밀번호를 ' + DEFAULT_PIN + ' 로, 계정을 ' + DEFAULT_WHO.join(', ') + ' 로 되돌렸습니다.');
}

/**
 * 학기말 정리용 — 한 달 넘은 응답을 지웁니다.
 * 익명 자료라 오래 둘 이유가 없습니다. 직접 실행하거나 트리거를 걸어 두세요.
 */
function 오래된응답지우기() {
  var sh = _sheet();
  var cut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (v[i][0] instanceof Date && v[i][0] < cut) sh.deleteRow(i + 1);
  }
}
