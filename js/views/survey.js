// Background Survey — 실제 OPIc 서베이 구조 (조건부 하위 질문 + 여가·취미·운동·휴가 합계 12개 이상)
import { settings, saveSettings } from '../settings.js';
import { SURVEY, TOPICS, itemTopic, visibleParts, validateSurvey } from '../questions.js';
import { esc, setTitle, toast } from '../ui.js';

/**
 * 서베이 폼을 container에 그림. onSubmit(survey) 은 유효할 때만 호출.
 * submitLabel: 버튼 문구
 */
export function mountSurveyForm(container, initial, { submitLabel = '저장', onSubmit }) {
  const ans = { ...(initial || {}) };
  const acts = new Set(initial?.activities || []);

  const paint = () => {
    const parts = visibleParts(ans);
    let lastSection = '';
    container.innerHTML = `
      <div class="card accent small">실제 시험의 Background Survey와 같은 항목입니다. 질문은 여기서 선택한 내용을 바탕으로 출제됩니다.
        <span class="tag ok">연습</span> 표시는 앱에 질문이 준비된 항목입니다.</div>
      ${parts.map((p) => {
        const head = p.section && p.section !== lastSection ? `<div class="section-label">${esc(p.section)}</div>` : '';
        if (p.section) lastSection = p.section;
        return `${head}<div class="card"><b>${esc(p.q)}</b>
          ${p.options.map((o) => `<label class="opt"><input type="radio" name="${p.id}" value="${esc(o)}" ${ans[p.id] === o ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
        </div>`;
      }).join('')}
      <div class="section-label">여가 활동 · 취미 · 운동 · 휴가</div>
      <div class="card warn small"><b>${esc(SURVEY.activityNote)}</b></div>
      ${SURVEY.groups.map((g) => `
        <div class="card"><b>${esc(g.title)}</b>
          ${g.items.map((it) => {
            const t = itemTopic(it[0]);
            return `<label class="opt"><input type="checkbox" value="${it[0]}" ${acts.has(it[0]) ? 'checked' : ''}> ${esc(it[1])} ${t && TOPICS[t] ? '<span class="tag ok">연습</span>' : ''}</label>`;
          }).join('')}
        </div>`).join('')}
      <div class="sticky-bar">
        <span id="cnt" class="small"></span>
        <button id="surveySubmit" class="btn primary">${esc(submitLabel)}</button>
      </div>`;
    updateCount();
  };

  const updateCount = () => {
    const el = container.querySelector('#cnt');
    if (!el) return;
    el.textContent = `선택 ${acts.size}개 / 최소 ${SURVEY.minActivities}개`;
    el.classList.toggle('bad', acts.size < SURVEY.minActivities);
  };

  const onChange = (e) => {
    const t = e.target;
    if (t.type === 'radio') {
      ans[t.name] = t.value;
      // 상위 답이 바뀌면 더 이상 해당되지 않는 하위 답 제거
      for (const p of SURVEY.parts) if (p.when && !p.when(ans)) delete ans[p.id];
      const y = window.scrollY;
      paint();
      window.scrollTo(0, y);
    } else if (t.type === 'checkbox') {
      if (t.checked) acts.add(t.value); else acts.delete(t.value);
      updateCount();
    }
  };
  const onClick = (e) => {
    if (!e.target.closest('#surveySubmit')) return;
    const sv = { ...ans, activities: [...acts] };
    for (const p of SURVEY.parts) if (p.when && !p.when(sv)) delete sv[p.id];
    const errs = validateSurvey(sv);
    if (errs.length) { toast(errs[0], 3500); return; }
    onSubmit(sv);
  };
  container.addEventListener('change', onChange);
  container.addEventListener('click', onClick);
  paint();
  return () => { container.removeEventListener('change', onChange); container.removeEventListener('click', onClick); };
}

/** 설정용 서베이 화면 (#/survey) — 여기서 저장한 값이 모의고사 서베이의 기본값이 됩니다 */
export async function render(view) {
  setTitle('Background Survey');
  return mountSurveyForm(view, settings().survey, {
    submitLabel: '저장',
    onSubmit: async (sv) => {
      await saveSettings({ survey: sv });
      toast('서베이를 저장했습니다');
      location.hash = '#/';
    },
  });
}
