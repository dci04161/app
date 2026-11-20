// 단어 조회 팝업 · 단어장 · 플래시카드 복습
import { settings } from '../settings.js';
import { lookupTerm, normalizeTerm, termKey, isSaved, saveVocab, removeVocab, allVocab, markReview } from '../lookup.js';
import { friendlyError } from '../gemini.js';
import { speak, stopSpeak } from '../tts.js';
import { esc, enText, setTitle, toast, confirmBox, fmtDate } from '../ui.js';

/* ───── 조회 팝업 (모범답안 시트 위에도 뜨도록 별도 레이어) ───── */

function layer() {
  let el = document.getElementById('lookupLayer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lookupLayer';
    el.className = 'lookup-layer hidden';
    el.innerHTML = '<div class="sheet-backdrop"></div><div class="sheet-panel lookup-panel"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('sheet-backdrop') || e.target.closest('[data-lk=close]')) closeLookup();
    });
  }
  return el;
}

export function closeLookup() {
  const el = document.getElementById('lookupLayer');
  if (el) { el.classList.add('hidden'); el.querySelector('.lookup-panel').innerHTML = ''; }
  stopSpeak();
}
window.addEventListener('hashchange', closeLookup);

let lookupSeq = 0;

export async function openLookup(rawTerm, context = '', saved = null) {
  const term = normalizeTerm(rawTerm);
  if (!term) return;
  const seq = ++lookupSeq;
  const el = layer();
  const panel = el.querySelector('.lookup-panel');
  el.classList.remove('hidden');
  panel.innerHTML = `
    <div class="sheet-head"><b class="lk-term">${esc(term)}</b><button class="icon-btn" data-lk="close">✕</button></div>
    <div class="row gap"><button class="btn small" data-lk="say">🔊 발음</button><button class="btn small" data-lk="slow">🐢 천천히</button></div>
    <div class="lk-body"><div class="spinner"></div><div class="lk-status small muted">뜻을 찾는 중…</div></div>`;

  const say = (rate) => speak(term, { rate });
  panel.querySelector('[data-lk=say]').addEventListener('click', () => say(0.9));
  panel.querySelector('[data-lk=slow]').addEventListener('click', () => say(0.55));
  say(0.9);

  let entry = saved;
  if (!entry) {
    if (!settings().apiKey) {
      panel.querySelector('.lk-body').innerHTML = '<div class="small muted">뜻 조회는 설정에서 Gemini API 키를 입력해야 사용할 수 있습니다. 발음 듣기는 키 없이 가능합니다.</div>';
      return;
    }
    try {
      entry = await lookupTerm(term, context, { onStatus: (m) => { const s = panel.querySelector('.lk-status'); if (s) s.textContent = m; } });
    } catch (err) {
      if (seq !== lookupSeq) return;
      panel.querySelector('.lk-body').innerHTML = `<div class="card error">${esc(friendlyError(err))}</div>`;
      return;
    }
  }
  if (seq !== lookupSeq) return;
  const savedNow = saved ? true : await isSaved(term);
  const ctxMatch = entry.context && context && entry.context === context.slice(0, 400);
  panel.querySelector('.lk-body').innerHTML = `
    ${entry.headword && termKey(entry.headword) !== termKey(term) ? `<div class="small">기본형: <b>${enText(entry.headword)}</b></div>` : ''}
    ${entry.ipa ? `<div class="ipa">${esc(entry.ipa)}</div>` : ''}
    ${entry.pronunciation_ko ? `<div class="small">🗣 ${esc(entry.pronunciation_ko)}</div>` : ''}
    <div class="meanings">${(entry.meanings || []).map((m) => `<div><span class="tag">${esc(m.pos || '뜻')}</span> ${esc(m.ko)}</div>`).join('') || '<div class="muted small">뜻 정보 없음</div>'}</div>
    ${(ctxMatch || saved) && entry.context_meaning_ko ? `<div class="card accent small">문장 속 의미: ${esc(entry.context_meaning_ko)}</div>` : ''}
    ${entry.example_en ? `<div class="example"><div>${enText(entry.example_en)} <button class="btn tiny" data-lk="ex">🔊</button></div><div class="small muted">${esc(entry.example_ko)}</div></div>` : ''}
    ${entry.forms ? `<div class="small muted">관련 형태: ${esc(entry.forms)}</div>` : ''}
    <button class="btn ${savedNow ? '' : 'primary'} full mt" data-lk="save">${savedNow ? '단어장에서 빼기' : '＋ 단어장에 저장'}</button>`;

  let isIn = savedNow;
  panel.querySelector('[data-lk=ex]')?.addEventListener('click', () => speak(entry.example_en));
  panel.querySelector('[data-lk=save]').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (isIn) {
      await removeVocab(termKey(term));
      isIn = false; b.textContent = '＋ 단어장에 저장'; b.classList.add('primary');
      toast('단어장에서 뺐습니다');
    } else {
      await saveVocab({ ...entry, term }, context);
      isIn = true; b.textContent = '단어장에서 빼기'; b.classList.remove('primary');
      toast('단어장에 저장했습니다');
    }
    document.dispatchEvent(new CustomEvent('vocab-changed'));
  });
}

/* ───── 단어장 목록 ───── */

