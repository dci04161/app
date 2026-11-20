// 연습 선택 화면 · 주제별 질문 목록 · 모범답안
import { settings } from '../settings.js';
import { TOPICS, TYPE_GROUPS, TYPE_LABELS, SRC_LABELS, ALL_RP_SETS, rpSet, questionsOfRpSet, questionsOfTopic, surveyTopicIds, surpriseTopicIds, referenceTopicIds, getQuestion, topicLabel } from '../questions.js';
import { buildTypePractice, comboFor } from '../exam.js';
import { EXAM_SETS } from '../sets.js';
import { stopSpeak } from '../tts.js';
import { playQuestion } from '../aivoice.js';
import { esc, enText, setTitle, openSheet, toast } from '../ui.js';
import { startSession } from './runner.js';
import { openExamples } from './examples.js';

export function startMock(setNo) {
  // 실제 시험과 같은 시작 절차(오리엔테이션 → 서베이 → Self Assessment → 사전 점검 → 샘플 질문)로 이동
  location.hash = setNo ? `#/exam/${setNo}` : '#/exam';
}

const srcTag = (src) => `<span class="tag src-${src}">${esc(SRC_LABELS[src] || '')}</span>`;

function questionCard(q) {
  return `
    <div class="card">
      <div class="small"><span class="tag">${esc(TYPE_LABELS[q.type])}</span> ${srcTag(q.src)}</div>
      <div class="q-text">${enText(q.text)}</div>
      <div class="row gap wrap">
        <button class="btn small primary" data-one="${q.id}">● 연습</button>
        <button class="btn small" data-say="${q.id}">🔊 듣기</button>
        <button class="btn small" data-sample="${q.id}">📘 예시 답변</button>
      </div>
    </div>`;
}

function commonClicks(view, title) {
  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.one) startSession({ mode: 'practice', title, qids: [b.dataset.one] });
    else if (b.dataset.say) playQuestion(getQuestion(b.dataset.say)?.text || '', { onFallback: (m) => toast(m, 4000) });
    else if (b.dataset.sample) openSample(b.dataset.sample);
  });
}

export async function render(view) {
  setTitle('연습');
  const s = settings();
  const mine = surveyTopicIds(s.survey);
  const surprise = surpriseTopicIds();
  const others = Object.keys(TOPICS).filter((t) => TOPICS[t].kind === 'survey' && !mine.includes(t));
  const chip = (t) => `<a class="chip" href="#/topic/${t}">${esc(TOPICS[t].label)}</a>`;
  const realSets = ALL_RP_SETS.filter((x) => !x.legacy);

  view.innerHTML = `
    <div class="card">
      <b>실전 모의고사</b>
      <p class="small muted">실제 시험 순서 그대로: Background Survey → Self Assessment → 사전 점검 → 샘플 질문 → 15문항(40분). 끝난 뒤 한꺼번에 분석</p>
      <button class="btn primary big full" data-act="mock">내 서베이로 모의고사</button>
      <p class="small muted">여우오픽 모의고사 1~30회 실제 출제 순서 그대로 (난이도 5~6)</p>
      <div class="set-grid">${EXAM_SETS.map((x) => `<button class="btn small" data-setno="${x.no}">${x.no}회</button>`).join('')}</div>
    </div>

    <div class="card">
      <b>유형별 연습</b>
      <p class="small muted">한 문제씩 녹음하고 바로 피드백 (서베이 주제·원문 질문 우선)</p>
      <div class="grid2">${TYPE_GROUPS.map((g) => `<button class="btn" data-type="${g.id}">${esc(g.label)}</button>`).join('')}</div>
    </div>

    <div class="card">
      <b>주제별 연습 · 내 서베이 주제</b>
      ${s.survey ? '' : '<p class="small muted">서베이를 설정하면 내 주제가 여기에 표시됩니다. <a href="#/survey">서베이 설정</a></p>'}
      <div class="chips">${mine.map(chip).join('')}</div>
      <b class="mt">돌발 주제</b>
      <div class="chips">${surprise.map(chip).join('')}</div>
      ${others.length ? `<details class="mt"><summary>다른 서베이 주제</summary><div class="chips">${others.map(chip).join('')}</div></details>` : ''}
      <b class="mt">롤플레이 관련 (참고용 · 모의고사 콤보에는 안 나옴)</b>
      <div class="chips">${referenceTopicIds().map(chip).join('')}</div>
    </div>

    <div class="card">
      <b>롤플레이 세트 (11~13번)</b>
      <div class="chips">${realSets.map((x) => `<a class="chip" href="#/rp/${x.id}">${esc(x.label)}</a>`).join('')}</div>
    </div>`;

  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'mock') startMock();
    if (b.dataset.setno) startMock(b.dataset.setno);
    if (b.dataset.type) {
      const qids = buildTypePractice(b.dataset.type, s.survey);
      if (!qids.length) { toast('연습할 질문이 없습니다'); return; }
      const g = TYPE_GROUPS.find((x) => x.id === b.dataset.type);
      startSession({ mode: 'practice', title: `${g.label} 연습`, qids });
    }
  });
}

