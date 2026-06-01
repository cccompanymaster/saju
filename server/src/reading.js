'use strict';
/**
 * reading.js — 사주 데이터 → 무료 맛보기 / 유료 심층 리딩
 * AI 키가 있으면 Gemini, 없으면 결정적 mock 으로 동작.
 */
const ai = require('./ai');

const PERSONA = `당신은 '마자샘 김경희'의 특허출원 리딩 구조를 따르는 사주 상담가 '마녀'입니다.
명리(사주)·오행·십성을 바탕으로 따뜻하지만 또렷하게 풀이합니다.
의료·법률·투자·재무·심리치료를 단정적으로 대체하지 않으며, 문화적·상징적 관점으로 안내합니다.
한국어 존댓말, 군더더기 없는 문장으로 씁니다.`;

/* 사주 핵심을 프롬프트용 텍스트로 압축 */
function sajuBrief(s) {
  const o = s.ohaeng;
  return [
    `이름: ${s.input.name} / 성별: ${genderText(s.input.gender)}`,
    `양력: ${s.solar} / 음력: ${s.lunar} / 띠: ${s.zodiac}`,
    `사주: ${s.pillarsText}`,
    `일간(나): ${s.dayMaster.hanja}(${s.dayMaster.gan}) · ${s.dayMaster.eumyang}${s.dayMaster.ohaeng} — ${s.dayMaster.desc}`,
    `오행 분포: 목${o.count.목} 화${o.count.화} 토${o.count.토} 금${o.count.금} 수${o.count.수} (강한 기운: ${o.dominant}${o.lacking.length ? `, 부족: ${o.lacking.join('·')}` : ''})`,
    `십성: 년 ${s.shishen.year || '-'}, 월 ${s.shishen.month || '-'}${s.shishen.hour ? `, 시 ${s.shishen.hour}` : ''}`,
    s.input.unknownTime ? '출생시간 모름(시주 제외).' : '',
  ].filter(Boolean).join('\n');
}

function genderText(g) { return g === 'M' ? '남성' : g === 'F' ? '여성' : '기타'; }

/* ── 무료 맛보기: 짧게, 핵심만, 결제 유도 ── */
async function freeReading(saju) {
  const prompt = `${PERSONA}

[사주 정보]
${sajuBrief(saju)}

[요청] 위 사주로 '무료 맛보기' 리딩을 작성하세요.
- 3개 단락, 각 2~3문장 (총 6문장 이내).
- ① 타고난 기질 한 줄 정의 ② 지금 흐름의 키워드 ③ 더 깊이 볼 가치가 있다는 여운.
- 구체적 시기·행동·결론은 '심층 리딩'에서 다룬다고 암시하되, 직접 광고 문구는 쓰지 마세요.
- 마크다운 기호 없이 자연스러운 문장으로.`;

  try {
    const text = await ai.generate(prompt, { maxTokens: 500, temperature: 0.95 });
    if (text) return { text, source: 'ai' };
  } catch (e) {
    console.warn('[freeReading] AI 실패, mock 사용:', e.message);
  }
  return { text: mockFree(saju), source: 'mock' };
}

/* ── 유료 심층: 질문 맞춤 + 구조화 ── */
async function paidReading(saju, question) {
  const q = (question || '').trim();
  const prompt = `${PERSONA}

[사주 정보]
${sajuBrief(saju)}

[고객 질문] ${q || '(질문 없음 — 전반적인 흐름을 봐주세요)'}

[요청] 아래 5개 항목의 '심층 리딩'을 작성하세요. 각 항목 제목을 그대로 쓰고 줄바꿈으로 구분:
1. 질문에 대한 마녀의 판정 — 질문이 있으면 명확한 방향(가능/주의/시기조정 등)으로 답.
2. 타고난 기질과 강점 — 일간·오행·십성 근거로.
3. 지금의 흐름 — 좋은 시기와 주의할 시기를 계절/시기 감각으로.
4. 관계와 일·돈 — 질문 맥락에 맞춰 현실 조언.
5. 지금 해야 할 행동 3가지 — 짧은 실행 문장.
- 따뜻하되 또렷하게, 각 항목 2~4문장. 마크다운 기호(#,*) 없이.`;

  try {
    const text = await ai.generate(prompt, { maxTokens: 1600, temperature: 0.9 });
    if (text) return { text, source: 'ai' };
  } catch (e) {
    console.warn('[paidReading] AI 실패, mock 사용:', e.message);
  }
  return { text: mockPaid(saju, q), source: 'mock' };
}

/* ── Mock (AI 키 없이도 그럴듯하게) ── */
function mockFree(s) {
  const dm = s.dayMaster, o = s.ohaeng;
  return [
    `${s.input.name}님은 ${dm.eumyang}${dm.ohaeng}(${dm.hanja}) 일간으로, ${dm.desc.replace(/의 기운$/, '')}을 중심으로 살아가는 분입니다.`,
    `지금은 '${o.dominant}'의 기운이 두드러져, ${ohaengFlow(o.dominant)} 흐름이 읽힙니다.${o.lacking.length ? ` 다만 ${o.lacking.join('·')}의 자리가 비어 있어 균형을 잡는 선택이 중요합니다.` : ''}`,
    `타고난 결은 분명하지만, 올해 이 흐름을 '언제·어떻게' 써야 할지는 시주와 운의 결을 더 깊이 봐야 또렷해집니다.`,
  ].join('\n\n');
}

function mockPaid(s, q) {
  const dm = s.dayMaster, o = s.ohaeng;
  return [
    `1. 질문에 대한 마녀의 판정\n${q ? `"${q}" — 지금의 기운으로 보면 무리하게 밀어붙이기보다 결을 맞춰 한 박자 준비한 뒤 움직이는 편이 유리합니다.` : '뚜렷한 질문을 정하면 답이 더 선명해집니다. 지금은 방향을 고르기 좋은 시기입니다.'}`,
    `2. 타고난 기질과 강점\n${dm.eumyang}${dm.ohaeng} 일간답게 ${dm.desc} 한가운데에 서 있습니다. '${o.dominant}'의 기운이 받쳐주어 한번 정한 길은 끝까지 매듭짓는 힘이 있습니다.`,
    `3. 지금의 흐름\n강한 ${o.dominant}의 기운이 일을 벌이기엔 좋으나, ${o.lacking.length ? `${o.lacking.join('·')}이 비어 마무리와 휴식을 일부러 챙겨야 합니다.` : '과열되지 않도록 속도를 조절하면 길게 갑니다.'}`,
    `4. 관계와 일·돈\n사람과의 일에서 먼저 신뢰를 보여주면 돈과 기회가 뒤따릅니다. 급한 결정보다 약속·계약의 디테일을 확인하세요.`,
    `5. 지금 해야 할 행동 3가지\n· 가장 미뤄둔 한 가지를 이번 주에 끝내기\n· 비어 있는 ${o.lacking[0] || '수'}의 기운을 채우는 습관 하나 만들기\n· 중요한 결정은 충분히 자고 난 아침에 내리기`,
  ].join('\n\n');
}

function ohaengFlow(d) {
  return ({
    목: '새 일을 벌이고 사람을 모으는', 화: '드러내고 표현하며 확장하는',
    토: '기반을 다지고 신뢰를 쌓는', 금: '정리하고 매듭지어 결실을 거두는',
    수: '깊이 사유하고 방향을 바꾸는',
  })[d] || '변화의';
}

module.exports = { freeReading, paidReading, sajuBrief };
