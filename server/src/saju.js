'use strict';
/**
 * saju.js — 사주(四柱八字) 심층 계산 모듈 (철학관 이상 수준)
 * lunar-javascript(검증된 만세력) 위에 한글 변환·십성·지장간·십이운성·
 * 납음·공망·대운(10년)·신살(역마·도화·화개·천을귀인)을 더한다.
 */
const { Solar, Lunar } = require('lunar-javascript');

/* ── 한자 → 한글 ── */
const GAN = { 甲:'갑', 乙:'을', 丙:'병', 丁:'정', 戊:'무', 己:'기', 庚:'경', 辛:'신', 壬:'임', 癸:'계' };
const JI  = { 子:'자', 丑:'축', 寅:'인', 卯:'묘', 辰:'진', 巳:'사', 午:'오', 未:'미', 申:'신', 酉:'유', 戌:'술', 亥:'해' };
const GAN_OHAENG = { 甲:'목', 乙:'목', 丙:'화', 丁:'화', 戊:'토', 己:'토', 庚:'금', 辛:'금', 壬:'수', 癸:'수' };
const GAN_EUMYANG = { 甲:'양', 乙:'음', 丙:'양', 丁:'음', 戊:'양', 己:'음', 庚:'양', 辛:'음', 壬:'양', 癸:'음' };
const JI_OHAENG = { 子:'수', 丑:'토', 寅:'목', 卯:'목', 辰:'토', 巳:'화', 午:'화', 未:'토', 申:'금', 酉:'금', 戌:'토', 亥:'수' };
const SHISHEN = { 比肩:'비견', 劫财:'겁재', 食神:'식신', 伤官:'상관', 偏财:'편재', 正财:'정재', 七杀:'편관', 正官:'정관', 偏印:'편인', 正印:'정인' };
const DISHI = { 长生:'장생', 沐浴:'목욕', 冠带:'관대', 临官:'건록', 帝旺:'제왕', 衰:'쇠', 病:'병', 死:'사', 墓:'묘', 绝:'절', 胎:'태', 养:'양' };
const ZODIAC = { 鼠:'쥐', 牛:'소', 虎:'호랑이', 兔:'토끼', 龙:'용', 蛇:'뱀', 马:'말', 羊:'양', 猴:'원숭이', 鸡:'닭', 狗:'개', 猪:'돼지' };

const OHAENG_DESC = {
  목: '나무처럼 뻗어 나가는 성장·기획의 기운',
  화: '불처럼 빛나고 표현하는 열정·확산의 기운',
  토: '흙처럼 중심을 잡아주는 신뢰·포용의 기운',
  금: '쇠처럼 단단하게 매듭짓는 결단·정리의 기운',
  수: '물처럼 흐르며 스며드는 지혜·유연의 기운',
};
/* 십성 한 줄 의미(해석 보조) */
const SHISHEN_MEAN = {
  비견: '주체·동료·경쟁(나와 같은 힘)', 겁재: '추진·승부·재물 변동(나와 다른 동력)',
  식신: '표현·여유·재능·먹을 복', 상관: '재능·표현·구속을 싫어함·언변',
  편재: '활동적 재물·사업·기회·이성', 정재: '안정적 재물·성실·배우자·관리',
  편관: '도전·압박·권위·결단(칠살)', 정관: '명예·직책·규범·책임',
  편인: '직관·전문·임기응변·고독', 정인: '학문·보호·문서·어머니·인덕',
};
const DISHI_MEAN = {
  장생: '새로 태어나 자라나는 기운', 목욕: '꾸미고 시행착오를 겪는 기운', 관대: '사회로 나아가 갖추는 기운',
  건록: '제 힘으로 자리를 얻는 전성의 초입', 제왕: '기운이 가장 왕성한 정점', 쇠: '정점을 지나 수그러드는 기운',
  병: '잠시 쉬어가며 약해지는 기운', 사: '활동을 거두고 정리하는 기운', 묘: '갈무리하여 저장하는 기운',
  절: '끊어졌다 다시 이어지는 전환', 태: '새 생명을 잉태하는 기운', 양: '품어 기르며 준비하는 기운',
};

