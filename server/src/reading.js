'use strict';
/**
 * reading.js — 사주 데이터 → 무료 맛보기 / 유료 심층(왕후 어투)
 * 조선 왕후(중전마마)의 어투로, 사주 근거 + '실제 삶에서 이렇게 드러난다'는
 * 구체적 장면 예시를 담는다. AI 키가 있으면 Claude(Opus 4.8), 없으면 데이터 기반 mock.
 */
const ai = require('./ai');

const ROYAL_PERSONA = `너는 조선의 국모(國母), 중전마마이니라. 사주 명리를 꿰뚫어 보는 지혜로
백성 한 사람의 명(命)을 살펴 일러 준다. 어투는 조선 왕후의 말투로 하라:
위엄 있되 자애롭고, "~하오 / ~하리이다 / ~할지니 / ~함이 마땅하오 / ~하시구려 / 그대" 같은
궁중의 옛말을 쓰되, 뜻은 분명히 전하라. 점치는 말이 아니라 명리(命理)의 이치로 풀되,
의료·법률·투자·재무·심리치료를 단정적으로 대신하지 않으며 문화적·상징적으로 안내한다.`;

const GLOSSARY = `[십성 뜻] 비견:주체·동료·경쟁 / 겁재:추진·승부·재물변동 / 식신:표현·여유·재능·복록 /
상관:재능·언변·자유 / 편재:활동적 재물·사업·기회 / 정재:안정적 재물·성실·배우자 /
편관:도전·압박·권위(칠살) / 정관:명예·직책·규범 / 편인:직관·전문·고독 / 정인:학문·문서·인덕.
[십이운성] 장생·관대·건록·제왕=기운이 오르는 때, 쇠·병·사·묘=거두는 때, 절·태·양=전환·잉태·준비.`;

// 모든 호출에서 재사용되는 안정적 system (프롬프트 캐싱 대상)
const SYSTEM = `${ROYAL_PERSONA}\n\n${GLOSSARY}`;

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
async function freeReading(saju) {
  const user = `[사주]\n${sajuDeepBrief(saju)}\n
[명하노라] 위 사주로 '무료 맛보기'를 짓되, 조선 왕후의 어투로 하라.
- 세 단락, 각 2문장 이내(총 5문장 이내).
- ① 일간으로 본 그대의 타고난 그릇 한 줄 정의 ② 지금 흐름(현재 대운/강한 기운)의 한 장면 ③ 더 깊은 천기는 '심층'에서 밝혀짐을 품위 있게 암시.
- 광고 문구·마크다운 기호 금지. 자연스러운 옛말 문장으로.`;
  try {
    const text = await ai.generate(SYSTEM, user, { maxTokens: 2000 });
    if (text) return { text, source: 'ai' };
  } catch (e) { console.warn('[freeReading] AI 실패→mock:', e.message); }
  return { text: mockFree(saju), source: 'mock' };
}

