// Gemini API 호출 (무료 티어 API 키 사용). 키는 폰 안 설정에만 저장되고 Google 서버로만 전송됩니다.
import { settings, saveSettings } from './settings.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class ApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listModels(key) {
  const out = [];
  let pageToken = '';
  for (let i = 0; i < 5; i++) {
    const url = `${BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(j?.error?.message || `HTTP ${res.status}`, res.status, j);
    for (const m of j.models || []) {
      if ((m.supportedGenerationMethods || []).includes('generateContent')) {
        out.push({ name: String(m.name).replace(/^models\//, ''), displayName: m.displayName || '' });
      }
    }
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return out;
}

const EXCLUDE = /(tts|live|image|imagen|embedding|transcribe|native-audio|veo|gemma|learnlm|aqa|robotics|computer-use|search)/i;

/** 텍스트(JSON) 답변용으로 쓸 수 있는 Gemini 모델인지 (음성합성·이미지·임베딩 전용 모델 제외) */
export function isUsableModel(name) {
  return /gemini/i.test(name) && !EXCLUDE.test(name);
}

function versionOf(name) {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : 0;
}

/** 목록에서 용도에 맞는 모델을 고름. kind: 'feedback' | 'lookup' */
export function isTtsModel(name) {
  return /gemini/i.test(name) && /tts/i.test(name);
}

export function pickModel(models, kind) {
  if (kind === 'tts') {
    const tts = models.map((m) => m.name).filter(isTtsModel);
    // 음질 우선: flash(lite 아님) → flash-lite → pro, 정식 > preview, 최신 버전 우선
    const rank = (n) => versionOf(n) * 10 - (/(preview|exp)/i.test(n) ? 3 : 0) - (/lite/i.test(n) ? 1 : 0) - (/pro/i.test(n) ? 5 : 0);
    tts.sort((a, b) => rank(b) - rank(a));
    return tts[0] || null;
  }
  const usable = models.map((m) => m.name).filter(isUsableModel);
  const isLite = (n) => /lite/i.test(n);
  const isFlash = (n) => /flash/i.test(n);
  const unstable = (n) => /(preview|exp|experimental)/i.test(n);
  const score = (n) => {
    let s = versionOf(n) * 10;
    if (unstable(n)) s -= 3;
    if (/latest/i.test(n)) s -= 1;
    return s;
  };
  let pool;
  if (kind === 'lookup') {
    pool = usable.filter((n) => isFlash(n) && isLite(n));
    if (!pool.length) pool = usable.filter(isFlash);
  } else {
    pool = usable.filter((n) => isFlash(n) && !isLite(n));
    if (!pool.length) pool = usable.filter(isFlash);
  }
  if (!pool.length) pool = usable;
  pool.sort((a, b) => score(b) - score(a));
  return pool[0] || null;
}

function extractText(j) {
  const c = j?.candidates?.[0];
  if (!c) {
    const br = j?.promptFeedback?.blockReason;
    throw new ApiError(br ? `요청이 차단되었습니다 (${br})` : '응답이 비어 있습니다', 200, j);
  }
  const text = (c.content?.parts || []).filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
  if (!text) throw new ApiError(`응답에 내용이 없습니다 (${c.finishReason || 'unknown'})`, 200, j);
  return text;
}

export function parseJSON(text) {
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { /* fallthrough */ }
  const s = t.indexOf('{'); const e = t.lastIndexOf('}');
  if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
  throw new Error('AI 응답(JSON)을 해석하지 못했습니다');
}

function retryDelayMs(err, attempt) {
  const details = err?.body?.error?.details || [];
  for (const d of details) {
    if (d.retryDelay) {
      const sec = parseFloat(String(d.retryDelay));
      if (!Number.isNaN(sec)) return Math.min(65, sec + 1) * 1000;
    }
  }
  return [4000, 12000, 30000][attempt] || 30000;
}

async function rawCall(model, body, key) {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  let j = null;
  try { j = JSON.parse(txt); } catch { /* not json */ }
  if (!res.ok) throw new ApiError(j?.error?.message || txt || `HTTP ${res.status}`, res.status, j);
  return j;
}

const MODEL_FIELD = { feedback: 'feedbackModel', lookup: 'lookupModel', tts: 'ttsModel' };

/**
 * 공통 호출 (원본 응답 JSON 반환).
 * kind: 'feedback' | 'lookup' | 'tts' (모델 선택용)
 * 모델이 없어졌으면(404) 목록에서 자동으로 새 모델을 골라 설정을 바꾸고 1회 재시도.
 * 429/500/503/네트워크 오류는 대기 후 최대 3회 재시도.
 */
export async function callModel({ kind, body, onStatus, maxRetries = 3 }) {
  const s = settings();
  const key = (s.apiKey || '').trim();
  if (!key) throw new ApiError('설정에서 Gemini API 키를 먼저 입력해 주세요', 0, null);
  const modelField = MODEL_FIELD[kind] || 'feedbackModel';
  let model = s[modelField];
  let switched = false;
  for (let attempt = 0; ; attempt++) {
    try {
      return await rawCall(model, body, key);
    } catch (err) {
      const st = err instanceof ApiError ? err.status : 0;
      if ((st === 404 || (st === 400 && /model/i.test(err.message) && /not (found|supported)/i.test(err.message))) && !switched) {
        switched = true;
        onStatus?.('모델을 찾을 수 없어 사용 가능한 모델을 확인하는 중…');
        const models = await listModels(key);
        const next = pickModel(models, kind);
        if (!next || next === model) throw err;
        model = next;
        await saveSettings({ [modelField]: next });
        attempt = -1;
        continue;
      }
      if ((st === 429 || st === 500 || st === 503 || st === 0 && err instanceof TypeError) && attempt < maxRetries) {
        const wait = retryDelayMs(err, attempt);
        onStatus?.(st === 429 ? `무료 한도 대기 중… ${Math.round(wait / 1000)}초 후 재시도` : `일시적 오류, ${Math.round(wait / 1000)}초 후 재시도`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

/** JSON 응답을 받는 호출 (분석·모범답안·단어 조회) */
export async function generateJSON({ kind, parts, system, temperature = 0.3, onStatus }) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, responseMimeType: 'application/json' },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const j = await callModel({ kind, body, onStatus });
  return parseJSON(extractText(j));
}

export function friendlyError(err) {
  const st = err?.status;
  const msg = err?.message || String(err);
  if (st === 400 && /api key/i.test(msg)) return 'API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.';
  if (st === 403) return 'API 키 권한 오류입니다. 키가 올바른지, AI Studio에서 발급한 키인지 확인해 주세요.';
  if (st === 429) return '무료 사용 한도를 초과했습니다. 잠시 후(또는 내일) 다시 시도해 주세요.';
  if (err instanceof TypeError) return '네트워크 연결을 확인해 주세요.';
  return msg;
}
