// 교재 예시 답변(스크립트) — 사용자가 설정에서 불러온 opic_scripts.json 을 폰 안(IndexedDB)에만 저장
// 앱 코드에는 '질문 → 스크립트 항목' 연결표(scriptmap.js)만 들어 있고 스크립트 본문은 들어 있지 않음
import { get, put, getAll, clearStore } from './db.js';
import { SCRIPT_MAP, RP_TEMPLATE_KEY } from './scriptmap.js';

export const docKey = (title) => String(title || '').replace(/^﻿/, '').replace('OPIc 스크립트 정리 - ', '').replace(/\s*\(원문[^)]*\)\s*$/, '').trim();

/** 파일 내용(JSON 텍스트) → 저장. 반환: { items, scripts, docs } */
export async function importScripts(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('JSON 파일이 아닙니다'); }
  if (data?.app !== 'opic-practice-scripts' || !Array.isArray(data.docs)) throw new Error('오픽 스크립트 파일(opic_scripts.json)이 아닙니다');
  const records = [];
  for (const d of data.docs) {
    const doc = docKey(d.title);
    for (const it of d.items || []) {
      const scripts = (it.scripts || []).filter((s) => s && typeof s.text === 'string' && s.text.trim())
        .map((s) => ({ label: String(s.label || ''), text: s.text }));
      records.push({ id: `${doc}#${it.no}`, doc, kind: d.kind === 'rp' ? 'rp' : 'general', header: String(it.header || ''), questions: (it.questions || []).map(String), scripts });
    }
  }
  if (!records.length) throw new Error('스크립트 항목이 없습니다');
  await clearStore('scripts');
  for (const r of records) await put('scripts', r);
  const linked = new Set(Object.values(SCRIPT_MAP).flat());
  const meta = {
    importedAt: Date.now(), createdAt: data.createdAt || '',
    docs: data.docs.length, items: records.length, scripts: records.reduce((a, r) => a + r.scripts.length, 0),
    linkedFound: [...linked].filter((k) => records.some((r) => r.id === k)).length, linkedTotal: linked.size,
  };
  await put('kv', meta, 'scriptsMeta');
  return meta;
}

export async function scriptsMeta() {
  return (await get('kv', 'scriptsMeta')) || null;
}

export async function clearScripts() {
  await clearStore('scripts');
  await put('kv', null, 'scriptsMeta');
}

export function hasScriptLink(qid) {
  return !!SCRIPT_MAP[qid];
}

/**
 * 질문의 교재 예시 답변. 반환: { linked, loaded, items: [{ id, doc, header, scripts:[{label,text}] }], template }
 * linked: 연결표에 있음 / loaded: 스크립트 파일을 불러왔음
 */
export async function scriptsFor(q) {
  const keys = SCRIPT_MAP[q.id] || [];
  const meta = await scriptsMeta();
  const out = { linked: keys.length > 0, loaded: !!meta, items: [], template: null };
  if (!meta) return out;
  for (const k of keys) {
    const r = await get('scripts', k);
    if (r && r.scripts.length) out.items.push(r);
  }
  if (q.type === 'rp_ask' || q.type === 'rp_solve') {
    const t = await get('scripts', RP_TEMPLATE_KEY);
    if (t && t.scripts.length) out.template = t;
  }
  return out;
}

export async function allScriptRecords() {
  return getAll('scripts');
}
