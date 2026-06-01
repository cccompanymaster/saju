'use strict';
/**
 * saju.js — 사주(四柱八字) 계산 모듈
 * lunar-javascript(검증된 만세력) 위에 한글 변환·해석 데이터를 입힌다.
 */
const { Solar, Lunar } = require('lunar-javascript');

/* ── 한자 → 한글 매핑 ── */
const GAN = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
const JI  = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const GAN_OHAENG = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const GAN_EUMYANG = { 甲: '양', 乙: '음', 丙: '양', 丁: '음', 戊: '양', 己: '음', 庚: '양', 辛: '음', 壬: '양', 癸: '음' };
const SHISHEN = { 比肩: '비견', 劫财: '겁재', 食神: '식신', 伤官: '상관', 偏财: '편재', 正财: '정재', 七杀: '편관', 正官: '정관', 偏印: '편인', 正印: '정인' };
const ZODIAC = { 鼠: '쥐', 牛: '소', 虎: '호랑이', 兔: '토끼', 龙: '용', 蛇: '뱀', 马: '말', 羊: '양', 猴: '원숭이', 鸡: '닭', 狗: '개', 猪: '돼지' };
const OHAENG_DESC = {
  목: '나무처럼 뻗어 나가는 성장·기획의 기운',
  화: '불처럼 빛나고 표현하는 열정·확산의 기운',
  토: '흙처럼 중심을 잡아주는 신뢰·포용의 기운',
  금: '쇠처럼 단단하게 매듭짓는 결단·정리의 기운',
  수: '물처럼 흐르며 스며드는 지혜·유연의 기운',
};

/** 간지 한자 두 글자(예: 庚午) → { hanja, han, gan, ji, ohaeng, eumyang } */
function pillar(ganzhi) {
  const g = ganzhi[0], j = ganzhi[1];
  return {
    hanja: ganzhi,
    han: (GAN[g] || g) + (JI[j] || j),
    gan: GAN[g] || g,
    ji: JI[j] || j,
    ohaeng: GAN_OHAENG[g] || '',
    eumyang: GAN_EUMYANG[g] || '',
  };
}

/**
 * 사주 계산
 * @param {object} input
 *  - birthdate: 'YYYY-MM-DD'
 *  - hour, minute: number (모름이면 unknownTime=true)
 *  - calendar: 'solar' | 'lunar' | 'leap'
 *  - unknownTime: boolean
 *  - gender: 'M'|'F'|'O', name: string
 */
function computeSaju(input) {
  const { birthdate, calendar = 'solar', unknownTime = false } = input;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(birthdate || '').trim());
  if (!m) throw new Error('생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD).');
  const [Y, M, D] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const hour = unknownTime ? 12 : clampInt(input.hour, 0, 23, 12);
  const minute = unknownTime ? 0 : clampInt(input.minute, 0, 59, 0);

  // 음력/윤달 → 양력 변환
  let solar;
  if (calendar === 'lunar' || calendar === 'leap') {
    const month = calendar === 'leap' ? -M : M; // 윤달은 음수 월
    const lunar = Lunar.fromYmdHms(Y, month, D, hour, minute, 0);
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(Y, M, D, hour, minute, 0);
  }

  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const pillars = {
    year: pillar(ec.getYear()),
    month: pillar(ec.getMonth()),
    day: pillar(ec.getDay()),
    hour: unknownTime ? null : pillar(ec.getTime()),
  };

  const dayMaster = pillars.day.gan;                 // 일간 = '나'
  const dayMasterHanja = ec.getDayGan();
  const ohaeng = countOhaeng(ec, unknownTime);

  // 십성 (가능한 자리만)
  const shishen = {
    year: SHISHEN[ec.getYearShiShenGan()] || '',
    month: SHISHEN[ec.getMonthShiShenGan()] || '',
    hour: unknownTime ? '' : (SHISHEN[ec.getTimeShiShenGan()] || ''),
  };

  return {
    input: {
      name: (input.name || '').trim() || '고객',
      gender: input.gender || 'O',
      birthdate, calendar, unknownTime,
      hour, minute,
      birthPlace: (input.birthPlace || '').trim(),
    },
    solar: solar.toYmd(),
    lunar: `${lunar.getYear()}-${pad2(Math.abs(lunar.getMonth()))}-${pad2(lunar.getDay())}${lunar.getMonth() < 0 ? ' (윤달)' : ''}`,
    zodiac: ZODIAC[lunar.getYearShengXiao()] || lunar.getYearShengXiao(),
    pillars,
    dayMaster: {
      gan: dayMaster,
      hanja: dayMasterHanja,
      ohaeng: GAN_OHAENG[dayMasterHanja] || '',
      eumyang: GAN_EUMYANG[dayMasterHanja] || '',
      desc: OHAENG_DESC[GAN_OHAENG[dayMasterHanja]] || '',
    },
    ohaeng,           // {목,화,토,금,수: count} + dominant/lacking
    shishen,
    pillarsText: pillarsText(pillars, unknownTime),
  };
}

function countOhaeng(ec, unknownTime) {
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const gans = [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan()];
  if (!unknownTime) gans.push(ec.getTimeGan());
  gans.forEach((g) => { const o = GAN_OHAENG[g]; if (o) count[o]++; });
  // 지지의 오행도 가볍게 반영
  const JI_OHAENG = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' };
  const jis = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi()];
  if (!unknownTime) jis.push(ec.getTimeZhi());
  jis.forEach((j) => { const o = JI_OHAENG[j]; if (o) count[o]++; });

  const entries = Object.entries(count);
  const dominant = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const lacking = entries.filter(([, v]) => v === 0).map(([k]) => k);
  return { count, dominant, lacking };
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

function pad2(n) { return String(n).padStart(2, '0'); }

function clampInt(v, lo, hi, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

module.exports = { computeSaju, OHAENG_DESC };
