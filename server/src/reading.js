'use strict';
/**
 * reading.js — 사주 데이터 → 무료 맛보기 / 유료 심층(왕후 어투)
 * 조선 왕후(중전마마)의 어투로, 사주 근거 + '실제 삶에서 이렇게 드러난다'는
 * 구체적 장면 예시를 담는다. AI 키가 있으면 Claude(Opus 4.8), 없으면 데이터 기반 mock.
 */
const ai = require('./ai');

const ROYAL_PERSONA = `너는 조선의 국모(國母), 중전마마이니라. 사주 명리를 꿰뚫어 보는 지혜로
백성 한 사람의 명(命)을 살펴 다정히 일러 준다. 어투는 조선시대 말투로 하되, 위엄보다 '친근함'을 앞세워라:
따뜻하고 다정하게, 그대를 아끼는 손윗사람처럼 "~하오 / ~한다오 / ~하구려 / ~하시게 / ~이라네 / ~하리니 / 그대여" 같은
옛말을 쓰되, 어렵지 않고 정겹게 전하라. 점치는 말이 아니라 명리(命理)의 이치로 풀되,
의료·법률·투자·재무·심리치료를 단정적으로 대신하지 않으며 문화적·상징적으로 안내한다.`;

const GLOSSARY = `[십성 뜻] 비견:주체·동료·경쟁 / 겁재:추진·승부·재물변동 / 식신:표현·여유·재능·복록 /
상관:재능·언변·자유 / 편재:활동적 재물·사업·기회 / 정재:안정적 재물·성실·배우자 /
편관:도전·압박·권위(칠살) / 정관:명예·직책·규범 / 편인:직관·전문·고독 / 정인:학문·문서·인덕.
[십이운성] 장생·관대·건록·제왕=기운이 오르는 때, 쇠·병·사·묘=거두는 때, 절·태·양=전환·잉태·준비.`;

// 모든 호출에서 재사용되는 안정적 system (프롬프트 캐싱 대상)
const SYSTEM = `${ROYAL_PERSONA}\n\n${GLOSSARY}`;

// ── 영어 버전 ──
const ROYAL_PERSONA_EN = `You are the Queen of Joseon, the mother of the nation, who reads a person's destiny (Myeong) through the wisdom of Saju.
Speak warmly and affectionately, like a caring elder — friendly first, dignified second. Use a gently old-world register ("you'll find…", "keep this close, dear one", "let me tell you plainly"), and keep every meaning clear and intimate.
This is not fortune-telling but the reasoning of Myeongri. You read culturally and symbolically, and never present medical, legal, financial or psychological advice as definitive.`;
const GLOSSARY_EN = `[Ten Gods] Companion: self/peers/competition · Rival: drive/rivalry/volatile wealth · Output: expression/ease/talent · Hurting Officer: talent/eloquence/freedom · Indirect Wealth: enterprise/opportunity · Direct Wealth: steady gain/spouse · Seven Killings: challenge/pressure/authority · Direct Officer: honor/office/order · Indirect Resource: intuition/expertise · Direct Resource: learning/documents/support.
[Twelve Stages] Growth/Cap/Officer/Peak = rising energy; Decline/Sickness/Death/Tomb = gathering in; Severance/Womb/Nurture = transition/conception/preparation.`;
const SYSTEM_EN = `${ROYAL_PERSONA_EN}\n\n${GLOSSARY_EN}`;

/* 사주 핵심 압축(프롬프트용) */
function sajuDeepBrief(s) {
  const o = s.ohaeng;
  const P = s.pillars;
  const pil = (k, p) => p ? `${k} ${p.hanja}(${p.han}) 천간오행:${p.ohaeng} 지지:${p.ji}(${p.jiOhaeng}) 운성:${p.dishi} 지장간:${p.hideGan.join('')} 지지십성:${p.jiShishen.join('·')}` : `${k} (모름)`;
  const lines = [
    `이름:${s.input.name} 성별:${genderText(s.input.gender)} 나이:약${s.input.age}세`,
    `양력:${s.solar} 음력:${s.lunar} 띠:${s.zodiac}`,
    pil('년주', P.year), pil('월주', P.month), pil('일주(나)', P.day), pil('시주', P.hour),
    `일간(나):${s.dayMaster.hanja}(${s.dayMaster.gan})·${s.dayMaster.eumyang}${s.dayMaster.ohaeng} — ${s.dayMaster.desc}`,
    `신강·신약: ${s.dayMaster.strength}(부조세력 ${s.dayMaster.strengthScore}%) / 억부용신: ${s.dayMaster.yongsin.element}(${s.dayMaster.yongsin.hanja}) — ${s.dayMaster.yongsin.reason}`,
    `천간 십성: 년${s.shishen.year} 월${s.shishen.month}${s.shishen.hour ? ' 시' + s.shishen.hour : ''}`,
    `오행 분포: 목${o.count.목} 화${o.count.화} 토${o.count.토} 금${o.count.금} 수${o.count.수} → 강한기운:${o.dominant}, 약한기운:${o.weakest}${o.lacking.length ? ', 없는기운:' + o.lacking.join('·') : ''}`,
    `납음: 일주 ${s.nayin.day} / 공망: ${s.gongmang}`,
    s.sinsal.length ? `신살: ${s.sinsal.map((x) => x.name + '(' + x.mean + ')').join(', ')}` : '신살: 두드러진 것 없음',
    s.currentDaeun ? `현재 대운(약${s.currentDaeun.age}세~): ${s.currentDaeun.han}, 십성 ${s.currentDaeun.shishen} (${s.currentDaeun.ohaeng}의 기운)` : '',
    `향후 대운: ${s.daeun.slice(0, 6).map((d) => d.age + '세 ' + d.han + '(' + d.shishen + ')').join(' / ')}`,
    s.input.unknownTime ? '※ 출생시각 모름 → 시주 제외, 시각 의존 해석은 절제.' : '',
  ];
  return lines.filter(Boolean).join('\n');
}
function genderText(g) { return g === 'M' ? '남자' : g === 'F' ? '여자' : '사람'; }

/* ── 무료 맛보기: 짧게, 왕후 어투, 여운 ── */
async function freeReading(saju, lang) {
  const en = lang === 'en';
  const user = en
    ? `[Saju]\n${sajuDeepBrief(saju)}\n
[Compose] Write a 'free preview' in the dignified voice of a Joseon queen.
- Three short paragraphs, at most 2 sentences each (5 sentences total).
- (1) one-line definition of the innate vessel by Day Master (2) one scene of the present flow (current Luck Pillar / dominant element) (3) gracefully hint that deeper secrets are revealed in the in-depth reading.
- No ad copy, no markdown. Natural, elevated English prose.`
    : `[사주]\n${sajuDeepBrief(saju)}\n
[명하노라] 위 사주로 '무료 맛보기'를 짓되, 조선 왕후의 어투로 하라.
- 세 단락, 각 2문장 이내(총 5문장 이내).
- ① 일간으로 본 그대의 타고난 그릇 한 줄 정의 ② 지금 흐름(현재 대운/강한 기운)의 한 장면 ③ 더 깊은 천기는 '심층'에서 밝혀짐을 품위 있게 암시.
- 광고 문구·마크다운 기호 금지. 자연스러운 옛말 문장으로.`;
  try {
    const text = await ai.generate(en ? SYSTEM_EN : SYSTEM, user, { maxTokens: 2000 });
    if (text) return { text, source: 'ai' };
  } catch (e) { console.warn('[freeReading] AI 실패→mock:', e.message); }
  return { text: en ? mockFreeEn(saju) : mockFree(saju), source: 'mock' };
}

