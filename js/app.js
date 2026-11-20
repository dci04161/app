import { openDB } from './db.js';
import { loadSettings } from './settings.js';
import { $, $$, closeSheet, sheetOpen, setTitle, esc } from './ui.js';
import { stopSpeak } from './tts.js';
import { openLookup } from './views/vocab.js';

import * as home from './views/home.js';
import * as survey from './views/survey.js';
import * as examstart from './views/examstart.js';
import * as practice from './views/practice.js';
import * as runner from './views/runner.js';
import * as attempt from './views/attempt.js';
import * as historyView from './views/history.js';
import * as weak from './views/weak.js';
import * as vocab from './views/vocab.js';
import * as settingsView from './views/settings.js';

// [경로 패턴, 모듈, 렌더 함수 이름, 하단 탭]
const ROUTES = [
  [/^\/?$/, home, 'render', 'home'],
  [/^\/survey$/, survey, 'render', 'home'],
  [/^\/exam$/, examstart, 'render', null],
  [/^\/exam\/(\d+)$/, examstart, 'render', null],
  [/^\/rp\/([\w-]+)$/, practice, 'renderRpSet', 'practice'],
  [/^\/practice$/, practice, 'render', 'practice'],
  [/^\/topic\/([\w-]+)$/, practice, 'renderTopic', 'practice'],
  [/^\/session\/([\w-]+)$/, runner, 'render', null],
  [/^\/review\/([\w-]+)$/, historyView, 'renderReview', 'history'],
  [/^\/attempt\/([\w-]+)$/, attempt, 'render', 'history'],
  [/^\/history$/, historyView, 'render', 'history'],
  [/^\/weak$/, weak, 'render', 'weak'],
  [/^\/vocab$/, vocab, 'render', 'vocab'],
  [/^\/vocab\/review$/, vocab, 'renderReview', 'vocab'],
  [/^\/settings$/, settingsView, 'render', null],
];

let cleanup = null;
let navToken = 0;

async function route() {
  const token = ++navToken;
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null;
  stopSpeak();
  if (sheetOpen()) closeSheet();
  hidePhraseBtn();
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  const view = $('#view');
  let found = ROUTES.find(([re]) => re.test(path));
  if (!found) { location.replace('#/'); return; }
  const [re, mod, fn, tab] = found;
  const params = path.match(re).slice(1);
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  document.body.classList.toggle('no-tabbar', tab === null);
  $('#backBtn').style.visibility = path === '/' ? 'hidden' : 'visible';
  // 화면마다 새 컨테이너를 만들어 이전 화면의 이벤트 리스너가 남지 않게 함
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = '<div class="loading">불러오는 중…</div>';
  view.replaceChildren(page);
  window.scrollTo(0, 0);
  try {
    const c = await mod[fn](page, ...params);
    if (token !== navToken) { if (typeof c === 'function') c(); return; }
    cleanup = c;
  } catch (err) {
    console.error(err);
    setTitle('오류');
    page.innerHTML = `<div class="card error">화면을 여는 중 오류가 발생했습니다.<br><small>${esc(err?.message || err)}</small></div>`;
  }
}

/* ───── 단어 터치 / 구절 선택 조회 ───── */

function sentenceAround(el) {
  const container = el.closest('.en');
  if (!container) return '';
  const text = container.textContent;
  // 클릭한 단어가 속한 문장 추출 (컨테이너 시작부터 단어 앞까지의 글자 수 = 위치)
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEndBefore(el);
  const idx = range.toString().length;
  const start = Math.max(text.lastIndexOf('.', idx - 1), text.lastIndexOf('?', idx - 1), text.lastIndexOf('!', idx - 1)) + 1;
  const ends = ['.', '?', '!'].map((c) => text.indexOf(c, idx)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  return text.slice(start, end).trim();
}

document.addEventListener('click', (e) => {
  const w = e.target.closest('.en .w');
  if (!w) return;
  const sel = window.getSelection();
  if (sel && String(sel).trim().includes(' ')) return; // 구절 선택 중이면 단어 조회 안 함
  e.preventDefault();
  e.stopPropagation();
  openLookup(w.textContent, sentenceAround(w));
}, true);

const phraseBtn = () => $('#phraseBtn');
function hidePhraseBtn() { phraseBtn().classList.add('hidden'); }
let phraseTimer;
document.addEventListener('selectionchange', () => {
  clearTimeout(phraseTimer);
  phraseTimer = setTimeout(() => {
    const sel = window.getSelection();
    const text = sel ? String(sel).trim() : '';
    if (!text || !sel.rangeCount) { hidePhraseBtn(); return; }
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const words = text.split(/\s+/).length;
    if (!node?.closest('.en') || words < 2 || words > 8) { hidePhraseBtn(); return; }
    const btn = phraseBtn();
    btn.dataset.term = text;
    btn.dataset.context = node.closest('.en').textContent.slice(0, 400);
    btn.classList.remove('hidden');
  }, 250);
});
phraseBtn().addEventListener('click', () => {
  const btn = phraseBtn();
  const term = btn.dataset.term;
  const ctx = btn.dataset.context;
  hidePhraseBtn();
  window.getSelection()?.removeAllRanges();
  if (term) openLookup(term, ctx);
});

/* ───── 공통 UI ───── */

$('#sheet').addEventListener('click', (e) => {
  if (e.target.classList.contains('sheet-backdrop') || e.target.closest('[data-close-sheet]')) closeSheet();
});
$('#backBtn').addEventListener('click', () => {
  if (window.history.length > 1) window.history.back(); else location.hash = '#/';
});
window.addEventListener('hashchange', route);

async function boot() {
  try {
    await openDB();
    await loadSettings();
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  } catch (err) {
    $('#view').innerHTML = `<div class="card error">이 브라우저에서 저장소를 열 수 없습니다: ${esc(err?.message || err)}</div>`;
    return;
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  route();
}

boot();
