// 답변 피드백 화면
import { get, put, byIndex } from '../db.js';
import { getQuestion, TYPE_LABELS, SRC_LABELS, topicLabel } from '../questions.js';
import { analyzeAttempt, inProgress, SCORE_LABELS, STRUCTURE_GUIDE } from '../analysis.js';
import { saveExpression } from '../lookup.js';
import { friendlyError } from '../gemini.js';
import { speak, stopSpeak } from '../tts.js';
import { playQuestion } from '../aivoice.js';
import { esc, enText, fmtTime, fmtDate, setTitle, toast } from '../ui.js';
import { startSession } from './runner.js';
import { openSample } from './practice.js';

const MEM_LABEL = { low: '낮음', medium: '보통', high: '높음' };

export async function render(view, attemptId) {
  setTitle('답변 피드백');
  let at = await get('attempts', attemptId);
  if (!at) { view.innerHTML = '<div class="card">기록을 찾을 수 없습니다.</div>'; return; }
  const q = getQuestion(at.qid) || { id: at.qid, type: at.qtype, topic: at.topic, text: at.qtext };
  const session = at.sessionId ? await get('sessions', at.sessionId) : null;
  const blob = await get('audio', at.id);
  const audioUrl = blob ? URL.createObjectURL(blob) : '';
  let alive = true;

  function nextNav() {
    if (!session) return '';
    if (session.mode === 'mock') return `<a class="btn" href="#/review/${session.id}">모의고사 결과로</a>`;
    if (!session.finishedAt && session.index < session.qids.length) {
      return `<a class="btn primary" href="#/session/${session.id}">다음 문제 → (${session.index + 1}/${session.qids.length})</a>`;
    }
    return session.qids.length > 1 ? `<a class="btn" href="#/review/${session.id}">연습 결과 보기</a>` : '';
  }

  function paint(statusMsg = '') {
    const fb = at.feedback;
    view.innerHTML = `
      <div class="card">
        <div class="small muted">${esc(topicLabel(q.topic))} · ${esc(TYPE_LABELS[q.type] || q.type)} · ${fmtDate(at.createdAt)} ${q.src ? `<span class="tag src-${q.src}">${esc(SRC_LABELS[q.src])}</span>` : ''}</div>
        <div class="q-text">${enText(q.text)}</div>
        <div class="row gap wrap">
          <button class="btn small" data-act="speakQ">🔊 질문 듣기</button>
          <button class="btn small" data-act="sample">📘 예시 답변</button>
          <button class="btn small" data-act="retry">↻ 재도전</button>
        </div>
      </div>

      <div class="card">
        <div class="row between"><b>내 답변</b><span class="small muted">${fmtTime(at.duration)}${at.stats ? ` · ${at.stats.words}단어 · ${at.stats.wpm} wpm` : ''}</span></div>
        ${audioUrl ? `<audio controls preload="metadata" src="${audioUrl}"></audio>` : '<div class="small muted">녹음 파일 없음</div>'}
        ${(at.duration || 0) < 60 && !['rp_ask', 'rp_eva'].includes(q.type) ? '<div class="pill warn">1분 미만 답변 — IH 목표라면 1분 30초 이상을 권장합니다</div>' : ''}
      </div>

      ${at.status !== 'done' ? `
        <div class="card ${at.status === 'error' ? 'error' : ''}">
          ${at.status === 'analyzing' || statusMsg ? `<div class="spinner"></div><div>${esc(statusMsg || 'AI가 분석 중입니다…')}</div>` : ''}
          ${at.status === 'error' ? `<div>분석 실패: ${esc(at.error)}</div>` : ''}
          ${at.status === 'recorded' && !statusMsg ? '<div>아직 분석하지 않은 답변입니다.</div>' : ''}
          ${at.status !== 'analyzing' && !statusMsg ? '<button class="btn primary" data-act="analyze">AI 분석하기</button>' : ''}
        </div>` : ''}

      ${fb ? feedbackHtml(fb, q) : ''}

      <div class="actions">${nextNav()}</div>
      <div class="card">
        <b>같은 질문 이전 기록</b>
        <div id="prevList" class="small muted">불러오는 중…</div>
      </div>`;
    loadPrev();
    fixWebmDuration(view.querySelector('audio'));
  }

  async function loadPrev() {
    const list = (await byIndex('attempts', 'qid', at.qid)).filter((a) => a.id !== at.id).sort((a, b) => b.createdAt - a.createdAt);
    const box = view.querySelector('#prevList');
    if (!box) return;
    box.innerHTML = list.length
      ? list.map((a) => `<a class="list-item" href="#/attempt/${a.id}"><span>${fmtDate(a.createdAt)} · ${fmtTime(a.duration)}</span><b>${esc(a.feedback?.estimated_level || (a.status === 'done' ? '-' : '미분석'))}</b></a>`).join('')
      : '이 질문의 다른 기록이 없습니다.';
  }

  async function runAnalyze() {
    at.status = 'analyzing';
    paint('녹음 준비 중…');
    try {
      at = await analyzeAttempt(at.id, (msg) => { if (alive) { const s = view.querySelector('.spinner + div'); if (s) s.textContent = msg; } });
      if (alive) paint();
    } catch (err) {
      at = (await get('attempts', at.id)) || at;
      if (alive) { paint(); toast(friendlyError(err), 4000); }
    }
  }

  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'speakQ') playQuestion(q.text, { onFallback: (m) => toast(m, 4000) });
    else if (act === 'speakImproved') speak(at.feedback?.improved_answer || '');
    else if (act === 'stopSpeak') stopSpeak();
    else if (act === 'analyze') runAnalyze();
    else if (act === 'sample') openSample(q.id);
    else if (act === 'retry') startSession({ mode: 'practice', title: '재도전', qids: [q.id] });
    else if (act === 'saveExpr') {
      const x = at.feedback?.useful_expressions?.[Number(b.dataset.i)];
      if (x) { await saveExpression(x, q.text); b.textContent = '저장됨 ✓'; b.disabled = true; toast('단어장에 저장했습니다'); }
    }
  });

  paint();
  if (at.status === 'recorded' && !inProgress.has(at.id)) runAnalyze();
  else if (at.status === 'analyzing' || inProgress.has(at.id)) {
    if (inProgress.has(at.id)) {
      // 다른 화면에서 시작한 분석이 진행 중 → 끝날 때까지 상태 확인
      paint('분석 진행 중…');
      const poll = setInterval(async () => {
        if (!alive) { clearInterval(poll); return; }
        if (!inProgress.has(at.id)) {
          clearInterval(poll);
          at = (await get('attempts', at.id)) || at;
          paint();
        }
      }, 1000);
    } else {
      // 앱이 분석 도중 꺼졌던 경우 → 다시 분석할 수 있게 표시
      at.status = 'error'; at.error = '분석이 중단되었습니다. 다시 시도해 주세요.';
      await put('attempts', at);
      paint();
    }
  }

  return () => { alive = false; stopSpeak(); if (audioUrl) URL.revokeObjectURL(audioUrl); };
}