export async function render(view) {
  setTitle('단어장');
  let list = await allVocab();
  view.innerHTML = `
    <div class="card">
      <form id="lkForm" class="row gap"><input id="lkInput" placeholder="단어·표현 직접 조회 (영어)" autocomplete="off" autocapitalize="off"><button class="btn primary">조회</button></form>
    </div>
    <div class="row gap between">
      <input id="search" placeholder="단어장 검색" class="grow">
      <a class="btn primary" href="#/vocab/review">복습</a>
    </div>
    <div id="vlist"></div>`;

  const paint = () => {
    const q = view.querySelector('#search').value.trim().toLowerCase();
    const shown = list.filter((v) => !q || v.term.toLowerCase().includes(q) || (v.meanings || []).some((m) => m.ko.includes(q)));
    view.querySelector('#vlist').innerHTML = shown.length ? shown.map((v) => `
      <div class="card vitem" data-key="${esc(v.key)}">
        <div class="row between"><b>${esc(v.term)}</b><span class="small muted">${esc(v.ipa || '')}</span></div>
        <div class="small">${esc((v.meanings || []).slice(0, 2).map((m) => m.ko).join(' / '))}</div>
        <div class="row between small muted"><span>${fmtDate(v.addedAt)} · 맞힘 ${v.known || 0} · 모름 ${v.unknown || 0}</span>
          <span><button class="btn tiny" data-v="say">🔊</button> <button class="btn tiny" data-v="del">삭제</button></span></div>
      </div>`).join('') : `<div class="card muted">${list.length ? '검색 결과가 없습니다.' : '저장된 단어가 없습니다. 피드백·질문의 영어 단어를 누르면 뜻을 보고 저장할 수 있어요.'}</div>`;
  };
  paint();

  view.querySelector('#search').addEventListener('input', paint);
  view.querySelector('#lkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = view.querySelector('#lkInput').value;
    if (normalizeTerm(t)) openLookup(t, '');
  });
  view.addEventListener('click', async (e) => {
    const item = e.target.closest('.vitem');
    if (!item) return;
    const v = list.find((x) => x.key === item.dataset.key);
    if (!v) return;
    const act = e.target.closest('[data-v]')?.dataset.v;
    if (act === 'say') { speak(v.term, { rate: 0.9 }); return; }
    if (act === 'del') {
      if (await confirmBox(`'${v.term}'을(를) 단어장에서 삭제할까요?`, '삭제')) {
        await removeVocab(v.key); list = await allVocab(); paint();
      }
      return;
    }
    openLookup(v.term, v.context, v);
  });
  const onChange = async () => { list = await allVocab(); if (document.body.contains(view)) paint(); };
  document.addEventListener('vocab-changed', onChange);
  return () => document.removeEventListener('vocab-changed', onChange);
}

/* ───── 플래시카드 복습 ───── */

export async function renderReview(view) {
  setTitle('단어 복습');
  const all = await allVocab();
  if (!all.length) {
    view.innerHTML = '<div class="card muted">단어장이 비어 있습니다. 먼저 단어를 저장해 주세요.</div>';
    return;
  }
  // 모르는 횟수가 많고 오래 복습 안 한 단어 우선, 한 번에 20개
  const deck = [...all].sort((a, b) => ((b.unknown || 0) - (b.known || 0)) - ((a.unknown || 0) - (a.known || 0)) || (a.lastReviewed || 0) - (b.lastReviewed || 0)).slice(0, 20);
  let i = 0; let knew = 0;

  const show = (revealed = false) => {
    if (i >= deck.length) {
      view.innerHTML = `<div class="card center"><b>복습 완료!</b><p>${deck.length}개 중 ${knew}개 알고 있었어요.</p>
        <a class="btn primary" href="#/vocab/review" data-again>한 번 더</a> <a class="btn" href="#/vocab">단어장</a></div>`;
      view.querySelector('[data-again]').addEventListener('click', (e) => { e.preventDefault(); window.dispatchEvent(new HashChangeEvent('hashchange')); });
      return;
    }
    const v = deck[i];
    view.innerHTML = `
      <div class="small muted center">${i + 1} / ${deck.length}</div>
      <div class="card flash">
        <div class="flash-term">${esc(v.term)}</div>
        <div class="muted">${esc(v.ipa || '')}</div>
        <button class="btn small" data-f="say">🔊</button>
        ${revealed ? `
          <div class="meanings mt">${(v.meanings || []).map((m) => `<div><span class="tag">${esc(m.pos || '뜻')}</span> ${esc(m.ko)}</div>`).join('')}</div>
          ${v.example_en ? `<div class="example">${enText(v.example_en)}<div class="small muted">${esc(v.example_ko || '')}</div></div>` : ''}` : ''}
      </div>
      ${revealed ? `<div class="grid2"><button class="btn big" data-f="no">모르겠어요</button><button class="btn primary big" data-f="yes">알아요</button></div>`
        : '<button class="btn primary big full" data-f="reveal">뜻 보기</button>'}`;
    if (!revealed) speak(v.term, { rate: 0.9 });
  };

  view.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-f]')?.dataset.f;
    if (!f || i >= deck.length) return;
    const v = deck[i];
    if (f === 'say') speak(v.term, { rate: 0.9 });
    if (f === 'reveal') show(true);
    if (f === 'yes' || f === 'no') {
      await markReview(v.key, f === 'yes');
      if (f === 'yes') knew++;
      i++; show(false);
    }
  });
  show(false);
  return () => stopSpeak();
}
