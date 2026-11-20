// 모의고사 시작 절차 — 실제 시험과 같은 순서
// 1 오리엔테이션 → 2 Background Survey → 3 Self Assessment(난이도 1~6) → 4 사전 점검(소리·마이크) → 5 샘플 질문(채점 안 됨) → 6 시험 시작
import { settings, saveSettings } from '../settings.js';
import { buildMockExam, buildExamSet } from '../exam.js';
import { Recorder, recordingSupported } from '../recorder.js';
import { stopSpeak } from '../tts.js';
import { playQuestion } from '../aivoice.js';
import { esc, setTitle, toast, fmtTime } from '../ui.js';
import { mountSurveyForm } from './survey.js';
import { startSession } from './runner.js';

// Self Assessment 6단계 (시험 화면 문구)
export const SELF_ASSESSMENT = [
  '나는 10단어 이하의 단어로 말할 수 있습니다.',
  '나는 기본적인 물건, 색깔, 요일, 음식, 의류, 숫자 등을 말할 수 있습니다.',
  '나는 자신, 직장, 친한 사람과 장소, 일상에 대한 기본적인 정보를 간단하게 문장으로 전달할 수 있습니다.',
  '나는 일상, 일/학교와 취미에 대해 간단한 대화를 할 수 있습니다. 또한 내가 원하는 질문도 할 수 있습니다.',
  '나는 친근한 주제와 가정, 일, 학교, 개인과 관심사에 대해 자신 있게 대화할 수 있습니다. 어떤 상황이 발생하더라도 잘 대처 가능합니다.',
  '개인적, 사회적인 또는 전문적인 주제에 대해서 내 의견을 제시할 수 있고 토론도 가능합니다. 구체적인 설명도 가능합니다.',
];

// 단계별 샘플 답변 (앱용으로 새로 작성한 예시)
const SA_SAMPLES = [
  'Hello. Um... my name... Minsu. Student. Coffee. Thank you.',
  'Hi. My name is Minsu. I like... red. Monday, Tuesday. I eat rice. Apple. One, two, three, four.',
  'Hello. My name is Minsu. I live in Seoul. I work at a company. I like coffee. On weekends, I go to the park. It is nice.',
  'Hi, I am Minsu. I live in Seoul with my family. On weekdays I go to work, and on weekends I usually go to the park near my house or watch movies. I like the park because it is quiet. What do you usually do on weekends?',
  'Well, I live in an apartment in Seoul with my family. Last weekend, I went to a park near my place, and it was really crowded because the weather was so nice. Next month, I am planning to go camping with my friends, so I am really looking forward to it. If it rains, we will probably just stay at a cabin instead.',
  'Honestly, I think the way people spend their free time has changed a lot. With smartphones, people tend to stay at home and consume content rather than go outside. On the one hand, it is convenient and cheap. On the other hand, I am concerned that it weakens real relationships, so I believe cities should invest more in public spaces that encourage people to meet in person.',
];

const STEPS = ['오리엔테이션', 'Background Survey', 'Self Assessment', '사전 점검', '샘플 질문', '시험 시작'];