/* ── 유료 심층: 길고 상세, 항목별 근거 + 실제 삶 예시, 왕후 어투(PDF용) ── */
async function paidReading(saju, question, lang) {
  const en = lang === 'en';
  const q = (question || '').trim();
  const decadeLines = saju.daeun.slice(0, 7).map((d) => `○ ${en ? 'Luck Pillar — from age ' + d.age + ' (' + d.hanja + ')' : '대운 — ' + d.age + '세부터 (' + d.han + ')'}`).join('\n');
  const user = en
    ? `[Saju]\n${sajuDeepBrief(saju)}\n
[The seeker asks] ${q || '(no specific question — read the destiny as a whole)'}\n
[Compose] Write a LONG, in-depth booklet (this becomes a 30+ page PDF) in the warm, affectionate voice of a Joseon queen — friendly first, dignified second. Write each section title exactly as '○ Title', separated by blank lines. Make EVERY section substantial: 4–8 sentences, weaving (1) the specific Saju basis (name the Ten God / element / stage / Luck Pillar / sinsal) and (2) one or two vivid real-life scenes (work, money, people, choices). No markdown symbols. Address the reader warmly as "dear one / you".

○ A Word to You
○ Your Saju at a Glance
○ The Day Master — Who You Are
○ Five Elements — Wood
○ Five Elements — Fire
○ Five Elements — Earth
○ Five Elements — Metal
○ Five Elements — Water
○ Strength and the Useful Element
○ Ten Gods — Companion group
○ Ten Gods — Output group
○ Ten Gods — Wealth group
○ Ten Gods — Officer group
○ Ten Gods — Resource group
○ Pillar — Year (roots, early years)
○ Pillar — Month (parents, society)
○ Pillar — Day (self, partner)
○ Pillar — Hour (children, later years)
○ The Path of Wealth
○ Work and Vocation
○ Honor and Standing
○ Study and Documents
○ Love and Marriage
○ Family and Children
○ Health and Body
○ People and Benefactors
${decadeLines}
○ The Year ahead and the season after
○ The Rhythm of the Seasons
○ Sinsal — the Patterns
○ Remedies — Three Household Wisdoms
○ Three Things to Keep
○ A Closing Letter`
    : `[사주]\n${sajuDeepBrief(saju)}\n
[그대의 물음] ${q || '(따로 묻지 않음 — 명 전반을 살펴라)'}\n
[명하노라] 아래 항목을 모두, '친근하되 위엄 있는 조선시대 말투'로 길고 상세하게 지어라(이 글은 30쪽 이상의 책으로 엮느니라). 각 항목 제목을 '○ 제목' 형식으로 그대로 쓰고 빈 줄로 나누라. 모든 항목을 넉넉히(4~8문장) 채우되, 매 항목마다 (1)사주 근거(십성·오행·운성·대운·신살을 콕 집어) → (2)"그 기운이 삶에서 이렇게 드러난다오" 하는 구체적 장면 1~2개를 곁들여라. 다정하게 '그대'라 부르고, 마크다운 기호 금지.

○ 머리말 — 그대에게
○ 사주 한눈에
○ 일간(日干) — 그대라는 사람
○ 오행 풀이 — 목(木)
○ 오행 풀이 — 화(火)
○ 오행 풀이 — 토(土)
○ 오행 풀이 — 금(金)
○ 오행 풀이 — 수(水)
○ 신강·신약과 용신(用神)
○ 십성 풀이 — 비겁
○ 십성 풀이 — 식상
○ 십성 풀이 — 재성
○ 십성 풀이 — 관성
○ 십성 풀이 — 인성
○ 기둥 풀이 — 년주(뿌리·초년)
○ 기둥 풀이 — 월주(부모·사회)
○ 기둥 풀이 — 일주(나·배우자)
○ 기둥 풀이 — 시주(자식·말년)
○ 재물의 길
○ 일과 직업
○ 명예와 자리
○ 학업과 문서
○ 사랑과 혼인
○ 가정과 자식
○ 건강과 몸
○ 사람과 귀인
${decadeLines}
○ 올해와 다가오는 해의 운
○ 사계절의 리듬
○ 신살(神煞) 풀이
○ 비방(秘方) — 살림의 지혜 셋
○ 마음가짐 셋
○ 맺음말 — 왕후의 편지`;
  try {
    const text = await ai.generate(en ? SYSTEM_EN : SYSTEM, user, { maxTokens: 16000 });
    if (text) return { text, source: 'ai' };
  } catch (e) { console.warn('[paidReading] AI 실패→mock:', e.message); }
  return { text: en ? mockPaidEn(saju, q) : mockPaid(saju, q), source: 'mock' };
}

/* ====================== Mock (AI 없이도 데이터 기반 고품질) ====================== */
function topShishen(s) {
  // 천간+지지 십성 빈도
  const cnt = {};
  const add = (x) => { if (x && x !== '일간(나)') cnt[x] = (cnt[x] || 0) + 1; };
  add(s.shishen.year); add(s.shishen.month); add(s.shishen.hour);
  ['year', 'month', 'day', 'hour'].forEach((k) => { const p = s.pillars[k]; if (p) p.jiShishen.forEach(add); });
  const sorted = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return sorted;
}
const FLOW = { 목:'새 일을 벌이고 사람을 모으는', 화:'드러내고 표현하며 넓히는', 토:'기반을 다지고 신뢰를 쌓는', 금:'매듭짓고 결실을 거두는', 수:'깊이 사유하고 방향을 바꾸는' };

function mockFree(s) {
  const dm = s.dayMaster, o = s.ohaeng;
  return [
    `그대의 명을 펼쳐 보니, ${dm.eumyang}${dm.ohaeng}의 일간(${dm.hanja})으로 태어났구려. ${dm.desc.replace(/의 기운$/, '')}을 본바탕으로 삼은 사람이오.`,
    `지금은 ${o.dominant}의 기운이 두터워 ${FLOW[o.dominant]} 흐름이 일고 있으니${s.currentDaeun ? `, 마침 ${s.currentDaeun.shishen}의 대운(${s.currentDaeun.han})이 그 길을 비추고 있소.` : '.'}`,
    `허나 천기의 깊은 갈피와 재물·인연·운의 때는 함부로 다 펼쳐 보일 수 없으니, 그 전모는 심층의 자리에서 밝히리이다.`,
  ].join('\n\n');
}

function joinSections(arr) {
  return arr.map((x) => (x.ch ? `◆ ${x.t}${x.b ? ' :: ' + x.b : ''}` : `○ ${x.t}\n${x.b}`)).join('\n\n');
}
function mockPaid(s, q) { return joinSections(buildLongKo(s, q)); }

