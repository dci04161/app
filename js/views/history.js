// 기록 목록 · 세션(모의고사/연습) 결과
import { get, getAll, del, byIndex } from '../db.js';
import { getQuestion, TYPE_LABELS, topicLabel } from '../questions.js';
import { analyzeMany } from '../analysis.js';
import { openExamples } from './examples.js';
import { esc, setTitle, fmtDate, fmtTime, averageLevel, confirmBox, toast } from '../ui.js';

const reload = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

export async function render(view) {
  setTitle('기록');
  const [sessions, attempts] = await Promise.all([getAll('sessions'), getAll('attempts')]);
  const bySession = {};
  for (const a of attempts) (bySession[a.sessionId] ||= []).push(a);
  const list = sessions.filter((s) => (bySession[s.id] || []).length).sort((a, b) => b.createdAt - a.createdAt);

  view.innerHTML = list.length ? list.map((s) => {
    const ats = bySession[s.id] || [];
    const lvl = averageLevel(ats.map((a) => a.feedback?.estimated_level).filter(Boolean));
    const pend = ats.filter((a) => a.status !== 'done').length;
    return `<a class="card block" href="#/review/${s.id}">
      <div class="row between"><b>${esc(s.title || (s.mode === 'mock' ? '모의고사' : '연습'))}</b><span class="level">${esc(lvl || '-')}</span></div>
      <div class="small muted">${fmtDate(s.createdAt)} · 답변 ${ats.length}개${pend ? ` · 미분석 ${pend}` : ''}${!s.finishedAt ? ' · 진행 중' : ''}</div>
    </a>`;
  }).join('') : '<div class="card muted">아직 기록이 없습니다. 연습을 시작해 보세요!</div>';
}

export async function renderReview(view, sessionId) {
  const s = await get('sessions', sessionId);
  if (!s) { view.innerHTML = '<div class="card">기록을 찾을 수 없습니다.</div>'; return; }
  setTitle(s.mode === 'mock' ? '모의고사 결과' : '연습 결과');
  const ats = await byIndex('attempts', 'sessionId', s.id);
  const byId = Object.fromEntries(ats.map((a) => [a.id, a]));
  const rows = s.qids.map((qid, i) => ({ i, qid, q: getQuestion(qid), ans: s.answers[i], at: byId[s.answers[i]] }));
  const pending = ats.filter((a) => a.status !== 'done');
  const lvl = averageLevel(ats.map((a) => a.feedback?.estimated_level).filter(Boolean));
  const doneCount = ats.filter((a) => a.status === 'done').length;

  const justEnded = s.mode === 'mock' && s.finishedAt && Date.now() - s.finishedAt < 60000;
  view.innerHTML = `
    ${justEnded ? `<div class="card accent center"><b>${s.timeUp ? '40분이 지나 시험이 종료되었습니다.' : '시험이 종료되었습니다. 수고하셨습니다!'}</b><div class="small muted">아래에서 답변을 AI로 분석할 수 있습니다.</div></div>` : ''}
    <div class="card">
      <div class="row between"><b>${esc(s.title)}</b><span class="level big">${esc(lvl || '-')}</span></div>
      <div class="small muted">${fmtDate(s.createdAt)} · 답변 ${ats.length}개 · 분석 완료 ${doneCount}개${s.timeUp ? " · 40분 시간 종료" : ""}</div>
      <div class="small muted">종합 예상 등급은 문항별 예상 등급의 평균(참고용)입니다.</div>
      ${!s.finishedAt ? `<a class="btn primary mt" href="#/session/${s.id}">이어서 하기 (${s.index + 1}/${s.qids.length})</a>` : ''}
      ${pending.length ? `<div id="prog" class="small mt"></div><button class="btn primary mt" data-act="all">미분석 ${pending.length}개 AI 분석하기</button>
        <div class="small muted">무료 한도를 아끼기 위해 한 개씩 순서대로 분석합니다. 15문항은 몇 분 걸릴 수 있어요.</div>` : ''}
    </div>
    ${rows.map((r) => `
      ${r.at ? `<a class="card block" href="#/attempt/${r.at.id}">` : '<div class="card">'}
        <div class="row between"><span class="small"><b>${r.i + 1}.</b> ${esc(topicLabel(r.q?.topic))} · ${esc(TYPE_LABELS[r.q?.type] || '')}</span>
          <span class="level">${r.at ? esc(r.at.feedback?.estimated_level || statusLabel(r.at.status)) : r.ans === 'skipped' ? '건너뜀' : '미응답'}</span></div>
        <div class="small q-preview">${esc(r.q?.text || '')}</div>
        ${r.at ? `<div class="small muted">${fmtTime(r.at.duration)}${r.at.status === 'error' ? ` · ${esc(r.at.error)}` : ''}</div>` : ''}
        ${r.at ? '' : `<button class="btn tiny mt" data-ex="${r.qid}">📘 예시 답변</button>`}
      ${r.at ? '</a>' : '</div>'}`).join('')}
    <button class="btn ghost danger full" data-act="delete">이 기록 삭제</button>`;

  view.addEventListener('click', async (e) => {
    const ex = e.target.closest('[data-ex]');
    if (ex) { openExamples(ex.dataset.ex); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'all') {
      b.disabled = true;
      const prog = view.querySelector('#prog');
      const res = await analyzeMany(pending.map((a) => a.id), (p) => {
        if (prog) prog.textContent = p.done ? `완료: 성공 ${p.ok}, 실패 ${p.fail}` : `${p.index + 1}/${p.total} 분석 중… ${p.status || ''}`;
      });
      toast(`분석 완료: 성공 ${res.ok}개${res.fail ? `, 실패 ${res.fail}개` : ''}`, 3500);
      if (document.body.contains(view)) reload();
    }
    if (b.dataset.act === 'delete') {
      if (!(await confirmBox('이 세션의 녹음과 분석 결과를 모두 삭제할까요? 되돌릴 수 없습니다.', '삭제'))) return;
      for (const a of ats) { await del('audio', a.id); await del('attempts', a.id); }
      await del('sessions', s.id);
      toast('삭제했습니다');
      location.hash = '#/history';
    }
  });
}

function statusLabel(st) {
  return { recorded: '미분석', analyzing: '분석 중', error: '실패', done: '-' }[st] || st;
}