/* ── 유료 심층: 길고 상세, 항목별 근거 + 실제 삶 예시, 왕후 어투(PDF용) ── */
async function paidReading(saju, question) {
  const q = (question || '').trim();
  const user = `[사주]\n${sajuDeepBrief(saju)}\n
[그대의 물음] ${q || '(따로 묻지 않음 — 명 전반을 살펴라)'}\n
[명하노라] 아래 항목을 모두, 조선 왕후의 어투로 상세히 지어라. 각 항목 제목을 '○ 제목' 형식으로 그대로 쓰고 줄바꿈으로 나누라.
규칙:
- 각 항목마다 반드시 (1)사주 근거(십성·오행·운성·대운·신살 중 해당하는 것을 콕 집어) → (2)"그 기운이 삶에서 이렇게 드러나오" 하는 구체적 장면 예시 1~2개를 든다.
- 예시는 막연하지 않게, 직장/돈/사람/선택의 실제 상황으로 생생하게.
- 위엄과 자애를 함께. 마크다운 기호(#,*) 금지.

○ 명(命)의 큰 그림
○ 타고난 성정과 그릇
○ 재물의 길
○ 일과 명예
○ 인연과 가정
○ 건강과 마음
○ 운(運)의 흐름 — 지금과 앞날
○ 그대 물음에 대한 답
○ 비방(秘方) — 지금 행할 세 가지
○ 왕후의 당부`;
  try {
    const text = await ai.generate(SYSTEM, user, { maxTokens: 8000 });
    if (text) return { text, source: 'ai' };
  } catch (e) { console.warn('[paidReading] AI 실패→mock:', e.message); }
  return { text: mockPaid(saju, q), source: 'mock' };
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

function mockPaid(s, q) {
  const dm = s.dayMaster, o = s.ohaeng, ts = topShishen(s);
  const ds = s.pillars.day; // 일주(배우자궁=일지)
  const cd = s.currentDaeun;
  const lack = o.lacking[0] || o.weakest;
  const sinsalNames = s.sinsal.map((x) => x.name);
  const sec = [];

  sec.push(`○ 명(命)의 큰 그림
그대는 ${dm.eumyang}${dm.ohaeng} 일간(${dm.hanja})을 기둥 삼아, 사주에 ${o.dominant}의 기운이 가장 두텁고 ${o.weakest}의 기운이 옅은 명이오(${s.pillarsText}). 이는 ${FLOW[o.dominant]} 힘은 넉넉하되, ${o.weakest}이 맡는 자리는 일부러 챙겨야 함을 이르오. 삶으로 보자면 — 한번 마음먹은 일은 끝을 보나, 마무리나 쉼이 필요한 길목에서 스스로를 너무 몰아세우는 장면이 거듭 나타나리이다.`);

  sec.push(`○ 타고난 성정과 그릇
일간이 ${dm.eumyang}${dm.ohaeng}이요, 십성으로는 ${ts.slice(0, 2).join('·') || '비견'}의 기운이 도드라지오. ${shishenLife(ts[0] || '비견')} 곁의 사람들은 그대를 두고 "겉은 단단한데 속은 정이 많다" 말하기 쉽소. 회의 자리에서 끝까지 제 뜻을 지키다가도, 정작 가까운 이의 부탁엔 약해지는 그 모습이 바로 이 기운이오.`);

  sec.push(`○ 재물의 길
재물은 재성(財星)과 식상(食傷)의 결로 보오. 그대 명에는 ${hasStar(s, ['편재', '정재']) ? '재성이 자리하여' : '재성이 드러나지 않아'} ${hasStar(s, ['편재', '정재']) ? '제 손으로 벌어 쥐는 힘이 있으니' : '큰 한탕보다 꾸준한 갈무리가 이로우니'}, ${hasStar(s, ['식신', '상관']) ? '재주(식상)가 재물로 이어지는 복도 따르오.' : '사람과의 신의를 앞세우면 재물이 뒤따라오리이다.'} 삶의 장면으로는 — 충동적으로 큰돈을 옮기려는 해보다, 작은 약속과 계약의 매듭을 또렷이 한 해에 곳간이 차오르오.`);

  sec.push(`○ 일과 명예
벼슬과 직(職)은 관성(官星)과 인성(印星)으로 보오. ${hasStar(s, ['정관', '편관']) ? '관성이 있어 책임과 직책이 그대를 찾고' : '관성이 옅어 남의 밑보다 제 영역을 세움이 어울리고'}, ${hasStar(s, ['정인', '편인']) ? '인성이 받쳐 배움과 문서의 덕이 있소.' : '배움은 스스로 길을 내어야 빛나오.'} ${cd ? `마침 지금은 ${cd.shishen}의 대운(${cd.han})이라 ${shishenFlow(cd.shishen)}` : ''} 장면으로는 — 윗사람이 맡긴 책임을 마다 않고 받아 든 자리에서 이름이 오르리이다.`);

  sec.push(`○ 인연과 가정
배우자의 자리는 일지(日支) ${ds.ji}(${ds.jiOhaeng})로 보오. ${ds.jiShishen.length ? `그 속의 기운이 ${ds.jiShishen.join('·')}이니, ` : ''}${sinsalNames.includes('도화살') ? '도화의 매력이 있어 사람이 절로 따르나, 인연의 무게를 가벼이 말 것이오.' : '겉보다 속의 결이 맞는 이와 오래가오.'} 삶의 장면으로는 — 화려한 만남보다, 그대의 침묵까지 읽어 주는 한 사람 곁에서 마음이 놓이리이다.`);

  sec.push(`○ 건강과 마음
${lack}의 기운이 옅으니, ${ohaengBody(lack)} 특히 무리한 뒤 ${ohaengBody(lack, true)} 신호가 오거든 몸이 보내는 전갈로 알고 쉬시오. 밤늦도록 일을 붙들다 다음 날 종일 가라앉는 장면이 잦거든, 그것이 바로 균형이 깨진 자리오.`);

  sec.push(`○ 운(運)의 흐름 — 지금과 앞날
${cd ? `지금 그대는 ${cd.han} 대운, ${cd.shishen}의 때를 지나오. ${shishenFlow(cd.shishen)}` : '대운의 큰 흐름 위에 서 있소.'}
앞날의 대운은 이러하오 — ${s.daeun.slice(0, 6).map((d) => `${d.age}세 ${d.han}(${d.shishen})`).join(', ')}. ${goodYears(s)} 장면으로는 — ${cd ? shishenScene(cd.shishen) : '맡은 일이 무르익는 해에 결실이 한꺼번에 오리이다.'}`);

  sec.push(`○ 그대 물음에 대한 답
${q ? `"${q}" 물었으니 답하오. ${cd ? `${cd.shishen}의 대운이 받치는 지금은 ` : ''}무겁게 밀어붙이기보다, 결을 맞춰 한 박자 고른 뒤 나아감이 마땅하오. ${hasStar(s, ['정관', '정재']) ? '바르게 갖추어 두면 길이 열리고' : '서두르면 탈이 나니'}, 때를 보아 움직이면 그르치지 않으리이다.` : '따로 묻지 않았으나, 명을 보매 지금은 벌이기보다 갖추기에 좋은 때이니 한 가지 뜻을 정하시오. 뜻이 서면 답은 절로 또렷해지오.'}`);

  sec.push(`○ 비방(秘方) — 지금 행할 세 가지
하나, 미뤄 둔 한 가지를 이레 안에 매듭지으시오(강한 ${o.dominant}을 결실로 돌리는 길이오).
둘, 옅은 ${lack}의 기운을 채우는 습(習)을 하나 들이시오 — ${ohaengRemedy(lack)}.
셋, 큰 결정은 충분히 잔 다음 날 아침에 내리시오. 그대의 ${dm.ohaeng} 기운은 새벽에 가장 맑소.`);

  sec.push(`○ 왕후의 당부
${s.input.name}, 그대의 명은 모자람이 아니라 '치우침'이오. 넘치는 ${o.dominant}을 베풀고, 옅은 ${lack}을 보태면, 명은 절로 둥글어지리이다. 이 글을 곳간에 간직하듯 지니고, 흔들릴 때마다 펼쳐 보시오. 과인이 그대의 앞길에 볕이 들기를 바라오.`);

  return sec.join('\n\n');
}

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

module.exports = { freeReading, paidReading, sajuDeepBrief };
