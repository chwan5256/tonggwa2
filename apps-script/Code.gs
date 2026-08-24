/**
 * 통합과학2 수업 웹앱 · 익명 응답 수집 + 차시 공개 관리
 * ---------------------------------------------------------------
 * ▶ 받는 것    : 차시 코드, 문항 코드, 선택지, 짧은 문장
 * ▶ 받지 않는 것 : 이름, 학번, 이메일, 그 밖에 개인을 알아볼 수 있는 것
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
 */

/* ★ 여기만 고치세요 — 차시를 열고 닫을 때 쓰는 번호입니다. 남에게 알리지 마세요. */
var TEACHER_PIN = '2603';

var SHEET = '응답';

/* ============================================================
   학생 페이지 → 여기 (응답 쓰기)
   ============================================================ */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    _sheet().appendRow([
      new Date(),
      String(d.lesson || '').slice(0, 20),
      String(d.item   || '').slice(0, 40),
      String(d.choice || '').slice(0, 20),
      String(d.text   || '').slice(0, 300)
    ]);
    return _out({ ok: true });
  } catch (err) {
    return _out({ ok: false, error: String(err) });
  }
}

/* ============================================================
   페이지 → 여기 (읽기)
   ?mode=stats   응답 집계   (기본)
   ?mode=gate    차시 공개 상태
   ?mode=setgate&code=u2-03&open=1&pin=____   공개/비공개 전환
   ?callback=fn  붙이면 JSONP 로 돌려줍니다 (브라우저 CORS 우회)
   ============================================================ */
function doGet(e) {
  var p = e.parameter || {};
  var out;
  try {
    if (p.mode === 'gate')          out = { ok: true, open: _gateAll() };
    else if (p.mode === 'setgate')  out = _setGate(p);
    else                            out = _stats(p);
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return _out(out, p.callback);
}

/* ---------- 응답 집계 ---------- */
function _stats(p) {
  var lesson = p.lesson || '', item = p.item || '';
  var since  = Number(p.since || 180);
  var from   = new Date(Date.now() - since * 60 * 1000);

  var rows = _sheet().getDataRange().getValues();
  rows.shift();

  var picked = rows.filter(function (r) {
    if (!(r[0] instanceof Date) || r[0] < from) return false;
    if (lesson && r[1] !== lesson) return false;
    if (item   && r[2] !== item)   return false;
    return true;
  });

  var count = {};
  picked.forEach(function (r) {
    var k = r[2] + '|' + r[3];
    count[k] = (count[k] || 0) + 1;
  });

  return {
    ok: true,
    total: picked.length,
    count: count,
    texts: picked.map(function (r) { return r[4]; }).filter(String)
  };
}

/* ---------- 차시 공개 관리 ----------
   ScriptProperties 에 { "u2-01": true, "u2-03": false } 형태로 저장합니다.
   목록에 없는 차시는 manifest.json 의 open 값을 따릅니다.               */
function _gateAll() {
  var raw = PropertiesService.getScriptProperties().getProperty('gate');
  return raw ? JSON.parse(raw) : {};
}

function _setGate(p) {
  if (String(p.pin || '') !== String(TEACHER_PIN)) {
    return { ok: false, error: '번호가 맞지 않습니다' };
  }
  var code = String(p.code || '').slice(0, 20);
  if (!code) return { ok: false, error: '차시 코드가 없습니다' };

  var g = _gateAll();
  g[code] = (String(p.open) === '1' || String(p.open) === 'true');
  PropertiesService.getScriptProperties().setProperty('gate', JSON.stringify(g));
  return { ok: true, open: g };
}

/* ---------- 도우미 ---------- */
function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['시각', '차시', '문항', '선택', '문장']);
    sh.setFrozenRows(1);
  }
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
