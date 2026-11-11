'use strict';

const byId = id => document.getElementById(id);
const koreanTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'medium'
});
const headings = ['저장 시각 (한국)', '학교', '학번', '이름', '측정 시간 (초)', '20초와의 오차 (초)', '20.00초 달성'];
let accessKey = '';
let records = [];
let requestNumber = 0;
let deleting = false;

function formatRecord(record) {
  const centiseconds = Math.round(record.elapsed_ms / 10);
  return [
    koreanTime.format(new Date(record.saved_at)), record.school, record.student_number,
    record.student_name, centiseconds / 100, (centiseconds - 2000) / 100,
    centiseconds === 2000 ? '예' : '아니오'
  ];
}

function render() {
  const body = document.createDocumentFragment();
  for (const record of records) {
    const row = document.createElement('tr');
    formatRecord(record).forEach((value, index) => {
      row.insertCell().textContent = index === 4 || index === 5 ? value.toFixed(2) : value;
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delete-record';
    button.textContent = '삭제';
    button.setAttribute('aria-label', record.student_name + ' 측정 기록 삭제');
    button.addEventListener('click', () => deleteRecord(record));
    row.insertCell().appendChild(button);
    body.appendChild(row);
  }
  byId('rows').replaceChildren(body);
  byId('count').textContent = '응답 ' + records.length.toLocaleString('ko-KR') + '건';
  byId('export').disabled = records.length === 0;
}

function signOut() {
  requestNumber++;
  deleting = false;
  accessKey = '';
  records = [];
  render();
  byId('key').value = '';
  byId('dashboard').hidden = true;
  byId('login').hidden = false;
  byId('status').textContent = '';
  byId('signIn').disabled = false;
  byId('refresh').disabled = false;
}

async function loadResults(key) {
  if (deleting) return;
  const current = ++requestNumber;
  byId('signIn').disabled = true;
  byId('refresh').disabled = true;
  byId('status').textContent = '결과를 불러오는 중입니다.';
  try {
    const result = await experimentRequest('list_time_results', { access_key: key });
    if (current !== requestNumber) return;
    accessKey = key;
    records = result;
    render();
    byId('key').value = '';
    byId('login').hidden = true;
    byId('dashboard').hidden = false;
    byId('status').textContent = '';
  } catch (error) {
    if (current !== requestNumber) return;
    if (error.status === 403) {
      signOut();
      byId('status').textContent = '관리자 접속 키를 확인해 주세요.';
      return;
    }
    byId('status').textContent = '결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    if (current === requestNumber) {
      byId('signIn').disabled = false;
      byId('refresh').disabled = false;
    }
  }
}

async function deleteRecord(record) {
  if (!accessKey || deleting || byId('refresh').disabled) return;
  const [savedAt, school, studentNumber, name, seconds] = formatRecord(record);
  if (!window.confirm(`${school} ${studentNumber} ${name} · ${seconds.toFixed(2)}초
${savedAt}
이 측정 기록을 삭제할까요?`)) return;

  const current = ++requestNumber;
  deleting = true;
  byId('refresh').disabled = true;
  byId('status').textContent = '기록을 삭제하는 중입니다.';
  try {
    const result = await experimentRequest('delete_time_result', {
      access_key: accessKey, response_id: record.id
    });
    if (current !== requestNumber) return;
    if (result?.ok !== true) throw new Error('삭제 확인 실패');
    records = records.filter(row => row.id !== record.id);
    render();
    byId('status').textContent = '선택한 측정 기록을 삭제했습니다.';
  } catch (error) {
    if (current !== requestNumber) return;
    if (error.status === 403) {
      signOut();
      byId('status').textContent = '관리자 접속 키를 확인해 주세요.';
      return;
    }
    byId('status').textContent = '삭제를 확인하지 못했습니다. 새로고침하거나 다시 시도해 주세요.';
  } finally {
    if (current === requestNumber) {
      deleting = false;
      byId('refresh').disabled = false;
    }
  }
}

byId('login').addEventListener('submit', event => {
  event.preventDefault();
  loadResults(byId('key').value.trim());
});
byId('refresh').addEventListener('click', () => loadResults(accessKey));
byId('signOut').addEventListener('click', signOut);
byId('export').addEventListener('click', () => {
  try {
    const data = records.map(formatRecord);
    const sheet = XLSX.utils.aoa_to_sheet([headings, ...data]);
    for (let row = 2; row <= data.length + 1; row++) {
      sheet['E' + row].z = '0.00';
      sheet['F' + row].z = '0.00';
    }
    sheet['!cols'] = [24, 22, 16, 18, 18, 23, 18].map(wch => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, '실험결과');
    XLSX.writeFile(workbook, '시간감각_실험결과.xlsx');
  } catch (error) {
    byId('status').textContent = '엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.';
  }
});