/* 오행 생극 */
const SHENG = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };  // A생B
const KE    = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };  // A극B
const GEN_BY = { 목:'수', 화:'목', 토:'화', 금:'토', 수:'금' };  // E를 생하는 오행
const KE_BY  = { 목:'금', 토:'목', 수:'토', 화:'수', 금:'화' };  // E를 극하는 오행
const OHAENG_HAN = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };

/* 일간 기준 천간의 십성 계산 (대운 등) */
function shishenOf(dmHanja, tHanja) {
  const dmO = GAN_OHAENG[dmHanja], dmY = GAN_EUMYANG[dmHanja];
  const tO = GAN_OHAENG[tHanja], tY = GAN_EUMYANG[tHanja];
  const same = dmY === tY;
  if (tO === dmO) return same ? '비견' : '겁재';
  if (SHENG[dmO] === tO) return same ? '식신' : '상관';
  if (KE[dmO] === tO) return same ? '편재' : '정재';
  if (KE[tO] === dmO) return same ? '편관' : '정관';
  if (SHENG[tO] === dmO) return same ? '편인' : '정인';
  return '';
}

/* ── 신살(표준 삼합 기준) ── */
const SAMHAP = { // 그룹 키 → 지지들
  수: ['申', '子', '辰'], 목: ['亥', '卯', '未'], 화: ['寅', '午', '戌'], 금: ['巳', '酉', '丑'],
};
function samhapKey(ji) { for (const k in SAMHAP) if (SAMHAP[k].includes(ji)) return k; return null; }
const YEOKMA = { 수:'寅', 목:'巳', 화:'申', 금:'亥' };   // 역마
const DOHWA  = { 수:'酉', 목:'子', 화:'卯', 금:'午' };   // 도화(연살)
const HWAGAE = { 수:'辰', 목:'未', 화:'戌', 금:'丑' };   // 화개
const CHEONEUL = { // 천을귀인 (일간 기준)
  甲:['丑','未'], 戊:['丑','未'], 庚:['丑','未'], 乙:['子','申'], 己:['子','申'],
  丙:['亥','酉'], 丁:['亥','酉'], 壬:['巳','卯'], 癸:['巳','卯'], 辛:['午','寅'],
};

function computeSinsal(branches, dayGanHanja, dayZhi, yearZhi, dayGanzhi) {
  const found = [];
  const baseKey = samhapKey(dayZhi) || samhapKey(yearZhi);
  const has = (ji) => branches.includes(ji);
  if (baseKey) {
    if (has(YEOKMA[baseKey])) found.push({ name: '역마살', mean: '이동·변동·여행·해외·바쁜 활동' });
    if (has(DOHWA[baseKey])) found.push({ name: '도화살', mean: '매력·인기·예술·이성의 끌림' });
    if (has(HWAGAE[baseKey])) found.push({ name: '화개살', mean: '학문·예술·종교·고독한 깊이' });
  }
  const ce = CHEONEUL[dayGanHanja] || [];
  if (ce.some(has)) found.push({ name: '천을귀인', mean: '귀인의 도움·위기에서 길이 열림' });
  // 특수 일주: 괴강·백호 (일주 간지 기준)
  if (['庚辰', '庚戌', '壬辰', '戊戌'].includes(dayGanzhi)) {
    found.push({ name: '괴강살', mean: '강한 카리스마·결단·우두머리 기질(일주)' });
  }
  if (['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'].includes(dayGanzhi)) {
    found.push({ name: '백호살', mean: '강렬한 집중력·승부 기질, 안전과 과로 주의(일주)' });
  }
  return found;
}

/* ── 신강/신약 + 용신(억부) ── */
const TEN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 일간 대비 오행이 '나를 돕는(印·比)'쪽이면 +, '덜어내는(食傷·財·官)'쪽이면 -
function isSupporter(dmO, e) { return e === dmO || GEN_BY[dmO] === e; }

/**
 * 일간 신강/신약 판정 + 억부용신
 * 월지(득령)·일지·지지(지장간)·천간에 가중치를 두어 부조(扶)와 억(抑)의 세력을 비교.
 */
