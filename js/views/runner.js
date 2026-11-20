// 문제 풀이 화면 (실제 OPIc 진행 방식)
// - 질문 듣기 → 질문이 끝난 뒤 5초 안에만 다시 듣기 1회 → 녹음
// - 모의고사: 질문 텍스트 숨김, 전체 40분 제한, 7번 뒤 난이도 재조정(쉬운/비슷한/어려운 질문)
import { get, put, uid } from '../db.js';
import { settings } from '../settings.js';
import { getQuestion, TYPE_LABELS, topicLabel } from '../questions.js';
import { buildLatter, adjustedDifficulty } from '../exam.js';
import { Recorder, recordingSupported } from '../recorder.js';
import { stopSpeak, ttsSupported } from '../tts.js';
import { playQuestion as playQ, aiVoiceEnabled, prefetchQuestions } from '../aivoice.js';
import { esc, enText, fmtTime, setTitle, toast, confirmBox } from '../ui.js';
import { mountExamples } from './examples.js';

const MAX_SEC = 240;               // 한 답변이 4분을 넘으면 자동 종료
const EXAM_LIMIT_MS = 40 * 60 * 1000; // 실제 시험 전체 40분
const REPLAY_WINDOW_MS = 5000;     // 질문이 끝난 뒤 5초 안에만 다시 듣기 가능
const ADJUST_AFTER = 7;            // 7번을 마친 뒤 난이도 재조정

export function mockTitle(s) {
  const lv = `${s.difficulty}${s.adjusted ? `-${s.difficulty2}` : ''}`;
  return s.plan?.setNo ? `여우오픽 기출 ${s.plan.setNo}회 (${lv})` : `실전 모의고사 ${lv}`;
}

export async function createSession({ mode, title, qids, plan = null, difficulty = null }) {
  const s = {
    id: uid('s'), mode, title, qids, plan,
    answers: qids.map(() => null), index: 0,
    createdAt: Date.now(), finishedAt: null,
    difficulty: difficulty || settings().difficulty, difficulty2: null, adjusted: false,
    examElapsed: 0, timeUp: false,
  };
  if (mode === 'mock') s.title = mockTitle(s);
  await put('sessions', s);
  return s.id;
}

export async function startSession(opts) {
  const id = await createSession(opts);
  location.hash = `#/session/${id}`;
}

