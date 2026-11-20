// 약점 분석: 완료된 분석 결과를 모아 유형별·항목별 평균과 자주 틀리는 문법을 계산
import { getAll } from './db.js';
import { TYPE_GROUPS } from './questions.js';
import { overallScore, SCORE_LABELS } from './analysis.js';
import { averageLevel } from './ui.js';

export async function doneAttempts() {
  const list = await getAll('attempts');
  return list.filter((a) => a.status === 'done' && a.feedback).sort((a, b) => b.createdAt - a.createdAt);
}

export async function computeStats() {
  const done = await doneAttempts();
  const scoreSum = {}; const scoreCnt = {};
  for (const k of Object.keys(SCORE_LABELS)) { scoreSum[k] = 0; scoreCnt[k] = 0; }
  const byGroup = {};
  const grammar = {};
  const examples = {};
  let shortCount = 0; let wpmSum = 0; let wpmCnt = 0;
  const memorized = { low: 0, medium: 0, high: 0 };

  for (const a of done) {
    const fb = a.feedback;
    for (const [k, v] of Object.entries(fb.scores || {})) {
      if (typeof v === 'number') { scoreSum[k] += v; scoreCnt[k]++; }
    }
    const g = TYPE_GROUPS.find((x) => x.types.includes(a.qtype));
    if (g) {
      byGroup[g.id] ||= { label: g.label, types: g.types, n: 0, sum: 0, levels: [] };
      const sc = overallScore(fb);
      if (sc != null) { byGroup[g.id].n++; byGroup[g.id].sum += sc; }
      if (fb.estimated_level) byGroup[g.id].levels.push(fb.estimated_level);
    }
    for (const e of fb.grammar_errors || []) {
      grammar[e.category] = (grammar[e.category] || 0) + 1;
      (examples[e.category] ||= []);
      if (examples[e.category].length < 4) examples[e.category].push(e);
    }
    if ((a.duration || 0) < 60 && !['rp_ask', 'rp_eva'].includes(a.qtype)) shortCount++;
    if (a.stats?.wpm) { wpmSum += a.stats.wpm; wpmCnt++; }
    if (fb.memorized?.level) memorized[fb.memorized.level]++;
  }

  const scores = Object.keys(SCORE_LABELS).map((k) => ({
    key: k, label: SCORE_LABELS[k], avg: scoreCnt[k] ? scoreSum[k] / scoreCnt[k] : null,
  }));
  const groups = Object.entries(byGroup).map(([id, g]) => ({
    id, label: g.label, types: g.types, n: g.n, avg: g.n ? g.sum / g.n : null, level: averageLevel(g.levels),
  })).sort((a, b) => (a.avg ?? 9) - (b.avg ?? 9));
  const grammarTop = Object.entries(grammar).sort((a, b) => b[1] - a[1]).map(([cat, n]) => ({ cat, n, examples: examples[cat] || [] }));

  return {
    count: done.length,
    recentLevel: averageLevel(done.slice(0, 10).map((a) => a.feedback.estimated_level)),
    scores,
    groups,
    weakestGroup: groups.find((g) => g.avg != null && g.n >= 1) || null,
    grammarTop,
    shortRatio: done.length ? shortCount / done.length : 0,
    avgWpm: wpmCnt ? Math.round(wpmSum / wpmCnt) : null,
    memorized,
  };
}