function analyzeStrength(ec, dayGanHanja, unknownTime) {
  const dmO = GAN_OHAENG[dayGanHanja];
  let support = 0, drain = 0;
  const add = (e, w) => { if (!e) return; if (isSupporter(dmO, e)) support += w; else drain += w; };

  // 천간 (일간 자신은 부조로 가산)
  add(GAN_OHAENG[ec.getYearGan()], 1.0);
  add(GAN_OHAENG[ec.getMonthGan()], 1.5);
  add(dmO, 1.0); // 일간 본인
  if (!unknownTime) add(GAN_OHAENG[ec.getTimeGan()], 1.0);

  // 지지(주된 지장간의 오행) — 월지 득령 최대 가중
  const branchPrimary = (hide) => GAN_OHAENG[(hide || [])[0]] || '';
  add(branchPrimary(ec.getYearHideGan()), 1.5);
  add(branchPrimary(ec.getMonthHideGan()), 3.0); // 월령
  add(branchPrimary(ec.getDayHideGan()), 2.0);  // 일지
  if (!unknownTime) add(branchPrimary(ec.getTimeHideGan()), 1.5);

  const total = support + drain || 1;
  const score = Math.round((support / total) * 100); // 부조 비율(%)
  let label;
  if (score >= 58) label = '신강';
  else if (score <= 42) label = '신약';
  else label = '중화';

  // 억부용신
  const cand = {
    인성: GEN_BY[dmO], 비겁: dmO,
    식상: SHENG[dmO], 재성: KE[dmO], 관성: KE_BY[dmO],
  };
  let yongsin, reason;
  if (label === '신강') {
    // 강한 일간은 덜어내야 — 식상/재/관 중 사주에서 가장 옅은 오행으로 균형
    yongsin = weakestOf(ec, unknownTime, [cand.식상, cand.재성, cand.관성]);
    reason = `일간이 강하니 ${OHAENG_HAN[yongsin]}(${yongsin})으로 기운을 덜어 흐름을 트는 것이 이롭습니다.`;
  } else if (label === '신약') {
    // 약한 일간은 도와야 — 인성/비겁 중 더 옅은 오행
    yongsin = weakestOf(ec, unknownTime, [cand.인성, cand.비겁]);
    reason = `일간이 약하니 ${OHAENG_HAN[yongsin]}(${yongsin})으로 뿌리를 받쳐 힘을 보태는 것이 이롭습니다.`;
  } else {
    // 중화 — 가장 부족한 오행을 보충(통관·조후 간략)
    yongsin = weakestOf(ec, unknownTime, ['목', '화', '토', '금', '수']);
    reason = `기운이 고르니 가장 옅은 ${OHAENG_HAN[yongsin]}(${yongsin})을 보충하면 더 둥글어집니다.`;
  }
  return { label, score, yongsin: { element: yongsin, hanja: OHAENG_HAN[yongsin], reason } };
}

function weakestOf(ec, unknownTime, candidates) {
  const cnt = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const gans = [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan()];
  const jis = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi()];
  if (!unknownTime) { gans.push(ec.getTimeGan()); jis.push(ec.getTimeZhi()); }
  gans.forEach((g) => { const o = GAN_OHAENG[g]; if (o) cnt[o]++; });
  jis.forEach((j) => { const o = JI_OHAENG[j]; if (o) cnt[o]++; });
  const uniq = candidates.filter((e, i) => e && candidates.indexOf(e) === i);
  return uniq.reduce((a, b) => (cnt[b] < cnt[a] ? b : a), uniq[0]);
}