/* 보조 텍스트 */
function hasStar(s, names) {
  const all = [s.shishen.year, s.shishen.month, s.shishen.hour];
  ['year', 'month', 'day', 'hour'].forEach((k) => { const p = s.pillars[k]; if (p) all.push.apply(all, p.jiShishen); });
  return names.some((n) => all.includes(n));
}
function shishenLife(ss) {
  return ({
    비견: '제 주관이 또렷하고 남에게 기대기를 꺼리는 기운이오.',
    겁재: '승부와 추진의 힘이 세어, 한번 달리면 멈추기 어려운 기운이오.',
    식신: '표현과 여유, 사람을 먹이고 즐겁게 하는 복된 기운이오.',
    상관: '재능과 언변이 빼어나되 얽매임을 싫어하는 기운이오.',
    편재: '활동적으로 기회를 좇아 재물을 다루는 기운이오.',
    정재: '성실히 모으고 살뜰히 지키는 기운이오.',
    편관: '도전과 결단, 위엄으로 사람을 이끄는 기운이오.',
    정관: '명예와 책임, 규범을 지키는 반듯한 기운이오.',
    편인: '직관과 전문, 홀로 깊이 파고드는 기운이오.',
    정인: '배움과 문서, 인덕으로 보호받는 기운이오.',
  })[ss] || '주관이 또렷한 기운이오.';
}
function shishenFlow(ss) {
  return ({
    비견: '제 힘으로 자리를 넓히고 동료를 얻는 때요.',
    겁재: '크게 벌이되 재물의 드나듦이 잦은 때이니 매듭을 단단히 하시오.',
    식신: '재주가 빛나고 마음에 여유가 도는 복된 때요.',
    상관: '재능으로 이름을 내되 입과 글을 삼가야 할 때요.',
    편재: '기회와 재물이 활발히 오가는 때이니 욕심의 선을 지키시오.',
    정재: '꾸준히 모으고 가정이 안정되는 때요.',
    편관: '큰 책임과 시험이 오나, 넘기면 그릇이 커지는 때요.',
    정관: '이름과 직책이 오르는 반듯한 때요.',
    편인: '배움과 전문을 깊이 하기 좋은 때요.',
    정인: '문서·자격·귀인의 덕이 따르는 때요.',
  })[ss] || '흐름이 한 번 바뀌는 때요.';
}
function shishenScene(ss) {
  return ({
    비견: '동업이나 한 팀으로 일을 키우는 자리에서 성과가 나리이다.',
    겁재: '큰 거래의 해엔 계약서의 작은 글씨까지 살펴야 탈이 없으리이다.',
    식신: '솜씨를 펼친 일이 입소문을 타 기회가 늘어나리이다.',
    상관: '말과 글로 빛나되, 윗사람과의 마찰만 누르면 이름이 오르리이다.',
    편재: '바깥에서 굴린 일이 재물로 돌아오는 해가 오리이다.',
    정재: '맡은 자리를 지킨 끝에 곳간이 차오르리이다.',
    편관: '맡기 두려웠던 책임을 받아 든 자리에서 크게 인정받으리이다.',
    정관: '승진이나 합격 같은 반듯한 결실이 찾아오리이다.',
    편인: '자격·전문의 문서가 길을 열어 주리이다.',
    정인: '귀인의 추천이나 문서의 덕으로 일이 풀리리이다.',
  })[ss] || '맡은 일이 무르익어 결실이 오리이다.';
}
function ohaengBody(o, symptom) {
  const m = {
    목: ['간·근육·눈의 기운이오.', '눈이 피로하고 결리는'],
    화: ['심장·혈·열의 기운이오.', '가슴이 답답하고 잠이 얕은'],
    토: ['비위·소화의 기운이오.', '속이 더부룩하고 입맛이 도는'],
    금: ['폐·기관지·피부의 기운이오.', '잔기침이 나고 피부가 마르는'],
    수: ['신장·생식·뼈의 기운이오.', '허리가 시리고 쉬 지치는'],
  }[o] || ['기운의 균형이오.', '쉬 지치는'];
  return symptom ? m[1] : m[0];
}
function ohaengRemedy(o) {
  return ({
    목: '아침 산책과 푸른 채소, 새 일을 배우는 습',
    화: '햇볕을 쬐고 사람을 만나 웃는 습, 붉은 빛을 곁에',
    토: '끼니를 거르지 않고 흙을 밟는 습, 노랑·황토빛을 곁에',
    금: '맑은 공기와 정돈, 호흡을 고르는 습, 흰빛·금속을 곁에',
    수: '충분한 물과 잠, 고요히 사유하는 습, 검정·남색을 곁에',
  })[o] || '규칙적인 잠과 식사';
}
function goodYears(s) {
  const good = [], bad = [];
  s.daeun.slice(0, 6).forEach((d) => {
    if (['정관', '정재', '정인', '식신'].includes(d.shishen)) good.push(d.age + '세');
    if (['겁재', '상관', '편관'].includes(d.shishen)) bad.push(d.age + '세');
  });
  let t = '';
  if (good.length) t += `특히 ${good.join('·')} 무렵의 대운이 반듯하게 이로우며, `;
  if (bad.length) t += `${bad.join('·')} 무렵엔 매듭과 말(言)을 삼가면 탈이 없으리이다.`;
  return t || '대운의 결을 보아 나아가면 그르치지 않으리이다.';
}

/* ====================== English mock ====================== */
const OHAENG_EN = { 목: 'Wood', 화: 'Fire', 토: 'Earth', 금: 'Metal', 수: 'Water' };
const FLOW_EN = {
  목: 'starting ventures and gathering people', 화: 'expressing and expanding outward',
  토: 'building foundations and trust', 금: 'concluding matters and gathering the harvest', 수: 'deep reflection and changing course',
};
const REMEDY_EN = {
  목: 'a morning walk, green vegetables, and learning something new', 화: 'sunlight, laughter with others, and a touch of red nearby',
  토: 'regular meals, walking on the earth, and tones of yellow and ochre', 금: 'clean air, tidiness, measured breathing, and white or metal nearby',
  수: 'ample water and sleep, quiet reflection, and shades of black and deep blue',
};
const STRENGTH_EN = { 신강: 'strong', 중화: 'balanced', 신약: 'weak' };
const SHISHEN_EN = {
  비견: 'Companion', 겁재: 'Rival', 식신: 'Output', 상관: 'Hurting Officer', 편재: 'Indirect Wealth',
  정재: 'Direct Wealth', 편관: 'Seven Killings', 정관: 'Direct Officer', 편인: 'Indirect Resource', 정인: 'Direct Resource',
};
function ssEn(k) { return SHISHEN_EN[k] || k; }
function dmDescEn(o) {
  return ({ 목: 'a steady, growing, planning force like a tree', 화: 'a bright, expressive, passionate force like fire',
    토: 'a trustworthy, embracing, centering force like earth', 금: 'a decisive force that concludes firmly like metal',
    수: 'a wise, adaptable force that flows like water' })[o] || 'a clear, defining force';
}
function mockFreeEn(s) {
  const dm = s.dayMaster, o = s.ohaeng, cd = s.currentDaeun;
  return [
    `Looking upon your chart, you were born under a ${dm.eumyang === '양' ? 'Yang' : 'Yin'} ${OHAENG_EN[dm.ohaeng]} Day Master (${dm.hanja}) — ${dmDescEn(dm.ohaeng)} at the center of who you are.`,
    `At present the ${OHAENG_EN[o.dominant]} force runs thick, so a season of ${FLOW_EN[o.dominant]} is rising${cd ? `, and the ${ssEn(cd.shishen)} Luck Pillar (${cd.hanja}) now lights that path.` : '.'}`,
    `Yet the deeper turns of wealth, bonds and timing cannot all be laid bare here; their full shape is revealed in the in-depth reading.`,
  ].join('\n\n');
}
function mockPaidEn(s, q) { return joinSections(buildLongEn(s, q)); }
function shishenFlowEn(ss) {
  return ({ 비견: 'a time to widen your ground and gain allies by your own strength.',
    겁재: 'a time of bold moves but frequent comings and goings of wealth — bind your agreements tightly.',
    식신: 'a blessed time when talent shines and the heart finds ease.', 상관: 'a time to make your name by talent — but guard your tongue and pen.',
    편재: 'a lively time of opportunity and wealth — hold the line of desire.', 정재: 'a steady time of saving and a settled household.',
    편관: 'great responsibility and trial arrive; pass through it and your vessel grows.', 정관: 'an upright time when name and office rise.',
    편인: 'a good time to deepen expertise and study.', 정인: 'a time favored by documents, credentials and benefactors.' })[ss] || 'a time when the flow turns once.';
}
function bodyEn(o) {
  return ({ 목: 'the liver, sinews and eyes', 화: 'the heart, blood and warmth', 토: 'the spleen-stomach and digestion',
    금: 'the lungs, airways and skin', 수: 'the kidneys, reproduction and bones' })[o] || 'the balance of energies';
}
function goodYearsEn(s) {
  const good = [], bad = [];
  s.daeun.slice(0, 6).forEach((d) => {
    if (['정관', '정재', '정인', '식신'].includes(d.shishen)) good.push('age ' + d.age);
    if (['겁재', '상관', '편관'].includes(d.shishen)) bad.push('age ' + d.age);
  });
  let t = '';
  if (good.length) t += `The pillars around ${good.join(', ')} are especially upright and favorable; `;
  if (bad.length) t += `around ${bad.join(', ')}, guard your words and finish what you start, and trouble passes.`;
  return t || 'Move with the grain of your Luck Pillars and you will not go astray.';
}

/* ====================== 장문 생성기 (친근한 조선 말투 · 30P+ 분량) ====================== */
const { Solar } = require('lunar-javascript');
const OH_HAN = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const DISHI_MEAN = {
  장생: '새로 태어나 자라나는 기운이라,', 목욕: '꾸미고 시행착오를 겪는 기운이라,', 관대: '사회로 나아가 갖추는 기운이라,',
  건록: '제 힘으로 자리를 얻는 기운이라,', 제왕: '기운이 가장 왕성한 정점이라,', 쇠: '정점을 지나 수그러드는 기운이라,',
  병: '잠시 쉬어가며 약해지는 기운이라,', 사: '활동을 거두고 정리하는 기운이라,', 묘: '갈무리하여 저장하는 기운이라,',
  절: '끊어졌다 다시 이어지는 전환이라,', 태: '새 생명을 잉태하는 기운이라,', 양: '품어 기르며 준비하는 기운이라,',
};

