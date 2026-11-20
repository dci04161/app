// 모의고사 출제 엔진 — 여우오픽 기출 1~30회의 실제 구성을 기준으로 함
//
//  Q1        자기소개
//  Q2~4      콤보 1   ┐ 각 콤보는 한 주제 3문항. 서베이 주제 또는 돌발 주제
//  Q5~7      콤보 2   │ (기출 30회 기준: 2~4번도 절반 가까이 돌발 주제)
//  ── 7번 뒤 난이도 재조정 ──
//  Q8~10     콤보 3   ┘
//  Q11~13    롤플레이 세트: 질문하기 → 문제 해결·대안 → 관련 경험 (콤보와 별개 상황)
//  Q14~15    같은 주제의 14번(비교·변화) + 15번(이슈·뉴스·트렌드)     … 난이도 5~6
//            난이도 3~4: 14 묘사 + 15 에바에게 질문하기 / 난이도 1~2: 11~12번까지(12문항)
import { TOPICS, INTRO, questionsOfTopic, surveyTopicIds, surpriseTopicIds, TYPE_GROUPS, ALL_RP_SETS, rpSet, getQuestion, TOPIC_LABELS } from './questions.js';
import { EXAM_SETS } from './sets.js';

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weighted(items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of items) { if ((r -= w) < 0) return v; }
  return items[items.length - 1][0];
}

const T = { d: 'desc', r: 'routine', c: 'compare', e: 'exp' };

// 콤보 패턴(유형 순서)과 가중치 — 기출 1~30회 콤보 90개를 실제로 집계한 값
//   dee 27 · dce 19 · dre 15 · drc 12 · ddc 6 · dde 3 · 기타(ded·rde·ree·eed 등) 각 1
const PATTERNS = {
  low: [['dre', 4], ['drc', 3], ['dde', 2], ['ddc', 2], ['dee', 2], ['dce', 1]], // 난이도 1~4 (기출 없음: 묘사·루틴 위주로 조정)
  mid: [['dee', 27], ['dce', 19], ['dre', 15], ['drc', 12], ['ddc', 6], ['dde', 3], ['ded', 1], ['rde', 1], ['ree', 1], ['eed', 1]], // 5 (기출 비율 그대로)
  high: [['dee', 32], ['dce', 22], ['dre', 13], ['drc', 8], ['ddc', 4], ['dde', 2], ['ded', 2], ['eed', 2], ['ree', 1]], // 6 (경험 비중↑)
};

function patternsFor(difficulty) {
  return difficulty <= 4 ? PATTERNS.low : difficulty >= 6 ? PATTERNS.high : PATTERNS.mid;
}

/** 주제로 콤보 3문항 구성. 가능한 패턴이 없으면 null */
export function comboFor(tid, difficulty) {
  const qs = questionsOfTopic(tid);
  const pool = {};
  for (const q of qs) (pool[q.type] ||= []).push(q.id);
  const fits = patternsFor(difficulty).filter(([p]) => {
    const need = {};
    for (const ch of p) need[T[ch]] = (need[T[ch]] || 0) + 1;
    return Object.entries(need).every(([t, n]) => (pool[t] || []).length >= n);
  });
  if (!fits.length) return null;
  const pat = weighted(fits);
  const used = new Set();
  return [...pat].map((ch) => {
    const opts = shuffle(pool[T[ch]]).filter((id) => !used.has(id));
    used.add(opts[0]);
    return opts[0];
  });
}

const canCombo = (tid, d) => !!comboFor(tid, d);
function hasAdvPair(tid) {
  const types = new Set(questionsOfTopic(tid).map((q) => q.type));
  return types.has('adv_compare') && types.has('adv_issue');
}
function advFor(tid) {
  const qs = questionsOfTopic(tid);
  // 같은 출처끼리 짝을 우선 (원문/기출 14번이면 15번도 원문/기출)
  const a = rand(qs.filter((q) => q.type === 'adv_compare'));
  const sameSrc = qs.filter((q) => q.type === 'adv_issue' && (q.src === 'a') === (a.src === 'a'));
  const i = rand(sameSrc.length ? sameSrc : qs.filter((q) => q.type === 'adv_issue'));
  return [a.id, i.id];
}
function rpIds(setId, difficulty) {
  const s = rpSet(setId);
  const pick = (slot) => `rp.${setId}.${slot}${Math.floor(Math.random() * s[slot].length)}`;
  return difficulty <= 2 ? [pick('q'), pick('s')] : [pick('q'), pick('s'), pick('x')];
}