export async function render(view, setNo = null) {
  setTitle(setNo ? `여우오픽 기출 ${setNo}회` : '실전 모의고사');
  let step = 0;
  let survey = settings().survey ? { ...settings().survey } : null;
  let level = settings().difficulty || 5;
  let cleanupStep = null;
  const rec = new Recorder();
  let recTimer = null; let micUrl = '';

  const stepHead = () => `<div class="steps">${STEPS.map((s, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}. ${esc(s)}</span>`).join('')}</div>`;

  function go(n) {
    cleanupStep?.(); cleanupStep = null;
    stopSpeak(); rec.cancel(); clearInterval(recTimer);
    step = n;
    window.scrollTo(0, 0);
    [orientation, surveyStep, selfAssessment, setupCheck, sampleQuestion, begin][n]();
  }

  function orientation() {
    view.innerHTML = `${stepHead()}
      <div class="card">
        <b>오리엔테이션</b>
        <ul class="small">
          <li>이 모의고사는 실제 OPIc과 같은 순서로 진행됩니다: Background Survey → Self Assessment → 사전 점검 → 샘플 질문 → 본 시험.</li>
          <li>본 시험은 총 15문항(난이도 1~2는 12문항), 전체 <b>40분</b>입니다.</li>
          <li>각 문항은 <b>Play</b>를 눌러 질문을 듣고, 질문이 끝나면 바로 답변이 녹음됩니다. 다시 듣기는 질문이 끝난 뒤 <b>5초 안에 1번</b>만 가능합니다.</li>
          <li>답변을 마치면 <b>Next</b>를 누릅니다. 질문 텍스트는 보이지 않습니다.</li>
          <li>7번 문항 뒤에 남은 질문의 난이도를 다시 선택하는 단계가 있습니다.</li>
          ${setNo ? `<li><b>여우오픽 기출 ${setNo}회</b>를 실제 출제 순서 그대로 진행합니다 (난이도 5~6 문항). 서베이·Self Assessment는 실제 시험처럼 진행하지만 이 회차의 문항은 바뀌지 않습니다.</li>` : '<li>질문은 내가 고른 서베이 주제와 돌발 주제에서 실제 기출 구성 비율대로 출제됩니다.</li>'}
          <li>1번 자기소개는 채점되지 않습니다.</li>
        </ul>
      </div>
      <button class="btn primary big full" data-next>다음</button>`;
    view.querySelector('[data-next]').onclick = () => go(1);
  }

  function surveyStep() {
    view.innerHTML = `${stepHead()}<div id="sv"></div>`;
    cleanupStep = mountSurveyForm(view.querySelector('#sv'), survey, {
      submitLabel: '다음',
      onSubmit: async (sv) => { survey = sv; await saveSettings({ survey: sv }); go(2); },
    });
  }

  function selfAssessment() {
    view.innerHTML = `${stepHead()}
      <div class="card accent small">본인의 영어 말하기 능력과 가장 비슷한 수준을 선택하세요. 이 선택에 따라 문항 난이도가 정해집니다. (IH 목표라면 보통 5 또는 6을 선택합니다)</div>
      ${SELF_ASSESSMENT.map((t, i) => `
        <label class="card opt sa">
          <input type="radio" name="sa" value="${i + 1}" ${level === i + 1 ? 'checked' : ''}>
          <span class="grow"><b>${i + 1}</b> ${esc(t)}</span>
          <button type="button" class="btn tiny" data-sample="${i}">▶ 샘플 답변</button>
        </label>`).join('')}
      <button class="btn primary big full" data-next>다음</button>`;
    view.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      playQuestion(SA_SAMPLES[Number(b.dataset.sample)], { onFallback: (m) => toast(m, 3000) });
    }));
    view.querySelector('[data-next]').onclick = () => {
      const v = Number(view.querySelector('input[name=sa]:checked')?.value);
      if (!v) { toast('난이도를 선택해 주세요'); return; }
      level = v;
      go(3);
    };
  }

  function setupCheck() {
    view.innerHTML = `${stepHead()}
      <div class="card"><b>1. 소리 확인</b>
        <p class="small muted">재생 버튼을 눌러 질문 음성이 잘 들리는지 확인하세요.</p>
        <button class="btn" data-play>▶ 소리 재생</button>
      </div>
      <div class="card"><b>2. 마이크 확인</b>
        <p class="small muted">녹음 버튼을 누르고 5초 동안 말한 뒤, 녹음된 소리를 들어 보세요.</p>
        <div class="row gap"><button class="btn rec" data-rec>● 5초 녹음</button><span id="micState" class="small"></span></div>
        <audio id="micPlay" controls class="hidden"></audio>
      </div>
      <button class="btn primary big full" data-next>다음</button>`;
    view.querySelector('[data-play]').onclick = () => playQuestion('This is a sound check. If you can hear this clearly, please continue.', { onFallback: (m) => toast(m, 3000) });
    view.querySelector('[data-rec]').onclick = async (e) => {
      const b = e.currentTarget;
      const st = view.querySelector('#micState');
      if (!recordingSupported()) { st.textContent = '이 브라우저는 녹음을 지원하지 않습니다.'; return; }
      b.disabled = true;
      try { await rec.start(); } catch (err) {
        st.textContent = err?.name === 'NotAllowedError' ? '마이크 권한을 허용해 주세요.' : `마이크 오류: ${err?.message || err}`;
        b.disabled = false; return;
      }
      recTimer = setInterval(async () => {
        const t = rec.elapsed();
        st.textContent = `녹음 중… ${fmtTime(t)}`;
        if (t >= 5) {
          clearInterval(recTimer);
          const r = await rec.stop();
          b.disabled = false;
          if (!r) return;
          if (micUrl) URL.revokeObjectURL(micUrl);
          micUrl = URL.createObjectURL(r.blob);
          const a = view.querySelector('#micPlay');
          if (a) { a.src = micUrl; a.classList.remove('hidden'); }
          st.textContent = '녹음 완료 — 재생해서 확인하세요.';
        }
      }, 250);
    };
    view.querySelector('[data-next]').onclick = () => go(4);
  }

  function sampleQuestion() {
    const SAMPLE = 'This is a sample question. Tell me about what you did yesterday.';
    view.innerHTML = `${stepHead()}
      <div class="card center">
        <div class="ava">🎧</div>
        <b>샘플 질문 (채점되지 않음)</b>
        <p class="small muted">실제 시험처럼 Play를 눌러 질문을 듣고 답해 보세요. 이 답변은 저장되지 않습니다.</p>
        <div id="sqState" class="q-state"></div>
      </div>
      <div class="actions">
        <button class="btn primary big" data-play>▶ Play</button>
        <button class="btn big hidden" data-stop>■ 답변 끝</button>
        <button class="btn big full" data-next>본 시험으로 →</button>
      </div>`;
    const st = view.querySelector('#sqState');
    const playB = view.querySelector('[data-play]'); const stopB = view.querySelector('[data-stop]');
    playB.onclick = async () => {
      playB.classList.add('hidden');
      st.textContent = '질문을 듣는 중…';
      await playQuestion(SAMPLE, { onFallback: (m) => toast(m, 3000) });
      if (step !== 4) return;
      try { await rec.start(); } catch { st.textContent = '마이크를 사용할 수 없습니다.'; playB.classList.remove('hidden'); return; }
      stopB.classList.remove('hidden');
      recTimer = setInterval(() => { st.textContent = `녹음 중… ${fmtTime(rec.elapsed())}`; }, 250);
    };
    stopB.onclick = () => {
      clearInterval(recTimer); rec.cancel();
      stopB.classList.add('hidden'); playB.classList.remove('hidden');
      st.textContent = '샘플 답변 완료. 준비되면 본 시험을 시작하세요.';
    };
    view.querySelector('[data-next]').onclick = () => go(5);
  }

  function begin() {
    view.innerHTML = `${stepHead()}
      <div class="card center">
        <div class="ava">🎧</div>
        <b>시험을 시작합니다</b>
        <p>${setNo ? `여우오픽 기출 <b>${setNo}회</b> · ` : ''}Self Assessment: <b>${level}단계</b> · 총 ${setNo || level > 2 ? 15 : 12}문항 · 40분</p>
        ${setNo ? (() => { const r = buildExamSet(setNo, survey).plan.replaced; return r.length ? `<p class="small muted">내가 고르지 않은 서베이 주제가 있던 ${r.map((x) => `${x.at}번(${esc(x.from)})`).join(', ')} 콤보는 내 서베이 주제로 바뀌어 출제됩니다.</p>` : ''; })() : ''}
        <p class="small muted">시작하면 40분 타이머가 시작됩니다.</p>
      </div>
      <button class="btn primary big full" data-start>시험 시작</button>`;
    view.querySelector('[data-start]').onclick = async () => {
      await saveSettings({ difficulty: level });
      const { qids, plan } = setNo ? buildExamSet(setNo, survey) : buildMockExam(survey, level);
      startSession({ mode: 'mock', title: '실전 모의고사', qids, plan, difficulty: level });
    };
  }

  go(0);
  return () => { cleanupStep?.(); stopSpeak(); rec.cancel(); clearInterval(recTimer); if (micUrl) URL.revokeObjectURL(micUrl); };
}
