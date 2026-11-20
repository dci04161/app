// 홈 화면
import { getAll } from '../db.js';
import { settings } from '../settings.js';
import { analyzeMany } from '../analysis.js';
import { esc, setTitle, fmtDate, averageLevel, toast } from '../ui.js';
import { startMock } from './practice.js';
import { buildTypePractice } from '../exam.js';
import { computeStats } from '../stats.js';
import { startSession } from './runner.js';
import { INTRO } from '../questions.js';

export async function render(view) {
  setTitle('오픽 연습');
  const s = settings();
  const [attempts, sessions, vocab, stats] = await Promise.all([getAll('attempts'), getAll('sessions'), getAll('vocab'), computeStats()]);
  const pending = attempts.filter((a) => a.status === 'recorded' || a.status === 'error').sort((a, b) => a.createdAt - b.createdAt);
  const unfinished = sessions.filter((x) => !x.finishedAt && x.index < x.qids.length && x.index > 0).sort((a, b) => b.createdAt - a.createdAt)[0];
  const recent = attempts.filter((a) => a.feedback?.estimated_level).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  view.innerHTML = `
    ${!s.apiKey ? `<a class="card warn block" href="#/settings"><b>① Gemini API 키를 입력해 주세요</b><div class="small">AI 피드백·단어 뜻 조회에 필요합니다 (무료). 눌러서 설정으로 이동</div></a>` : ''}
    ${!s.survey ? `<a class="card warn block" href="#/survey"><b>${s.apiKey ? '' : '② '}서베이를 설정해 주세요</b><div class="small">실제 시험처럼 내가 고른 주제로 문제가 나옵니다</div></a>` : ''}

    <div class="stats3">
      <div><b>${esc(averageLevel(recent.map((a) => a.feedback.estimated_level)) || '-')}</b><span>최근 예상 등급</span></div>
      <div><b>${stats.count}</b><span>분석한 답변</span></div>
      <div><b>${vocab.length}</b><span>단어장</span></div>
    </div>

    ${unfinished ? `<a class="card block" href="#/session/${unfinished.id}"><b>이어서 하기</b><div class="small muted">${esc(unfinished.title)} · ${unfinished.index}/${unfinished.qids.length} · ${fmtDate(unfinished.createdAt)}</div></a>` : ''}

    ${pending.length ? `<div class="card"><b>분석 대기 ${pending.length}개</b>
      <div class="small muted">녹음은 저장됐지만 아직 AI 분석 전이거나 실패한 답변입니다.</div>
      <div id="pendProg" class="small"></div>
      <button class="btn" data-act="analyzeAll">모두 분석하기</button></div>` : ''}

    <button class="btn primary big full" data-act="mock">🎧 실전 모의고사 (내 서베이)</button>
    <button class="btn big full" data-act="set">📝 여우오픽 기출 세트 (1~30회 중 무작위)</button>
    <div class="grid2">
      <a class="btn big" href="#/practice">유형·주제별 연습</a>
      <button class="btn big" data-act="weak">약점 집중 연습</button>
      <button class="btn big" data-act="intro">자기소개 연습</button>
      <a class="btn big" href="#/vocab/review">단어 복습</a>
    </div>

    <div class="card small muted">
      <b>공부 팁</b>
      <ul>
        <li>스크립트를 통째로 외우기보다 표현과 구조를 익혀 내 이야기로 바꿔 말하세요.</li>
        <li>답변은 1분 이상, 유형별 구조(묘사·경험·롤플레이)를 지키는 게 IH의 핵심입니다.</li>
        <li>같은 질문을 피드백 후 다시 녹음하면 효과가 큽니다.</li>
      </ul>
      <a href="#/survey">Background Survey 미리 설정</a>
    </div>`;

  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'mock') startMock();
    if (act === 'set') startMock(1 + Math.floor(Math.random() * 30));
    if (act === 'intro') startSession({ mode: 'practice', title: '자기소개 연습', qids: [INTRO.id] });
    if (act === 'weak') {
      const w = stats.weakestGroup;
      if (!w) { toast('분석된 답변이 쌓이면 약점을 찾아 드려요. 먼저 연습해 보세요.'); return; }
      const qids = buildTypePractice(w.id, s.survey, 5);
      startSession({ mode: 'practice', title: `약점 집중: ${w.label}`, qids });
    }
    if (act === 'analyzeAll') {
      b.disabled = true;
      const prog = view.querySelector('#pendProg');
      const res = await analyzeMany(pending.map((a) => a.id), (p) => {
        prog.textContent = p.done ? `완료: 성공 ${p.ok}, 실패 ${p.fail}` : `${p.index + 1}/${p.total} 분석 중… ${p.status || ''}`;
      });
      toast(`분석 완료: 성공 ${res.ok}개${res.fail ? `, 실패 ${res.fail}개` : ''}`);
      if (document.body.contains(view)) window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
}