/**
 * 서베이 기반 맞춤 모의고사. 반환: { qids, plan }
 * plan 은 7번 뒤 난이도 재조정 때 8번 이후를 다시 만드는 데 사용
 */
export function buildMockExam(survey, difficulty = 5) {
  const mine = shuffle(surveyTopicIds(survey)).filter((t) => canCombo(t, difficulty));
  const surprise = shuffle(surpriseTopicIds()).filter((t) => canCombo(t, difficulty));
  const used = new Set();
  const take = (preferSurvey) => {
    const a = (preferSurvey ? mine : surprise).filter((t) => !used.has(t));
    const b = (preferSurvey ? surprise : mine).filter((t) => !used.has(t));
    const t = a[0] || b[0];
    used.add(t);
    return t;
  };
  // 콤보 1~3: 기출 30회 중 서베이 2개+돌발 1개가 16회, 서베이 1개+돌발 2개가 14회. 위치는 무작위(2~4번 돌발 14/30)
  const kinds = shuffle(Math.random() < 16 / 30 ? [true, true, false] : [true, false, false]);
  const combos = kinds.map(take);

  // 롤플레이: 실제 세트 위주(85%), 콤보 주제와 겹치지 않는 상황
  const realSets = ALL_RP_SETS.filter((s) => !s.legacy && !combos.includes(s.topic));
  const mineSet = new Set(surveyTopicIds(survey));
  const legacySets = ALL_RP_SETS.filter((s) => s.legacy && mineSet.has(s.topic) && !combos.includes(s.topic));
  const rpSetId = (Math.random() < 0.85 || !legacySets.length ? rand(realSets) : rand(legacySets)).id;
  const rpTopic = rpSet(rpSetId).topic;

  // 14~15: 콤보·롤플레이와 다른 주제, 14·15 짝이 있는 주제 (서베이/돌발 반반)
  const advPool = (src) => src.filter((t) => !combos.includes(t) && t !== rpTopic && hasAdvPair(t));
  const advTopic = rand(Math.random() < 0.5 ? (advPool(mine).length ? advPool(mine) : advPool(surprise)) : (advPool(surprise).length ? advPool(surprise) : advPool(mine)))
    || rand(Object.keys(TOPICS).filter(hasAdvPair));
  // 난이도 3~4용 14·15번 주제 (묘사 + 에바 질문)
  const evaTopic = rand([...mine, ...surprise].filter((t) => !combos.includes(t) && t !== rpTopic && questionsOfTopic(t).some((q) => q.type === 'rp_eva'))) || combos[0];

  const plan = { combos, rpSetId, advTopic, evaTopic };
  const qids = [INTRO.id, ...comboFor(combos[0], difficulty), ...comboFor(combos[1], difficulty), ...buildLatter(plan, difficulty)];
  return { qids, plan };
}

/** 8번 이후 (7번 뒤 난이도 재조정 시 다시 생성) */
export function buildLatter(plan, difficulty) {
  if (plan.fixed) return plan.latter;
  const ids = [...(comboFor(plan.combos[2], difficulty) || comboFor(plan.combos[2], 5))];
  ids.push(...rpIds(plan.rpSetId, difficulty));
  if (difficulty >= 5) ids.push(...advFor(plan.advTopic));
  else if (difficulty >= 3) {
    const qs = questionsOfTopic(plan.evaTopic);
    ids.push(rand(qs.filter((q) => q.type === 'desc')).id, qs.find((q) => q.type === 'rp_eva').id);
  }
  return ids;
}

/** 주어진 유형 순서를 가진 콤보 (원문·기출 질문 우선) */
function comboByTypes(tid, types) {
  const qs = questionsOfTopic(tid);
  const used = new Set();
  const out = [];
  for (const t of types) {
    const cand = shuffle(qs.filter((q) => q.type === t && !used.has(q.id))).sort((a, b) => (a.src === 'a') - (b.src === 'a'));
    if (!cand.length) return null;
    used.add(cand[0].id);
    out.push(cand[0].id);
  }
  return out;
}
const realScore = (ids) => ids.filter((id) => getQuestion(id).src !== 'a').length;

