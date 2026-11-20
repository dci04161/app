// 녹음 답변 AI 분석 · 모범답안 생성
import { get, put } from './db.js';
import { settings } from './settings.js';
import { generateJSON, friendlyError } from './gemini.js';
import { toWav16k, blobToBase64 } from './recorder.js';
import { TYPE_LABELS, topicLabel, getQuestion } from './questions.js';
import { LEVELS, wordsOf } from './ui.js';

export const GRAMMAR_CATS = ['시제', '관사', '전치사', '수일치', '단복수', '동사형태', '어순', '대명사', '어휘선택', '문장구조', '기타'];

export const STRUCTURE_GUIDE = {
  intro: '이름·신분 → 하는 일과 일상 → 취미·성격 → 짧은 마무리',
  desc: '전체 소개 → 구체적 특징 2~3개(위치·모습·분위기 등) → 개인적인 느낌·이유',
  routine: '빈도·시간 → 순서대로 하는 일(first, then, after that) → 이유나 느낌',
  compare: '과거 모습 → 현재 모습 → 차이점과 그 이유 → 내 생각',
  exp: '언제·어디서·누구와(배경) → 무슨 일이 있었는지(사건 전개) → 결과 → 느낀 점 (과거시제 유지)',
  rp_ask: '인사와 전화한 목적 → 질문 3~4개 → 감사 인사로 마무리 (실제 통화처럼)',
  rp_solve: '문제 상황 설명 → 사과·양해 구하기 → 대안 2~3개 제시 → 마무리 인사',
  rp_exp: '비슷한 경험의 배경 → 발생한 문제 → 해결 과정 → 결과와 교훈',
  rp_eva: '관심 표현·공감 한마디 → 에바에게 직접 질문 3~4개 (의문문 형태) → 짧은 마무리',
  adv_compare: '과거와 현재 구체적 비교(예시) → 변화의 원인 → 장단점 또는 내 의견',
  adv_issue: '이슈 설명 → 원인과 실제 사례 → 영향 → 해결책과 내 의견',
};

const SYSTEM = `You are an experienced OPIc (ACTFL) rater and a supportive English speaking coach for a Korean adult learner whose target grade is IH.
Write every explanation, comment and note in Korean (한국어). Write transcripts, corrections, the improved answer, and expressions in English.
Be honest and specific. Never invent content that is not in the audio. Return ONLY valid JSON.`;

function feedbackPrompt(q, attempt) {
  const s = settings();
  return `Evaluate the learner's spoken answer in the attached audio.

Question type: ${q.type} (${TYPE_LABELS[q.type] || q.type})
Topic: ${topicLabel(q.topic)}
Test difficulty setting: ${s.difficulty}
Question: "${q.text}"
Recorded length: ${Math.round(attempt.duration || 0)} seconds
Expected structure for this type (Korean): ${STRUCTURE_GUIDE[q.type] || ''}
${s.profileNote ? `Learner background (use only to keep the improved answer realistic): ${s.profileNote}` : ''}

Rules:
- transcript: verbatim English transcript including fillers (um, uh, like) and false starts. Mark long pauses as "...". Unclear words as [unclear].
- If the audio is silent, too short, or not English, set transcript to "" and explain in summary_ko; give low scores and NL/NM.
- scores: integers 1-5 (5 = IH-AL quality) for task (answered the question fully), fluency, grammar, vocabulary, structure, naturalness (not sounding memorized).
- estimated_level: one of ${LEVELS.join(', ')} for this single answer only (it is a rough reference).
- grammar_errors: up to 8 most important errors. "original" must be copied exactly from the transcript. category must be one of: ${GRAMMAR_CATS.join(', ')}.
- fluency: list the fillers actually used; comment on hesitation/long pauses and on speaking pace in Korean.
- structure: whether the answer followed the expected structure and what was missing.
- memorized: low/medium/high likelihood that the answer sounds recited from a memorized script (flat rhythm, unnaturally perfect sentences followed by breakdowns, content not matching the question), with a Korean comment.
- pronunciation: only clearly noticeable issues you can actually hear, up to 5. Use an empty array if none.
- improved_answer: rewrite the learner's OWN answer (keep their ideas, facts and experiences; fill gaps only with simple, plausible details) at IM2 to IH level — natural spoken English, mostly common vocabulary, a few connectors and natural fillers (you know, actually, I mean), about 130-180 words (around 1.5 minutes). Do NOT write at AL or native-essay level. Follow the expected structure.
- improved_answer_ko: natural Korean translation of improved_answer.
- useful_expressions: 3-6 expressions from improved_answer worth memorizing, with Korean meaning and a short example sentence.
- priorities_ko: the 2-3 most important things to fix next time, in Korean, concrete and actionable.
- summary_ko: 2-3 sentence overall comment in Korean.

JSON shape:
{
 "transcript": "",
 "summary_ko": "",
 "estimated_level": "IM2",
 "scores": {"task": 3, "fluency": 3, "grammar": 3, "vocabulary": 3, "structure": 3, "naturalness": 3},
 "priorities_ko": [""],
 "grammar_errors": [{"original": "", "corrected": "", "category": "시제", "explanation_ko": ""}],
 "fluency": {"fillers": [""], "hesitation_ko": "", "pace_ko": ""},
 "structure": {"followed": true, "comment_ko": ""},
 "memorized": {"level": "low", "comment_ko": ""},
 "pronunciation": [{"word": "", "issue_ko": ""}],
 "improved_answer": "",
 "improved_answer_ko": "",
 "useful_expressions": [{"expression": "", "meaning_ko": "", "example": ""}]
}`;
}

