// 질문을 Gemini AI 음성(TTS)으로 읽기
// - 질문마다 한 번만 음성을 만들고 폰에 저장(qaudio) → 이후엔 API 사용 없음
// - 실패하면 폰 내장 음성으로 자동 대체
import { get, put, clearStore } from './db.js';
import { settings } from './settings.js';
import { callModel, ApiError, friendlyError } from './gemini.js';
import { speak, playAudioBlob, ttsSupported } from './tts.js';

// 차분하고 또렷한 여성 음성 위주 (실제 시험관 음성을 흉내 내는 것이 아니라 비슷한 분위기)
export const AI_VOICES = [
  ['Erinome', '또렷함 (기본)'],
  ['Kore', '단단하고 차분함'],
  ['Aoede', '편안하고 부드러움'],
  ['Despina', '부드러움'],
  ['Sulafat', '따뜻함'],
  ['Achernar', '조용하고 부드러움'],
  ['Schedar', '고르고 안정적'],
  ['Iapetus', '또렷함 (남성)'],
];

const STYLE = 'calm, clear and friendly professional interviewer; standard American English; natural moderate pace';

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const cacheKey = (voice, text) => `${voice}|${hash(text)}|${text.length}`;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 응답 오디오 → 재생 가능한 WAV Blob (WAV면 그대로, 헤더 없는 PCM이면 WAV 헤더 추가) */
export function audioPartToWav(inline) {
  const bytes = b64ToBytes(inline.data || '');
  if (bytes.length < 100) throw new ApiError('음성 데이터가 비어 있습니다', 200, null);
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const mime = String(inline.mimeType || inline.mime_type || '');
  if (isRiff) return new Blob([bytes], { type: 'audio/wav' });
  if (/mpeg|mp3/i.test(mime)) return new Blob([bytes], { type: 'audio/mpeg' });
  if (/ogg|opus/i.test(mime)) return new Blob([bytes], { type: 'audio/ogg' });
  const rate = Number((mime.match(/rate=(\d+)/i) || [])[1]) || 24000;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, bytes.length, true);
  return new Blob([header, bytes], { type: 'audio/wav' });
}

function findAudioPart(j) {
  const parts = j?.candidates?.[0]?.content?.parts || [];
  const p = parts.find((x) => x.inlineData?.data || x.inline_data?.data);
  if (!p) throw new ApiError('음성이 생성되지 않았습니다', 200, j);
  return p.inlineData || p.inline_data;
}

let legacyFormat = false; // 예전 형식(prebuiltVoiceConfig)만 받는 모델이면 이후 계속 사용

function buildBody(text, voice, legacy) {
  if (legacy) {
    return {
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    };
  }
  return {
    contents: [{ role: 'user', parts: [{ text, speech_metadata: { style: STYLE } }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice } } },
  };
}

async function synthesize(text, voice, onStatus) {
  try {
    const j = await callModel({ kind: 'tts', body: buildBody(text, voice, legacyFormat), onStatus, maxRetries: 0 });
    return audioPartToWav(findAudioPart(j));
  } catch (err) {
    // 요청 형식이 맞지 않는 모델이면 예전 형식으로 한 번 더
    if (!legacyFormat && err instanceof ApiError && err.status === 400 && !/api key/i.test(err.message)) {
      legacyFormat = true;
      const j = await callModel({ kind: 'tts', body: buildBody(text, voice, true), onStatus, maxRetries: 0 });
      return audioPartToWav(findAudioPart(j));
    }
    throw err;
  }
}

// AI 음성이 실패하면 일정 시간 폰 음성만 사용 (문항마다 실패·대기를 반복하지 않도록)
let pausedUntil = 0;
const PAUSE_MS = 10 * 60 * 1000;

export function aiVoiceEnabled() {
  const s = settings();
  return s.voiceMode === 'ai' && !!s.apiKey;
}

/** 질문 음성 Blob (저장된 것이 있으면 그것, 없으면 생성 후 저장) */
const inflight = new Map(); // 같은 질문을 동시에 두 번 만들지 않도록

export async function getQuestionAudio(text, { onStatus, voice } = {}) {
  const v = voice || settings().aiVoice || 'Erinome';
  const key = cacheKey(v, text);
  const cached = await get('qaudio', key);
  if (cached) return cached;
  onStatus?.('질문 음성 준비 중…');
  if (!inflight.has(key)) {
    const job = synthesize(text, v, onStatus)
      .then(async (blob) => { await put('qaudio', blob, key); return blob; })
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return inflight.get(key);
}

export async function hasQuestionAudio(text) {
  return !!(await get('qaudio', cacheKey(settings().aiVoice || 'Erinome', text)));
}

let warnedFallback = false;

/**
 * 질문 읽기. AI 음성이 켜져 있으면 AI 음성, 실패 시 폰 내장 음성.
 * 반환: { ok: 재생 성공 여부, ai: AI 음성 사용 여부, error }
 */
export async function playQuestion(text, { onStatus, onFallback } = {}) {
  if (aiVoiceEnabled()) {
    try {
      // 일시 중지 중이어도 이미 저장된 음성은 재생
      const cached = Date.now() < pausedUntil ? await get('qaudio', cacheKey(settings().aiVoice || 'Erinome', text)) : null;
      if (Date.now() >= pausedUntil || cached) {
        const blob = cached || await getQuestionAudio(text, { onStatus });
        onStatus?.('');
        const ok = await playAudioBlob(blob);
        return { ok, ai: true };
      }
    } catch (err) {
      onStatus?.('');
      pausedUntil = Date.now() + PAUSE_MS;
      if (!warnedFallback) { warnedFallback = true; onFallback?.(`AI 음성을 쓸 수 없어 당분간 폰 음성으로 읽습니다 (${friendlyError(err)})`); }
    }
  }
  if (!ttsSupported()) return { ok: false, ai: false };
  const ok = await speak(text);
  return { ok, ai: false };
}

/** 여러 질문 음성을 미리 만들어 두기 (모의고사 시작 시 다음 문항 대기 시간 줄이기) */
export function prefetchQuestions(texts) {
  let cancelled = false;
  const done = (async () => {
    if (!aiVoiceEnabled() || Date.now() < pausedUntil) return;
    for (const t of texts) {
      if (cancelled) return;
      try { await getQuestionAudio(t); } catch { pausedUntil = Date.now() + PAUSE_MS; return; }
    }
  })();
  return { cancel: () => { cancelled = true; }, done };
}

/** 설정에서 직접 테스트할 때는 일시 중지 해제 */
export function resumeAiVoice() { pausedUntil = 0; warnedFallback = false; }

export async function clearQuestionAudio() {
  await clearStore('qaudio');
}
