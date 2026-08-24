/**
 * 통합과학2 수업 웹앱 · 익명 응답 수집
 * ---------------------------------------------------------------
 * 학생 페이지에서 보낸 익명 응답을 이 스크립트가 붙어 있는
 * 구글 시트에 한 줄씩 쌓습니다.
 *
 * ▶ 받는 것   : 차시 코드, 문항 코드, 선택지, 짧은 문장
 * ▶ 받지 않는 것 : 이름, 학번, 이메일, 그 밖에 개인을 알아볼 수 있는 것
 *
 * 이름을 받아야 하는 과제는 이 경로를 쓰지 않고 구글 폼·클래스룸으로 보냅니다.
 * 그 경계선이 이 설계의 안전장치입니다.
 * ---------------------------------------------------------------
 * 설치 : 구글 시트 → 확장 프로그램 → Apps Script → 이 코드를 붙여넣기
 * 배포 : 배포 → 새 배포 → 유형 '웹 앱'
 *          실행 계정      = 나
 *          액세스 권한    = 링크가 있는 모든 사용자
 *        → 배포를 누르면 나오는 /exec 로 끝나는 주소를 복사해서
 *          각 차시 index.html 의  LESSON.api  에 붙여 넣습니다.
 *
 * ⚠ 코드를 고친 뒤에는 '배포 관리 → 편집 → 버전: 새 버전'으로 다시 배포해야
 *   바뀐 내용이 반영됩니다. 주소는 그대로 유지됩니다.
 */

var SHEET = '응답';

/** 학생 페이지 → 여기 (쓰기) */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var sh = _sheet();
    sh.appendRow([
      new Date(),
      String(d.lesson || '').slice(0, 20),
      String(d.item   || '').slice(0, 40),
      String(d.choice || '').slice(0, 20),
      String(d.text   || '').slice(0, 300)
    ]);
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

/** 교사 화면 → 여기 (읽기)
 *  ?lesson=u2-03            그 차시 전체 집계
 *  ?lesson=u2-03&item=ox-elnino   한 문항만
 *  &since=30                최근 30분 것만 (기본 180분)
 */
function doGet(e) {
  var p = e.parameter || {};
  var lesson = p.lesson || '';
  var item   = p.item || '';
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

  return _json({
    ok: true,
    total: picked.length,
    count: count,
    texts: picked.map(function (r) { return r[4]; }).filter(String)
  });
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

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
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
