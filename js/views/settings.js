// 설정 화면
import { settings, saveSettings } from '../settings.js';
import { listModels, pickModel, isUsableModel, isTtsModel, friendlyError } from '../gemini.js';
import { englishVoices, speak, playAudioBlob, stopSpeak } from '../tts.js';
import { AI_VOICES, getQuestionAudio, clearQuestionAudio, resumeAiVoice } from '../aivoice.js';
import { importScripts, scriptsMeta, clearScripts } from '../scripts.js';
import { SCRIPT_MAP } from '../scriptmap.js';
import { getAll, put, clearStore } from '../db.js';
import { esc, setTitle, toast, confirmBox } from '../ui.js';

const APP_VERSION = '1.5.0';
const SAMPLE_Q = 'You indicated in the survey that you like to go to the park. Describe a park you often go to.';
const BACKUP_STORES = ['sessions', 'attempts', 'vocab', 'dict', 'samples', 'scripts'];

export async function render(view) {
  setTitle('설정');
  const s = settings();
  let models = [];

  view.innerHTML = `
    <div class="card">
      <b>Gemini API 키</b>
      <p class="small muted">무료 키 발급: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → Create API key. 키는 이 폰에만 저장되고 Google 서버로만 전송됩니다. (결제 계정을 연결하지 않으면 무료로 사용됩니다)</p>
      <div class="row gap"><input id="apiKey" type="password" value="${esc(s.apiKey)}" placeholder="AIza..." autocomplete="off" class="grow"><button class="btn small" id="showKey">보기</button></div>
      <button class="btn primary mt" id="testKey">저장하고 연결 확인</button>
      <div id="keyMsg" class="small mt"></div>
    </div>

    <div class="card">
      <b>AI 모델</b>
      <p class="small muted">무료 모델은 자주 바뀝니다. ‘연결 확인’을 누르면 사용 가능한 목록을 불러옵니다. 모델이 사라지면 앱이 자동으로 새 모델로 바꿉니다.</p>
      <label class="field">답변 분석·모범답안<select id="feedbackModel"><option>${esc(s.feedbackModel)}</option></select></label>
      <label class="field">단어 조회 (가벼운 모델 권장)<select id="lookupModel"><option>${esc(s.lookupModel)}</option></select></label>
    </div>

    <div class="card">
      <b>시험 설정</b>
      <label class="field">연습 난이도 · 모의고사 Self Assessment 기본 선택값
        <select id="difficulty">${[3, 4, 5, 6].map((d) => `<option value="${d}" ${s.difficulty === d ? 'selected' : ''}>${d}${d === 5 ? ' (기본)' : ''}</option>`).join('')}</select></label>
      <label class="opt"><input type="checkbox" id="autoRecord" ${s.autoRecord ? 'checked' : ''}> 질문이 끝나면 자동으로 녹음 시작 (실제 시험 방식)</label>
      <label class="field">내 정보 메모 (모범답안·추천 답변을 내 상황에 맞추는 데 사용)
        <textarea id="profileNote" rows="3" placeholder="예: 20대 후반, 반도체 장비 설계 교육 수강 중, 서울 아파트에서 가족과 거주, 주말에 공원 산책과 카페를 좋아함">${esc(s.profileNote)}</textarea></label>
    </div>

    <div class="card">
      <b>질문 음성</b>
      <label class="opt"><input type="radio" name="voiceMode" value="ai" ${s.voiceMode === 'ai' ? 'checked' : ''}> AI 음성 (Gemini, 자연스러운 시험관 느낌 · 기본)</label>
      <label class="opt"><input type="radio" name="voiceMode" value="device" ${s.voiceMode !== 'ai' ? 'checked' : ''}> 폰 내장 음성 (API 사용 안 함)</label>
      <label class="field">AI 목소리<select id="aiVoice">${AI_VOICES.map(([v, l]) => `<option value="${v}" ${s.aiVoice === v ? 'selected' : ''}>${esc(v)} — ${esc(l)}</option>`).join('')}</select></label>
      <label class="field">음성 모델<select id="ttsModel"><option>${esc(s.ttsModel)}</option></select></label>
      <div class="row gap wrap"><button class="btn small" id="aiTest">🔊 AI 목소리 들어보기</button><button class="btn small" id="clearQa">저장된 질문 음성 삭제</button></div>
      <div id="aiMsg" class="small mt"></div>
      <p class="small muted">질문마다 처음 한 번만 음성을 만들고 폰에 저장해서, 두 번째부터는 무료 한도를 쓰지 않습니다. AI 음성을 쓸 수 없으면 자동으로 폰 음성으로 읽습니다. 실제 시험관 목소리를 복제한 것이 아니라 비슷한 분위기의 음성입니다.</p>
    </div>

    <div class="card">
      <b>폰 내장 음성 (단어 발음·답안 듣기·AI 음성 대체용)</b>
      <label class="field">목소리<select id="ttsVoice"><option value="">자동 (영어 미국)</option></select></label>
      <label class="field">속도 <span id="rateVal">${s.ttsRate}</span><input id="ttsRate" type="range" min="0.6" max="1.2" step="0.05" value="${s.ttsRate}"></label>
      <button class="btn small" id="ttsTest">🔊 들어보기</button>
      <p class="small muted">목소리가 없으면 안드로이드 설정 &gt; 텍스트 음성 변환에서 Google 음성 엔진의 영어 음성 데이터를 설치하세요.</p>
    </div>

    <div class="card">
      <b>교재 예시 답변 (스크립트)</b>
      <div id="scriptStatus" class="small muted mt">확인 중…</div>
      <div class="row gap wrap mt">
        <label class="btn small primary">스크립트 파일 불러오기<input type="file" id="scriptFile" accept="application/json,.json" hidden></label>
        <button class="btn small danger" id="scriptClear">스크립트 삭제</button>
      </div>
      <p class="small muted">opic_scripts.json 파일을 한 번 불러오면 폰 안에만 저장되어, 연습 중 ‘💡 예시 답변’에서 교재 답변을 볼 수 있어요. 앱 코드나 GitHub에는 올라가지 않습니다.</p>
    </div>

    <button class="btn primary full" id="saveAll">설정 저장</button>

    <div class="card">
      <b>데이터</b>
      <div id="storage" class="small muted"></div>
      <div class="row gap wrap mt">
        <button class="btn small" id="exportBtn">백업 파일 내보내기</button>
        <label class="btn small">백업 불러오기<input type="file" id="importFile" accept="application/json,.json" hidden></label>
        <button class="btn small danger" id="wipeBtn">모든 데이터 삭제</button>
      </div>
      <p class="small muted">백업에는 기록·분석 결과·단어장이 들어가며, 녹음 파일과 API 키는 포함되지 않습니다.</p>
    </div>
    <div class="small muted center">오픽 연습 v${APP_VERSION}</div>`;

  const $v = (id) => view.querySelector('#' + id);

  // 목소리 목록 (늦게 로드되는 기기 대비)
  const fillVoices = () => {
    const sel = $v('ttsVoice');
    if (!sel) return;
    const cur = settings().ttsVoice;
    sel.innerHTML = '<option value="">자동 (영어 미국)</option>' + englishVoices().map((v) => `<option value="${esc(v.name)}" ${v.name === cur ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  };
  fillVoices();
  const voiceTimer = setTimeout(fillVoices, 1200);

  $v('ttsRate').addEventListener('input', (e) => { $v('rateVal').textContent = e.target.value; });
  $v('ttsTest').addEventListener('click', () => speak('You indicated in the survey that you like to go to the park. Describe a park you often go to.', { rate: Number($v('ttsRate').value), voice: $v('ttsVoice').value }));
  $v('aiTest').addEventListener('click', async () => {
    const msg = $v('aiMsg');
    const key = $v('apiKey').value.trim();
    if (!key) { msg.textContent = 'API 키를 먼저 입력해 주세요.'; return; }
    if (key !== settings().apiKey) await saveSettings({ apiKey: key });
    if ($v('ttsModel').value) await saveSettings({ ttsModel: $v('ttsModel').value });
    msg.textContent = '음성 만드는 중…';
    try {
      const blob = await getQuestionAudio(SAMPLE_Q, { voice: $v('aiVoice').value, onStatus: (m) => { msg.textContent = m; } });
      resumeAiVoice();
      msg.innerHTML = `<span class="ok-text">✓ 재생 중 (모델: ${esc(settings().ttsModel)})</span>`;
      await playAudioBlob(blob);
    } catch (err) {
      msg.innerHTML = `<span class="bad">AI 음성 실패: ${esc(friendlyError(err))} — 이 경우 폰 내장 음성으로 읽습니다.</span>`;
    }
  });
  $v('clearQa').addEventListener('click', async () => {
    await clearQuestionAudio();
    toast('저장된 질문 음성을 삭제했습니다 (필요할 때 다시 만듭니다)');
  });

  const paintScripts = async () => {
    const m = await scriptsMeta();
    const el = $v('scriptStatus');
    if (!el) return;
    el.innerHTML = m ? `<span class="ok-text">✓ 불러옴</span> · 문서 ${m.docs}개 · 항목 ${m.items}개 · 예시 답변 ${m.scripts}개 · 질문 연결 ${m.linkedFound}/${m.linkedTotal}` : '아직 불러오지 않았어요. (교재 답변 없이도 AI 예시 답변은 볼 수 있어요)';
  };
  paintScripts();
  $v('scriptFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    $v('scriptStatus').textContent = '불러오는 중…';
    try {
      const m = await importScripts(await file.text());
      toast(`스크립트를 불러왔어요 (예시 답변 ${m.scripts}개)`);
    } catch (err) {
      toast(`불러오기 실패: ${err.message}`, 4000);
    }
    paintScripts();
  });
  $v('scriptClear').addEventListener('click', async () => {
    if (!(await confirmBox('불러온 교재 스크립트를 이 폰에서 삭제할까요? (파일을 다시 불러오면 복구됩니다)', '삭제'))) return;
    await clearScripts();
    toast('스크립트를 삭제했습니다');
    paintScripts();
  });

  $v('showKey').addEventListener('click', () => {
    const i = $v('apiKey');
    i.type = i.type === 'password' ? 'text' : 'password';
    $v('showKey').textContent = i.type === 'password' ? '보기' : '숨기기';
  });

  function fillModels() {
    const cur = settings();
    for (const [id, field] of [['feedbackModel', 'feedbackModel'], ['lookupModel', 'lookupModel']]) {
      const names = models.map((m) => m.name).filter(isUsableModel);
      if (cur[field] && !names.includes(cur[field])) names.unshift(cur[field]);
      $v(id).innerHTML = names.map((n) => `<option value="${esc(n)}" ${n === cur[field] ? 'selected' : ''}>${esc(n)}</option>`).join('');
    }
    const tts = models.map((m) => m.name).filter(isTtsModel);
    if (cur.ttsModel && !tts.includes(cur.ttsModel)) tts.unshift(cur.ttsModel);
    $v('ttsModel').innerHTML = tts.map((n) => `<option value="${esc(n)}" ${n === cur.ttsModel ? 'selected' : ''}>${esc(n)}</option>`).join('');
  }

  $v('testKey').addEventListener('click', async () => {
    const key = $v('apiKey').value.trim();
    const msg = $v('keyMsg');
    if (!key) { msg.textContent = '키를 입력해 주세요.'; return; }
    msg.textContent = '확인 중…';
    try {
      models = await listModels(key);
      const patch = { apiKey: key };
      const names = models.map((m) => m.name);
      if (!names.includes(settings().feedbackModel)) patch.feedbackModel = pickModel(models, 'feedback') || settings().feedbackModel;
      if (!names.includes(settings().lookupModel)) patch.lookupModel = pickModel(models, 'lookup') || settings().lookupModel;
      if (!names.includes(settings().ttsModel)) patch.ttsModel = pickModel(models, 'tts') || settings().ttsModel;
      await saveSettings(patch);
      fillModels();
      msg.innerHTML = `<span class="ok-text">✓ 연결 성공 — 사용 가능한 모델 ${models.length}개. 분석: ${esc(settings().feedbackModel)} / 단어: ${esc(settings().lookupModel)} / 음성: ${esc(settings().ttsModel)}</span>`;
    } catch (err) {
      msg.innerHTML = `<span class="bad">연결 실패: ${esc(friendlyError(err))}</span>`;
    }
  });

  $v('saveAll').addEventListener('click', async () => {
    await saveSettings({
      apiKey: $v('apiKey').value.trim(),
      feedbackModel: $v('feedbackModel').value || settings().feedbackModel,
      lookupModel: $v('lookupModel').value || settings().lookupModel,
      difficulty: Number($v('difficulty').value) || 5,
      autoRecord: $v('autoRecord').checked,
      profileNote: $v('profileNote').value.trim(),
      ttsVoice: $v('ttsVoice').value,
      voiceMode: view.querySelector('input[name=voiceMode]:checked')?.value || 'ai',
      aiVoice: $v('aiVoice').value || 'Erinome',
      ttsModel: $v('ttsModel').value || settings().ttsModel,
      ttsRate: Number($v('ttsRate').value) || 0.95,
    });
    toast('저장했습니다');
  });

  // 저장 공간
  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const el = $v('storage');
      if (el) el.textContent = `사용 중: ${(usage / 1048576).toFixed(1)}MB${quota ? ` / 사용 가능 ${(quota / 1073741824).toFixed(1)}GB` : ''}`;
    }).catch(() => {});
  }

  $v('exportBtn').addEventListener('click', async () => {
    const data = { app: 'opic-practice', version: 1, exportedAt: Date.now(), settings: { ...settings(), apiKey: '' } };
    for (const st of BACKUP_STORES) data[st] = await getAll(st);
    // dict, samples 는 키가 별도라 키와 함께 저장
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `opic-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  $v('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'opic-practice') throw new Error('이 앱의 백업 파일이 아닙니다');
      let n = 0;
      for (const st of ['sessions', 'attempts', 'vocab', 'scripts']) {
        for (const item of data[st] || []) { await put(st, item); n++; }
      }
      for (const item of data.dict || []) { if (item?.term) { await put('dict', item, String(item.term).toLowerCase()); n++; } }
      for (const item of data.samples || []) { if (item?.qid) { await put('samples', item, item.qid); n++; } }
      if ((data.scripts || []).length) {
        await put('kv', { importedAt: Date.now(), createdAt: '', docs: new Set(data.scripts.map((r) => r.doc)).size, items: data.scripts.length, scripts: data.scripts.reduce((a, r) => a + (r.scripts?.length || 0), 0), linkedFound: [...new Set(Object.values(SCRIPT_MAP).flat())].filter((k) => data.scripts.some((r) => r.id === k)).length, linkedTotal: new Set(Object.values(SCRIPT_MAP).flat()).size }, 'scriptsMeta');
      }
      if (data.settings) {
        const { apiKey, ...rest } = data.settings;
        await saveSettings(rest);
      }
      toast(`불러오기 완료 (${n}개 항목)`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(`불러오기 실패: ${err.message}`, 4000);
    }
  });

  $v('wipeBtn').addEventListener('click', async () => {
    if (!(await confirmBox('녹음·기록·단어장을 포함한 모든 데이터를 삭제합니다. 되돌릴 수 없습니다. (설정과 API 키는 유지)', '모두 삭제'))) return;
    for (const st of ['sessions', 'attempts', 'audio', 'vocab', 'dict', 'samples', 'qaudio']) await clearStore(st);
    toast('모든 데이터를 삭제했습니다');
    location.hash = '#/';
  });

  return () => { clearTimeout(voiceTimer); stopSpeak(); };
}