/* ── 진태양시(경도) 보정 ── */
const CITY_LON = {
  서울: 126.98, seoul: 126.98, 인천: 126.71, incheon: 126.71, 수원: 127.03,
  부산: 129.08, busan: 129.08, 대구: 128.6, daegu: 128.6, 광주: 126.85, gwangju: 126.85,
  대전: 127.38, daejeon: 127.38, 울산: 129.31, ulsan: 129.31, 제주: 126.53, jeju: 126.53,
  춘천: 127.73, 강릉: 128.9, 전주: 127.15, 청주: 127.49, 포항: 129.36, 창원: 128.68,
  평양: 125.75, 도쿄: 139.69, tokyo: 139.69, 오사카: 135.5, 뉴욕: -74.0, newyork: -74.0,
  la: -118.24, '로스앤젤레스': -118.24, london: -0.13, 런던: -0.13, 베이징: 116.4, beijing: 116.4,
};
function lonOf(place) {
  const key = String(place || '').trim().toLowerCase().replace(/\s|시$|특별시$|광역시$/g, '');
  for (const k in CITY_LON) { if (k.toLowerCase() === key || key.includes(k.toLowerCase())) return CITY_LON[k]; }
  return 127.5; // 한반도 평균(미상)
}
function shiftClock(Y, M, D, h, mi, offsetMin) {
  const dt = new Date(Date.UTC(Y, M - 1, D, h, mi));
  dt.setUTCMinutes(dt.getUTCMinutes() + offsetMin);
  return { Y: dt.getUTCFullYear(), M: dt.getUTCMonth() + 1, D: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
}

/* ── 보조 ── */
function pad2(n) { return String(n).padStart(2, '0'); }
function clampInt(v, lo, hi, dflt) { const n = parseInt(v, 10); return Number.isNaN(n) ? dflt : Math.max(lo, Math.min(hi, n)); }
function ganHan(h) { return GAN[h] || h; }
function jiHan(h) { return JI[h] || h; }
function gzHan(gz) { return (GAN[gz[0]] || gz[0]) + (JI[gz[1]] || gz[1]); }

function pillar(ganzhi, dishiHanja, hideGanArr, zhiShishenArr) {
  const g = ganzhi[0], j = ganzhi[1];
  return {
    hanja: ganzhi, han: ganHan(g) + jiHan(j),
    gan: ganHan(g), ji: jiHan(j),
    ohaeng: GAN_OHAENG[g] || '', eumyang: GAN_EUMYANG[g] || '',
    jiOhaeng: JI_OHAENG[j] || '',
    dishi: DISHI[dishiHanja] || dishiHanja || '',
    hideGan: (hideGanArr || []).map((x) => ganHan(x)),
    jiShishen: (zhiShishenArr || []).map((x) => SHISHEN[x] || x),
  };
}

/**
 * 사주 심층 계산
 */
function computeSaju(input) {
  const { birthdate, calendar = 'solar', unknownTime = false } = input;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(birthdate || '').trim());
  if (!m) throw new Error('생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD).');
  const [Y, M, D] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const hour = unknownTime ? 12 : clampInt(input.hour, 0, 23, 12);
  const minute = unknownTime ? 0 : clampInt(input.minute, 0, 59, 0);
  const gender = input.gender || 'O';

  let solar;
  if (calendar === 'lunar' || calendar === 'leap') {
    const month = calendar === 'leap' ? -M : M;
    solar = Lunar.fromYmdHms(Y, month, D, hour, minute, 0).getSolar();
  } else {
    solar = Solar.fromYmdHms(Y, M, D, hour, minute, 0);
  }

  // 진태양시 보정(옵션): 출생지 경도 기준으로 시계시각을 보정해 시주를 더 정확히
  let trueSolar = { applied: false };
  if (input.trueSolarTime && !unknownTime) {
    const lon = Number(input.birthLongitude) || lonOf(input.birthPlace);
    const offsetMin = Math.round((lon - 135) * 4); // 표준시(135°E) 대비 분 보정
    if (offsetMin !== 0) {
      const c = shiftClock(solar.getYear(), solar.getMonth(), solar.getDay(), solar.getHour(), solar.getMinute(), offsetMin);
      solar = Solar.fromYmdHms(c.Y, c.M, c.D, c.h, c.mi, 0);
    }
    trueSolar = { applied: true, lon, offsetMin };
  }

  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const dayGanHanja = ec.getDayGan();

  const pillars = {
    year: pillar(ec.getYear(), ec.getYearDiShi(), ec.getYearHideGan(), ec.getYearShiShenZhi()),
    month: pillar(ec.getMonth(), ec.getMonthDiShi(), ec.getMonthHideGan(), ec.getMonthShiShenZhi()),
    day: pillar(ec.getDay(), ec.getDayDiShi(), ec.getDayHideGan(), ec.getDayShiShenZhi()),
    hour: unknownTime ? null : pillar(ec.getTime(), ec.getTimeDiShi(), ec.getTimeHideGan(), ec.getTimeShiShenZhi()),
  };

  // 천간 십성(라이브러리)
  const shishen = {
    year: SHISHEN[ec.getYearShiShenGan()] || '',
    month: SHISHEN[ec.getMonthShiShenGan()] || '',
    day: '일간(나)',
    hour: unknownTime ? '' : (SHISHEN[ec.getTimeShiShenGan()] || ''),
  };

  const ohaeng = countOhaeng(ec, unknownTime);
  const strength = analyzeStrength(ec, dayGanHanja, unknownTime);

  // 신살
  const branches = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi()];
  if (!unknownTime) branches.push(ec.getTimeZhi());
  const sinsal = computeSinsal(branches, dayGanHanja, ec.getDayZhi(), ec.getYearZhi(), ec.getDay());

  // 대운
  const yun = ec.getYun(gender === 'M' ? 1 : 0);
  const startYear = yun.getStartYear();
  const startMonth = yun.getStartMonth();
  const daYunList = yun.getDaYun() || [];
  const daeun = [];
  daYunList.forEach((d) => {
    const gz = d.getGanZhi();
    if (!gz) return; // 기운 전(출생~) 빈 칸 제외
    const g = gz[0];
    daeun.push({
      age: d.getStartAge(),
      year: d.getStartYear(),
      hanja: gz, han: gzHan(gz),
      gan: ganHan(g), ji: jiHan(gz[1]),
      ohaeng: GAN_OHAENG[g] || '',
      shishen: shishenOf(dayGanHanja, g),
    });
  });
  // 현재 대운
  const nowYear = new Date().getFullYear();
  const age = nowYear - Y;
  let currentDaeun = null;
  for (let i = 0; i < daeun.length; i++) {
    const next = daeun[i + 1];
    if (daeun[i].age <= age && (!next || age < next.age)) { currentDaeun = daeun[i]; break; }
  }
  if (!currentDaeun && daeun.length) currentDaeun = age < daeun[0].age ? daeun[0] : daeun[daeun.length - 1];

  return {
    input: {
      name: (input.name || '').trim() || '귀인',
      gender, birthdate, calendar, unknownTime, hour, minute,
      birthPlace: (input.birthPlace || '').trim(),
      age,
    },
    trueSolar,
    solar: solar.toYmd(),
    lunar: `${lunar.getYear()}-${pad2(Math.abs(lunar.getMonth()))}-${pad2(lunar.getDay())}${lunar.getMonth() < 0 ? ' (윤달)' : ''}`,
    zodiac: ZODIAC[lunar.getYearShengXiao()] || lunar.getYearShengXiao(),
    pillars,
    dayMaster: {
      gan: ganHan(dayGanHanja), hanja: dayGanHanja,
      ohaeng: GAN_OHAENG[dayGanHanja] || '', eumyang: GAN_EUMYANG[dayGanHanja] || '',
      desc: OHAENG_DESC[GAN_OHAENG[dayGanHanja]] || '',
      strength: strength.label, strengthScore: strength.score,
      yongsin: strength.yongsin,
    },
    ohaeng,
    shishen,
    sinsal,
    nayin: { day: ec.getDayNaYin(), year: ec.getYearNaYin() },
    gongmang: (ec.getDayXunKong() || '').split('').map((x) => jiHan(x)).join('·'),
    palace: { taiyuan: gzHan(ec.getTaiYuan()), minggong: gzHan(ec.getMingGong()) },
    daeun,
    daeunStart: { year: startYear, month: startMonth },
    currentDaeun,
    pillarsText: pillarsText(pillars, unknownTime),
    glossary: { SHISHEN_MEAN, DISHI_MEAN, OHAENG_DESC },
  };
}

function countOhaeng(ec, unknownTime) {
  const count = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  const gans = [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan()];
  const jis = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi()];
  if (!unknownTime) { gans.push(ec.getTimeGan()); jis.push(ec.getTimeZhi()); }
  gans.forEach((g) => { const o = GAN_OHAENG[g]; if (o) count[o]++; });
  jis.forEach((j) => { const o = JI_OHAENG[j]; if (o) count[o]++; });
  const entries = Object.entries(count);
  const dominant = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const lacking = entries.filter(([, v]) => v === 0).map(([k]) => k);
  return { count, dominant, weakest, lacking };
}

function pillarsText(p, unknownTime) {
  const parts = [
    `년주 ${p.year.hanja}(${p.year.han})`,
    `월주 ${p.month.hanja}(${p.month.han})`,
    `일주 ${p.day.hanja}(${p.day.han})`,
  ];
  if (!unknownTime && p.hour) parts.push(`시주 ${p.hour.hanja}(${p.hour.han})`);
  return parts.join(' · ');
}

module.exports = { computeSaju, shishenOf, OHAENG_DESC };