/**
 * 여우오픽 기출 세트. 내가 고르지 않은 서베이 주제(제거·참고용 주제)가 들어 있는 콤보·14~15번은
 * 같은 유형 순서의 내 서베이 주제로 바꾸고, 나머지는 기출 그대로 유지
 */
export function buildExamSet(no, survey) {
  const set = EXAM_SETS.find((s) => s.no === Number(no));
  if (!set) return null;
  const qids = [...set.qids];
  // 제거된 주제의 질문은 조회되지 않으므로 id 에서 주제·유형을 읽음 (예: 'camping.e1' → camping / 경험)
  const KEY_T = { d: 'desc', r: 'routine', c: 'compare', e: 'exp', a: 'adv_compare', i: 'adv_issue' };
  const topicOf = (id) => (id.startsWith('rp.') ? 'rp:' + id.split('.')[1] : id === 'intro' ? 'intro' : id.split('.')[0]);
  const typeOf = (id) => getQuestion(id)?.type || KEY_T[id.split('.')[1][0]];
  const usable = (tid) => TOPICS[tid] && TOPICS[tid].kind !== 'ref';
  const used = new Set(qids.map(topicOf).filter((t) => !String(t).startsWith('rp:')));
  const mine = shuffle(surveyTopicIds(survey));
  const surprise = shuffle(surpriseTopicIds());
  const replaced = [];
  for (const [start, len] of [[1, 3], [4, 3], [7, 3], [13, 2]]) {
    const tid = topicOf(qids[start]);
    if (usable(tid)) continue;
    const types = qids.slice(start, start + len).map(typeOf);
    let best = null;
    for (const pool of [mine, surprise]) {
      for (const t of pool) {
        if (used.has(t)) continue;
        const c = comboByTypes(t, types);
        if (c && (!best || realScore(c) > realScore(best.ids))) best = { t, ids: c };
      }
      if (best && realScore(best.ids) === len) break; // 원문·기출로 다 채웠으면 돌발까지 안 봄
      if (best && pool === mine) break;               // 서베이 주제로 채울 수 있으면 서베이 주제 우선
    }
    if (!best) continue;
    used.add(best.t);
    qids.splice(start, len, ...best.ids);
    replaced.push({ at: start + 1, from: TOPIC_LABELS[tid] || tid, to: TOPICS[best.t].label });
  }
  return { qids, plan: { fixed: true, setNo: set.no, latter: qids.slice(7), replaced } };
}

/** 7번 답한 뒤 난이도 재조정: 'easier' | 'same' | 'harder' */
export function adjustedDifficulty(start, choice) {
  if (choice === 'easier') return Math.max(1, start - 1);
  if (choice === 'harder') return Math.min(6, start + 1);
  return start;
}

/** 유형별 연습: 서베이 주제 위주로 n개 */
export function buildTypePractice(groupId, survey, n = 5) {
  const g = TYPE_GROUPS.find((x) => x.id === groupId);
  if (!g) return [];
  if (groupId === 'intro') return [INTRO.id];
  const mine = surveyTopicIds(survey);
  if (groupId === 'rp') {
    const s = rand(ALL_RP_SETS.filter((x) => !x.legacy));
    return rpIds(s.id, 5);
  }
  if (groupId === 'adv') {
    const t = rand([...mine, ...surpriseTopicIds()].filter(hasAdvPair));
    return advFor(t);
  }
  return buildFromTypes(g.types, survey, n);
}

/** 특정 유형 목록에서 n개 (서베이 주제 우선, 원문·기출 질문 우선) */
export function buildFromTypes(types, survey, n = 5) {
  const pick = (topics) => shuffle(topics.flatMap(questionsOfTopic).filter((q) => types.includes(q.type)))
    .sort((a, b) => (a.src === 'a') - (b.src === 'a'));
  let qs = pick(surveyTopicIds(survey));
  if (qs.length < n) qs = qs.concat(pick(surpriseTopicIds()));
  const seen = new Set();
  return shuffle(qs.filter((q) => !seen.has(q.id) && seen.add(q.id)).slice(0, n)).map((q) => q.id);
}
