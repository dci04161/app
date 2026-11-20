// 단어·표현 조회 (뜻·발음기호·예문) + 단어장
import { get, put, del, getAll } from './db.js';
import { generateJSON } from './gemini.js';

export function normalizeTerm(t) {
  return String(t || '').replace(/[‘’]/g, "'").replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').replace(/\s+/g, ' ').trim();
}
export const termKey = (t) => normalizeTerm(t).toLowerCase();

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);

export async function lookupTerm(term, context = '', { onStatus } = {}) {
  const t = normalizeTerm(term);
  if (!t) throw new Error('조회할 단어가 없습니다');
  const key = t.toLowerCase();
  const cached = await get('dict', key);
  if (cached) return cached;
  const isPhrase = /\s/.test(t);
  const raw = await generateJSON({
    kind: 'lookup',
    temperature: 0.1,
    onStatus,
    parts: [{ text: `You are an English-Korean learner's dictionary for a Korean adult preparing for the OPIc speaking test.
Look up the ${isPhrase ? 'English expression' : 'English word'}: "${t}"
${context ? `It appeared in this sentence: "${context.slice(0, 400)}"` : ''}
Return ONLY JSON:
{
 "headword": "(dictionary form, e.g. went -> go; keep phrases as natural set phrases)",
 "ipa": "(American English IPA of the headword, with slashes, e.g. /ɡoʊ/)",
 "pronunciation_ko": "(Korean tip on how to pronounce it, stress position, common mistakes by Korean speakers; short)",
 "meanings": [{"pos": "(품사 in Korean, e.g. 동사, 명사, 형용사, 표현)", "ko": "(Korean meaning)"}],
 "context_meaning_ko": "(the meaning in the given sentence, Korean; empty if no sentence)",
 "example_en": "(one natural spoken example sentence useful for OPIc)",
 "example_ko": "(Korean translation of the example)",
 "forms": "(useful forms like past tense, plural, or related words; short, may be empty)"
}` }],
  });
  const entry = {
    term: t,
    headword: str(raw.headword) || t,
    ipa: str(raw.ipa),
    pronunciation_ko: str(raw.pronunciation_ko),
    meanings: arr(raw.meanings).map((m) => ({ pos: str(m?.pos), ko: str(m?.ko) })).filter((m) => m.ko),
    context: context ? context.slice(0, 400) : '',
    context_meaning_ko: str(raw.context_meaning_ko),
    example_en: str(raw.example_en),
    example_ko: str(raw.example_ko),
    forms: str(raw.forms),
    fetchedAt: Date.now(),
  };
  await put('dict', entry, key);
  return entry;
}

/* ───── 단어장 ───── */

export async function isSaved(term) { return !!(await get('vocab', termKey(term))); }

export async function saveVocab(entry, source = '') {
  const key = termKey(entry.term || entry.headword);
  const existing = await get('vocab', key);
  const item = {
    key,
    term: entry.term || entry.headword,
    headword: entry.headword || entry.term,
    ipa: entry.ipa || '',
    pronunciation_ko: entry.pronunciation_ko || '',
    meanings: entry.meanings || [],
    context: entry.context || '',
    context_meaning_ko: entry.context_meaning_ko || '',
    example_en: entry.example_en || '',
    example_ko: entry.example_ko || '',
    forms: entry.forms || '',
    source: source || existing?.source || '',
    addedAt: existing?.addedAt || Date.now(),
    known: existing?.known || 0,
    unknown: existing?.unknown || 0,
    lastReviewed: existing?.lastReviewed || 0,
  };
  await put('vocab', item);
  return item;
}

/** 피드백의 '유용한 표현'을 조회 없이 바로 저장 */
export async function saveExpression({ expression, meaning_ko, example }, source = '') {
  return saveVocab({ term: normalizeTerm(expression) || expression, headword: expression, meanings: meaning_ko ? [{ pos: '표현', ko: meaning_ko }] : [], example_en: example || '' }, source);
}

export async function removeVocab(key) { await del('vocab', key); }

export async function allVocab() {
  const list = await getAll('vocab');
  return list.sort((a, b) => b.addedAt - a.addedAt);
}

export async function markReview(key, knew) {
  const v = await get('vocab', key);
  if (!v) return;
  if (knew) v.known = (v.known || 0) + 1; else v.unknown = (v.unknown || 0) + 1;
  v.lastReviewed = Date.now();
  await put('vocab', v);
}