function groupOf(ss) {
  if (ss === '비견' || ss === '겁재') return '비겁';
  if (ss === '식신' || ss === '상관') return '식상';
  if (ss === '편재' || ss === '정재') return '재성';
  if (ss === '편관' || ss === '정관') return '관성';
  if (ss === '편인' || ss === '정인') return '인성';
  return '';
}
function presentGroups(s) {
  const set = new Set();
  [s.shishen.year, s.shishen.month, s.shishen.hour].forEach((x) => { const g = groupOf(x); if (g) set.add(g); });
  ['year', 'month', 'day', 'hour'].forEach((k) => { const p = s.pillars[k]; if (p) p.jiShishen.forEach((x) => { const g = groupOf(x); if (g) set.add(g); }); });
  return set;
}
function yearGanzhi(year) { try { return Solar.fromYmdHms(year, 6, 15, 12, 0, 0).getLunar().getEightChar().getYear(); } catch (e) { return ''; } }

/* 오행 장문 뱅크 (KO) */
const OHK = {
  목: { trait: '목(木)은 나무처럼 위로 뻗고 새것을 펴는 기운이라, 봄의 새싹과 같은 성정이라네. 인정 많고 자라기를 좋아하며, 곧고 어진 마음을 지녔소.', strong: '그 기운이 두터우니 일을 벌이고 사람을 모으는 데 거침이 없구려. 새 사업, 새 공부, 새 인연에 늘 마음이 먼저 가닿는다오. 다만 가지가 너무 무성하면 햇빛이 안으로 들지 못하는 법이니, 벌인 일을 제때 베어 다듬을 줄도 알아야 하오. 삶의 장면으로는 — 여러 일을 동시에 펼쳐 놓고 어느 하나도 놓지 못해 스스로 지치는 때가 오기 쉽소.', weak: '목이 조금 옅으니, 새 일을 시작할 적엔 한 번 더 마음을 다잡고 작은 매듭부터 지으면 좋겠소. 시작이 더딘 것이 흠이 아니라, 뿌리를 깊이 내리는 그대만의 방식이라오.', none: '목이 비어 있으니, 새로 배우고 펴는 자리를 일부러 곁에 두시게. 푸른 빛과 화초, 아침 산책이 그 빈자리를 메워 주리다.' },
  화: { trait: '화(火)는 불처럼 밝히고 드러내는 기운이라, 한여름 볕과 같은 성정이오. 예(禮)를 알고 환하며, 사람을 끌어모으는 따뜻함을 지녔소.', strong: '그 빛이 환하니 표현과 인기가 절로 따르고, 무대와 사람들 앞에서 빛나는 사람이구려. 허나 너무 타오르면 쉬이 지치고 마음이 들뜨니, 불씨를 아껴 두는 지혜가 필요하오. 삶의 장면으로는 — 한껏 달아올라 일을 벌였다가, 며칠 못 가 기운이 뚝 꺼지는 일이 잦으리다.', weak: '온기가 옅으니, 사람과 어울려 웃고 햇볕을 쬐는 일이 곧 약이 되오. 혼자 너무 오래 있지 말고, 마음 맞는 이와 밥 한 끼 나누는 일을 가벼이 보지 마시게.', none: '불기운이 비었으니, 마음이 가라앉을 땐 따뜻한 곳과 사람을 찾으시게. 붉은 빛과 밝은 불빛이 그대의 기운을 돋우어 주리다.' },
  토: { trait: '토(土)는 흙처럼 품고 가운데를 잡아주는 기운이라, 늦여름 너른 들과 같은 성정이구려. 믿음(信)이 두텁고 너그러워, 사람이 기대고 싶어 하는 사람이라오.', strong: '믿음과 끈기가 도타워 한번 맡은 자리는 묵묵히 지켜 내오. 허나 너무 무거우면 변화를 더디게 하고 고집이 되니, 한 번씩 자리를 털고 일어나 새 바람을 들이시게. 삶의 장면으로는 — 떠나야 할 자리를 정에 매여 오래 붙들다 때를 놓치는 일이 있으리다.', weak: '중심이 옅으니, 끼니와 잠을 거르지 않는 것만으로도 큰 보탬이 되오. 작은 규칙 하나가 흔들리는 마음을 붙들어 준다오.', none: '토가 비었으니, 매일 같은 시각의 작은 습관 하나가 그대의 뿌리를 굳혀 주리다. 황토빛과 흙을 밟는 일을 곁에 두시게.' },
  금: { trait: '금(金)은 쇠처럼 매듭짓고 결단하는 기운이라, 가을 서리와 같은 성정이라네. 의(義)를 알고 맺고 끊음이 분명하여, 믿음직한 칼과 같은 사람이오.', strong: '맺고 끊음이 분명하여 결실을 잘 거두고, 옳고 그름을 또렷이 가리오. 허나 날이 너무 서면 곁의 사람이 베일 수 있으니, 말을 부드러이 하고 한 번 더 품는 여유를 두시구려. 삶의 장면으로는 — 바른말을 하고도 모진 사람으로 오해받아 속앓이하는 때가 있으리다.', weak: '결단이 옅으니, 끝맺음을 미루지 않는 작은 연습이 그대를 크게 도우리다. 오늘 할 매듭을 내일로 넘기지 않는 것만으로도 운이 트인다오.', none: '금이 비었으니, 정리하고 마무리하는 습을 곁에 두시게. 흰빛과 맑은 쇠붙이, 깔끔한 자리가 그 기운을 채워 주리다.' },
  수: { trait: '수(水)는 물처럼 흐르고 깊이 사유하는 기운이라, 겨울 깊은 물과 같은 성정이오. 지혜(智)가 깊고 융통이 있어, 어디로든 길을 내는 사람이라오.', strong: '지혜와 융통이 깊어 사람의 속과 일의 이치를 잘 헤아리오. 허나 너무 고이면 생각만 많아지고 몸이 따르지 못하니, 자주 움직여 물을 흐르게 하시게. 삶의 장면으로는 — 머릿속으로 열 번을 굴리다 정작 첫걸음을 떼지 못하는 때가 있으리다.', weak: '물기운이 옅으니, 충분히 자고 물을 가까이하면 마음이 절로 맑아지오. 쉬는 것을 게으름으로 여기지 마시게 — 그대에겐 쉼이 곧 보약이라오.', none: '수가 비었으니, 고요히 사유하는 시간을 하루에 한 줌 떼어두시게. 검은빛·남색과 잔잔한 물가가 그대의 기운을 채워 주리다.' },
};
/* 십성 그룹 장문 (KO) */
const SS5K = {
  비겁: { has: '비겁(比劫)이 자리하니 제 주관이 또렷하고, 동료와 형제·벗의 인연이 두텁구려. 남에게 기대기보다 제 힘으로 서기를 좋아하고, 한번 정하면 끝을 보는 뚝심이 있소. 다만 고집이 과하면 곁이 멀어지고 재물의 드나듦이 잦아지니, 한 발 물러서는 여유와 동업의 셈을 또렷이 하는 지혜를 함께 두시게. 삶의 장면으로는 — 옳다 여긴 일을 끝까지 밀어붙여 이루나, 더러 사람과 부딪혀 외로워지는 때가 오리다.', no: '비겁이 옅으니, 홀로 다 짊어지기보다 사람을 곁에 두고 나누면 한결 가벼워지오. 좋은 동료 하나가 그대의 부족한 추진을 메워 주리다.' },
  식상: { has: '식상(食傷)이 있으니 표현과 재주, 그리고 먹을 복이 따르오. 말과 글, 솜씨로 사람을 즐겁게 하고 베푸는 데서 그대의 빛이 나는구려. 다만 재주가 앞서 윗사람과 부딪히기 쉬우니, 입과 글을 한 번 더 다스리면 이름이 절로 오르리다. 삶의 장면으로는 — 솜씨를 펼친 일이 입소문을 타 기회가 늘되, 무심한 한마디로 공든 탑을 흔드는 일을 삼가야 하오.', no: '식상이 옅으니, 마음을 안으로만 두지 말고 한 줄이라도 꺼내어 표현하면 길이 열리오. 재주가 없는 것이 아니라 아직 꺼내지 않았을 뿐이라네.' },
  재성: { has: '재성(財星)이 자리하니 제 손으로 벌어 쥐는 힘이 있고, 현실을 다루는 셈이 밝소. 큰 한탕을 좇기보다 작은 약속과 계약의 매듭을 또렷이 한 해에 곳간이 차오른다오. 삶의 장면으로는 — 욕심을 부려 크게 벌인 해보다, 들고 나는 셈을 살뜰히 챙긴 해에 정작 손에 남는 것이 많으리다.', no: '재성이 드러나지 않으니, 재물은 좇을수록 멀어지고 사람의 신의를 앞세울 때 뒤따라오오. 곳간을 채우려 애쓰기보다 베푼 정으로 사람을 얻으면, 재물은 그 사람들의 손을 빌려 돌아온다네.' },
  관성: { has: '관성(官星)이 있으니 책임과 직책이 그대를 찾고, 규범을 지키는 반듯함이 곧 복이 되오. 조직과 자리에서 그대의 그릇이 드러나니, 맡기 두려운 자리를 받아 든 곳에서 외려 사람이 커지는 법이라오. 삶의 장면으로는 — 떠밀리듯 맡은 책임을 마다 않고 끌어안은 자리에서, 뜻밖에 이름과 신망을 얻으리다.', no: '관성이 옅으니, 남의 밑에서 매이기보다 제 영역을 세우는 길이 어울리오. 규율에 갇히면 답답해하니, 스스로 규율을 만드는 자리에 서시게.' },
  인성: { has: '인성(印星)이 자리하니 배움·문서·귀인의 덕이 따르오. 공부와 자격, 어른의 음덕이 그대의 든든한 뒷배가 되어 주는구려. 삶의 장면으로는 — 막다른 길에서 한 장의 문서나 한 사람의 추천이 길을 열어 주는 일이 거듭 있으리다.', no: '인성이 옅으니, 배움은 스스로 길을 내어야 빛나오. 기댈 뒷배가 적은 만큼 제 발로 선 힘이 단단하니, 좋은 스승 하나를 곁에 두면 그 단단함이 더 빛나리다.' },
};
/* 기둥 영역 (KO) */
const PILLARK = {
  year: { dom: '뿌리·조상·초년운', txt: '년주는 그대가 딛고 선 뿌리와 어린 시절의 바탕이라오.' },
  month: { dom: '부모·청년·사회운', txt: '월주는 부모의 자리이자 그대가 사회로 나아가는 문이구려.' },
  day: { dom: '나·배우자운', txt: '일주는 그대 자신이자 평생을 함께할 짝의 자리라네.' },
  hour: { dom: '자식·말년운', txt: '시주는 자식과 노년, 그리고 그대가 남길 결실의 자리오.' },
};

