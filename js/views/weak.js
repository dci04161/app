// 약점 분석 화면
import { settings } from '../settings.js';
import { computeStats } from '../stats.js';
import { buildTypePractice } from '../exam.js';
import { esc, enText, setTitle } from '../ui.js';
import { startSession } from './runner.js';

const bar = (label, v, max = 5) => `<div class="score-row"><span>${esc(label)}</span><div class="bar"><div style="width:${v ? (v / max) * 100 : 0}%"></div></div><b>${v ? v.toFixed(1) : '-'}</b></div>`;

export async function render(view) {
  setTitle('약점 분석');
  const st = await computeStats();
  if (!st.count) {
    view.innerHTML = '<div class="card muted">분석된 답변이 아직 없습니다. 연습하고 AI 분석을 받으면 약점이 여기에 정리됩니다.</div>';
    return;
  }
  const weakScores = [...st.scores].filter((x) => x.avg != null).sort((a, b) => a.avg - b.avg);
  view.innerHTML = `
    <div class="card">
      <div class="row between"><b>최근 10개 평균 예상 등급</b><span class="level big">${esc(st.recentLevel || '-')}</span></div>
      <div class="small muted">분석한 답변 ${st.count}개 기준 · 평균 말하기 속도 ${st.avgWpm ?? '-'} wpm (보통 100~140 wpm이면 자연스러움)</div>
      <div class="small">1분 미만 답변 비율: <b>${Math.round(st.shortRatio * 100)}%</b>${st.shortRatio > 0.3 ? ' — 답변 길이를 늘리는 연습이 필요해요' : ''}</div>
      <div class="small">외운 티 판정: 낮음 ${st.memorized.low} · 보통 ${st.memorized.medium} · 높음 ${st.memorized.high}</div>
    </div>

    <div class="card"><b>항목별 평균 (5점 만점)</b>
      ${st.scores.map((x) => bar(x.label, x.avg)).join('')}
      ${weakScores.length ? `<div class="small mt">가장 약한 항목: <b>${esc(weakScores[0].label)}</b></div>` : ''}
    </div>

    <div class="card"><b>유형별 평균 (약한 순)</b>
      ${st.groups.map((g) => `<div class="row between gap">
        <div class="grow">${bar(`${g.label} (${g.n})`, g.avg)}</div>
        <button class="btn tiny" data-gid="${g.id}" data-label="${esc(g.label)}">연습</button></div>`).join('')}
    </div>

    <div class="card"><b>자주 틀리는 문법</b>
      ${st.grammarTop.length ? st.grammarTop.slice(0, 6).map((g) => `
        <details><summary>${esc(g.cat)} <span class="tag">${g.n}회</span></summary>
          ${g.examples.map((e) => `<div class="fix"><div class="before">${enText(e.original)}</div><div class="after">→ ${enText(e.corrected)}</div><div class="small">${esc(e.explanation_ko)}</div></div>`).join('')}
        </details>`).join('') : '<div class="small muted">기록된 문법 오류가 없습니다.</div>'}
    </div>`;

  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gid]');
    if (!b) return;
    const qids = buildTypePractice(b.dataset.gid, settings().survey, 5);
    startSession({ mode: 'practice', title: `약점 집중: ${b.dataset.label}`, qids });
  });
}
