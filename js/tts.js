// 질문·단어 읽기: 폰 내장 음성(TTS) 사용 → 무료, API 한도 사용 안 함
import { settings } from './settings.js';

let voices = [];
function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function ttsSupported() { return !!window.speechSynthesis; }

export function englishVoices() {
  loadVoices();
  return voices.filter((v) => /^en[-_]/i.test(v.lang) || /^en$/i.test(v.lang));
}

function pickVoice(name) {
  const en = englishVoices();
  return en.find((v) => v.name === name) || en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
}

export function speak(text, opts = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !text) { resolve(false); return; }
    stopSpeak();
    const s = settings();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = opts.rate ?? s.ttsRate ?? 0.95;
    const v = pickVoice(opts.voice ?? s.ttsVoice);
    if (v) u.voice = v;
    let done = false; let started = false;
    const finish = (ok) => {
      if (done) return;
      done = true; clearInterval(poll); clearTimeout(limit);
      resolve(ok);
    };
    u.onstart = () => { started = true; };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    // 일부 안드로이드 기기에서 onend가 오지 않는 문제 대비
    const poll = setInterval(() => {
      if (started && !speechSynthesis.speaking && !speechSynthesis.pending) finish(true);
    }, 400);
    const limit = setTimeout(() => finish(started), Math.max(10000, text.length * 150 / (u.rate || 1)));
    speechSynthesis.speak(u);
  });
}

/* ───── 오디오 파일 재생 (AI 음성) ───── */
let player = null;
let playerDone = null;

export function playAudioBlob(blob) {
  stopSpeak();
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    player = a;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      if (player === a) { player = null; playerDone = null; }
      resolve(ok);
    };
    playerDone = finish;
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.play().catch(() => finish(false));
  });
}

export function stopSpeak() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (player) {
    try { player.pause(); } catch { /* ignore */ }
    const done = playerDone;
    player = null; playerDone = null;
    done?.(false);
  }
}