export async function render(view, sessionId) {
  const session = await get('sessions', sessionId);
  if (!session) { view.innerHTML = '<div class="card">세션을 찾을 수 없습니다.</div>'; return; }
  if (session.finishedAt || session.index >= session.qids.length) {
    location.replace(`#/review/${session.id}`);
    return;
  }
  const mock = session.mode === 'mock';
  setTitle(mock ? mockTitle(session) : (session.title || '연습'));

  // ── 7번 뒤 난이도 재조정 화면 ──
  if (mock && session.plan && !session.adjusted && session.index === ADJUST_AFTER) {
    return renderAdjust(view, session);
  }

  const rec = new Recorder();
  let timer = null; let meter = null; let clock = null; let replayTimer = null;
  let alive = true; let nextCleanup = null;
  let replayLeft = 1; let state = 'idle'; // idle | speaking | ready | recording | saving
  let showText = !mock;
  let t0 = Date.now(); // 마지막으로 시간을 저장한 시각 (40분 계산용)
  const examMs = () => (session.examElapsed || 0) + (Date.now() - t0);

  const q = getQuestion(session.qids[session.index]);
  if (!q) { view.innerHTML = '<div class="card error">질문 데이터를 찾을 수 없습니다.</div>'; return; }

  view.innerHTML = `
    <div class="runner">
      <div class="row between small muted">
        <span>문항 <b>${session.index + 1}</b> / ${session.qids.length}</span>
        ${mock ? `<span>남은 시간 <b id="examClock">${fmtTime((EXAM_LIMIT_MS - examMs()) / 1000)}</b></span>`
          : `<span>${esc(topicLabel(q.topic))} · ${esc(TYPE_LABELS[q.type] || '')}</span>`}
      </div>
      <div class="progress"><div style="width:${(session.index / session.qids.length) * 100}%"></div></div>

      <div class="card q-card">
        <div class="ava">🎧</div>
        <div id="qState" class="q-state">${mock ? 'Play 버튼을 누르면 질문이 나옵니다.' : '질문을 들을 준비가 되면 아래 버튼을 누르세요.'}</div>
        <div id="qText" class="q-text ${showText ? '' : 'hidden'}">${enText(q.text)}</div>
        ${mock ? '' : `<button id="toggleText" class="link">${showText ? '질문 숨기기' : '질문 텍스트 보기'}</button>`}
        ${mock ? '' : '<button id="exBtn" class="btn small mt">💡 예시 답변 보기</button>'}
      </div>
      ${mock ? '' : '<div id="exPanel" class="card ex-panel hidden"></div>'}

      <div id="recBox" class="rec-box hidden">
        <div class="rec-time" id="recTime">0:00</div>
        <div class="meter"><div id="meterBar"></div></div>
        <div class="rec-marks"><span>1:00</span><span>2:00</span></div>
        <div class="rec-track"><div id="recTrack"></div><i style="left:${(60 / 150) * 100}%"></i><i style="left:${(120 / 150) * 100}%"></i></div>
        <div id="recHint" class="small muted">1분 이상 말하는 것을 목표로 하세요.</div>
      </div>

      <div class="actions">
        <button id="playBtn" class="btn primary big">▶ ${mock ? 'Play' : '질문 듣기'}</button>
        <button id="replayBtn" class="btn hidden">↻ 다시 듣기 (5초 안에 1회)</button>
        <button id="recBtn" class="btn rec big hidden">● 녹음 시작</button>
        <button id="stopBtn" class="btn primary big hidden">${mock ? 'Next ▶' : '■ 답변 완료 · 다음'}</button>
        ${mock ? '<button id="nextBtn" class="btn big hidden">Next ▶</button>' : ''}
        <div class="row gap">
          ${mock ? '' : '<button id="skipBtn" class="btn ghost">건너뛰기</button>'}
          <button id="quitBtn" class="btn ghost">${mock ? '시험 중단' : '그만하기'}</button>
        </div>
      </div>
      ${mock ? '<div class="small muted center">질문 텍스트는 보이지 않습니다. 다시 듣기는 질문이 끝난 뒤 5초 안에 한 번만 가능하며, 전체 40분이 지나면 시험이 종료됩니다.</div>' : ''}
      ${!recordingSupported() ? '<div class="card error">이 브라우저는 녹음을 지원하지 않습니다. 안드로이드 크롬에서 열어 주세요.</div>' : ''}
      ${!ttsSupported() && !aiVoiceEnabled() ? '<div class="card warn">이 브라우저는 음성 읽기(TTS)를 지원하지 않아 질문을 텍스트로 보여줍니다.</div>' : ''}
    </div>`;

  const el = (id) => view.querySelector('#' + id);
  const show = (id, on) => el(id)?.classList.toggle('hidden', !on);
  const setState = (msg) => { const s = el('qState'); if (s) s.textContent = msg; };

  if (!ttsSupported() && !aiVoiceEnabled()) { showText = true; show('qText', true); }

  // 지금 문항에 답하는 동안 다음 문항 AI 음성을 미리 준비
  const nextQ = getQuestion(session.qids[session.index + 1] || '');
  const prefetch = nextQ ? prefetchQuestions([nextQ.text]) : null;

  let exLoaded = false;
  el('exBtn')?.addEventListener('click', () => {
    const p = el('exPanel');
    const open = p.classList.contains('hidden');
    p.classList.toggle('hidden', !open);
    el('exBtn').textContent = open ? '💡 예시 답변 접기' : '💡 예시 답변 보기';
    if (open && !exLoaded) { exLoaded = true; mountExamples(p, q.id); }
  });

  el('toggleText')?.addEventListener('click', () => {
    showText = !showText;
    show('qText', showText);
    el('toggleText').textContent = showText ? '질문 숨기기' : '질문 텍스트 보기';
  });

  if (mock) {
    clock = setInterval(() => {
      const left = EXAM_LIMIT_MS - examMs();
      const c = el('examClock');
      if (c) { c.textContent = fmtTime(Math.max(0, left) / 1000); c.classList.toggle('bad', left < 5 * 60 * 1000); }
      if (left <= 0) timeUp();
    }, 1000);
  }

  function openReplayWindow() {
    clearTimeout(replayTimer);
    if (replayLeft <= 0) { show('replayBtn', false); return; }
    show('replayBtn', true);
    replayTimer = setTimeout(() => show('replayBtn', false), REPLAY_WINDOW_MS);
  }

  async function playQuestion() {
    if (!alive) return;
    state = 'speaking';
    clearTimeout(replayTimer);
    show('playBtn', false); show('recBtn', false); show('stopBtn', false); show('replayBtn', false); show('nextBtn', false);
    setState('질문을 듣는 중…');
    const { ok } = await playQ(q.text, {
      onStatus: (m) => { if (alive) setState(m || '질문을 듣는 중…'); },
      onFallback: (m) => toast(m, 4000),
    });
    if (!alive) return;
    if (!ok) { toast('음성 재생에 실패했습니다. 질문 텍스트를 확인하세요.'); showText = true; show('qText', true); }
    state = 'ready';
    openReplayWindow();
    if (mock) show('nextBtn', true);
    if (settings().autoRecord && recordingSupported()) {
      await startRecording();
    } else {
      setState('준비가 되면 녹음을 시작하세요.');
      show('recBtn', recordingSupported());
    }
  }

  async function startRecording() {
    if (!alive || state === 'recording') return;
    try {
      await rec.start();
    } catch (err) {
      state = 'ready';
      setState('마이크를 사용할 수 없습니다.');
      show('recBtn', true);
      toast(err?.name === 'NotAllowedError' ? '마이크 권한을 허용해 주세요 (브라우저 설정 > 사이트 권한).' : `마이크 오류: ${err?.message || err}`, 4000);
      return;
    }
    if (!alive) { rec.cancel(); return; }
    state = 'recording';
    setState('답변 녹음 중… 다 말하면 ‘답변 완료’를 누르세요.');
    show('recBox', true); show('recBtn', false); show('stopBtn', true); show('nextBtn', false);
    timer = setInterval(() => {
      const t = rec.elapsed();
      el('recTime').textContent = fmtTime(t);
      el('recTrack').style.width = `${Math.min(100, (t / 150) * 100)}%`;
      el('recHint').textContent = t < 60 ? '1분 이상 말하는 것을 목표로 하세요.' : t < 120 ? '좋아요! 자연스럽게 마무리해도 됩니다.' : '충분합니다. 마무리하세요.';
      if (t >= MAX_SEC) finishAnswer();
    }, 250);
    meter = setInterval(() => { const m = el('meterBar'); if (m) m.style.width = `${Math.round(rec.level() * 100)}%`; }, 80);
  }

  function stopTimers() {
    clearInterval(timer); clearInterval(meter); timer = null; meter = null;
  }

  async function replay() {
    if (replayLeft <= 0 || state === 'saving') return;
    replayLeft--;
    clearTimeout(replayTimer);
    show('replayBtn', false);
    stopTimers();
    rec.cancel();
    state = 'ready';
    show('recBox', false);
    await playQuestion();
  }

  function persistTime() {
    if (!mock) return;
    session.examElapsed = examMs();
    t0 = Date.now(); // 저장한 시점부터 다시 셈 (중복 계산 방지)
  }

  async function saveRecording() {
    const result = await rec.stop();
    if (!result || !result.blob || result.blob.size < 500) return null;
    const at = {
      id: uid('a'), sessionId: session.id, qid: q.id, qtype: q.type, topic: q.topic, qtext: q.text,
      createdAt: Date.now(), duration: result.duration, mime: result.blob.type,
      status: 'recorded', error: '', feedback: null, stats: null,
    };
    await put('audio', result.blob, at.id);
    await put('attempts', at);
    session.answers[session.index] = at.id;
    return at;
  }

  async function finishAnswer() {
    if (state !== 'recording') return;
    state = 'saving';
    stopTimers(); clearTimeout(replayTimer);
    show('stopBtn', false); show('replayBtn', false);
    setState('저장 중…');
    const at = await saveRecording();
    if (!at) {
      toast('녹음된 내용이 없습니다. 다시 시도해 주세요.');
      state = 'ready';
      show('recBox', false); show('recBtn', true);
      return;
    }
    await advance();
    if (mock) goNext();
    else location.hash = `#/attempt/${at.id}`;
  }

  async function advance() {
    persistTime();
    session.index++;
    if (session.index >= session.qids.length) session.finishedAt = Date.now();
    await put('sessions', session);
  }

  function goNext() {
    if (session.finishedAt) { location.hash = `#/review/${session.id}`; return; }
    cleanupAll();
    render(view, session.id).then((c) => { nextCleanup = c; });
  }

  // 40분 종료: 녹음 중이던 답변은 저장하고 시험 종료 (남은 문항은 미응답)
  async function timeUp() {
    if (!alive || session.finishedAt) return;
    clearInterval(clock);
    alive = false;
    stopSpeak(); clearTimeout(replayTimer);
    if (state === 'recording') { stopTimers(); await saveRecording(); }
    else rec.cancel();
    session.examElapsed = EXAM_LIMIT_MS;
    session.timeUp = true;
    session.finishedAt = Date.now();
    await put('sessions', session);
    toast('40분이 지나 시험이 종료되었습니다', 4000);
    location.hash = `#/review/${session.id}`;
  }

  el('playBtn').addEventListener('click', playQuestion);
  el('replayBtn').addEventListener('click', replay);
  el('recBtn').addEventListener('click', startRecording);
  el('stopBtn').addEventListener('click', finishAnswer);
  async function skipCurrent() {
    if (state === 'saving') return;
    stopTimers(); rec.cancel(); stopSpeak(); clearTimeout(replayTimer);
    session.answers[session.index] = 'skipped';
    await advance();
    if (mock) goNext();
    else if (session.finishedAt) location.hash = `#/review/${session.id}`;
    else { cleanupAll(); render(view, session.id).then((c) => { nextCleanup = c; }); }
  }
  el('skipBtn')?.addEventListener('click', skipCurrent);
  // 모의고사 Next (녹음 없이 넘어가는 경우: 무응답 처리)
  el('nextBtn')?.addEventListener('click', async () => {
    if (state === 'recording') { finishAnswer(); return; }
    if (await confirmBox('답변하지 않고 다음 문항으로 넘어갈까요? 이 문항은 무응답 처리됩니다.', '넘어가기')) skipCurrent();
  });
  el('quitBtn').addEventListener('click', async () => {
    const wasRec = state === 'recording';
    if (await confirmBox(wasRec ? '녹음 중인 답변은 저장되지 않습니다. 그만할까요? (나중에 홈에서 이어서 할 수 있어요)' : '그만할까요? 나중에 홈에서 이어서 할 수 있어요.', '그만하기')) {
      location.hash = '#/';
    }
  });

  function cleanupAll() {
    if (alive && mock && !session.finishedAt) {
      // 화면을 떠날 때 지금까지 쓴 시간 저장 (이어하기 시 남은 시간 유지)
      persistTime();
      put('sessions', session).catch(() => {});
    }
    alive = false;
    prefetch?.cancel();
    stopTimers(); clearInterval(clock); clearTimeout(replayTimer);
    rec.cancel(); stopSpeak();
  }
  return () => { cleanupAll(); if (typeof nextCleanup === 'function') nextCleanup(); };
}