// 크롬 녹음(webm)은 길이 정보가 없어 재생바가 0:00으로 보이는 문제 보정
function fixWebmDuration(audio) {
  if (!audio) return;
  audio.addEventListener('loadedmetadata', () => {
    if (audio.duration !== Infinity && !Number.isNaN(audio.duration)) return;
    const reset = () => { audio.removeEventListener('timeupdate', reset); audio.currentTime = 0; };
    audio.addEventListener('timeupdate', reset);
    audio.currentTime = 1e7;
  }, { once: true });
}

function scoreBar(label, v) {
  const pct = v ? (v / 5) * 100 : 0;
  return `<div class="score-row"><span>${esc(label)}</span><div class="bar"><div style="width:${pct}%"></div></div><b>${v ?? '-'}</b></div>`;
}

export function feedbackHtml(fb, q) {
  const errs = fb.grammar_errors || [];
  return `
    <div class="card">
      <div class="row between"><b>종합</b><span class="level">${esc(fb.estimated_level || '-')}</span></div>
      <p>${esc(fb.summary_ko)}</p>
      <div class="small muted">예상 등급은 한 문항만 보고 매긴 참고용입니다.</div>
      ${Object.entries(SCORE_LABELS).map(([k, l]) => scoreBar(l, fb.scores?.[k])).join('')}
    </div>

    ${fb.priorities_ko?.length ? `<div class="card accent"><b>다음에 꼭 고칠 점</b><ol>${fb.priorities_ko.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}

    <div class="card">
      <b>문법·표현 교정 ${errs.length ? `(${errs.length})` : ''}</b>
      ${errs.length ? errs.map((e) => `
        <div class="fix">
          <div class="before">${enText(e.original)}</div>
          <div class="after">→ ${enText(e.corrected)}</div>
          <div class="small"><span class="tag">${esc(e.category)}</span> ${esc(e.explanation_ko)}</div>
        </div>`).join('') : '<div class="small muted">눈에 띄는 문법 오류가 없습니다.</div>'}
    </div>

    <div class="card">
      <b>유창성</b>
      ${fb.fluency?.fillers?.length ? `<div class="small">사용한 필러: ${fb.fluency.fillers.map((f) => `<span class="tag">${esc(f)}</span>`).join(' ')}</div>` : ''}
      ${fb.fluency?.hesitation_ko ? `<p>${esc(fb.fluency.hesitation_ko)}</p>` : ''}
      ${fb.fluency?.pace_ko ? `<p>${esc(fb.fluency.pace_ko)}</p>` : ''}
    </div>

    <div class="card">
      <b>구성</b> <span class="pill ${fb.structure?.followed ? 'ok' : 'warn'}">${fb.structure?.followed ? '구조 지킴' : '구조 보완 필요'}</span>
      <div class="small muted">권장 구조: ${esc(STRUCTURE_GUIDE[q.type] || '')}</div>
      <p>${esc(fb.structure?.comment_ko)}</p>
      <b>외운 티</b> <span class="pill ${fb.memorized?.level === 'low' ? 'ok' : 'warn'}">${MEM_LABEL[fb.memorized?.level] || '-'}</span>
      <p>${esc(fb.memorized?.comment_ko)}</p>
    </div>

    ${fb.pronunciation?.length ? `<div class="card"><b>발음 (참고)</b>
      ${fb.pronunciation.map((p) => `<div class="fix"><div>${enText(p.word)} <button class="btn tiny" data-say-word="${esc(p.word)}">🔊</button></div><div class="small">${esc(p.issue_ko)}</div></div>`).join('')}
      <div class="small muted">AI가 오디오로 판단한 참고 의견입니다.</div></div>` : ''}

    <div class="card">
      <div class="row between"><b>추천 답변 (IM2~IH)</b>
        <span><button class="btn tiny" data-act="speakImproved">🔊 듣기</button> <button class="btn tiny" data-act="stopSpeak">■</button></span></div>
      <div class="answer">${enText(fb.improved_answer)}</div>
      ${fb.improved_answer_ko ? `<details><summary>한국어 해석</summary><p>${esc(fb.improved_answer_ko)}</p></details>` : ''}
    </div>

    ${fb.useful_expressions?.length ? `<div class="card"><b>외워둘 표현</b>
      ${fb.useful_expressions.map((x, i) => `
        <div class="fix">
          <div>${enText(x.expression)} — <span>${esc(x.meaning_ko)}</span></div>
          ${x.example ? `<div class="small">${enText(x.example)}</div>` : ''}
          <button class="btn tiny" data-act="saveExpr" data-i="${i}">＋ 단어장</button>
        </div>`).join('')}</div>` : ''}

    <details class="card"><summary><b>받아쓰기 (내가 말한 내용)</b></summary>
      <div class="answer">${fb.transcript ? enText(fb.transcript) : '<span class="muted">인식된 내용 없음</span>'}</div>
    </details>
    <div class="small muted center">영어 단어를 누르면 뜻·발음, 여러 단어를 길게 눌러 선택하면 표현을 조회할 수 있어요.</div>`;
}

// 발음 항목의 🔊 버튼 (data-say)
document.addEventListener('click', (e) => {
  const b = e.target.closest("[data-say-word]");
  if (b) speak(b.dataset.sayWord, { rate: 0.7 });
});
