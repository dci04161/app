// 화면 공통 도구
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 영어 텍스트를 단어 단위로 터치 가능하게 렌더링 (단어 조회용) */
export function enText(str) {
  const s = String(str ?? '');
  let out = '';
  let last = 0;
  const re = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;
  let m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(last, m.index));
    out += `<span class="w">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  out += esc(s.slice(last));
  return `<span class="en">${out}</span>`;
}

let toastTimer;
export function toast(msg, ms = 2500) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

let sheetOnClose = null;
export function openSheet(html, onClose) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  sheetOnClose = onClose || null;
  return $('#sheetBody');
}
export function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheetBody').innerHTML = '';
  const cb = sheetOnClose; sheetOnClose = null;
  cb?.();
}
export function sheetOpen() { return !$('#sheet').classList.contains('hidden'); }

export function confirmBox(message, okLabel = '확인') {
  return new Promise((resolve) => {
    const body = openSheet(`<p class="confirm-msg">${esc(message)}</p>
      <div class="row gap"><button class="btn" data-x="no">취소</button><button class="btn primary" data-x="yes">${esc(okLabel)}</button></div>`,
    () => resolve(false));
    body.addEventListener('click', (e) => {
      const x = e.target.closest('[data-x]')?.dataset.x;
      if (!x) return;
      sheetOnClose = null;
      closeSheet();
      resolve(x === 'yes');
    });
  });
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const LEVELS = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'];
export function levelIndex(l) { return LEVELS.indexOf(String(l || '').toUpperCase().replace(/\s/g, '')); }
export function averageLevel(levels) {
  const idx = levels.map(levelIndex).filter((i) => i >= 0);
  if (!idx.length) return null;
  const avg = idx.reduce((a, b) => a + b, 0) / idx.length;
  return LEVELS[Math.round(avg)];
}

export function setTitle(t) { $('#title').textContent = t; document.title = t === '오픽 연습' ? t : `${t} · 오픽 연습`; }

export function wordsOf(text) {
  return (String(text || '').match(/[A-Za-z][A-Za-z'’-]*/g) || []);
}