const SCORE_KEYS = ['task', 'fluency', 'grammar', 'vocabulary', 'structure', 'naturalness'];
export const SCORE_LABELS = { task: '과제 수행', fluency: '유창성', grammar: '문법', vocabulary: '어휘', structure: '구성', naturalness: '자연스러움' };

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function normalizeFeedback(f) {
  f = f || {};
  const scores = {};
  for (const k of SCORE_KEYS) {
    const n = Math.round(Number(f.scores?.[k]));
    scores[k] = Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : null;
  }
  let level = str(f.estimated_level).toUpperCase().replace(/\s/g, '');
  if (!LEVELS.includes(level)) level = '';
  return {
    transcript: str(f.transcript),
    summary_ko: str(f.summary_ko),
    estimated_level: level,
    scores,
    priorities_ko: arr(f.priorities_ko).map(str).filter(Boolean),
    grammar_errors: arr(f.grammar_errors).map((e) => ({
      original: str(e?.original), corrected: str(e?.corrected),
      category: GRAMMAR_CATS.includes(e?.category) ? e.category : '기타',
      explanation_ko: str(e?.explanation_ko),
    })).filter((e) => e.original || e.corrected),
    fluency: {
      fillers: arr(f.fluency?.fillers).map(str).filter(Boolean),
      hesitation_ko: str(f.fluency?.hesitation_ko),
      pace_ko: str(f.fluency?.pace_ko),
    },
    structure: { followed: !!f.structure?.followed, comment_ko: str(f.structure?.comment_ko) },
    memorized: {
      level: ['low', 'medium', 'high'].includes(f.memorized?.level) ? f.memorized.level : 'low',
      comment_ko: str(f.memorized?.comment_ko),
    },
    pronunciation: arr(f.pronunciation).map((p) => ({ word: str(p?.word), issue_ko: str(p?.issue_ko) })).filter((p) => p.word),
    improved_answer: str(f.improved_answer),
    improved_answer_ko: str(f.improved_answer_ko),
    useful_expressions: arr(f.useful_expressions).map((x) => ({
      expression: str(x?.expression), meaning_ko: str(x?.meaning_ko), example: str(x?.example),
    })).filter((x) => x.expression),
  };
}

const FILLERS = new Set(['um', 'uh', 'erm', 'hmm', 'ah', 'eh', 'umm', 'uhh']);
export function speechStats(transcript, duration) {
  const words = wordsOf(transcript).filter((w) => !FILLERS.has(w.toLowerCase()));
  const wpm = duration > 0 ? Math.round(words.length / (duration / 60)) : 0;
  return { words: words.length, wpm };
}