function buildLongKo(s, q) {
  const dm = s.dayMaster, o = s.ohaeng, P = s.pillars, cd = s.currentDaeun, ys = dm.yongsin;
  const sec = []; const push = (t, b) => sec.push({ t, b });
  const chap = (t, sub) => sec.push({ ch: true, t, b: sub || '' });
  const grp = presentGroups(s);
  const nowY = new Date().getFullYear();

  chap('서(序) — 명(命)을 펼치며', '그대의 타고난 바탕과 흐르는 운을 여는 글');
  push('머리말 — 그대에게', `${s.input.name}, 먼 길 돌아 이 자리에 앉은 그대를 반기오. 내 그대를 아끼는 마음으로, 타고난 명(命)과 흘러가는 운(運)을 한 자 한 자 적어 두었으니 부디 곁에 두고 흔들릴 때마다 펼쳐 보시게. 사주란 하늘이 정해 둔 족쇄가 아니라, 그대가 어떤 그릇으로 났고 어느 철에 무엇을 심으면 좋을지를 일러주는 농사의 책력 같은 것이라오. 그러니 이 글을 읽고 두려워하지 말고, 외려 마음이 든든해지기를 바라오. 이 글은 점(占)이 아니라 명리(命理)의 이치를 빌려 그대의 결을 비추는 거울일 뿐이라네.`);

  push('사주 한눈에', `그대의 사주는 ${s.pillarsText}라오. 일간은 ${dm.eumyang}${dm.ohaeng}(${dm.hanja})이니 ${dm.desc.replace(/의 기운$/, '')}을 본바탕으로 삼은 사람이구려. 일간의 힘은 '${dm.strength}'(부조세력 ${dm.strengthScore}푼)이요, 가장 옅어 채워야 할 기운(용신)은 ${ys.hanja}(${ys.element})라네. 오행은 목 ${o.count.목}, 화 ${o.count.화}, 토 ${o.count.토}, 금 ${o.count.금}, 수 ${o.count.수}로 ${o.dominant}이 두텁고 ${o.weakest}이 옅소.`);

  chap('제1장 — 그대라는 사람', '일간과 오행으로 본 타고난 그릇');
  push('일간(日干) — 그대라는 사람', `일간은 사주에서 곧 '나' 자신을 가리키는 자리라오. 그대는 ${dm.eumyang}${dm.ohaeng}(${dm.hanja})으로 났으니, ${dm.desc} 한가운데에 선 사람이구려. ${shishenLife((s.shishen.month || s.shishen.year || '비견'))} 곁의 이들은 그대를 두고 "겉은 단단한데 속은 정이 많다" 말하기 쉽소.\n삶의 장면으로 이르자면 — 좀처럼 속을 다 내보이지 않다가도, 정작 아끼는 이가 어려움에 처하면 제 일을 제쳐 두고 달려가는 사람이 바로 그대라네. 그 두 결, 곧 단단함과 다정함을 그대 스스로 알고 다독이면, 사람과 일이 한결 순해지리다.`);

  ['목', '화', '토', '금', '수'].forEach((el) => {
    const c = o.count[el];
    const b = c >= 2 ? OHK[el].strong : (c === 0 ? OHK[el].none : OHK[el].weak);
    push(`오행 풀이 — ${el}(${OH_HAN[el]})`, `${OHK[el].trait} 그대 명에 ${el}은 ${c}자리이니, ${b}${el === ys.element ? ` 이 ${el}이 바로 그대의 용신이라, 곁에 채울수록 명이 둥글어진다오.` : ''}`);
  });

  chap('제2장 — 기운의 짜임', '신강·신약과 용신, 그리고 십성의 결');
  push('신강·신약과 용신(用神)', `일간의 힘을 저울에 달아 보니 '${dm.strength}'(부조세력 ${dm.strengthScore}푼)이라오. ${ys.reason} 신강(身强)이면 넘치는 힘을 덜어 흐르게 하고, 신약(身弱)이면 옅은 뿌리를 받쳐 세우는 것이 명리의 이치라네. 그대에게는 ${ys.hanja}(${ys.element})의 기운을 가까이하는 것이 평생의 보약이 되어 주오.\n삶의 장면으로는 — 일이 잘 풀리지 않고 마음이 메마를 때, ${ohaengRemedy(ys.element)}를 곁에 두면 신통히도 기운이 도는 것을 느끼게 되리다. 빛깔과 방위, 사람과 일까지 그 기운을 빌리면, 막혔던 길이 한 칸씩 열린다오.`);

  ['비겁', '식상', '재성', '관성', '인성'].forEach((g) => {
    push(`십성 풀이 — ${g}`, grp.has(g) ? SS5K[g].has : SS5K[g].no);
  });

  chap('제3장 — 네 기둥의 이야기', '년·월·일·시 네 기둥에 담긴 한평생');
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = P[k];
    if (!p) { push('기둥 풀이 — 시주(時柱)', '출생 시각을 모르니 시주는 비워 두었소. 시주는 자식과 말년, 그리고 그대가 남길 결실의 자리이니, 뒷날 시각을 알게 되거든 다시 펼쳐 보시게. 그때엔 늘그막의 빛깔과 아랫사람의 인연까지 한결 또렷해지리다.'); return; }
    const nm = { year: '년주(年柱)', month: '월주(月柱)', day: '일주(日柱)', hour: '시주(時柱)' }[k];
    const era = { year: '어린 시절과 조상의 음덕이 그대를 길렀고,', month: '청년의 때와 부모·사회의 마당에서 그대가 다듬어졌으며,', day: '한평생 곁에 둘 짝과 그대 자신의 속결이 여기 담겼고,', hour: '늘그막의 평안과 아랫사람·자식의 인연이 이 자리에 깃들었소,' }[k];
    push(`기둥 풀이 — ${nm} · ${PILLARK[k].dom}`, `${PILLARK[k].txt} 이 자리에 ${p.hanja}(${p.han})가 앉았으니, 천간은 ${p.ohaeng}, 지지는 ${p.ji}(${p.jiOhaeng})요 십이운성으로는 '${p.dishi}'의 결이라오. ${p.jiShishen.length ? `그 속에 ${p.jiShishen.join('·')}의 기운이 깃들어, ` : ''}${DISHI_MEAN[p.dishi] || ''} ${era}\n그러니 이 기둥이 말하는 바를 가벼이 넘기지 말고, ${k === 'day' ? '특히 짝을 고르고 제 마음을 다스리는 일에' : k === 'month' ? '특히 일과 사회의 인연을 맺는 일에' : '그에 맞갖은 자리에'} 마음을 두시게.`);
  });

  chap('제4장 — 삶의 자리', '재물·일·명예·배움·사랑·가정·건강·사람');
  push('재물의 길 — 곳간을 채우는 법', `재물은 재성과 식상의 결로 본다오. ${grp.has('재성') ? '그대는 제 손으로 벌어 쥐는 힘이 있으니' : '큰 한탕보다 꾸준한 갈무리가 이로우니'}, ${grp.has('식상') ? '재주를 펼친 일이 곧 재물로 이어지오.' : '사람의 신의를 앞세우면 재물이 뒤따라오오.'} 충동으로 큰돈을 옮기는 해보다, 작은 약속과 계약의 글자를 또렷이 한 해에 곳간이 차오른다는 것을 잊지 마시게.`);
  push('일과 직업 — 어느 길이 맞는가', `그대의 ${dm.ohaeng} 일간과 ${o.dominant}의 기운으로 보아, ${careerKo(dm.ohaeng, o.dominant)} ${grp.has('관성') ? '관성이 받쳐 조직과 직책이 어울리고,' : '관성이 옅어 제 영역을 세우는 일이 어울리고,'} ${grp.has('식상') ? '재주를 드러내는 일에서 더욱 빛나리다.' : '꾸준히 쌓는 일에서 신뢰를 얻으리다.'}`);
  push('명예와 자리 — 이름을 높이는 때', `관성과 인성이 명예의 결이라오. ${grp.has('관성') || grp.has('인성') ? '문서와 직책의 덕이 있으니, 맡은 자리를 마다 않고 받아 든 곳에서 이름이 오르리다.' : '스스로 길을 내어 실력으로 증명하면, 더디어도 단단한 이름을 얻으리다.'} ${cd ? `마침 ${cd.shishen}의 대운이 비추니 ${shishenFlow(cd.shishen)}` : ''}`);
  push('학업과 문서 — 배움의 복', `인성은 배움과 문서, 자격의 별이라네. ${grp.has('인성') ? '공부와 문서의 덕이 두터우니, 자격과 시험에서 결실을 보기 좋소.' : '배움은 스스로 길을 내어야 빛나니, 좋은 스승과 벗을 곁에 두시게.'} 큰 결정과 계약은 충분히 자고 난 아침에 살피면 그르치지 않으리다.`);
  push('사랑과 혼인 — 인연의 결', `배우자의 자리는 일지(日支) ${P.day.ji}(${P.day.jiOhaeng})로 본다오. ${s.sinsal.some((x) => x.name === '도화살') ? '도화의 매력이 있어 사람이 절로 따르나, 인연의 무게를 가벼이 말 것이오.' : '화려한 만남보다 속결이 맞는 이와 오래간다오.'} 그대의 침묵까지 읽어 주는 한 사람 곁에서 마음이 놓이리니, 부디 겉보다 결을 보시게.`);
  push('가정과 자식 — 뿌리와 가지', `${P.hour ? `시주 ${P.hour.hanja}로 보아 자식·말년의 자리에 ${P.hour.jiShishen.join('·') || P.hour.ohaeng}의 기운이 깃들었소.` : '시각을 모르니 자식의 자리는 뒷날로 미루어 두오.'} 가정은 그대가 베푼 만큼 돌아오는 곳이니, 말 한마디를 따뜻이 하면 집안의 기운이 절로 둥글어진다오.`);
  push('건강과 몸 — 미리 살피는 지혜', `${o.weakest}의 기운이 옅으니 ${ohaengBody(o.weakest)} 특히 무리한 뒤 ${ohaengBody(o.weakest, true)} 신호가 오거든 몸이 보내는 전갈로 알고 쉬시게. 밤늦도록 일을 붙들다 다음 날 종일 가라앉는 일이 잦거든, 그것이 바로 균형이 깨진 자리라오.`);
  push('사람과 귀인 — 누가 그대를 돕는가', `${s.sinsal.some((x) => x.name === '천을귀인') ? '명에 천을귀인이 들었으니, 위기의 길목마다 귀인이 손을 내밀어 주오. 사람을 귀히 여기면 그 복이 더 두터워지리다.' : '귀인은 멀리 있지 않고, 그대가 신의를 지킨 사람들 사이에서 난다오.'} 베푼 정이 곧 그대의 울타리가 되어 주리니, 사람을 곳간처럼 아끼시게.`);

  chap('제5장 — 운(運)의 흐름', '대운 10년의 마디와 올해의 운');
  s.daeun.slice(0, 5).forEach((d) => {
    push(`대운 — ${d.age}세부터 (${d.han})`, `${d.age}세부터 십 년, ${d.han}(${d.hanja}) 대운이 드오. 십성으로는 ${d.shishen}이요 ${d.ohaeng}의 기운이 비추니, ${shishenFlow(d.shishen)} 삶의 장면으로는 — ${shishenScene(d.shishen)}${cd && d.age === cd.age ? '\n바로 지금 그대가 지나는 때이니, 이 십 년의 결을 잘 살펴 때를 고르면 한평생의 큰 자리를 여기서 닦으리다.' : ''}`);
  });

  const yg = yearGanzhi(nowY), ng = yearGanzhi(nowY + 1);
  push(`올해와 다가오는 해 — 세운(歲運)`, `올해는 ${yg} 해라오. ${cd ? `${cd.shishen} 대운의 결 위에 한 해의 기운이 얹히니, ` : ''}무겁게 밀어붙이기보다 결을 맞춰 한 박자 고른 뒤 나아감이 마땅하오. 봄에 씨를 고르고, 여름에 부지런히 키워, 가을에 거두는 마음이면 그르치지 않으리다.\n이듬해 ${nowY + 1}년은 ${ng} 해이니, 올해 다진 바를 매듭짓고 한 걸음 더 내딛기에 좋소. 미루어 둔 약속과 글자를 또렷이 하고, 사람과의 신의를 새로이 다지면 좋은 기별이 따르리다.`);
  push('사계절의 리듬 — 언제 무엇을 할까', `봄(寅卯辰)엔 새 일을 펴고 사람을 모으며, 여름(巳午未)엔 드러내고 알리시오. 가을(申酉戌)엔 거두고 매듭지으며, 겨울(亥子丑)엔 갈무리하고 쉬며 다음을 준비하시게. 그대의 용신 ${ys.element}이 드는 철엔 특히 일이 순하게 풀린다오.`);
  chap('제6장 — 신살과 비방(秘方)', '타고난 무늬와, 살림에 쓰는 지혜');
  push('신살(神煞) 풀이', `${s.sinsal.length ? '그대 명에 든 신살은 — ' + s.sinsal.map((x) => `${x.name}(${x.mean})`).join(', ') + '이라오. 신살은 길흉을 정하는 족쇄가 아니라, 그대 기운의 빛깔을 일러주는 무늬일 뿐이니 두려워 말고 살려 쓰시게.' : '두드러진 신살은 없으니, 외려 기운이 고르고 담백한 명이라 할 수 있소.'} 공망(空亡)은 ${s.gongmang}이라, 그 자리에선 너무 큰 기대보다 마음을 비우는 편이 이롭다오.`);
  push('비방(秘方)과 마음가짐 — 오래 지닐 지혜', `하나, 미뤄 둔 한 가지를 이레 안에 매듭지으시게(강한 ${o.dominant}을 결실로 돌리는 길이오). 둘, 용신 ${ys.hanja}(${ys.element})의 기운을 채우는 습을 하나 들이시오 — ${ohaengRemedy(ys.element)}. 셋, 큰 결정은 충분히 잔 다음 날 아침에 내리시게. 그대의 ${dm.ohaeng} 기운은 새벽에 가장 맑다오.\n오래 지닐 말 셋도 함께 두오 — 넘치는 ${o.dominant}은 베풀고 옅은 ${ys.element}은 채우라. 사람을 곳간처럼 아끼라, 귀인은 거기서 난다. 급할수록 한 박자 고르라, 그대의 결단은 서두르지 않을 때 가장 바르다.`);

  chap('발(跋) — 글을 맺으며', '그대에게 부치는 마지막 한마디');
  push('맺음말 — 왕후의 편지', `${s.input.name}, 그대의 명은 모자람이 아니라 '치우침'일 뿐이라네. 넘치는 곳은 덜고 옅은 곳은 채우면, 명은 절로 둥글어진다오. 오늘 그대가 물은 "${q || '앞날의 흐름'}"도, 결국 그대가 제 결을 알고 때를 고를 때 가장 환히 열리리다. 이 한 권을 곳간에 간직하듯 지니고, 흔들리는 밤마다 펼쳐 보시게. 내, 그대의 앞길에 오래도록 볕이 들기를 진심으로 바라오.`);

  return sec;
}
function careerKo(dmO, dom) {
  return ({ 목: '기획하고 가르치고 키우는 일,', 화: '드러내고 알리고 표현하는 일,', 토: '중개하고 신뢰를 쌓고 관리하는 일,', 금: '판단하고 매듭짓고 다루는 일,', 수: '연구하고 설계하고 흐름을 읽는 일,' })[dmO] || '제 결에 맞는 일,';
}

