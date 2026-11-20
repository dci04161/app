// 예시 답변 패널 — 교재 스크립트(있으면) + AI 예시(IM2~IH)
import { getQuestion, TYPE_LABELS, topicLabel } from '../questions.js';
import { scriptsFor } from '../scripts.js';
import { getSample } from '../analysis.js';
import { friendlyError } from '../gemini.js';
import { saveExpression } from '../lookup.js';
import { settings } from '../settings.js';
import { speak, stopSpeak } from '../tts.js';
import { esc, enText, openSheet, toast } from '../ui.js';

function scriptBlock(text) {
  // 스크립트는 한 줄 = 한 문장. 괄호 속 한글 메모는 작게 표시
  return text.split('\n').map((line) => {
    const m = line.match(/^(.*?)(\s*\(\+?[^)]*[가-힣][^)]*\))\s*$/);
    return m ? `${enText(m[1])}<span class="memo">${esc(m[2])}</span>` : enText(line);
  }).join(' ');
}

function scriptsHtml(res) {
  if (!res.items.length) return '';
  const many = res.items.reduce((a, r) => a + r.scripts.length, 0) > 1;
  return res.items.map((r) => `
    <div class="ex-item">
      <div class="small muted">📗 교재: ${esc(r.doc)} — ${esc(r.header)}</div>
      ${r.scripts.map((s, i) => `
        <div class="ex-script">
          ${many || s.label ? `<div class="small"><span class="tag src-s">${esc(s.label || `답변 ${i + 1}`)}</span></div>` : ''}
          <div class="answer">${scriptBlock(s.text)}</div>
          <button class="btn tiny" data-ex="say" data-text="${esc(s.text.replace(/\s*\([^)]*[가-힣][^)]*\)/g, ''))}">🔊 듣기</button>
        </div>`).join('')}
    </div>`).join('') + (res.template ? `
    <details class="mt"><summary class="small">📞 통화 시작·마무리 표현 (교재)</summary>
      ${res.template.scripts.map((s) => `<div class="ex-script"><div class="small"><span class="tag">${esc(s.label)}</span></div><div class="answer">${scriptBlock(s.text)}</div></div>`).join('')}
    </details>` : '');
}

/**
 * container 에 예시 답변을 그림.
 * opts.compact: 문제 풀이 화면 안에서 쓰는 짧은 형태
 */
export async function mountExamples(container, qid, opts = {}) {
  const q = getQuestion(qid);
  if (!q) { container.innerHTML = '<div class="small muted">질문을 찾을 수 없습니다.</div>'; return; }
  container.innerHTML = '<div class="spinner"></div>';
  const res = await scriptsFor(q);
  const hint = !res.items.length && res.linked && !res.loaded
    ? '<div class="small muted">이 질문에는 교재 예시 답변이 있어요. <a href="#/settings">설정 → 스크립트 불러오기</a>로 파일을 넣으면 볼 수 있어요.</div>' : '';
  const noScript = !res.items.length && !res.linked ? '<div class="small muted">이 질문은 교재 예시 답변이 없어요. AI 예시를 만들어 볼 수 있어요.</div>' : '';
  container.innerHTML = `
    ${scriptsHtml(res)}
    ${hint}${noScript}
    <div class="ai-box mt">
      <button class="btn small" data-ex="ai">🤖 AI 예시 답변 (IM2~IH)${res.items.length ? ' 보기' : ' 만들기'}</button>
      <div class="ai-out"></div>
    </div>
    <div class="small muted mt">예시는 그대로 외우기보다 구조와 표현을 내 이야기에 맞게 바꿔 말하세요. 단어를 누르면 뜻·발음을 볼 수 있어요.</div>`;

  const aiOut = container.querySelector('.ai-out');
  async function loadAi(refresh = false) {
    if (!settings().apiKey) { aiOut.innerHTML = '<div class="small muted">AI 예시는 설정에서 Gemini API 키를 넣어야 만들 수 있어요.</div>'; return; }
    aiOut.innerHTML = '<div class="spinner"></div><div class="small ai-status">AI 예시 답변을 만드는 중…</div>';
    let sample;
    try {
      sample = await getSample(qid, { refresh, onStatus: (m) => { const s = aiOut.querySelector('.ai-status'); if (s) s.textContent = m; } });
    } catch (err) {
      aiOut.innerHTML = `<div class="card error small">${esc(friendlyError(err))}</div>`;
      return;
    }
    aiOut.innerHTML = `
      <div class="answer">${enText(sample.answer)}</div>
      <div class="row gap wrap"><button class="btn tiny" data-ex="aisay">🔊 듣기</button><button class="btn tiny" data-ex="stop">■</button><button class="btn tiny" data-ex="again">↻ 다른 버전</button></div>
      ${sample.answer_ko ? `<details><summary class="small">한국어 해석</summary><p class="small">${esc(sample.answer_ko)}</p></details>` : ''}
      ${sample.structure_ko.length ? `<div class="small mt"><b>답변 구성</b><ol>${sample.structure_ko.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
      ${sample.key_expressions.length ? `<div class="small"><b>핵심 표현</b>${sample.key_expressions.map((x, i) => `
        <div class="fix"><span>${enText(x.expression)} — ${esc(x.meaning_ko)}</span> <button class="btn tiny" data-ex="save" data-i="${i}">＋ 단어장</button></div>`).join('')}</div>` : ''}
      ${sample.tip_ko ? `<div class="small accent-text">💡 ${esc(sample.tip_ko)}</div>` : ''}`;
    aiOut.dataset.answer = sample.answer;
    aiOut._sample = sample;
  }

  container.onclick = async (e) => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    const act = b.dataset.ex;
    if (act === 'say') speak(b.dataset.text);
    if (act === 'ai') { b.classList.add('hidden'); loadAi(false); }
    if (act === 'again') loadAi(true);
    if (act === 'aisay') speak(aiOut.dataset.answer || '');
    if (act === 'stop') stopSpeak();
    if (act === 'save' && aiOut._sample) {
      await saveExpression(aiOut._sample.key_expressions[Number(b.dataset.i)], q.text);
      b.textContent = '저장됨 ✓'; b.disabled = true; toast('단어장에 저장했습니다');
    }
  };
  if (opts.autoAi && !res.items.length && settings().apiKey) {
    container.querySelector('[data-ex="ai"]')?.classList.add('hidden');
    loadAi(false);
  }
}

/** 예시 답변 시트 (주제 화면·피드백 화면의 '📘 예시 답변' 버튼) */
export function openExamples(qid) {
  const q = getQuestion(qid);
  if (!q) return;
  const body = openSheet(`<div class="sheet-head"><b>예시 답변</b><button class="icon-btn" data-close-sheet>✕</button></div>
    <div class="small muted">${esc(topicLabel(q.topic))} · ${esc(TYPE_LABELS[q.type])}</div>
    <div class="q-text">${enText(q.text)}</div>
    <div id="exBox"></div>`, () => stopSpeak());
  mountExamples(body.querySelector('#exBox'), qid);
}