/* ───── 난이도 재조정 (7번 뒤) ───── */
function renderAdjust(view, session) {
  const cur = session.difficulty;
  view.innerHTML = `
    <div class="card center">
      <div class="ava">🎧</div>
      <b>난이도 재조정</b>
      <p>지금까지와 비교해 남은 질문의 난이도를 선택하세요.</p>
      <p class="small muted">실제 시험에서도 7번 뒤에 나오는 단계입니다. 대부분 ‘비슷한 질문’을 권장합니다.</p>
      ${session.plan?.fixed ? '<p class="small muted">기출 세트는 남은 문항이 고정되어 있어 선택과 관계없이 원래 순서대로 진행됩니다.</p>' : ''}
    </div>
    <div class="actions">
      <button class="btn big" data-adj="easier">쉬운 질문${cur > 1 ? ` (→ ${cur - 1})` : ''}</button>
      <button class="btn primary big" data-adj="same">비슷한 질문 (→ ${cur})</button>
      <button class="btn big" data-adj="harder">어려운 질문${cur < 6 ? ` (→ ${cur + 1})` : ''}</button>
    </div>`;
  const onClick = async (e) => {
    const b = e.target.closest('[data-adj]');
    if (!b) return;
    view.removeEventListener('click', onClick);
    const d2 = adjustedDifficulty(cur, b.dataset.adj);
    const head = session.qids.slice(0, ADJUST_AFTER);
    const tail = buildLatter(session.plan, d2);
    session.qids = head.concat(tail);
    session.answers = session.answers.slice(0, ADJUST_AFTER).concat(tail.map(() => null));
    session.difficulty2 = d2;
    session.adjusted = true;
    session.title = mockTitle(session);
    await put('sessions', session);
    const c = await render(view, session.id);
    cleanupRef.fn = c;
  };
  const cleanupRef = { fn: null };
  view.addEventListener('click', onClick);
  return () => { view.removeEventListener('click', onClick); if (typeof cleanupRef.fn === 'function') cleanupRef.fn(); };
}
