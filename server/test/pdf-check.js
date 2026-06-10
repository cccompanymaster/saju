'use strict';
/**
 * pdf-check.js — PDF 사주첩 회귀 테스트
 * - KO/EN 페이지 수 30~40 범위 검증 (chromium 필요 — 없으면 skip)
 * - 핵심 구성(일주 물상·띠·용어 풀이·세운 십성) 포함 검증
 * 실행: npm run test:pdf
 */
const assert = require('assert');
const { computeSaju } = require('../src/saju');
const { paidReading, freeReading } = require('../src/reading');
const { renderPdf } = require('../src/pdf');

let PDFDocument = null;
try { ({ PDFDocument } = require('pdf-lib')); } catch (_) {}

const checks = [];
function check(name, cond) { checks.push({ name, ok: !!cond }); console.log((cond ? '  ✓ ' : '  ✗ ') + name); }

(async () => {
  const s = computeSaju({ name: '민지', gender: 'F', birthdate: '1995-07-22', hour: 14, minute: 0, birthPlace: '서울', trueSolarTime: true });
  const sEn = computeSaju({ name: 'Mina', gender: 'F', birthdate: '1995-07-22', hour: 14, minute: 0, birthPlace: 'Seoul', trueSolarTime: true });

  // 1) 본문 구성 (mock 기준 — PDF 없이도 검증)
  const ko = await paidReading(s, '올해 이직을 해도 될까요?', 'ko');
  check('KO: 일주 물상 포함', ko.text.includes('물상'));
  check('KO: 띠 풀이 포함', ko.text.includes('띠 풀이'));
  check('KO: 용어 풀이 장 포함', ko.text.includes('명리(命理)의 첫걸음'));
  check('KO: 십성 두 별 풀이(비견·겁재)', ko.text.includes('비견(比肩)') && ko.text.includes('겁재(劫財)'));
  check('KO: 세운 십성 분석', /십성으로 '(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)'의 해/.test(ko.text));
  check('KO: 열두 달 흐름', ko.text.includes('열두 달'));

  const en = await paidReading(sEn, 'Should I change jobs this year?', 'en');
  check('EN: Day Pillar portrait', en.text.includes('Mulsang'));
  check('EN: Zodiac section', en.text.includes('Zodiac Year'));
  check('EN: Primer chapter', en.text.includes('First Steps in Myeongri'));
  check('EN: Twelve Months', en.text.includes('The Twelve Months'));

  // 무료 맛보기에 일주 물상 한 줄
  const free = await freeReading(s, 'ko');
  check('KO free: 일주/물상 언급', /일주|격이라/.test(free.text));

  // 2) PDF 페이지 수 (chromium 있으면)
  const pdfKo = await renderPdf(s, ko.text, '올해 이직을 해도 될까요?', 'ko');
  if (!pdfKo || !PDFDocument) {
    console.log('⚠ chromium/pdf-lib 없음 → 페이지 수 검증 skip');
  } else {
    const nKo = (await PDFDocument.load(pdfKo)).getPageCount();
    check(`KO PDF 30~40p (실측 ${nKo}p)`, nKo >= 30 && nKo <= 40);
    const pdfEn = await renderPdf(sEn, en.text, 'Should I change jobs this year?', 'en');
    const nEn = (await PDFDocument.load(pdfEn)).getPageCount();
    check(`EN PDF 30~40p (실측 ${nEn}p)`, nEn >= 30 && nEn <= 40);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${failed.length ? '✗ 실패 ' + failed.length + '/' + checks.length : '✓ 전체 통과 (' + checks.length + ')'}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('✗ 오류:', e); process.exit(1); });