/* ── 영어 장문 ── */
const OHE = {
  목: { trait: 'Wood rises and unfolds like a tree.', strong: 'It runs thick in you, so you start things and gather people with ease — yet prune the branches when they grow too dense.', weak: 'It is a little thin, so steady yourself once more before beginning anew.', none: 'It is empty, so keep learning and new beginnings deliberately near you.' },
  화: { trait: 'Fire brightens and reveals.', strong: 'Your light is bright, drawing warmth and favor — but spare the flame, for it tires quickly when it blazes.', weak: 'Warmth is thin; sunlight and laughter with others are your remedy.', none: 'Fire is empty; when the heart sinks, seek warm places and warm people.' },
  토: { trait: 'Earth embraces and holds the center.', strong: 'Trust and endurance are deep — but lift yourself now and then, lest weight make you slow.', weak: 'The center is thin; not skipping meals or sleep is itself a great help.', none: 'Earth is empty; one daily rhythm will firm your roots.' },
  금: { trait: 'Metal concludes and decides.', strong: 'You conclude clearly and harvest well — but soften your words, lest a sharp edge cut those near you.', weak: 'Resolve is thin; practice not delaying the finish.', none: 'Metal is empty; keep a habit of tidying and finishing close at hand.' },
  수: { trait: 'Water flows and reflects deeply.', strong: 'Wisdom runs deep — but move your body so the water does not pool into over-thinking.', weak: 'Water is thin; ample sleep and water clear the mind.', none: 'Water is empty; set aside a handful of quiet reflection each day.' },
};
const SS5E = {
  비겁: { has: 'Companion/Rival stars are present, so you have firm will and strong bonds with peers — hold a little space to step back, lest stubbornness push others away.', no: 'These stars are thin; share the load with people rather than carrying all alone.' },
  식상: { has: 'Output stars are present, so expression, talent and good fortune of plenty follow — shine in word and craft, and curb friction with elders.', no: 'Output is thin; do not keep it all within — express even one line, and a path opens.' },
  재성: { has: 'Wealth stars are present, so you can earn and hold by your own hand — coffers fill in the year of precise small promises, not the big gamble.', no: 'Wealth stars are hidden; put trust in people first, and wealth follows.' },
  관성: { has: 'Officer stars are present, so duty and title seek you, and order becomes a blessing — your vessel grows where you accept the seat you feared.', no: 'Officer stars are thin; building your own domain suits you more than serving under others.' },
  인성: { has: 'Resource stars are present, so learning, documents and benefactors favor you — credentials become your steady backing.', no: 'Resource stars are thin; learning shines when you cut your own path — keep one good teacher near.' },
};
const PILLARE = {
  year: { dom: 'roots · ancestry · early years', txt: 'The Year pillar is the root you stand upon and the ground of your childhood.' },
  month: { dom: 'parents · youth · society', txt: 'The Month pillar is the seat of parents and the gate by which you step into the world.' },
  day: { dom: 'self · partner', txt: 'The Day pillar is you yourself, and the seat of the one who walks beside you.' },
  hour: { dom: 'children · later years', txt: 'The Hour pillar is the seat of children, old age, and the harvest you leave behind.' },
};
function buildLongEn(s, q) {
  const dm = s.dayMaster, o = s.ohaeng, P = s.pillars, cd = s.currentDaeun, ys = dm.yongsin;
  const sec = []; const push = (t, b) => sec.push({ t, b });
  const chap = (t, sub) => sec.push({ ch: true, t, b: sub || '' });
  const grp = presentGroups(s); const nowY = new Date().getFullYear();
  const y = dm.eumyang === '양' ? 'Yang' : 'Yin';

  chap('Preface — Opening Your Destiny', 'a word before the reading begins');
  push('A Word to You', `${s.input.name}, I welcome you who have come the long way to this seat. With a heart that holds you dear, I have set down — letter by letter — your given destiny and the fortune that flows. Keep it near, and unfold it whenever you waver. This is not fortune-telling but a mirror borrowed from the reasoning of Myeongri.`);
  push('Your Saju at a Glance', `Your chart is Year ${P.year.hanja} · Month ${P.month.hanja} · Day ${P.day.hanja}${P.hour ? ' · Hour ' + P.hour.hanja : ''}. Your Day Master is ${y} ${OHAENG_EN[dm.ohaeng]} (${dm.hanja}); its strength is '${STRENGTH_EN[dm.strength] || dm.strength}' (${dm.strengthScore}%), and your useful element to feed is ${OH_HAN[ys.element]} (${OHAENG_EN[ys.element]}). The Five Elements stand Wood ${o.count.목}, Fire ${o.count.화}, Earth ${o.count.토}, Metal ${o.count.금}, Water ${o.count.수} — ${OHAENG_EN[o.dominant]} thick and ${OHAENG_EN[o.weakest]} thin.`);
  chap('Chapter 1 — Who You Are', 'the vessel you were born with');
  push('The Day Master — Who You Are', `The Day Master is 'you' within the chart. Born ${y} ${OHAENG_EN[dm.ohaeng]}, you stand at the heart of ${dmDescEn(dm.ohaeng)}. Those near you may say, "firm without, warm within." Know and tend both grains in yourself, and people and work grow gentler around you.`);
  ['목', '화', '토', '금', '수'].forEach((el) => {
    const c = o.count[el];
    const b = c >= 2 ? OHE[el].strong : (c === 0 ? OHE[el].none : OHE[el].weak);
    push(`Five Elements — ${OHAENG_EN[el]} (${OH_HAN[el]})`, `${OHE[el].trait} In your chart ${OHAENG_EN[el]} holds ${c} place(s), so ${b}${el === ys.element ? ` This ${OHAENG_EN[el]} is your useful element — the more you feed it, the rounder your destiny grows.` : ''}`);
  });
  chap('Chapter 2 — The Weave of Energy', 'strength, the useful element, and the Ten Gods');
  push('Strength and the Useful Element', `Weighing the Day Master, it is '${STRENGTH_EN[dm.strength] || dm.strength}' (support ${dm.strengthScore}%). ${ys.reason} If strong, drain to let it flow; if weak, prop it to stand — so keeping ${OHAENG_EN[ys.element]} near is your lifelong tonic. In practice: ${REMEDY_EN[ys.element]}.`);
  ['비겁', '식상', '재성', '관성', '인성'].forEach((g) => push(`Ten Gods — ${({ 비겁: 'Companion group', 식상: 'Output group', 재성: 'Wealth group', 관성: 'Officer group', 인성: 'Resource group' })[g]}`, grp.has(g) ? SS5E[g].has : SS5E[g].no));
  chap('Chapter 3 — The Four Pillars', 'a lifetime held in Year, Month, Day and Hour');
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = P[k];
    if (!p) { push('Pillar — Hour', 'Your birth time is unknown, so the Hour pillar is left empty. When you learn it, return here and the grain of children and later years will sharpen.'); return; }
    const nm = { year: 'Year', month: 'Month', day: 'Day', hour: 'Hour' }[k];
    push(`Pillar — ${nm} · ${PILLARE[k].dom}`, `${PILLARE[k].txt} Here sits ${p.hanja}; the stem is ${OHAENG_EN[p.ohaeng]}, the branch ${p.hanja[1]} (${OHAENG_EN[p.jiOhaeng]}), and by the Twelve Stages it carries the grain of '${DI_EN_R[p.dishi] || p.dishi}'. Keep what this seat tells you.`);
  });
  chap('Chapter 4 — The Places of Life', 'wealth, work, honor, study, love, family, health, people');
  push('The Path of Wealth', `Wealth is read through Wealth and Output stars. ${grp.has('재성') ? 'You can earn and hold by your own hand,' : 'Steady gathering suits you better than the big strike,'} ${grp.has('식상') ? 'and your craft flows into income.' : 'and trust in people lets wealth follow.'} Coffers fill in the year of precise small promises, not impulsive large moves.`);
  push('Work and Vocation', `By your ${OHAENG_EN[dm.ohaeng]} Day Master and thick ${OHAENG_EN[o.dominant]}, ${careerEn(dm.ohaeng)} ${grp.has('관성') ? 'Officer stars favor organizations and titles,' : 'with thin Officer stars, building your own domain suits you,'} ${grp.has('식상') ? 'and you shine where talent is shown.' : 'and trust grows where you steadily accumulate.'}`);
  push('Honor and Standing', `Officer and Resource stars are the grain of honor. ${grp.has('관성') || grp.has('인성') ? 'With the favor of documents and office, your name rises where you accept the charge given you.' : 'Cut your own path and prove by skill; the name comes slower but stands firmer.'} ${cd ? `The ${ssEn(cd.shishen)} Luck Pillar now lights this — ${shishenFlowEn(cd.shishen)}` : ''}`);
  push('Study and Documents', `Resource is the star of learning and credentials. ${grp.has('인성') ? 'Their favor is thick, so credentials and examinations bear fruit.' : 'Learning shines when self-driven; keep one good teacher near.'} Weigh large decisions and contracts on the morning after full sleep.`);
  push('Love and Marriage', `The partner's seat is the Day Branch, ${P.day.hanja[1]}. ${s.sinsal.some((x) => x.name === '도화살') ? 'A Peach-Blossom charm draws people — yet do not take a bond lightly.' : 'You last with one whose inner grain matches, more than the dazzling match.'} Beside the one who reads your silences, your heart settles.`);
  push('Family and Children', `${P.hour ? `By the Hour pillar ${P.hour.hanja}, the seat of children and later years carries ${P.hour.jiShishen.join('·') || OHAENG_EN[P.hour.ohaeng]}.` : 'With the time unknown, the seat of children waits for another day.'} Home returns what you give; one warm word rounds the household's energy.`);
  push('Health and Body', `${OHAENG_EN[o.weakest]} runs thin, which governs ${bodyEn(o.weakest)}. When signs come after overexertion, take them as the body's message and rest. Holding work late and sinking the next day is the very place balance has broken.`);
  push('People and Benefactors', `${s.sinsal.some((x) => x.name === '천을귀인') ? 'A "Heavenly Noble" benefactor sits in your chart, so at each crossing a helping hand reaches out — honor people, and that blessing thickens.' : 'Benefactors are not far; they arise among those with whom you have kept faith.'} The kindness you give becomes your fence; treasure people as a storehouse.`);
  chap('Chapter 5 — The Flow of Fortune', 'the decade pillars and the year ahead');
  s.daeun.slice(0, 5).forEach((d) => push(`Luck Pillar — from age ${d.age} (${d.hanja})`, `From age ${d.age}, a decade of ${d.hanja} arrives. By the Ten Gods it is ${ssEn(d.shishen)}, so ${shishenFlowEn(d.shishen)} In life — ${shishenSceneEn(d.shishen)}${cd && d.age === cd.age ? ' This is the very time you now pass through.' : ''}`));
  const yg = yearGanzhi(nowY), ng = yearGanzhi(nowY + 1);
  push(`The Year Ahead — ${nowY} & ${nowY + 1}`, `This year is ${yg}. ${cd ? `Upon the grain of the ${ssEn(cd.shishen)} Luck Pillar, ` : ''}rather than forcing, align and take one measured beat before moving. Choose seed in spring, tend in summer, harvest in autumn — and you will not go astray.\nNext year, ${nowY + 1}, is ${ng}: a good time to conclude what you firmed this year and step one pace further. Make promises and documents precise and renew faith with people, and good word follows.`);
  push('The Rhythm of the Seasons', `In spring (寅卯辰) unfold new work and gather people; in summer (巳午未) reveal and announce; in autumn (申酉戌) harvest and conclude; in winter (亥子丑) store, rest and prepare. In the season your useful element ${OHAENG_EN[ys.element]} enters, matters run especially smooth.`);
  chap('Chapter 6 — Patterns and Remedies', 'the marks you carry, and the wisdom to use them');
  push('Sinsal — the Patterns', `${s.sinsal.length ? 'The sinsal in your chart are — ' + s.sinsal.map((x) => `${x.name} (${x.mean})`).join(', ') + '. They are not shackles of fortune but patterns marking the color of your energy; do not fear them, but use them.' : 'No marked sinsal stand out — yours is rather an even, clear-grained destiny.'} Your Void (空亡) is ${s.gongmang}; in that seat, empty your expectations rather than raise them high.`);
  push('Remedies and Things to Keep', `First, finish within seven days the one thing you have put off (turning your strong ${OHAENG_EN[o.dominant]} into harvest). Second, take up one habit feeding your useful element ${OHAENG_EN[ys.element]} — ${REMEDY_EN[ys.element]}. Third, make large decisions on the morning after full sleep; your ${OHAENG_EN[dm.ohaeng]} is clearest at dawn.\nAnd three words to keep long — give of your abundant ${OHAENG_EN[o.dominant]} and feed your thin ${OHAENG_EN[ys.element]}; treasure people as a storehouse, for benefactors arise there; the more urgent the matter, the more you should take one beat, for your resolve is truest unhurried.`);
  chap('Postscript — In Closing', 'a last word, sent to you');
  push('A Closing Letter', `${s.input.name}, your destiny is not lacking but leaning. Lift from where it overflows and feed where it runs thin, and it rounds itself out. The very thing you asked — "${q || 'the flow ahead'}" — opens brightest when you know your own grain and choose your time. Keep this booklet as grain in the storehouse, and unfold it on the nights you waver. May the light fall long upon your road.`);
  return sec;
}
function careerEn(dmO) {
  return ({ 목: 'work that plans, teaches and grows fits you;', 화: 'work that reveals, announces and expresses fits you;', 토: 'work that mediates, builds trust and manages fits you;', 금: 'work that judges, concludes and handles fits you;', 수: 'work that researches, designs and reads the current fits you;' })[dmO] || 'work that fits your grain;';
}
const DI_EN_R = { 장생: 'Growth', 목욕: 'Bath', 관대: 'Cap', 건록: 'Officer', 제왕: 'Peak', 쇠: 'Decline', 병: 'Sickness', 사: 'Death', 묘: 'Tomb', 절: 'Severance', 태: 'Womb', 양: 'Nurture' };
function shishenSceneEn(ss) {
  return ({ 비견: 'a venture or team where you build together bears fruit', 겁재: 'in big-deal years, read even the fine print to avoid trouble', 식신: 'your craft spreads by word of mouth and opportunity grows', 상관: 'you shine by word and pen — curb friction with elders and your name rises', 편재: 'work turned outward returns as wealth', 정재: 'holding your post, the coffers fill', 편관: 'taking a charge you feared, you are greatly recognized', 정관: 'an upright fruit like promotion or passing arrives', 편인: 'a credential or expertise opens the way', 정인: 'a referral or document smooths the path' })[ss] || 'what you tend ripens into harvest';
}

module.exports = { freeReading, paidReading, sajuDeepBrief };