export function overallScore(fb) {
  const v = Object.values(fb?.scores || {}).filter((n) => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

let running = null; // 동시에 하나만 분석 (무료 한도 보호)
export const inProgress = new Set(); // 지금 이 앱에서 분석 중(또는 대기 중)인 기록 id

export async function analyzeAttempt(id, onStatus) {
  inProgress.add(id);
  try {
    return await analyzeOne(id, onStatus);
  } finally {
    inProgress.delete(id);
  }
}

async function analyzeOne(id, onStatus) {
  while (running) { onStatus?.('앞의 분석이 끝나기를 기다리는 중…'); try { await running; } catch { /* ignore */ } }
  const job = (async () => {
    const at = await get('attempts', id);
    if (!at) throw new Error('기록을 찾을 수 없습니다');
    const blob = await get('audio', id);
    if (!blob) throw new Error('녹음 파일이 없습니다');
    const q = getQuestion(at.qid) || { id: at.qid, type: at.qtype, topic: at.topic, text: at.qtext };
    at.status = 'analyzing'; at.error = '';
    await put('attempts', at);
    try {
      onStatus?.('녹음 변환 중…');
      const { wav, duration } = await toWav16k(blob);
      if (duration && (!at.duration || Math.abs(duration - at.duration) > 2)) at.duration = duration;
      const data = await blobToBase64(wav);
      onStatus?.('AI가 답변을 듣고 분석 중…');
      const raw = await generateJSON({
        kind: 'feedback',
        system: SYSTEM,
        temperature: 0.2,
        parts: [{ text: feedbackPrompt(q, at) }, { inlineData: { mimeType: 'audio/wav', data } }],
        onStatus,
      });
      const fb = normalizeFeedback(raw);
      at.feedback = fb;
      at.stats = speechStats(fb.transcript, at.duration);
      at.status = 'done';
      at.analyzedAt = Date.now();
      at.model = settings().feedbackModel;
      await put('attempts', at);
      return at;
    } catch (err) {
      at.status = 'error';
      at.error = friendlyError(err);
      await put('attempts', at);
      throw err;
    }
  })();
  running = job;
  try { return await job; } finally { if (running === job) running = null; }
}

/** 여러 개 순차 분석 */
export async function analyzeMany(ids, onProgress) {
  let ok = 0; let fail = 0;
  for (let i = 0; i < ids.length; i++) {
    onProgress?.({ index: i, total: ids.length, ok, fail, status: '' });
    try {
      await analyzeAttempt(ids[i], (status) => onProgress?.({ index: i, total: ids.length, ok, fail, status }));
      ok++;
    } catch (err) {
      fail++;
      if (err?.status === 400 || err?.status === 403 || /API 키/.test(err?.message || '')) {
        onProgress?.({ index: i, total: ids.length, ok, fail, status: friendlyError(err), fatal: true });
        break;
      }
    }
  }
  onProgress?.({ index: ids.length, total: ids.length, ok, fail, status: '완료', done: true });
  return { ok, fail };
}

/* ───────── 모범답안 (IM2~IH) ───────── */

function samplePrompt(q, variant) {
  const s = settings();
  return `Write a model answer for this OPIc question for a Korean adult learner.
Question type: ${q.type} (${TYPE_LABELS[q.type] || q.type}); Topic: ${topicLabel(q.topic)}
Question: "${q.text}"
Expected structure (Korean): ${STRUCTURE_GUIDE[q.type] || ''}
${s.profileNote ? `Learner background (make the answer fit this person): ${s.profileNote}` : 'Learner background: unknown — use simple, believable personal details.'}
${variant ? 'Write a different version from a typical answer (different details and examples).' : ''}

Requirements:
- Level: between IM2 and IH. Natural spoken English, mostly common words, some connectors and natural fillers (well, you know, actually). NOT AL/native-essay level, no rare vocabulary.
- Length: about 130-180 words (about 1.5 minutes when spoken). Role-play "ask" questions: 3-4 questions in a phone-call style.
- Follow the expected structure.
Return ONLY JSON:
{"answer": "", "answer_ko": "(natural Korean translation)", "structure_ko": ["(each part of the answer in Korean, short)"], "key_expressions": [{"expression": "", "meaning_ko": ""}], "tip_ko": "(one practical tip in Korean)"}`;
}

export async function getSample(qid, { refresh = false, onStatus } = {}) {
  if (!refresh) {
    const cached = await get('samples', qid);
    if (cached) return cached;
  }
  const q = getQuestion(qid);
  if (!q) throw new Error('질문을 찾을 수 없습니다');
  const raw = await generateJSON({ kind: 'feedback', system: SYSTEM, temperature: 0.8, parts: [{ text: samplePrompt(q, refresh) }], onStatus });
  const sample = {
    qid,
    answer: str(raw.answer),
    answer_ko: str(raw.answer_ko),
    structure_ko: arr(raw.structure_ko).map(str).filter(Boolean),
    key_expressions: arr(raw.key_expressions).map((x) => ({ expression: str(x?.expression), meaning_ko: str(x?.meaning_ko) })).filter((x) => x.expression),
    tip_ko: str(raw.tip_ko),
    createdAt: Date.now(),
  };
  if (!sample.answer) throw new Error('모범답안을 만들지 못했습니다. 다시 시도해 주세요.');
  await put('samples', sample, qid);
  return sample;
}
