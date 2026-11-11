/**
 * 20초 시간 감각 실험 — Google Apps Script 서버
 * 이 파일은 결과를 이 스크립트가 연결된 Google 스프레드시트에 저장합니다.
 * 배포: 스프레드시트 > 확장 프로그램 > Apps Script > 웹 앱
 */
const SHEET_NAME = '실험결과';
const HEADERS = [
  '저장 시각(한국)', '응답 ID', '학교', '이름',
  '측정 시간(초)', '20초 대비 오차(초)', '절대 오차(초)',
  '20.00초 달성', '원본 측정값(ms)', '참여자가 정지한 시각(참고용)'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('20초 감각 실험 | TIME SENSE LAB')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 처음 한번 실행하면 저장용 시트를 만들고 헤더를 생성합니다. */
function setupSheet() {
  const sheet = getOrCreateSheet_();
  return '완료! 데이터가 저장될 시트: ' + sheet.getName();
}

/**
 * 브라우저에서 전달된 하나의 응답을 시트에 기록합니다.
 * 서버 측 잠금과 응답 ID 중복 확인으로 재시도 시 중복 행 생성을 방지합니다.
 */
function saveResult(data) {
  if (!data || typeof data !== 'object') throw new Error('전송된 응답이 없습니다.');

  const school = cleanText_(data.school, 60, '학교');
  const studentName = cleanText_(data.name, 40, '이름');
  const id = String(data.id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    throw new Error('잘못된 응답 ID입니다. 페이지를 다시 열어 주세요.');
  }
  if (data.consent !== true) throw new Error('개인정보 수집·이용 동의가 필요합니다.');
  const elapsedMs = Number(data.elapsedMs);
  if (!Number.isInteger(elapsedMs) || elapsedMs < 1 || elapsedMs > 180000) {
    throw new Error('측정 시간 값이 유효하지 않습니다.');
  }

  const exactSec = elapsedMs / 1000;
  const shownSec = Math.round(elapsedMs / 10) / 100; // 소수 둘째 자리로 반올림
  const signedError = Math.round((shownSec - 20) * 100) / 100;
  const absoluteError = Math.abs(signedError);
  const winner = shownSec === 20;
  const stoppedAt = String(data.stoppedAt || '').slice(0, 40);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getOrCreateSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const found = sheet.getRange(2, 2, lastRow - 1, 1)
        .createTextFinder(id).matchEntireCell(true).findNext();
      if (found) {
        const r = found.getRow();
        const stored = sheet.getRange(r, 5, 1, 5).getValues()[0];
        return {
          ok: true,
          alreadySaved: true,
          measuredSeconds: Number(stored[0]),
          errorSeconds: Number(stored[1]),
          absoluteErrorSeconds: Number(stored[2]),
          winner: String(stored[3]) === '예',
          responseId: id
        };
      }
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      id, asSafeCell_(school), asSafeCell_(studentName),
      shownSec, signedError, absoluteError, winner ? '예' : '아니오',
      elapsedMs, asSafeCell_(stoppedAt)
    ]);
    SpreadsheetApp.flush();

    return {
      ok: true,
      alreadySaved: false,
      measuredSeconds: shownSec,
      errorSeconds: signedError,
      absoluteErrorSeconds: absoluteError,
      winner: winner,
      responseId: id
    };
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Google 스프레드시트에 연결된 Apps Script에서 실행해 주세요.');
  }
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground('#1a2844').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 145);
    sheet.setColumnWidth(2, 290);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 100);
  }
  return sheet;
}

function cleanText_(value, maxLen, label) {
  if (typeof value !== 'string') throw new Error(label + '을(를) 입력해 주세요.');
  const v = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  if (v.length < 1 || v.length > maxLen) {
    throw new Error(label + '은(는) 1~' + maxLen + '자 이내로 작성해 주세요.');
  }
  return v;
}

/** 스프레드시트 수식 삽입 방지 */
function asSafeCell_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