export async function renderTopic(view, tid) {
  const t = TOPICS[tid];
  if (!t) { view.innerHTML = '<div class="card">주제를 찾을 수 없습니다.</div>'; return; }
  setTitle(t.label);
  const qs = questionsOfTopic(tid).filter((q) => q.type !== 'rp_eva');
  const combo = comboFor(tid, 5);
  const advQs = qs.filter((q) => q.type.startsWith('adv_'));
  const sets = ALL_RP_SETS.filter((x) => x.topic === tid);
  const order = ['desc', 'routine', 'compare', 'exp', 'adv_compare', 'adv_issue'];
  const sorted = [...qs].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  view.innerHTML = `
    <div class="card">
      <div class="small muted">${t.kind === 'survey' ? '서베이 주제' : t.kind === 'ref' ? '롤플레이 관련 참고 주제 (모의고사 콤보에는 출제 안 함)' : '돌발 주제'} · 질문 ${qs.length}개</div>
      <div class="row gap wrap mt">
        ${combo ? '<button class="btn primary" data-set="combo">콤보 3문항 연습</button>' : ''}
        ${advQs.some((q) => q.type === 'adv_compare') && advQs.some((q) => q.type === 'adv_issue') ? '<button class="btn" data-set="adv">14~15번 연습</button>' : ''}
      </div>
      ${sets.length ? `<div class="small mt">관련 롤플레이: ${sets.map((x) => `<a href="#/rp/${x.id}">${esc(x.label)}</a>`).join(' · ')}</div>` : ''}
    </div>
    ${sorted.map(questionCard).join('')}`;

  view.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b?.dataset.set) return;
    if (b.dataset.set === 'combo') startSession({ mode: 'practice', title: `${t.label} 콤보`, qids: comboFor(tid, 5) });
    if (b.dataset.set === 'adv') {
      const a = advQs.filter((q) => q.type === 'adv_compare'); const i = advQs.filter((q) => q.type === 'adv_issue');
      startSession({ mode: 'practice', title: `${t.label} 14~15번`, qids: [a[Math.floor(Math.random() * a.length)].id, i[Math.floor(Math.random() * i.length)].id] });
    }
  });
  commonClicks(view, `${t.label} 연습`);
  return () => stopSpeak();
}

export async function renderRpSet(view, setId) {
  const set = rpSet(setId);
  if (!set) { view.innerHTML = '<div class="card">롤플레이 세트를 찾을 수 없습니다.</div>'; return; }
  setTitle(`롤플레이 · ${set.label}`);
  const qs = questionsOfRpSet(setId);
  view.innerHTML = `
    <div class="card">
      <div class="small muted">11 질문하기 → 12 문제 해결·대안 → 13 관련 경험 · 연습할 때마다 버전이 무작위로 바뀝니다</div>
      <button class="btn primary mt" data-run>세트 연습 (3문항)</button>
    </div>
    ${['rp_ask', 'rp_solve', 'rp_exp'].map((type) => `<div class="section-label">${esc(TYPE_LABELS[type])}</div>${qs.filter((q) => q.type === type).map(questionCard).join('')}`).join('')}`;
  view.querySelector('[data-run]').addEventListener('click', () => {
    const pick = (type) => { const c = qs.filter((q) => q.type === type); return c[Math.floor(Math.random() * c.length)].id; };
    startSession({ mode: 'practice', title: `롤플레이 · ${set.label}`, qids: [pick('rp_ask'), pick('rp_solve'), pick('rp_exp')] });
  });
  commonClicks(view, `롤플레이 · ${set.label}`);
  return () => stopSpeak();
}

/* ───── 예시 답변 시트 (교재 스크립트 + AI 예시) ───── */
export function openSample(qid) {
  return openExamples(qid);
}
