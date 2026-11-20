// 녹음: MediaRecorder(webm/opus 등)로 녹음하고, 분석 전송 시 16kHz 모노 WAV로 변환
// 이유: 크롬 기본 녹음 형식(webm)은 Gemini 지원 오디오 형식이 아니므로 WAV로 바꿔서 보냄

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

export function recordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

export class Recorder {
  constructor() {
    this.mr = null; this.stream = null; this.chunks = [];
    this.startedAt = 0; this.ac = null; this.an = null; this.buf = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    this.chunks = [];
    this.mr = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.mr.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.mr.start(1000);
    this.startedAt = performance.now();
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ac.createMediaStreamSource(this.stream);
      this.an = this.ac.createAnalyser();
      this.an.fftSize = 512;
      this.buf = new Uint8Array(this.an.fftSize);
      src.connect(this.an);
    } catch { this.an = null; }
  }

  get recording() { return !!(this.mr && this.mr.state === 'recording'); }

  elapsed() { return this.startedAt ? (performance.now() - this.startedAt) / 1000 : 0; }

  level() {
    if (!this.an) return 0;
    this.an.getByteTimeDomainData(this.buf);
    let m = 0;
    for (let i = 0; i < this.buf.length; i++) { const v = Math.abs(this.buf[i] - 128); if (v > m) m = v; }
    return Math.min(1, m / 100);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mr || this.mr.state === 'inactive') { this.cleanup(); resolve(null); return; }
      const duration = this.elapsed();
      const mr = this.mr;
      mr.onstop = () => {
        const blob = new Blob(this.chunks, { type: mr.mimeType || 'audio/webm' });
        this.cleanup();
        resolve({ blob, duration });
      };
      mr.stop();
    });
  }

  cancel() {
    if (this.mr && this.mr.state !== 'inactive') {
      this.mr.onstop = null;
      try { this.mr.stop(); } catch { /* ignore */ }
    }
    this.cleanup();
  }

  cleanup() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ac) this.ac.close().catch(() => {});
    this.stream = null; this.ac = null; this.an = null; this.startedAt = 0;
  }
}

export async function toWav16k(blob) {
  const arr = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  let decoded;
  try {
    decoded = await ac.decodeAudioData(arr);
  } finally {
    ac.close().catch(() => {});
  }
  const rate = 16000;
  const length = Math.max(1, Math.ceil(decoded.duration * rate));
  const off = new OfflineAudioContext(1, length, rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return { wav: encodeWav(rendered.getChannelData(0), rate), duration: decoded.duration };
}

export function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
