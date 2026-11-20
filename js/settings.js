import { get, put } from './db.js';

export const DEFAULTS = {
  apiKey: '',
  feedbackModel: 'gemini-3.8-flash',   // 설정 화면의 '모델 목록 불러오기'로 바꿀 수 있음
  lookupModel: 'gemini-3.5-flash-lite',
  difficulty: 5,
  autoRecord: true,
  ttsRate: 0.95,
  ttsVoice: '',
  voiceMode: 'ai',                     // 'ai' = Gemini AI 음성으로 질문 읽기, 'device' = 폰 내장 음성
  aiVoice: 'Erinome',
  ttsModel: 'gemini-3.8-flash-tts',
  profileNote: '',
  survey: null,          // { job, student, residence, activities: [ids] }
};

let cache = { ...DEFAULTS };

export async function loadSettings() {
  const saved = await get('kv', 'settings');
  cache = { ...DEFAULTS, ...(saved || {}) };
  return cache;
}

export function settings() {
  return cache;
}

export async function saveSettings(patch) {
  cache = { ...cache, ...patch };
  await put('kv', cache, 'settings');
  return cache;
}
