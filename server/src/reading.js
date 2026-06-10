'use strict';
/**
 * reading.js — 사주 데이터 → 무료 맛보기 / 유료 심층(왕후 어투)
 * 조선 왕후(중전마마)의 어투로, 사주 근거 + '실제 삶에서 이렇게 드러난다'는
 * 구체적 장면 예시를 담는다. AI 키가 있으면 Claude(Opus 4.8), 없으면 데이터 기반 mock.
 */
const ai = require('./ai');
const { shishenOf } = require('./saju');

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
[Compose] Write a 'free preview' in the warm, friendly voice of a Joseon queen.
- Three short paragraphs, at most 2 sentences each (6 sentences total).
- (1) define the vessel by the Day Pillar ${saju.pillars.day.hanja}, painting it as one pictorial image (e.g. 'a tall tree standing on the tiger's mountain in early spring') (2) one scene of the present flow (current Luck Pillar / dominant element) (3) gracefully hint that deeper secrets are revealed in the in-depth reading.
- No ad copy, no markdown. Natural, gently old-world English prose.`
    : `[사주]\n${sajuDeepBrief(saju)}\n
[명하노라] 위 사주로 '무료 맛보기'를 짓되, 친근한 조선시대 말투로 하라.
- 세 단락, 각 2문장 이내(총 6문장 이내).
- ① 일주 ${saju.pillars.day.hanja}를 물상(예: '큰 나무가 이른 봄 호랑이 산에 우뚝 선 격') 한 폭으로 그려 그릇을 정의 ② 지금 흐름(현재 대운/강한 기운)의 한 장면 ③ 더 깊은 천기는 '심층'에서 밝혀짐을 품위 있게 암시.
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
○ How to Read This Book (plainly explain Saju, Five Elements, Ten Gods, Luck Pillars for a first-time reader; use '▷ term — meaning' lines for definitions)
○ Your Saju at a Glance
○ The Day Master — Who You Are
○ Your Day Pillar — a Portrait (paint the Day Pillar ${saju.pillars.day.hanja} in the pictorial Mulsang way)
○ Your Zodiac Year (the birth-year animal's broad grain)
○ Light and Shadow of Character
○ Talent and Aptitude
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
○ Before Reading the Four Pillars
○ Pillar — Year (roots, early years)
○ Pillar — Month (parents, society)
○ Pillar — Day (self, partner)
○ Pillar — Hour (children, later years)
○ The Eight Characters, One by One ('▷' lines per stem and branch)
○ The Path of Wealth
○ Work and Vocation
○ Honor and Standing
○ Study and Documents
○ Love and Marriage
○ Family and Children
○ Health and Body
○ People and Benefactors
○ The Wisdom of Relationships
○ Earning and Keeping Wealth
${decadeLines}
○ By Area — This Year (wealth / work / love / health / movement with '▷' lines)
○ The Twelve Months (month-by-month '▷' lines by the branch energies)
○ The Year Ahead (name this and next year's stems and their Ten God vs the Day Master)
○ The Rhythm of the Seasons
○ Good Years and Cautionary Years
○ Sinsal — the Patterns
○ Remedies and Things to Keep
○ This Year in Summary
○ A Small Glossary to Keep ('▷ term — meaning' lines, filled with this person's actual values)
○ A Closing Letter`
    : `[사주]\n${sajuDeepBrief(saju)}\n
[그대의 물음] ${q || '(따로 묻지 않음 — 명 전반을 살펴라)'}\n
[명하노라] 아래 항목을 모두, '친근하되 위엄 있는 조선시대 말투'로 길고 상세하게 지어라(이 글은 30쪽 이상의 책으로 엮느니라). 각 항목 제목을 '○ 제목' 형식으로 그대로 쓰고 빈 줄로 나누라. 모든 항목을 넉넉히(4~8문장) 채우되, 매 항목마다 (1)사주 근거(십성·오행·운성·대운·신살을 콕 집어) → (2)"그 기운이 삶에서 이렇게 드러난다오" 하는 구체적 장면 1~2개를 곁들여라. 다정하게 '그대'라 부르고, 마크다운 기호 금지.

○ 머리말 — 그대에게
○ 이 책을 읽는 법 (처음 보는 이를 위해 사주·오행·십성·대운을 쉬운 말로 풀고, 용어는 '▷ 용어 — 뜻' 줄로 적으라)
○ 사주 한눈에
○ 일간(日干) — 그대라는 사람
○ 일주(日柱) 물상 — ${saju.pillars.day.hanja}로 본 그대의 초상 (물상法으로 일주를 한 폭의 그림처럼 그려라)
○ 띠 풀이 — 태어난 해의 띠로 본 큰 결
○ 성정의 빛과 그늘
○ 재능과 적성
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
○ 네 기둥을 읽기 전에
○ 기둥 풀이 — 년주(뿌리·초년)
○ 기둥 풀이 — 월주(부모·사회)
○ 기둥 풀이 — 일주(나·배우자)
○ 기둥 풀이 — 시주(자식·말년)
○ 여덟 글자 낱낱이 풀이 ('▷' 줄로 천간·지지 하나씩)
○ 재물의 길
○ 일과 직업
○ 명예와 자리
○ 학업과 문서
○ 사랑과 혼인
○ 가정과 자식
○ 건강과 몸
○ 사람과 귀인
○ 관계의 지혜
○ 재물을 모으고 지키는 법
${decadeLines}
○ 분야별 올해의 운 (재물/일/애정/건강/이동을 '▷' 줄로)
○ 열두 달의 흐름 (달별 기운을 '▷' 줄로)
○ 올해와 다가오는 해 — 세운 (올해·내년 천간의 십성을 일간에 견주어 짚으라)
○ 사계절의 리듬
○ 좋은 해와 주의할 해
○ 신살(神煞) 풀이
○ 비방(秘方)과 마음가짐
○ 올해의 운세 총평
○ 간직할 작은 낱말집 ('▷ 용어 — 뜻' 줄로, 이 사람의 실제 값을 채워서)
○ 맺음말 — 왕후의 편지`;
  try {
    const text = await ai.generate(en ? SYSTEM_EN : SYSTEM, user, { maxTokens: 24000 });
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
  const d = s.pillars.day;
  const img = GAN_IMAGE[d.hanja[0]], scn = JI_SCENE[d.hanja[1]];
  const iljuLine = img && scn ? ` 물상으로 그리면, ${img.ko}가 ${scn.ko} 격이라네.` : '';
  return [
    `그대의 명을 펼쳐 보니, ${d.hanja}(${d.han}) 일주로 태어났구려.${iljuLine} ${dm.desc.replace(/의 기운$/, '')}을 본바탕으로 삼은 사람이오.`,
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
  const d = s.pillars.day;
  const img = GAN_IMAGE[d.hanja[0]], scn = JI_SCENE[d.hanja[1]];
  const iljuLine = img && scn ? ` In the old pictorial way, you are ${img.en}, ${scn.en}.` : '';
  return [
    `Looking upon your chart, you were born under the Day Pillar ${d.hanja}.${iljuLine} At your center is ${dmDescEn(dm.ohaeng)}.`,
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
const GEN_BY_R = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' }; // E를 낳는 오행
const SHENG_R = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // E가 낳는 오행
function supportsDM(dmO, e) { return e === dmO || GEN_BY_R[dmO] === e; } // 일간을 돕는 기운(비겁·인성)
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
/* 십성 한자·다스리는 영역·두 별 풀이 (KO) */
const SS_HAN = { 비겁: '比劫', 식상: '食傷', 재성: '財星', 관성: '官星', 인성: '印星' };
const SS_GOV = { 비겁: '주체성과 경쟁, 동료의 인연', 식상: '표현과 재능, 의식주(衣食住)', 재성: '재물과 현실, 이성(異性)의 인연', 관성: '명예와 직책, 규율과 책임', 인성: '학문과 문서, 보살핌과 인덕' };
const SS_SUB = {
  비겁: [['비견(比肩)', "'어깨를 나란히 한다'는 뜻이라오. 나와 같은 오행에 음양도 같은 기운으로, 형제·동료·동업자, 그리고 '제 힘으로 서려는 나'를 가리키오. 주관이 또렷하고 독립심이 강하나, 지나치면 고집이 되오."], ['겁재(劫財)', "'재물을 빼앗는다'는 뜻이라오. 나와 같은 오행이되 음양이 다른 기운으로, 강한 추진력과 승부욕을 주오. 다만 재물의 드나듦이 잦으니, 동업과 돈거래엔 셈을 또렷이 해야 하오."]],
  식상: [['식신(食神)', "'먹여 주는 신'이라는 뜻이라오. 내가 낳아 베푸는 기운으로, 여유·표현·재능, 그리고 먹을 복을 주오. 성정이 너그럽고 즐길 줄 아는 사람이오."], ['상관(傷官)', "'관(벼슬)을 상하게 한다'는 뜻이라오. 빼어난 재주와 언변을 주되, 틀과 규범에 매이기를 싫어하오. 재능으로 빛나되 입과 글을 한 번 더 다스리면 탈이 없소."]],
  재성: [['편재(偏財)', "'치우친 재물'이라오. 크게 움직이는 활동적 재물·사업·기회·바깥 인연을 이르니, 수완 좋고 통이 큰 기운이오."], ['정재(正財)', "'바른 재물'이라오. 성실히 모으는 안정적 재물이며, 살림을 알뜰히 꾸리는 기운이오. 남자에게는 배우자의 별이기도 하오."]],
  관성: [['편관(偏官)', "칠살(七殺)이라고도 하는 '치우친 벼슬'이라오. 도전·압박·결단·위엄을 주니, 두려워 피하지 않고 넘기면 도리어 큰 그릇이 되오."], ['정관(正官)', "'바른 벼슬'이라오. 명예·직책·규범·책임을 이르며 반듯한 처신을 주오. 여자에게는 배우자의 별이기도 하오."]],
  인성: [['편인(偏印)', "'치우친 도장'이라오. 직관·전문·임기응변을 주되, 더러 외로움과 별난 기질이 따르기도 하오."], ['정인(正印)', "'바른 도장'이라오. 학문·문서·자격, 그리고 어머니의 음덕과 인덕을 이르니, 배우고 보살핌받는 복이 두텁소."]],
};

/* 기둥 영역 (KO) */
const PILLARK = {
  year: { dom: '뿌리·조상·초년운', txt: '년주는 그대가 딛고 선 뿌리와 어린 시절의 바탕이라오.' },
  month: { dom: '부모·청년·사회운', txt: '월주는 부모의 자리이자 그대가 사회로 나아가는 문이구려.' },
  day: { dom: '나·배우자운', txt: '일주는 그대 자신이자 평생을 함께할 짝의 자리라네.' },
  hour: { dom: '자식·말년운', txt: '시주는 자식과 노년, 그리고 그대가 남길 결실의 자리오.' },
};

/* ── 일주(60갑자) 물상 — 일간 이미지 × 일지 풍경 조합 ── */
const GAN_IMAGE = {
  甲: { ko: '하늘로 곧게 뻗은 큰 나무', en: 'a tall, straight tree' },
  乙: { ko: '바람에 휘어도 꺾이지 않는 화초와 덩굴', en: 'a flowering vine that bends but never breaks' },
  丙: { ko: '만물을 비추는 한낮의 태양', en: 'the midday sun that lights all things' },
  丁: { ko: '어둠 속에서 더 또렷한 등불', en: 'a lamp that shines clearer in the dark' },
  戊: { ko: '비바람에도 흔들리지 않는 큰 산', en: 'a great mountain unmoved by storms' },
  己: { ko: '온갖 씨앗을 품어 기르는 기름진 밭', en: 'fertile farmland that nurtures every seed' },
  庚: { ko: '단단하게 벼려진 무쇠와 바위', en: 'forged iron and solid rock' },
  辛: { ko: '갈고 닦여 빛나는 보석', en: 'a gem polished to brilliance' },
  壬: { ko: '천 갈래 물을 받아들이는 큰 바다', en: 'a vast sea that receives a thousand streams' },
  癸: { ko: '땅을 적시는 봄비와 새벽이슬', en: 'spring rain and morning dew that quietly soak the earth' },
};
const JI_SCENE = {
  子: { ko: '한밤의 깊은 물가에 선', en: 'standing by deep water at midnight', ani: '쥐', aniEn: 'Rat' },
  丑: { ko: '한겨울 언 들녘에 뿌리내린', en: 'rooted in a frozen winter field', ani: '소', aniEn: 'Ox' },
  寅: { ko: '이른 봄 호랑이 산에 우뚝 선', en: 'standing tall on the tiger\'s mountain in early spring', ani: '호랑이', aniEn: 'Tiger' },
  卯: { ko: '봄 들판 가운데 깨어난', en: 'awakening in the middle of a spring meadow', ani: '토끼', aniEn: 'Rabbit' },
  辰: { ko: '봄비 머금은 용못 곁에 선', en: 'beside the dragon\'s pond swollen with spring rain', ani: '용', aniEn: 'Dragon' },
  巳: { ko: '초여름 햇살 든 길목에 선', en: 'at a sunlit crossroads of early summer', ani: '뱀', aniEn: 'Snake' },
  午: { ko: '한낮 말이 내달리는 벌판에 선', en: 'on the plain where horses run at noon', ani: '말', aniEn: 'Horse' },
  未: { ko: '늦여름 양 떼 노니는 언덕에 선', en: 'on a late-summer hill where sheep graze', ani: '양', aniEn: 'Goat' },
  申: { ko: '바위 골짜기 너른 터에 선', en: 'on broad ground in a rocky valley', ani: '원숭이', aniEn: 'Monkey' },
  酉: { ko: '가을걷이 끝난 곳간 앞에 선', en: 'before the storehouse after the autumn harvest', ani: '닭', aniEn: 'Rooster' },
  戌: { ko: '늦가을 산마루 망루에 선', en: 'on a watchtower at the late-autumn ridge', ani: '개', aniEn: 'Dog' },
  亥: { ko: '깊고 너른 강물 곁에 선', en: 'beside a deep, wide river', ani: '돼지', aniEn: 'Pig' },
};
/* 띠(12지) 성향 */
const ZODIAC_TRAIT = {
  쥐: { ko: '영민하고 셈이 밝아 어려운 때에도 살길을 찾아내는 재주가 있소. 다만 잔걱정이 많으니 마음을 너무 졸이지 마시게.', en: 'quick-witted and resourceful, you find a way through even hard times — only do not fret over every small thing.' },
  소: { ko: '근면하고 끈기가 도타워, 남들이 포기한 자리에서도 끝내 결실을 거두오. 다만 고집이 황소 같으니 한 번씩 곁의 말도 들으시게.', en: 'diligent and enduring, you harvest where others gave up — only your stubbornness is ox-like, so lend an ear now and then.' },
  호랑이: { ko: '용맹하고 추진이 빨라 앞장서는 자리가 어울리오. 다만 성급함이 흠이 되기 쉬우니, 큰일일수록 한 박자 고르시게.', en: 'brave and fast-driving, the front suits you — only haste can become a flaw, so take one beat before great matters.' },
  토끼: { ko: '온화하고 눈치가 빨라 사람들 사이를 부드럽게 잇는 재주가 있소. 다만 갈등을 피하려다 제 몫을 놓치지 마시게.', en: 'gentle and perceptive, you knit people together — only do not lose your share by avoiding every conflict.' },
  용: { ko: '포부가 크고 기상이 높아 무리의 으뜸이 될 그릇이오. 다만 눈이 높은 만큼 발밑의 작은 일도 귀히 여기시게.', en: 'grand in ambition and high in spirit, a vessel fit to lead — only as your eyes are high, honor the small things at your feet.' },
  뱀: { ko: '지혜롭고 직관이 깊어 남이 못 보는 결을 읽어내오. 다만 속을 잘 내보이지 않으니, 믿을 이에겐 마음을 여시게.', en: 'wise and deeply intuitive, you read what others miss — only you seldom show your depths, so open to the trustworthy.' },
  말: { ko: '활달하고 자유로워 매인 자리보다 달리는 자리에서 빛나오. 다만 멀리 가려거든 쉼표도 함께 찍으시게.', en: 'lively and free, you shine where you can run — only to go far, mark your rests as well.' },
  양: { ko: '온순하고 정이 많아 예(藝)와 보살핌에 재주가 있소. 다만 남 챙기다 제 곳간이 비지 않게 하시게.', en: 'gentle and affectionate, gifted in art and care — only do not empty your own storehouse tending others.' },
  원숭이: { ko: '재치 있고 손재주가 빼어나 무엇이든 빨리 익히오. 다만 재주를 믿고 마무리를 가벼이 말 것이오.', en: 'witty and deft, you learn anything fast — only do not let talent make you light with the finish.' },
  닭: { ko: '꼼꼼하고 표현이 분명해 일을 빈틈없이 매조지오. 다만 바른말이 모진 말로 들리지 않게 다듬으시게.', en: 'meticulous and articulate, you finish without gaps — only polish your right words so they do not sound harsh.' },
  개: { ko: '충직하고 의리가 깊어 사람들이 그대를 믿고 기대오. 다만 옳고 그름에 너무 매여 스스로를 들볶지 마시게.', en: 'loyal and righteous, people lean on you with trust — only do not torment yourself by clinging too hard to right and wrong.' },
  돼지: { ko: '복덕이 두텁고 너그러워 사람과 재물이 절로 모이오. 다만 좋은 게 좋다 하다 셈이 흐려지지 않게 하시게.', en: 'thick in blessing and generous, people and wealth gather to you — only do not let easy goodwill blur your accounts.' },
};
/* 특수 일주 부가 풀이 */
const SPECIAL_ILJU = {
  괴강살: { ko: '또한 그대의 일주는 괴강(魁罡)이라 부르는 자리라오. 우두머리 별이 깃들어 결단과 카리스마가 남다르니, 어중간한 자리보다 책임을 통째로 맡는 자리에서 외려 빛나오. 다만 그 강함이 고집으로 비치지 않게, 부드러운 말 한 겹을 두르시게.', en: 'Your Day Pillar is also the seat called Goegang (魁罡) — the chieftain\'s star. Decision and charisma set you apart, so you shine brighter bearing full charge than in half-seats. Only wrap that strength in a layer of soft words, lest it read as stubbornness.' },
  백호살: { ko: '또한 그대의 일주에는 백호(白虎)의 기운이 깃들었소. 무서운 이름과 달리, 실은 한곳에 무섭게 파고드는 집중과 승부의 힘이라오. 큰일을 이루는 원동력이 되니 두려워 말되, 과로와 안전사고만은 각별히 살피시게.', en: 'Your Day Pillar also carries the White Tiger (白虎). Despite the fearsome name, it is in truth a fierce power of focus and contest that drives great works — do not fear it, only take special care against overwork and accidents.' },
};
function iljuKo(s) {
  const d = s.pillars.day;
  const img = GAN_IMAGE[d.hanja[0]], scn = JI_SCENE[d.hanja[1]];
  if (!img || !scn) return '';
  let t = `이제 예부터 내려오는 물상(物象)으로 그대의 일주를 그려 보리다. 그대의 일주 ${d.hanja}(${d.han})는, ${img.ko}가 ${scn.ko} 격이라오. 이 한 폭의 그림이 곧 그대가 세상에 선 모습이니, 곰곰이 들여다보시게.\n`;
  t += `일지 ${d.ji}(${scn.ani})는 ${d.jiOhaeng}(${OH_HAN[d.jiOhaeng]})의 땅이요 십이운성으로 '${d.dishi}'의 자리이니, ${DISHI_MEAN[d.dishi] || ''} 그대의 발밑이 그러한 기운 위에 놓였다는 뜻이라네. ${d.jiShishen.length ? `또 그 속에 ${d.jiShishen.join('·')}의 별을 품고 있어, 가장 가까운 자리(나와 배우자)의 살림이 이 별들의 결을 따라 흐르오.` : ''}`;
  const specials = s.sinsal.filter((x) => SPECIAL_ILJU[x.name]).map((x) => SPECIAL_ILJU[x.name].ko);
  if (specials.length) t += `\n${specials.join('\n')}`;
  return t;
}
function iljuEn(s) {
  const d = s.pillars.day;
  const img = GAN_IMAGE[d.hanja[0]], scn = JI_SCENE[d.hanja[1]];
  if (!img || !scn) return '';
  let t = `Now let me paint your Day Pillar in the old pictorial way (Mulsang). Your Day Pillar ${d.hanja} is the image of ${img.en}, ${scn.en}. This single picture is how you stand in the world — look into it slowly.\n`;
  t += `The Day Branch ${d.hanja[1]} (the ${scn.aniEn}) is ground of ${OHAENG_EN[d.jiOhaeng]} (${OH_HAN[d.jiOhaeng]}), and by the Twelve Stages it sits in '${DI_EN_R[d.dishi] || d.dishi}' — meaning the very ground beneath you carries that grain. ${d.jiShishen.length ? `Hidden within it are the stars of ${d.jiShishen.map((x) => SHISHEN_EN[x] || x).join(' and ')}, by whose grain the household of your closest seat — yourself and your partner — flows.` : ''}`;
  const specials = s.sinsal.filter((x) => SPECIAL_ILJU[x.name]).map((x) => SPECIAL_ILJU[x.name].en);
  if (specials.length) t += `\n${specials.join('\n')}`;
  return t;
}

function buildLongKo(s, q) {
  const dm = s.dayMaster, o = s.ohaeng, P = s.pillars, cd = s.currentDaeun, ys = dm.yongsin;
  const sec = []; const push = (t, b) => sec.push({ t, b });
  const chap = (t, sub) => sec.push({ ch: true, t, b: sub || '' });
  const grp = presentGroups(s);
  const nowY = new Date().getFullYear();
  const eumY = dm.eumyang === '양' ? '양(陽)' : '음(陰)';
  const OH_NATURE = { 목: '봄·어짊(仁)·간담과 눈', 화: '여름·예(禮)·심장과 피', 토: '환절기·믿음(信)·비위와 소화', 금: '가을·의로움(義)·폐와 피부', 수: '겨울·지혜(智)·신장과 뼈' };

  chap('서(序) — 명(命)을 펼치며', '그대의 타고난 바탕과 흐르는 운을 여는 글');
  push('머리말 — 그대에게', `${s.input.name}, 먼 길 돌아 이 자리에 앉은 그대를 반기오. 내 그대를 아끼는 마음으로, 타고난 명(命)과 흘러가는 운(運)을 한 자 한 자 적어 두었으니 부디 곁에 두고 흔들릴 때마다 펼쳐 보시게. 사주란 하늘이 정해 둔 족쇄가 아니라, 그대가 어떤 그릇으로 났고 어느 철에 무엇을 심으면 좋을지를 일러주는 농사의 책력 같은 것이라오. 좋은 사주, 나쁜 사주가 따로 있는 것이 아니라, 다만 저마다 두터운 곳과 옅은 곳이 다를 뿐이니, 그 결을 알고 다스리는 이가 곧 제 운의 주인이 되는 법이라네. 그러니 이 글을 읽고 두려워하지 말고, 외려 마음이 든든해지기를 바라오. 이 글은 점(占)이 아니라 명리(命理)의 이치를 빌려 그대의 결을 비추는 거울일 뿐이라오.`);
  push('이 책을 읽는 법', `이 책은 처음 사주를 보는 이도 따라올 수 있도록 엮었으니, 차근차근 읽으면 그만이라오. 어려운 한자말이 나오면 그 자리에 뜻풀이를 달아 두었으니, 모르는 말이 나와도 멈칫하지 마시게.\n▷ 명(命) — 타고난 바탕, 곧 사주 여덟 글자 그 자체라오. 바꿀 수 없는 '밭'에 비할 수 있소.\n▷ 운(運) — 시간을 따라 흐르는 기운으로, 십 년 단위의 대운과 한 해의 세운이 있소. 밭에 드는 '철과 날씨'라 보면 되오.\n먼저 제1장에서 사주의 기본 낱말을 익히고, 이어 제2장부터 그대의 글자를 하나하나 풀어 가리다. 한 장(章)을 다 읽거든 잠시 책을 덮고, 제 삶에 비추어 곱씹어 보시게 — 그리하면 글이 비로소 그대의 것이 된다오.`);
  push('사주 한눈에', `먼저 그대의 사주를 한눈에 펼쳐 보이리다. 그대의 여덟 글자는 ${s.pillarsText}라오. 그중 태어난 날의 천간, 곧 '나'를 가리키는 일간은 ${eumY}의 ${dm.ohaeng}(${dm.hanja})이니, ${dm.desc.replace(/의 기운$/, '')}을 본바탕으로 삼은 사람이구려. 일간의 힘은 '${dm.strength}'(부조세력 ${dm.strengthScore}푼)이요, 가장 옅어 채워야 할 요긴한 기운(용신)은 ${ys.hanja}(${ys.element})라네. 오행의 많고 적음은 목 ${o.count.목}, 화 ${o.count.화}, 토 ${o.count.토}, 금 ${o.count.금}, 수 ${o.count.수}로, ${o.dominant}이 가장 두텁고 ${o.weakest}이 가장 옅소. 이 한 줄 안에 그대의 성정과 강약, 그리고 평생 다스려야 할 과제가 모두 담겨 있으니, 아래 장에서 하나씩 풀어 가리다.`);

  chap('제1장 — 명리(命理)의 첫걸음', '처음 보는 이를 위한 쉬운 용어 풀이');
  push('사주(四柱)란 무엇인가', `사주(四柱)란 글자 그대로 '네 기둥'이라는 뜻이라오. 태어난 해·달·날·시(時) 이 넷을 각각 하나의 기둥으로 세우고, 기둥마다 하늘의 글자 하나와 땅의 글자 하나를 얹으니, 모두 여덟 글자가 되어 '팔자(八字)'라 부른다오. 흔히 "팔자가 사납다" 할 때의 그 팔자가 바로 이것이라네.\n▷ 천간(天干) — 하늘의 열 글자(갑·을·병·정·무·기·경·신·임·계). 겉으로 드러난 마음과 기상을 가리키오.\n▷ 지지(地支) — 땅의 열두 글자(자·축·인·묘·진·사·오·미·신·유·술·해), 곧 우리가 아는 열두 띠라오. 속에 감춘 바탕과 현실을 가리키오.\n그대의 여덟 글자는 ${s.pillarsText}이니, 이 글자들이 서로 돕고 누르는 어울림을 읽는 것이 곧 사주를 보는 일이라오.`);
  push('오행(五行)이란', `오행(五行)은 세상 만물을 이루는 다섯 가지 기운, 곧 나무(木)·불(火)·흙(土)·쇠(金)·물(水)이라오. 사람의 사주도 이 다섯 기운의 많고 적음으로 풀이하니, 어느 기운이 두터운가에 따라 성정과 재주가 갈린다네.\n▷ 상생(相生) — 서로 낳아 북돋움이라. 물이 나무를 키우고, 나무가 불을 피우며, 불이 흙을 이루고, 흙이 쇠를 품으며, 쇠가 다시 물을 낳으오.\n▷ 상극(相剋) — 서로 눌러 다스림이라. 나무는 흙을, 흙은 물을, 물은 불을, 불은 쇠를, 쇠는 나무를 누르오.\n이 낳고 누름의 이치로, 그대에게 무엇이 넘치고 무엇이 모자란지를 가늠하는 것이라오.`);
  push('십성(十星)이란', `십성(十星), 또는 십신(十神)이라 하는 것은, 일간(나)을 기준으로 다른 글자들이 '나와 맺는 관계'에 붙인 열 가지 이름이라오. 나를 돕는가, 내가 낳는가, 내가 누르는가에 따라 크게 다섯 무리로 나뉘니, 이 다섯만 알아도 사주의 절반은 읽은 셈이라네.\n▷ 비겁(比劫) — 나와 같은 오행(주체·경쟁·동료).\n▷ 식상(食傷) — 내가 낳아 베푸는 오행(표현·재능·의식주).\n▷ 재성(財星) — 내가 눌러 다루는 오행(재물·현실·이성).\n▷ 관성(官星) — 나를 누르는 오행(명예·직책·규율).\n▷ 인성(印星) — 나를 낳아 주는 오행(학문·문서·보살핌).\n이 열 별의 많고 적음이, 그대가 무엇에 강하고 무엇이 비었는지를 또렷이 일러준다오.`);
  push('대운(大運)과 세운(歲運)', `타고난 사주가 '밭'이라면, 운(運)은 그 밭에 드는 '철과 날씨'라 하였소. 같은 씨앗도 봄에 심으면 살고 한겨울에 심으면 얼어 죽으니, 사주는 '무엇을 타고났나'와 '언제 움직일까'를 함께 보아야 비로소 온전해진다오.\n▷ 대운(大運) — 열 해마다 갈마드는 큰 흐름이라, 인생의 큰 계절이라 할 수 있소.\n▷ 세운(歲運) — 해마다 바뀌는 한 해의 기운이라오.\n그러니 운이 좋다 나쁘다 가르기보다, '이 철엔 무엇을 심고 무엇을 거둘까'를 헤아리는 것이 지혜라네.`);
  push('신강·신약, 용신, 그리고 신살', `끝으로 자주 나올 세 낱말을 미리 풀어 두리다.\n▷ 신강(身强)·신약(身弱) — 일간(나)의 힘이 센지 약한지를 이르오. 나를 돕는 기운(비겁·인성)이 많으면 신강, 적으면 신약이라 하오. 어느 쪽이 더 좋은 것은 아니니, 다만 다스리는 법이 다를 뿐이라오.\n▷ 용신(用神) — 사주의 치우침을 고르게 만들어 주는, 가장 요긴한 기운이라오. 신강이면 힘을 덜어 주는 기운이, 신약이면 보태 주는 기운이 용신이 되니, 평생 가까이할 '나의 보약'인 셈이라네.\n▷ 신살(神煞) — 특정 글자들이 만났을 때 생기는 '무늬'로, 역마(이동)·도화(매력)·화개(예술)·천을귀인(귀인) 따위가 있소. 길흉의 족쇄가 아니라 기운의 빛깔이라 여기시게.`);

  chap('제2장 — 그대라는 사람', '일간과 오행으로 본 타고난 그릇');
  push('일간(日干) — 그대라는 사람', `일간(日干)이란 태어난 '날의 천간'으로, 사주 여덟 글자 가운데 '나' 자신을 가리키는 가장 으뜸가는 글자라오. 그대의 일간은 ${dm.hanja}(${dm.gan}), 곧 ${eumY}의 ${dm.ohaeng}(${OH_HAN[dm.ohaeng]})이니, ${dm.desc} 한가운데에 선 사람이구려. ${shishenLife((s.shishen.month || s.shishen.year || '비견'))}\n곁의 이들은 그대를 두고 "겉은 단단한데 속은 정이 많다" 말하기 쉽소. 삶의 장면으로 이르자면 — 좀처럼 속을 다 내보이지 않다가도, 정작 아끼는 이가 어려움에 처하면 제 일을 제쳐 두고 달려가는 사람이 바로 그대라네. 그 두 결, 곧 단단함과 다정함을 그대 스스로 알고 다독이면, 사람과 일이 한결 순해지리다.`);
  push(`일주(日柱) 물상 — ${P.day.hanja}(${P.day.han})로 본 그대의 초상`, iljuKo(s));
  push(`띠 풀이 — ${s.zodiac}띠로 본 그대`, `사주만큼 깊지는 않으나, 태어난 해의 지지 곧 '띠'에도 그 사람의 큰 결이 담긴다오. 그대는 ${s.zodiac}띠로 났으니, ${(ZODIAC_TRAIT[s.zodiac] || {}).ko || '그 해의 기운을 고스란히 받은 사람이라오.'}\n띠는 같은 해에 난 모두가 나누어 가지는 큰 바탕이요, 그 위에 그대만의 여덟 글자가 얹혀 비로소 그대가 되는 것이니 — 띠 풀이는 큰 밑그림으로, 사주 풀이는 그 위에 그려진 세필(細筆)로 읽으면 꼭 맞다오.`);

  ['목', '화', '토', '금', '수'].forEach((el) => {
    const c = o.count[el];
    const b = c >= 2 ? OHK[el].strong : (c === 0 ? OHK[el].none : OHK[el].weak);
    push(`오행 풀이 — ${el}(${OH_HAN[el]})`, `▷ ${el}(${OH_HAN[el]}) — ${OH_NATURE[el]}을 주관하는 기운이라오.\n${OHK[el].trait} 그대 명에 ${el}은 여덟 글자 중 ${c}자리를 차지하니, ${b}${el === ys.element ? ` 무엇보다 이 ${el}이 바로 그대의 용신(用神)이라, 곁에 가까이 채울수록 막힌 길이 열리고 명이 둥글어진다오.` : ''}`);
  });
  push('성정의 빛과 그늘', `사람의 기운에는 빛이 있으면 반드시 그늘이 있는 법이라, 같은 기질도 잘 쓰면 복이 되고 지나치면 흠이 된다오. 그대는 ${o.dominant}이 두터우니 ${({ 목: '인정 많고 자라기를 좋아하여 늘 새 일과 사람에 마음이 먼저 가닿는 빛이 있으나, 벌인 일을 다 끌어안다 지치는 그늘이 따르오', 화: '환하고 다정하여 사람을 끌어모으는 빛이 있으나, 쉬 달아올랐다 쉬 식는 그늘이 따르오', 토: '믿음직하고 너그러워 사람이 기대는 빛이 있으나, 정에 매여 떠날 때를 놓치는 그늘이 따르오', 금: '맺고 끊음이 분명하여 일을 잘 거두는 빛이 있으나, 날이 서서 사람을 베는 그늘이 따르오', 수: '슬기롭고 융통이 있어 어디로든 길을 내는 빛이 있으나, 생각만 깊어 첫걸음이 더딘 그늘이 따르오' })[o.dominant]}. 빛은 살리고 그늘은 다독이는 것이 평생의 공부라네.\n반대로 옅은 ${o.weakest}의 자리에서는 더러 서툴고 약하기 쉬우니, 그 일을 만나거든 혼자 애쓰기보다 그 기운이 두터운 사람을 곁에 두어 빌리시게. 그것이 모자람을 메우는 가장 빠른 길이라오.`);
  push('재능과 적성 — 무엇에 빼어난가', `${grp.has('식상') ? '식상이 있어 표현과 손재주, 가르치고 즐겁게 하는 일에 빼어나오. 말·글·예(藝)로 풀어내는 일이 그대의 마당이라네.' : '식상이 옅으니 화려한 재주를 겉으로 뽐내기보다, 한 가지를 깊이 파고드는 장인의 길이 어울리오.'} ${grp.has('인성') ? '또한 인성이 받쳐 배우고 익혀 가르치는 일, 문서와 자격을 다루는 일에도 복이 있소.' : '배움은 스스로 길을 내어야 하니, 몸으로 부딪혀 익히는 재주가 더 빛나리다.'} ${grp.has('관성') ? '관성이 있어 사람을 이끌고 질서를 세우는 자리도 능히 감당하오.' : '얽매인 자리보다 제 뜻대로 펴는 일에서 더 신명이 나오.'}\n무엇을 하든, 그대의 두터운 ${o.dominant} 기운을 살릴 수 있는 일이라야 오래간다오. 적성이란 그저 잘하는 일이 아니라 '하고도 지치지 않는 일'임을 잊지 마시게.`);

  chap('제3장 — 기운의 짜임', '신강·신약과 용신, 그리고 십성의 결');
  push('신강·신약과 용신(用神)', `이제 그대의 일간이 얼마나 힘이 있는지를 저울에 달아 보리다. 헤아려 보니 '${dm.strength}'(부조세력 ${dm.strengthScore}푼)이라오. ${ys.reason} 앞서 일렀듯 신강(身强)이면 넘치는 힘을 덜어 흐르게 하고, 신약(身弱)이면 옅은 뿌리를 받쳐 세우는 것이 명리의 이치라네. 그대에게는 ${ys.hanja}(${ys.element})의 기운을 가까이하는 것이 평생의 보약이 되어 주오.\n삶의 장면으로는 — 일이 잘 풀리지 않고 마음이 메마를 때, ${ohaengRemedy(ys.element)}를 곁에 두면 신통히도 기운이 도는 것을 느끼게 되리다. 빛깔과 방위, 사람과 일까지 그 기운을 빌리면, 막혔던 길이 한 칸씩 열린다오.`);

  ['비겁', '식상', '재성', '관성', '인성'].forEach((g) => {
    const sub = SS_SUB[g];
    const presence = grp.has(g) ? SS5K[g].has : SS5K[g].no;
    push(`십성 풀이 — ${g}(${SS_HAN[g]})`, `${g}(${SS_HAN[g]})은 ${SS_GOV[g]}을 다스리는 기운으로, 다시 두 별로 나뉜다오.\n▷ ${sub[0][0]} — ${sub[0][1]}\n▷ ${sub[1][0]} — ${sub[1][1]}\n${presence}`);
  });

  chap('제4장 — 네 기둥의 이야기', '년·월·일·시 네 기둥에 담긴 한평생');
  push('네 기둥을 읽기 전에', `사주의 네 기둥은 한 사람의 한평생을 네 토막으로 나누어 비추는 거울과 같다오. 년주는 뿌리와 초년을, 월주는 부모와 청년·사회를, 일주는 나 자신과 배우자를, 시주는 자식과 늘그막을 맡으니, 기둥마다 어떤 글자가 앉았는지를 보면 그 시절의 빛깔을 가늠할 수 있다네. 또한 기둥의 지지에는 '십이운성(十二運星)'이라 하여, 사람의 한살이(태어나 자라고 늙어 갈무리되는 열두 마디)에 견준 기운의 세기가 깃들어 있으니, 함께 살피면 더욱 또렷하오.`);
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = P[k];
    if (!p) { push('기둥 풀이 — 시주(時柱)', '출생 시각을 모르니 시주는 비워 두었소. 시주는 자식과 말년, 그리고 그대가 남길 결실의 자리이니, 뒷날 시각을 알게 되거든 다시 펼쳐 보시게. 그때엔 늘그막의 빛깔과 아랫사람의 인연까지 한결 또렷해지리다.'); return; }
    const nm = { year: '년주(年柱)', month: '월주(月柱)', day: '일주(日柱)', hour: '시주(時柱)' }[k];
    const era = { year: '어린 시절과 조상의 음덕이 그대를 길렀고,', month: '청년의 때와 부모·사회의 마당에서 그대가 다듬어졌으며,', day: '한평생 곁에 둘 짝과 그대 자신의 속결이 여기 담겼고,', hour: '늘그막의 평안과 아랫사람·자식의 인연이 이 자리에 깃들었소,' }[k];
    push(`기둥 풀이 — ${nm} · ${PILLARK[k].dom}`, `${PILLARK[k].txt} 이 자리에 ${p.hanja}(${p.han})가 앉았으니, 천간(겉으로 드러난 기운)은 ${p.ohaeng}, 지지(속에 감춘 바탕)는 ${p.ji}(${p.jiOhaeng})요, 십이운성으로는 '${p.dishi}'의 결이라오. ${p.jiShishen.length ? `또 그 지지 속에는 ${p.jiShishen.join('·')}의 십성이 감추어져 깃들어 있어, 겉으로 드러나지 않은 그대의 또 다른 결을 일러준다오. ` : ''}${DISHI_MEAN[p.dishi] || ''} ${era} 이 기둥이 곧 그 시절·그 자리의 빛깔이라오.\n그러니 이 기둥이 말하는 바를 가벼이 넘기지 말고, ${k === 'day' ? '특히 짝을 고르고 제 마음을 다스리는 일에' : k === 'month' ? '특히 일과 사회의 인연을 맺는 일에' : k === 'year' ? '특히 뿌리와 초년의 바탕을 헤아리는 일에' : '늘그막과 자식의 자리를 살피는 일에'} 마음을 두시게.`);
  });
  push('여덟 글자 낱낱이 풀이', (function () {
    const order = ['year', 'month', 'day', 'hour'];
    const nmK = { year: '년주', month: '월주', day: '일주', hour: '시주' };
    let out = '끝으로 그대의 여덟 글자를 하나하나 짚어 두리다. 천간은 겉으로 드러난 마음, 지지는 속에 품은 바탕이라 보면 되오.';
    order.forEach((k) => {
      const p = P[k]; if (!p) return;
      const ssGan = k === 'day' ? '일간(나 자신)' : ({ year: s.shishen.year, month: s.shishen.month, hour: s.shishen.hour }[k] || '');
      out += `\n▷ ${nmK[k]} 천간 ${p.hanja[0]}(${p.gan}) — ${p.eumyang}의 ${p.ohaeng}(${OH_HAN[p.ohaeng]})이니${ssGan ? `, 십성으로 ${ssGan}의 자리라오.` : '.'}`;
      out += `\n▷ ${nmK[k]} 지지 ${p.hanja[1]}(${p.ji}) — ${p.jiOhaeng}(${OH_HAN[p.jiOhaeng]})의 땅이요, 십이운성 '${p.dishi}'${p.jiShishen.length ? `, 속에 ${p.jiShishen.join('·')}을 품었소.` : '.'}`;
    });
    return out;
  })());

  chap('제5장 — 삶의 자리', '재물·일·명예·배움·사랑·가정·건강·사람');
  push('재물의 길 — 곳간을 채우는 법', `재물은 재성(財星)과 식상(食傷)의 결로 본다오. 재성은 내가 다루는 재물이요, 식상은 그 재물을 낳는 재주이니, 이 둘의 어울림이 곧 곳간의 크기를 정한다네. 그대 명에는 ${grp.has('재성') ? '재성이 또렷이 자리하여 제 손으로 벌어 쥐는 힘이 있으니' : '재성이 겉으로 드러나지 않아 큰 한탕보다 꾸준한 갈무리가 이로우니'}, ${grp.has('식상') ? '재주를 펼친 일이 곧 재물로 이어지는 복도 따르오.' : '사람의 신의를 앞세우면 재물이 그 사람의 손을 빌려 뒤따라오오.'}\n삶의 장면으로는 — 충동으로 큰돈을 옮긴 해보다, 작은 약속과 계약의 글자를 또렷이 챙긴 해에 정작 손에 남는 것이 많으리다. 들고 나는 셈을 살뜰히 적는 버릇 하나가, 그대에겐 천 냥 곳간의 자물쇠가 되어 준다오.`);
  push('일과 직업 — 어느 길이 맞는가', `그대의 ${dm.ohaeng} 일간과 가장 두터운 ${o.dominant}의 기운으로 보아, ${careerKo(dm.ohaeng, o.dominant)} 그러한 일에서 그대의 재주가 가장 환히 빛난다오. ${grp.has('관성') ? '관성이 받쳐 주니 조직과 직책 안에서 자리를 얻기 좋고,' : '관성이 옅으니 남의 밑에 매이기보다 제 영역을 세우는 일이 어울리고,'} ${grp.has('식상') ? '재주를 겉으로 드러내는 일에서 더욱 인정받으리다.' : '묵묵히 쌓아 올리는 일에서 신뢰를 얻으리다.'}\n삶의 장면으로는 — 남이 시켜서 하는 일보다, 스스로 뜻을 세워 벌인 일에서 신명이 나고 성과도 따라온다네.`);
  push('명예와 자리 — 이름을 높이는 때', `벼슬과 이름은 관성(官星)과 인성(印星)으로 본다오. ${grp.has('관성') || grp.has('인성') ? '그대는 문서와 직책의 덕이 있으니, 맡기 두려운 자리라도 마다 않고 받아 든 곳에서 이름이 오르리다.' : '드러난 관·인이 옅으니, 스스로 길을 내어 실력으로 증명하면 더디어도 단단한 이름을 얻으리다.'} ${cd ? `마침 지금은 ${cd.shishen}의 대운이 비추니, ${shishenFlow(cd.shishen)}` : ''}\n삶의 장면으로는 — 공(功)을 다투어 앞에 나서기보다, 묵묵히 맡은 바를 끝까지 해낸 자리에서 사람들이 먼저 그대의 이름을 부르게 되리다.`);
  push('학업과 문서 — 배움의 복', `인성(印星)은 배움과 문서, 자격의 별이라네. ${grp.has('인성') ? '공부와 문서의 덕이 두터우니, 자격·시험·계약처럼 도장 찍는 일에서 결실을 보기 좋소.' : '인성이 옅으니 배움은 스스로 길을 내어야 빛나오. 기댈 뒷배가 적은 만큼 제 발로 선 힘이 단단하니, 좋은 스승 하나를 곁에 두면 그 단단함이 더 빛나리다.'}\n삶의 장면으로는 — 큰 결정과 계약은 충분히 자고 난 맑은 아침에 다시 한 번 살피면, 서둘러 도장 찍어 후회하는 일이 없으리다.`);
  push('사랑과 혼인 — 인연의 결', `배우자의 자리는 일지(日支) ${P.day.ji}(${P.day.jiOhaeng})로 본다오. 일지는 곧 그대가 가장 가까이 두는 사람의 자리이니, 여기 깃든 기운이 인연의 빛깔을 일러준다네. ${s.sinsal.some((x) => x.name === '도화살') ? '명에 도화(桃花)의 매력이 있어 사람이 절로 따르나, 끌림이 깊은 만큼 인연의 무게를 가벼이 말 것이오.' : '화려한 만남보다 속결이 맞는 이와 오래간다오.'}\n삶의 장면으로는 — 한눈에 타오르는 인연보다, 그대의 침묵까지 가만히 읽어 주는 한 사람 곁에서 마음이 놓이리니, 부디 겉모습보다 결을 보시게.`);
  push('가정과 자식 — 뿌리와 가지', `${P.hour ? `시주 ${P.hour.hanja}로 보아, 자식과 말년의 자리에 ${P.hour.jiShishen.join('·') || P.hour.ohaeng}의 기운이 깃들었소.` : '출생 시각을 모르니 자식의 자리는 뒷날로 미루어 두오.'} 가정이란 그대가 베푼 만큼 고스란히 돌아오는 곳이라, 밖에서 아무리 큰 공을 세워도 집안이 차가우면 마음 둘 곳이 없는 법이라네.\n삶의 장면으로는 — 바쁜 날에도 식구에게 건네는 따뜻한 말 한마디가, 집안의 기운을 절로 둥글게 만든다오. 그것이 가장 작으면서도 가장 큰 비방(秘方)이라오.`);
  push('건강과 몸 — 미리 살피는 지혜', `몸은 오행의 균형으로 보니, 옅은 기운이 맡은 자리가 먼저 신호를 보낸다오. 그대는 ${o.weakest}의 기운이 가장 옅으니, ${ohaengBody(o.weakest)} 특히 무리한 뒤 ${ohaengBody(o.weakest, true)} 신호가 오거든, 그것을 게으름이 아니라 몸이 보내는 전갈로 알고 쉬시게.\n삶의 장면으로는 — 밤늦도록 일을 붙들다 다음 날 종일 가라앉는 일이 잦거든, 바로 그 자리가 균형이 깨진 곳이라오. 쉼을 죄로 여기지 않는 것이, 그대에겐 가장 긴요한 보약이라네.`);
  push('사람과 귀인 — 누가 그대를 돕는가', `${s.sinsal.some((x) => x.name === '천을귀인') ? '그대 명에는 천을귀인(天乙貴人)이 들었으니, 이는 사주에서 가장 으뜸가는 길한 무늬라오. 위기의 길목마다 뜻밖의 사람이 손을 내밀어 그대를 건져 주니, 사람을 귀히 여길수록 그 복이 더 두터워진다오.' : '귀인은 멀리 있지 않고, 그대가 신의를 지킨 사람들 사이에서 난다오. 오늘 무심히 베푼 정이, 뒷날 그대를 건지는 손이 되어 돌아온다네.'}\n삶의 장면으로는 — 베푼 정이 곧 그대를 둘러싼 울타리가 되어 주리니, 사람을 곳간처럼 아끼시게.`);
  push('관계의 지혜 — 가까이할 사람, 거리 둘 사람', `사람의 인연도 오행의 생극으로 헤아릴 수 있다오. 그대의 일간은 ${dm.ohaeng}이니, 그대를 낳아 북돋는 ${GEN_BY_R[dm.ohaeng]}의 기운을 지닌 이는 어버이처럼 그대를 길러 주고, 그대가 낳아 주는 ${SHENG_R[dm.ohaeng]}의 기운을 지닌 이는 자식처럼 그대의 정을 받아 가오. 같은 ${dm.ohaeng}의 사람과는 벗이 되기 쉬우나 다투기도 쉬우니, 셈을 또렷이 하면 오래간다네.\n무엇보다 그대의 용신인 ${ys.element}의 기운을 지닌 사람을 가까이 두시게 — 함께 있으면 막힌 일이 트이고 마음이 환해지는 귀인이라오. 다만 누구를 만나든, 사람을 오행의 잣대로만 가르지 말고 그 마음의 결을 먼저 보는 것이 으뜸가는 지혜임을 잊지 마시게.`);
  push('재물을 모으고 지키는 법', `버는 것은 재주요 지키는 것은 습관이라, 곳간은 큰 손이 아니라 촘촘한 그물로 채워진다오. 그대처럼 ${o.dominant}이 두터운 이는 ${({ 목: '일을 자꾸 벌이려는 기운이 세니, 새 일에 돈을 묻기 전에 벌인 일부터 거두시게', 화: '한껏 달아오를 때 크게 쓰기 쉬우니, 들뜬 마음에 지른 셈을 하루만 묵혀 보시게', 토: '사람의 정에 약해 보증과 빌려줌에 곳간이 새기 쉬우니, 정과 돈은 따로 셈하시게', 금: '아끼는 힘은 좋으나 한 번 결단에 크게 베팅하기 쉬우니, 큰 결정 앞에 반드시 하루를 묵히시게', 수: '머리로 굴리는 투자에 끌리기 쉬우니, 모르는 물에는 발을 깊이 담그지 마시게' })[o.dominant]}.\n살림의 비방은 단출하오 — 들고 나는 셈을 매일 적고, 버는 것의 한 줌은 손대지 않는 곳간에 따로 두며, 큰 지출은 반드시 하룻밤을 재운 뒤 결정하시게. 이 세 가지만 지켜도 그대의 곳간은 새지 않으리다.`);

  chap('제6장 — 운(運)의 흐름', '대운 10년의 마디와 올해, 그리고 열두 달');
  s.daeun.slice(0, 7).forEach((d) => {
    const onNow = cd && d.age === cd.age;
    push(`대운 — ${d.age}세부터 (${d.han})`, `${d.age}세부터 열 해 동안, ${d.han}(${d.hanja}) 대운이 그대의 밭에 드오. 이 십 년은 십성으로 ${d.shishen}이요 ${d.ohaeng}(${OH_HAN[d.ohaeng]})의 기운이 비추니, ${shishenFlow(d.shishen)} ${d.ohaeng === ys.element ? `더욱이 이 ${d.ohaeng}은 그대의 용신이라, 이 마디엔 막혔던 일이 트이고 귀인의 손길이 잦으리다.` : (supportsDM(dm.ohaeng, d.ohaeng) ? `이 기운은 그대 일간을 북돋는 편이니, 자신감을 갖고 펼치기 좋은 때라오.` : `이 기운은 그대 일간을 덜어내는 편이니, 욕심을 줄이고 매듭을 단단히 하면 탈이 없으리다.`)}\n삶의 장면으로는 — ${shishenScene(d.shishen)}${onNow ? ' 무엇보다 이 마디가 바로 지금 그대가 지나는 때이니, 이 십 년의 결을 잘 살펴 때를 고르면 한평생의 큰 자리를 여기서 닦으리다.' : ''}`);
  });
  push('분야별 올해의 운', `한 해의 기운을 살림의 갈래로 나누어 일러 두리다.\n▷ 재물 — ${grp.has('재성') ? '버는 만큼 새는 곳도 살피면 곳간이 는다오. 큰 투자는 가을에 한 번 더 따져 보시게.' : '큰 욕심을 부리기보다 들고 나는 셈을 또렷이 하면 외려 손에 남는 것이 많으리다.'}\n▷ 일·직장 — ${grp.has('관성') ? '맡은 자리에서 책임을 더하면 인정이 따르니, 피하지 말고 받아 드시게.' : '제 솜씨를 드러낼 자리를 스스로 만들면 길이 열리오.'}\n▷ 애정 — ${s.sinsal.some((x) => x.name === '도화살') ? '사람이 따르는 해이니, 끌림보다 결을 보고 인연을 고르시게.' : '겉을 꾸미기보다 마음을 나누면 인연이 깊어지오.'}\n▷ 건강 — 옅은 ${o.weakest}의 자리, 곧 ${ohaengBody(o.weakest)} 미리 살피시게.\n▷ 이동·변동 — ${s.sinsal.some((x) => x.name === '역마살') ? '역마가 드니 옮기고 떠나는 일이 잦겠소. 분주함을 기회로 삼으시게.' : '자리를 함부로 옮기기보다 다진 곳을 깊이 하는 편이 이로운 해라오.'}`);
  push('열두 달의 흐름', (function () {
    const M = [['寅', '인', '목', '정월·초봄'], ['卯', '묘', '목', '이월·봄'], ['辰', '진', '토', '삼월·늦봄'], ['巳', '사', '화', '사월·초여름'], ['午', '오', '화', '오월·여름'], ['未', '미', '토', '유월·늦여름'], ['申', '신', '금', '칠월·초가을'], ['酉', '유', '금', '팔월·가을'], ['戌', '술', '토', '구월·늦가을'], ['亥', '해', '수', '시월·초겨울'], ['子', '자', '수', '동짓달·겨울'], ['丑', '축', '토', '섣달·늦겨울']];
    const head = '달마다 드는 기운이 다르니, 제 일간과 견주어 힘이 붙는 달과 덜어내는 달을 짚어 두리다(절기 기준이라 양력과 며칠 어긋날 수 있소).\n';
    return head + M.map((m) => {
      const el = m[2];
      const tag = el === ys.element ? '용신이 드는 달이라 가장 길하니, 큰일은 이때 도모하시게' : (supportsDM(dm.ohaeng, el) ? '기운이 붙어 자신 있게 펼치기 좋소' : '기운을 덜어내니 무리 말고 매듭을 다지시게');
      return `▷ ${m[3]} (${m[1]}·${m[0]}, ${el}) — ${tag}.`;
    }).join('\n');
  })());

  const yg = yearGanzhi(nowY), ng = yearGanzhi(nowY + 1);
  const ygSS = yg ? shishenOf(dm.hanja, yg[0]) : '';
  const ngSS = ng ? shishenOf(dm.hanja, ng[0]) : '';
  push(`올해와 다가오는 해 — 세운(歲運)`, `이제 한 해의 기운을 보리다. 올해 ${nowY}년은 ${yg} 해이니, 그 천간을 그대의 일간에 견주면 십성으로 '${ygSS}'의 해라오. 곧 ${shishenFlow(ygSS)} ${cd ? `여기에 ${cd.shishen} 대운의 큰 결까지 얹히니, 두 기운을 함께 읽어야 하오.` : ''}\n삶의 장면으로는 — ${shishenScene(ygSS)} 봄에 씨를 고르고, 여름에 부지런히 키워, 가을에 거두는 마음이면 그르치지 않으리다.\n이듬해 ${nowY + 1}년은 ${ng} 해, 십성으로 '${ngSS}'의 해라네. ${shishenFlow(ngSS)} 올해 다진 바를 그 결에 맞추어 매듭짓고 한 걸음 더 내딛으면, 좋은 기별이 따르리다.`);
  push('사계절의 리듬 — 언제 무엇을 할까', `한 해 안에서도 철마다 기운이 다르니, 그 결을 따르면 애써 거스르지 않고도 일이 순해진다오. 봄(寅卯辰)엔 새 일을 펴고 사람을 모으며, 여름(巳午未)엔 드러내고 알리시오. 가을(申酉戌)엔 거두고 매듭지으며, 겨울(亥子丑)엔 갈무리하고 쉬며 다음을 준비하시게.\n그대의 용신인 ${ys.element}의 기운이 드는 철엔 특히 일이 순하게 풀리니, 큰일은 되도록 그 무렵에 도모하면 좋겠소.`);
  push('좋은 해와 주의할 해', `${goodYears(s)} 좋은 마디라 하여 가만히 있어도 복이 굴러오는 것은 아니요, 주의할 마디라 하여 무조건 화가 닥치는 것도 아니라오. 좋은 때엔 부지런히 씨를 뿌려 거두고, 주의할 때엔 욕심을 줄이고 말과 매듭을 삼가면, 어느 해든 그르치지 않는 법이라네.\n특히 큰 결단—이사, 혼인, 창업, 큰 계약—은 용신의 기운이 받쳐 주는 해와 달에 맞추면 한결 순하게 풀리니, 서두르지 말고 때를 골라 두시게.`);
  push('올해의 운세 총평', `간추려 이르자면, 올해 ${yg}년의 그대는 ${cd ? `${cd.shishen} 대운의 결 위에서 ` : ''}'벌이기'보다 '갖추기'에 마음을 두는 편이 이로운 한 해라오. 그대의 강한 ${o.dominant}을 베풀어 사람을 얻고, 옅은 ${ys.element}을 채워 균형을 잡으면, 작은 일들이 모여 큰 자리를 닦게 되리다.\n조급해하지 마시게. 그대의 명은 한 해에 터지는 불꽃이 아니라, 해를 거듭하며 두터워지는 나이테 같은 것이라오. 오늘 한 걸음, 내일 한 걸음이 쌓여 끝내 그대가 바라던 자리에 닿으리니, 부디 제 결을 믿고 꾸준히 나아가시게.`);
  chap('제7장 — 신살과 비방(秘方)', '타고난 무늬와, 살림에 쓰는 지혜');
  push('신살(神煞) 풀이', `${s.sinsal.length ? '신살이란 앞서 일렀듯 특정 글자들이 만나 생기는 기운의 무늬라오. 그대 명에 든 신살은 — ' + s.sinsal.map((x) => `${x.name}(${x.mean})`).join(', ') + '이라오. 신살은 길흉을 못 박는 족쇄가 아니라, 그대 기운의 빛깔을 일러주는 무늬일 뿐이니, 두려워 말고 외려 그 결을 살려 쓰시게.' : '그대 명에는 두드러진 신살이 없으니, 외려 기운이 고르고 담백한 명이라 할 수 있소. 무늬가 옅다는 것은 휘둘림이 적다는 뜻이기도 하다오.'}\n또 하나 일러둘 것은 공망(空亡)이라오. 그대의 공망은 ${s.gongmang}이니, 그 글자가 맡은 자리에서는 너무 큰 기대를 걸기보다 마음을 비우는 편이 외려 이롭다네. 비운 자리에 도리어 뜻밖의 복이 깃드는 법이라오.`);
  push('비방(秘方)과 마음가짐 — 오래 지닐 지혜', `끝으로, 살림에 곧장 쓸 수 있는 비방 셋을 일러 두리다.\n하나, 미뤄 둔 한 가지를 이레 안에 매듭지으시게(넘치는 ${o.dominant}을 결실로 돌리는 길이라오). 둘, 용신인 ${ys.hanja}(${ys.element})의 기운을 채우는 습관을 하나 들이시오 — ${ohaengRemedy(ys.element)}. 셋, 큰 결정은 충분히 잔 다음 날 아침에 내리시게. 그대의 ${dm.ohaeng} 기운은 새벽에 가장 맑다오.\n또 오래 지닐 말 셋도 함께 두오 — 넘치는 ${o.dominant}은 베풀고 옅은 ${ys.element}은 채우라. 사람을 곳간처럼 아끼라, 귀인은 거기서 난다. 급할수록 한 박자 고르라, 그대의 결단은 서두르지 않을 때 가장 바르다.`);

  push('간직할 작은 낱말집', `이 책에 나온 말들을 한자리에 모아 두니, 뒷날 다시 펼칠 때 길잡이로 삼으시게.\n▷ 사주(四柱)·팔자(八字) — 태어난 해·달·날·시의 네 기둥, 여덟 글자.\n▷ 일간(日干) — 태어난 날의 천간, 곧 '나'. 그대는 ${dm.hanja}(${dm.gan}).\n▷ 일주(日柱) — 태어난 날의 두 글자. 그대는 ${P.day.hanja}(${P.day.han}).\n▷ 오행(五行) — 목·화·토·금·수 다섯 기운. 그대는 ${o.dominant}이 두텁고 ${o.weakest}이 옅음.\n▷ 십성(十星) — 일간과 다른 글자의 관계 열 가지(비겁·식상·재성·관성·인성의 다섯 무리).\n▷ 신강·신약 — 일간 힘의 세고 약함. 그대는 '${dm.strength}'.\n▷ 용신(用神) — 치우침을 고르는 가장 요긴한 기운. 그대는 ${ys.hanja}(${ys.element}).\n▷ 대운(大運)·세운(歲運) — 십 년의 큰 흐름과 한 해의 기운.\n▷ 십이운성(十二運星) — 기운의 세기를 사람의 한살이 열두 마디에 견준 것.\n▷ 신살(神煞) — 글자들이 만나 생기는 기운의 무늬. 공망(空亡)은 비워 두면 이로운 자리.`);

  chap('발(跋) — 글을 맺으며', '그대에게 부치는 마지막 한마디');
  push('맺음말 — 왕후의 편지', `${s.input.name}, 여기까지 함께 와 주어 고맙소. 거듭 이르거니와, 그대의 명은 모자람이 아니라 다만 '치우침'일 뿐이라네. 넘치는 곳은 덜고 옅은 곳은 채우면, 명은 절로 둥글어진다오. 오늘 그대가 물은 "${q || '앞날의 흐름'}"도, 결국 그대가 제 결을 알고 때를 고를 때 가장 환히 열리리다.\n이 한 권을 곳간에 간직하듯 지니고, 흔들리는 밤마다 펼쳐 보시게. 글자는 정해져 있어도, 그 글자를 어떻게 살아 낼지는 오롯이 그대의 몫이라오. 내, 그대의 앞길에 오래도록 볕이 들기를 진심으로 바라오.`);

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
const SS_GOV_EN = { 비겁: 'selfhood, competition and companions', 식상: 'expression, talent and livelihood', 재성: 'wealth, the practical world and romance', 관성: 'honor, office and order', 인성: 'learning, documents and care' };
const SS_HAN_EN = { 비겁: 'Companion group · 比劫', 식상: 'Output group · 食傷', 재성: 'Wealth group · 財星', 관성: 'Officer group · 官星', 인성: 'Resource group · 印星' };
const SS_SUB_EN = {
  비겁: [['Companion (比肩)', "'shoulder to shoulder' — the same element and polarity as you. It marks siblings, peers and partners, and the self that wants to stand on its own. Firm-willed, but stubborn in excess."], ['Rival (劫財)', "'robs wealth' — the same element but opposite polarity. It gives drive and competitiveness, yet wealth comes and goes, so keep accounts clear in any partnership."]],
  식상: [['Output (食神)', "'the feeding spirit' — what you give birth to. It brings ease, expression, talent and the fortune of plenty; a generous, life-enjoying energy."], ['Hurting Officer (傷官)', "'harms the office' — brilliant talent and eloquence that dislikes rules and frames. Shine by it, yet guard your tongue and pen."]],
  재성: [['Indirect Wealth (偏財)', "'tilted wealth' — large, active money: enterprise, opportunity and outside ties; a resourceful, big-handed energy."], ['Direct Wealth (正財)', "'upright wealth' — steady money, patiently saved and well kept. For a man, it is also the spouse star."]],
  관성: [['Seven Killings (偏官)', "the 'tilted office', also called Seven Killings — challenge, pressure, decisiveness and authority. Faced rather than fled, it grows your vessel."], ['Direct Officer (正官)', "'upright office' — honor, title, order and responsibility, and an upright bearing. For a woman, it is also the spouse star."]],
  인성: [['Indirect Resource (偏印)', "'tilted seal' — intuition, expertise and quick wit, sometimes with a touch of solitude."], ['Direct Resource (正印)', "'upright seal' — learning, documents and credentials, and a mother's grace; the fortune of being taught and cared for."]],
};
const OH_NATURE_EN = { 목: 'spring, benevolence (仁), the liver and eyes', 화: 'summer, courtesy (禮), the heart and blood', 토: 'the turn of seasons, faith (信), the spleen and digestion', 금: 'autumn, righteousness (義), the lungs and skin', 수: 'winter, wisdom (智), the kidneys and bones' };

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
  chap('Primer — First Steps in Myeongri', 'a plain glossary for the first-time reader');
  push('What is Saju (the Four Pillars)?', `Saju (四柱) means 'four pillars'. The year, month, day and hour of your birth each become a pillar, and onto each pillar we set one letter of Heaven and one of Earth — eight letters in all, which is why a destiny is also called 'Palja (八字, the eight characters)'.\n▷ Heavenly Stems (天干) — the ten letters of Heaven (Gap, Eul, Byeong... ). They show the mind and bearing that you reveal outwardly.\n▷ Earthly Branches (地支) — the twelve letters of Earth, the twelve zodiac animals. They show the foundation and reality you hold within.\nYour eight characters are Year ${P.year.hanja} · Month ${P.month.hanja} · Day ${P.day.hanja}${P.hour ? ' · Hour ' + P.hour.hanja : ''}; reading how they help and check one another is what it means to read a Saju.`);
  push('The Five Elements', `The Five Elements (五行) are the five energies that make up all things — Wood, Fire, Earth, Metal and Water. A chart is read by which of these run thick and which run thin.\n▷ Generation (相生) — they give birth to one another: Water feeds Wood, Wood kindles Fire, Fire makes Earth, Earth holds Metal, Metal gathers Water.\n▷ Control (相剋) — they check one another: Wood parts Earth, Earth dams Water, Water quenches Fire, Fire melts Metal, Metal cuts Wood.\nBy this giving and checking, we gauge what is abundant and what is wanting in you.`);
  push('The Ten Gods', `The Ten Gods (十星), or Ten Spirits, are ten names for the relationship each letter makes with the Day Master (you). By whether a thing supports you, is born of you, or is checked by you, they fall into five groups.\n▷ Companion group (比劫) — the same energy as you: selfhood, competition, peers.\n▷ Output group (食傷) — what you give birth to: expression, talent, livelihood.\n▷ Wealth group (財星) — what you check: money and the practical world.\n▷ Officer group (官星) — what checks you: honor, office, order.\n▷ Resource group (印星) — what gives birth to you: learning, documents, care.\nThe count of these ten tells, at a glance, where you are strong and where you are empty.`);
  push('Luck Pillars and Annual Luck', `If your born Saju is a 'field', then fortune (運) is the 'season and weather' that visits it. The same seed lives if sown in spring and freezes if sown in deep winter, so a reading weighs both what you were born with and when to move.\n▷ Luck Pillar (大運, Daeun) — the great current that turns every ten years; the large seasons of a life.\n▷ Annual Luck (歲運, Seun) — the energy of each single year.\nSo rather than sort fortune into 'good' and 'bad', the wisdom is to ask: in this season, what shall I plant, and what shall I gather?`);
  push('Strength, the Useful Element, and Sinsal', `Three words you will meet often, set down plainly:\n▷ Strong / Weak (身强·身弱) — whether the Day Master (you) is strong or weak. Much that supports you (Companion, Resource) makes you strong; little makes you weak. Neither is 'better'; only the way of tending differs.\n▷ Useful Element (用神) — the most needful energy that evens out the chart's leaning. If strong, what drains you; if weak, what feeds you — your lifelong tonic.\n▷ Sinsal (神煞) — patterns that arise when certain letters meet: Travel Horse (movement), Peach Blossom (charm), Canopy (art), Heavenly Noble (benefactor), and the like. Read them as the color of your energy, not as shackles of fortune.`);

  chap('Chapter 1 — Who You Are', 'the vessel you were born with');
  push('The Day Master — Who You Are', `The Day Master is 'you' within the chart. Born ${y} ${OHAENG_EN[dm.ohaeng]}, you stand at the heart of ${dmDescEn(dm.ohaeng)}. Those near you may say, "firm without, warm within." Know and tend both grains in yourself, and people and work grow gentler around you.`);
  push(`Your Day Pillar — a Portrait in ${P.day.hanja}`, iljuEn(s));
  push(`Your Zodiac Year — the ${(JI_SCENE[s.pillars.year.hanja[1]] || {}).aniEn || s.zodiac}`, `Though not as deep as the full chart, the branch of your birth year — your zodiac animal — also carries a broad grain of who you are. Born in the year of the ${(JI_SCENE[s.pillars.year.hanja[1]] || {}).aniEn || s.zodiac}, ${(ZODIAC_TRAIT[s.zodiac] || {}).en || 'you carry the full energy of that year.'}\nThe zodiac is the broad base shared by all born that year; upon it your own eight characters are drawn, and only then do you become you. Read the zodiac as the underdrawing, and the Saju as the fine brushwork upon it.`);
  ['목', '화', '토', '금', '수'].forEach((el) => {
    const c = o.count[el];
    const b = c >= 2 ? OHE[el].strong : (c === 0 ? OHE[el].none : OHE[el].weak);
    push(`Five Elements — ${OHAENG_EN[el]} (${OH_HAN[el]})`, `▷ ${OHAENG_EN[el]} (${OH_HAN[el]}) — governs ${OH_NATURE_EN[el]}.\n${OHE[el].trait} In your chart ${OHAENG_EN[el]} holds ${c} place(s), so ${b}${el === ys.element ? ` Above all, this ${OHAENG_EN[el]} is your useful element — the more you keep it near, the more blocked paths open and the rounder your destiny grows.` : ''}`);
  });
  push('Light and Shadow of Character', `Where there is light there is shadow, so the same temper, well used, becomes a blessing, and overdone, a flaw. With ${OHAENG_EN[o.dominant]} thick in you, ${({ 목: 'you are warm and growth-loving, your heart reaching first toward new work and people — yet you tire from embracing every venture at once', 화: 'you are bright and draws people in — yet you flare up and cool down just as fast', 토: 'you are trustworthy and broad, one others lean upon — yet you cling by affection and miss the time to leave', 금: 'you conclude clearly and harvest well — yet a sharp edge can cut those near you', 수: 'you are wise and supple, finding a way anywhere — yet thought runs deep and the first step comes slow' })[o.dominant]}. To raise the light and soothe the shadow is the study of a lifetime.\nWhere your thin ${OHAENG_EN[o.weakest]} sits, you may be clumsy or weak; meeting such work, do not strain alone but borrow from one in whom that energy runs thick — the swiftest way to fill what is wanting.`);
  push('Talent and Aptitude', `${grp.has('식상') ? 'With Output stars, you excel at expression, craft, teaching and delighting others; word, pen and art are your field.' : 'With thin Output, rather than flaunting flashy skill, the path of a quiet master who bores deep into one thing suits you.'} ${grp.has('인성') ? 'Resource stars also favor learning, mastering and teaching, and the handling of documents and credentials.' : 'Learning must be self-driven, so a craft learned by the body shines brighter for you.'} ${grp.has('관성') ? 'With Officer stars, you can also bear the seat that leads people and sets order.' : 'You find more spirit in shaping your own way than in a bound post.'}\nWhatever you do, it lasts when it draws on your thick ${OHAENG_EN[o.dominant]}. Aptitude is not what you merely do well, but 'what you can do without tiring' — remember it.`);

  chap('Chapter 2 — The Weave of Energy', 'strength, the useful element, and the Ten Gods');
  push('Strength and the Useful Element', `Weighing the Day Master, it is '${STRENGTH_EN[dm.strength] || dm.strength}' (support ${dm.strengthScore}%). ${ys.reason} If strong, drain to let it flow; if weak, prop it to stand — so keeping ${OHAENG_EN[ys.element]} near is your lifelong tonic. In practice: ${REMEDY_EN[ys.element]}.`);
  ['비겁', '식상', '재성', '관성', '인성'].forEach((g) => {
    const sub = SS_SUB_EN[g];
    const presence = grp.has(g) ? SS5E[g].has : SS5E[g].no;
    push(`Ten Gods — ${SS_HAN_EN[g]}`, `This group governs ${SS_GOV_EN[g]}, and divides into two stars.\n▷ ${sub[0][0]} — ${sub[0][1]}\n▷ ${sub[1][0]} — ${sub[1][1]}\n${presence}`);
  });
  chap('Chapter 3 — The Four Pillars', 'a lifetime held in Year, Month, Day and Hour');
  push('Before Reading the Four Pillars', `The four pillars are like a mirror that reflects one life in four parts. The Year pillar holds your roots and early years; the Month, your parents, youth and society; the Day, yourself and your partner; the Hour, your children and later years. See which letters sit in each pillar, and you can gauge the color of that season of life.\nUpon each pillar's branch also rests one of the Twelve Stages (十二運星) — the strength of energy likened to the twelve turns of a human life, from birth through growth to gathering-in. Read them together, and each seat grows clearer still.`);
  ['year', 'month', 'day', 'hour'].forEach((k) => {
    const p = P[k];
    if (!p) { push('Pillar — Hour', 'Your birth time is unknown, so the Hour pillar is left empty. The Hour holds children, later years and the harvest you leave, so when you learn the time, return here — the color of your later seasons and the bonds with those who follow you will sharpen.'); return; }
    const nm = { year: 'Year', month: 'Month', day: 'Day', hour: 'Hour' }[k];
    const era = { year: 'Your childhood and the grace of your forebears raised you here;', month: 'your youth and the field of parents and society shaped you here;', day: 'the partner of a lifetime and your own inner grain are held here;', hour: 'the peace of later years and the bonds of children rest here;' }[k];
    push(`Pillar — ${nm} · ${PILLARE[k].dom}`, `${PILLARE[k].txt} Here sits ${p.hanja}; the stem (the energy shown outward) is ${OHAENG_EN[p.ohaeng]}, the branch (the foundation held within) is ${p.hanja[1]} (${OHAENG_EN[p.jiOhaeng]}), and by the Twelve Stages it carries the grain of '${DI_EN_R[p.dishi] || p.dishi}'. ${p.jiShishen.length ? `Hidden in that branch are the stars of ${p.jiShishen.map((x) => SHISHEN_EN[x] || x).join(' and ')}, telling of a grain in you not shown on the surface. ` : ''}${era} this pillar is the very color of that season and seat.\nSo do not pass lightly over what it says; give your heart ${k === 'day' ? 'especially to choosing your partner and tending your own mind' : k === 'month' ? 'especially to the ties of work and society' : k === 'year' ? 'especially to weighing your roots and early ground' : 'to watching over your later years and those who follow you'}.`);
  });
  push('The Eight Characters, One by One', (function () {
    const order = ['year', 'month', 'day', 'hour'];
    const nmE = { year: 'Year', month: 'Month', day: 'Day', hour: 'Hour' };
    let out = 'Lastly, let me touch each of your eight characters in turn. The stem is the mind shown outward; the branch, the ground held within.';
    order.forEach((k) => {
      const p = P[k]; if (!p) return;
      const ssGan = k === 'day' ? 'the Day Master (you yourself)' : (ssEn({ year: s.shishen.year, month: s.shishen.month, hour: s.shishen.hour }[k] || '') || '');
      out += `\n▷ ${nmE[k]} stem ${p.hanja[0]} — ${p.eumyang === '양' ? 'Yang' : 'Yin'} ${OHAENG_EN[p.ohaeng]} (${OH_HAN[p.ohaeng]})${ssGan ? `, the seat of ${ssGan}.` : '.'}`;
      out += `\n▷ ${nmE[k]} branch ${p.hanja[1]} — ground of ${OHAENG_EN[p.jiOhaeng]} (${OH_HAN[p.jiOhaeng]}), stage '${DI_EN_R[p.dishi] || p.dishi}'${p.jiShishen.length ? `, holding ${p.jiShishen.map((x) => SHISHEN_EN[x] || x).join(' and ')} within.` : '.'}`;
    });
    return out;
  })());
  chap('Chapter 4 — The Places of Life', 'wealth, work, honor, study, love, family, health, people');
  push('The Path of Wealth', `Wealth is read through Wealth and Output stars. ${grp.has('재성') ? 'You can earn and hold by your own hand,' : 'Steady gathering suits you better than the big strike,'} ${grp.has('식상') ? 'and your craft flows into income.' : 'and trust in people lets wealth follow.'} Coffers fill in the year of precise small promises, not impulsive large moves.`);
  push('Work and Vocation', `By your ${OHAENG_EN[dm.ohaeng]} Day Master and thick ${OHAENG_EN[o.dominant]}, ${careerEn(dm.ohaeng)} ${grp.has('관성') ? 'Officer stars favor organizations and titles,' : 'with thin Officer stars, building your own domain suits you,'} ${grp.has('식상') ? 'and you shine where talent is shown.' : 'and trust grows where you steadily accumulate.'}`);
  push('Honor and Standing', `Officer and Resource stars are the grain of honor. ${grp.has('관성') || grp.has('인성') ? 'With the favor of documents and office, your name rises where you accept the charge given you.' : 'Cut your own path and prove by skill; the name comes slower but stands firmer.'} ${cd ? `The ${ssEn(cd.shishen)} Luck Pillar now lights this — ${shishenFlowEn(cd.shishen)}` : ''}`);
  push('Study and Documents', `Resource is the star of learning and credentials. ${grp.has('인성') ? 'Their favor is thick, so credentials and examinations bear fruit.' : 'Learning shines when self-driven; keep one good teacher near.'} Weigh large decisions and contracts on the morning after full sleep.`);
  push('Love and Marriage', `The partner's seat is the Day Branch, ${P.day.hanja[1]}. ${s.sinsal.some((x) => x.name === '도화살') ? 'A Peach-Blossom charm draws people — yet do not take a bond lightly.' : 'You last with one whose inner grain matches, more than the dazzling match.'} Beside the one who reads your silences, your heart settles.`);
  push('Family and Children', `${P.hour ? `By the Hour pillar ${P.hour.hanja}, the seat of children and later years carries ${P.hour.jiShishen.join('·') || OHAENG_EN[P.hour.ohaeng]}.` : 'With the time unknown, the seat of children waits for another day.'} Home returns what you give; one warm word rounds the household's energy.`);
  push('Health and Body', `${OHAENG_EN[o.weakest]} runs thin, which governs ${bodyEn(o.weakest)}. When signs come after overexertion, take them as the body's message and rest. Holding work late and sinking the next day is the very place balance has broken.`);
  push('People and Benefactors', `${s.sinsal.some((x) => x.name === '천을귀인') ? 'A "Heavenly Noble" benefactor sits in your chart, so at each crossing a helping hand reaches out — honor people, and that blessing thickens.' : 'Benefactors are not far; they arise among those with whom you have kept faith.'} The kindness you give becomes your fence; treasure people as a storehouse.`);
  push('The Wisdom of Relationships', `Bonds, too, can be weighed by the generation and control of the Five Elements. Your Day Master is ${OHAENG_EN[dm.ohaeng]}, so one whose energy is ${OHAENG_EN[GEN_BY_R[dm.ohaeng]]} (which gives birth to you) raises you like a parent, while one whose energy is ${OHAENG_EN[SHENG_R[dm.ohaeng]]} (which you give birth to) receives your care like a child. With another of the same ${OHAENG_EN[dm.ohaeng]}, friendship comes easily — but so does friction, so keep accounts clear and it lasts.\nAbove all, keep near one whose energy is your useful element, ${OHAENG_EN[ys.element]} — beside them, blocked matters open and the heart brightens; such a one is a true benefactor. Yet whomever you meet, do not sort people by the elements alone; to see first the grain of their heart is the foremost wisdom.`);
  push('Earning and Keeping Wealth', `Earning is a talent; keeping is a habit — a storehouse fills not by a large hand but by a fine net. With ${OHAENG_EN[o.dominant]} thick, you ${({ 목: 'are quick to start new ventures, so before burying money in the new, first gather in what you have begun', 화: 'spend big when you flare up, so let a heated impulse sit one day before you act', 토: 'are soft to others, so guarantees and loans leak the storehouse — count affection and money apart', 금: 'save well but may stake big on one decision, so always let a great choice sleep a night', 수: 'are drawn to clever, heady investments, so do not wade deep into waters you do not know' })[o.dominant]}.\nThe household remedy is plain — write your ins and outs each day; set aside one untouched handful of all you earn; and decide every large spending only after a night's sleep. Keep these three, and your storehouse will not leak.`);
  chap('Chapter 5 — The Flow of Fortune', 'the decade pillars and the year ahead');
  s.daeun.slice(0, 7).forEach((d) => push(`Luck Pillar — from age ${d.age} (${d.hanja})`, `From age ${d.age}, a decade of ${d.hanja} arrives over your field. By the Ten Gods it is ${ssEn(d.shishen)}, with the energy of ${OHAENG_EN[d.ohaeng]} shining, so ${shishenFlowEn(d.shishen)} ${d.ohaeng === ys.element ? `What is more, this ${OHAENG_EN[d.ohaeng]} is your useful element, so in this stretch blocked matters open and benefactors come often.` : (supportsDM(dm.ohaeng, d.ohaeng) ? `This energy supports your Day Master, so it is a fine time to act with confidence.` : `This energy drains your Day Master, so curb desire and bind your knots tightly, and trouble passes.`)}\nIn life — ${shishenSceneEn(d.shishen)}${cd && d.age === cd.age ? ' Above all, this is the very stretch you now pass through; read its grain well, and here you lay the great seat of a lifetime.' : ''}`));
  const yg = yearGanzhi(nowY), ng = yearGanzhi(nowY + 1);
  push('By Area — This Year', `Let me set out the year by the parts of life.\n▷ Wealth — ${grp.has('재성') ? 'watch the leaks as much as the earnings, and weigh any large investment once more in autumn.' : 'rather than chasing a big strike, keep your ins and outs precise, and more remains in hand.'}\n▷ Work — ${grp.has('관성') ? 'add responsibility where you stand, and recognition follows; do not flee the seat.' : 'make your own place to show your craft, and the way opens.'}\n▷ Love — ${s.sinsal.some((x) => x.name === '도화살') ? 'people are drawn to you this year; choose by grain, not by mere attraction.' : 'share heart over show, and the bond deepens.'}\n▷ Health — tend in advance the thin ${OHAENG_EN[o.weakest]} seat, which governs ${bodyEn(o.weakest)}.\n▷ Movement — ${s.sinsal.some((x) => x.name === '역마살') ? 'with the Travel Horse, comings and goings are frequent; make the bustle your opportunity.' : 'rather than moving your seat lightly, deepening where you stand serves you better this year.'}`);
  push('The Twelve Months', (function () {
    const M = [['寅', 'early spring (Feb)'], ['卯', 'spring (Mar)'], ['辰', 'late spring (Apr)'], ['巳', 'early summer (May)'], ['午', 'summer (Jun)'], ['未', 'late summer (Jul)'], ['申', 'early autumn (Aug)'], ['酉', 'autumn (Sep)'], ['戌', 'late autumn (Oct)'], ['亥', 'early winter (Nov)'], ['子', 'winter (Dec)'], ['丑', 'late winter (Jan)']];
    const JIO = { 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수', 子: '수', 丑: '토' };
    const head = 'Each month carries its own energy; weighed against your Day Master, here are the months that lift you and those that drain you (by solar terms, so a few days may differ from the civil calendar).\n';
    return head + M.map((m) => {
      const el = JIO[m[0]];
      const tag = el === ys.element ? 'your useful element enters — most auspicious; attempt great things now' : (supportsDM(dm.ohaeng, el) ? 'energy supports you — act with confidence' : 'energy drains you — do not overreach; firm your knots');
      return `▷ ${m[1]} (${m[0]}, ${OHAENG_EN[el]}) — ${tag}.`;
    }).join('\n');
  })());
  push('Good Years and Cautionary Years', `${goodYearsEn(s)} A favorable stretch does not pour fortune upon the idle, nor does a cautionary one doom you to ruin. In good times, sow and gather diligently; in cautionary times, curb desire and guard your words and knots — and no year goes astray.\nGreat decisions — moving house, marriage, founding a venture, a large contract — run smoothest when matched to the years and months your useful element supports. Do not rush; choose the time.`);
  push('This Year in Summary', `In brief, this ${yg} year asks you, ${cd ? `upon the ${ssEn(cd.shishen)} Luck Pillar, ` : ''}to lean toward 'preparing' rather than 'launching'. Give of your strong ${OHAENG_EN[o.dominant]} to win people, feed your thin ${OHAENG_EN[ys.element]} to find balance, and small matters will gather into a great seat.\nDo not be impatient. Yours is not a destiny that bursts in a single year, but one that thickens like the rings of a tree, season upon season. A step today, a step tomorrow, and at last you reach the seat you longed for — so trust your grain and go steadily on.`);
  const ygSS = yg ? shishenOf(dm.hanja, yg[0]) : '';
  const ngSS = ng ? shishenOf(dm.hanja, ng[0]) : '';
  push(`The Year Ahead — ${nowY} & ${nowY + 1}`, `This year is ${yg}; weighed against your Day Master, its stem makes it a year of '${ssEn(ygSS)}' — that is, ${shishenFlowEn(ygSS)} ${cd ? `Upon this lies the larger grain of your ${ssEn(cd.shishen)} Luck Pillar, so read the two currents together.` : ''}\nIn life — ${shishenSceneEn(ygSS)}. Choose seed in spring, tend in summer, harvest in autumn — and you will not go astray.\nNext year, ${nowY + 1}, is ${ng}, a year of '${ssEn(ngSS)}': ${shishenFlowEn(ngSS)} Conclude what you firmed this year along that grain and step one pace further, and good word follows.`);
  push('The Rhythm of the Seasons', `In spring (寅卯辰) unfold new work and gather people; in summer (巳午未) reveal and announce; in autumn (申酉戌) harvest and conclude; in winter (亥子丑) store, rest and prepare. In the season your useful element ${OHAENG_EN[ys.element]} enters, matters run especially smooth.`);
  chap('Chapter 6 — Patterns and Remedies', 'the marks you carry, and the wisdom to use them');
  push('Sinsal — the Patterns', `${s.sinsal.length ? 'The sinsal in your chart are — ' + s.sinsal.map((x) => `${x.name} (${x.mean})`).join(', ') + '. They are not shackles of fortune but patterns marking the color of your energy; do not fear them, but use them.' : 'No marked sinsal stand out — yours is rather an even, clear-grained destiny.'} Your Void (空亡) is ${s.gongmang}; in that seat, empty your expectations rather than raise them high.`);
  push('Remedies and Things to Keep', `First, finish within seven days the one thing you have put off (turning your strong ${OHAENG_EN[o.dominant]} into harvest). Second, take up one habit feeding your useful element ${OHAENG_EN[ys.element]} — ${REMEDY_EN[ys.element]}. Third, make large decisions on the morning after full sleep; your ${OHAENG_EN[dm.ohaeng]} is clearest at dawn.\nAnd three words to keep long — give of your abundant ${OHAENG_EN[o.dominant]} and feed your thin ${OHAENG_EN[ys.element]}; treasure people as a storehouse, for benefactors arise there; the more urgent the matter, the more you should take one beat, for your resolve is truest unhurried.`);
  push('A Small Glossary to Keep', `The words of this book, gathered in one place to guide you when you open it again.\n▷ Saju (四柱) / Palja (八字) — the four pillars and eight characters of your birth year, month, day and hour.\n▷ Day Master (日干) — the stem of your birth day; 'you'. Yours is ${dm.hanja}.\n▷ Day Pillar (日柱) — the two characters of your birth day. Yours is ${P.day.hanja}.\n▷ Five Elements (五行) — Wood, Fire, Earth, Metal, Water. In you, ${OHAENG_EN[o.dominant]} runs thick and ${OHAENG_EN[o.weakest]} thin.\n▷ Ten Gods (十星) — the ten relations between the Day Master and the other letters, in five groups (Companion, Output, Wealth, Officer, Resource).\n▷ Strong / Weak (身强·身弱) — the strength of the Day Master. Yours is '${STRENGTH_EN[dm.strength] || dm.strength}'.\n▷ Useful Element (用神) — the most needful energy that evens the chart. Yours is ${OH_HAN[ys.element]} (${OHAENG_EN[ys.element]}).\n▷ Luck Pillar (大運) / Annual Luck (歲運) — the ten-year current and the single year's energy.\n▷ Twelve Stages (十二運星) — energy's strength likened to the twelve turns of a life.\n▷ Sinsal (神煞) — patterns where letters meet; the Void (空亡) is a seat best kept empty of expectation.`);

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
