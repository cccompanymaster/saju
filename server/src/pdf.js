'use strict';
/**
 * pdf.js — 유료 심층 사주를 '한지풍 PDF 사주첩'으로 렌더링
 * - 나눔명조(내장, base64)로 어디서든 한글이 정확히 출력됨
 * - Playwright(chromium)로 HTML→PDF. 없으면 null 반환(텍스트 메일로 폴백).
 */
const fs = require('fs');
const path = require('path');

let chromium = null;
try { chromium = require('playwright').chromium; }
catch (_) { try { chromium = require('playwright-core').chromium; } catch (e) { /* optional */ } }

/* 폰트 base64 (1회 캐시) */
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
let FONT_CSS = null;
function fontFaceCss() {
  if (FONT_CSS !== null) return FONT_CSS;
  function b64(f) { try { return fs.readFileSync(path.join(FONT_DIR, f)).toString('base64'); } catch (_) { return ''; } }
  const reg = b64('NanumMyeongjo-Regular.ttf');
  const bold = b64('NanumMyeongjo-ExtraBold.ttf');
  FONT_CSS = `
    ${reg ? `@font-face{font-family:'NM';font-weight:400;src:url(data:font/ttf;base64,${reg}) format('truetype');}` : ''}
    ${bold ? `@font-face{font-family:'NM';font-weight:800;src:url(data:font/ttf;base64,${bold}) format('truetype');}` : ''}`;
  return FONT_CSS;
}

const O_COLOR = { 목: '#2e6da4', 화: '#c0392b', 토: '#c9a227', 금: '#6b7178', 수: '#2b2b38' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function pillarCol(label, p) {
  if (!p) return `<td class="mx"><div class="lbl">${label}</div><div class="gan" style="color:#999">·</div><div class="ji" style="color:#999">·</div><div class="sub">모름</div><div class="sub"></div><div class="sub"></div></td>`;
  return `<td class="mx">
    <div class="lbl">${label}</div>
    <div class="gan" style="color:${O_COLOR[p.ohaeng] || '#221b14'}">${esc(p.hanja[0])}</div>
    <div class="ji" style="color:${O_COLOR[p.jiOhaeng] || '#221b14'}">${esc(p.hanja[1])}</div>
    <div class="sub">${esc(p.han)}</div>
    <div class="sub">${esc(p.dishi || '')}</div>
    <div class="sub">${esc(p.hideGan.join('·'))}</div>
  </td>`;
}

function ohaengBars(o) {
  const max = Math.max.apply(null, Object.values(o.count)) || 1;
  return ['목', '화', '토', '금', '수'].map((k) => {
    const pct = Math.round((o.count[k] / max) * 100);
    return `<div class="ob"><span class="obn">${k}</span><span class="obt"><span class="obf" style="width:${pct}%;background:${O_COLOR[k]}"></span></span><span class="obc">${o.count[k]}</span></div>`;
  }).join('');
}

function daeunStrip(s) {
  return s.daeun.slice(0, 8).map((d) => {
    const on = s.currentDaeun && d.age === s.currentDaeun.age;
    return `<div class="du ${on ? 'on' : ''}"><div class="dua">${d.age}세</div><div class="duh">${esc(d.han)}</div><div class="dus">${esc(d.shishen)}</div></div>`;
  }).join('');
}

function readingHtml(text) {
  return String(text || '').split('\n').map((line) => {
    const t = line.trim();
    if (!t) return '';
    if (/^○\s/.test(t)) return `<h2 class="rh">${esc(t.replace(/^○\s*/, ''))}</h2>`;
    return `<p class="rp">${esc(t)}</p>`;
  }).join('');
}

const L = {
  ko: {
    cover_sub: '御 覽 四 柱 帖', booklet: '님의 사주첩', issued: '간행', gender: { M: '남', F: '여', O: '-' },
    myeong: '사주 명식 (四柱命式)', pHour: '시주', pDay: '일주(나)', pMonth: '월주', pYear: '년주', unknown: '모름',
    dm: '일간(나)', strength: '신강·신약', support: '부조세력', yongsin: '억부용신', truesolar: '진태양시 보정',
    ohaeng: '오행 분포 (五行)', strong: '강한 기운', weak: '약한 기운', sinsalHead: '신살·공망·납음', noSinsal: '두드러진 신살 없음',
    gongmang: '공망(空亡)', nayin: '납음(納音): 일주', daeun: '대운 (大運) · 10년의 흐름', now: '현재 약', nowMid: '세 —', nowEnd: '의 때',
    ask: '묻기를 —', foot1: '조선사주는 마자샘 김경희의 특허출원 리딩 구조를 바탕으로 합니다.',
    foot2: '사주·명리의 상징 체계를 함께 읽는 문화적·상징적 리딩이며, 의료·법률·투자·재무·심리치료 등 전문 자문을 대체하지 않습니다.',
  },
  en: {
    cover_sub: 'ROYAL SAJU BOOKLET · 御覽四柱帖', booklet: "'s Saju booklet", issued: 'Issued', gender: { M: 'M', F: 'F', O: '-' },
    myeong: 'Four Pillars (四柱命式)', pHour: 'Hour', pDay: 'Day (me)', pMonth: 'Month', pYear: 'Year', unknown: 'unknown',
    dm: 'Day Master (me)', strength: 'Strength', support: 'support', yongsin: 'Useful element', truesolar: 'true-solar adj.',
    ohaeng: 'Five Elements (五行)', strong: 'strongest', weak: 'weakest', sinsalHead: 'Sinsal · Void · Najang', noSinsal: 'no marked sinsal',
    gongmang: 'Void (空亡)', nayin: 'Najang (納音): day', daeun: 'Luck Pillars (大運) · the decades', now: 'now ~age', nowMid: ' —', nowEnd: '',
    ask: 'You asked —', foot1: 'Joseon Saju is based on the patent-pending reading structure of Maja-saem Kim Kyung-hee.',
    foot2: 'A cultural, symbolic reading of the Saju and Myeongri tradition; it does not replace professional medical, legal, financial or psychological advice.',
  },
};
const STRENGTH_PDF = { 신강: { ko: '신강', en: 'Strong' }, 중화: { ko: '중화', en: 'Balanced' }, 신약: { ko: '신약', en: 'Weak' } };

function buildHtml(saju, readingText, question, lang) {
  const s = saju;
  const t = L[lang === 'en' ? 'en' : 'ko'];
  const today = new Date().toISOString().slice(0, 10);
  const sinsal = s.sinsal.map((x) => `<span class="chip">${esc(x.name)}</span>`).join(' ');
  const strengthTxt = (STRENGTH_PDF[s.dayMaster.strength] || {})[lang === 'en' ? 'en' : 'ko'] || s.dayMaster.strength;
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<style>
  ${fontFaceCss()}
  * { box-sizing: border-box; }
  @page { size: A4; margin: 14mm 14mm 16mm; }
  body { font-family: 'NM', serif; color: #221b14; margin: 0;
    background: #f3ead4;
    background-image: repeating-linear-gradient(90deg, rgba(120,90,40,.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(120,90,40,.03) 0 1px, transparent 1px 4px);
  }
  .cover { background: linear-gradient(180deg,#16263f,#0d1a2e); color:#f3ead4; border-radius:8px; padding:26px 24px; text-align:center; position:relative; }
  .seal { display:inline-grid; place-items:center; width:46px; height:46px; background:#b8362a; color:#fff; font-weight:800; font-size:18px; border-radius:6px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.35); }
  .cover h1 { font-size:26px; font-weight:800; letter-spacing:6px; margin:12px 0 2px; color:#fff; }
  .cover .sub { color:#c9a64a; letter-spacing:6px; font-size:13px; margin:0 0 10px; }
  .cover .who { font-size:14px; color:#f3ead4; margin:6px 0 0; }
  .cover .meta { font-size:12px; color:rgba(243,234,212,.7); margin:4px 0 0; }
  .sec { margin-top:18px; }
  .card { border:1px solid #d8c39a; border-radius:8px; background:#f7f0df; padding:16px; }
  .h-eye { color:#b8362a; font-weight:800; letter-spacing:3px; font-size:12px; margin:0 0 10px; }
  /* 명식 */
  table.myeong { width:100%; border-collapse:separate; border-spacing:6px; }
  td.mx { width:25%; text-align:center; background:#fff; border:1px solid #e0cfa6; border-radius:6px; padding:8px 4px; vertical-align:top; }
  td.mx .lbl { font-size:11px; color:#93826a; margin-bottom:4px; }
  td.mx .gan { font-size:34px; font-weight:800; line-height:1.05; }
  td.mx .ji { font-size:34px; font-weight:800; line-height:1.05; }
  td.mx .sub { font-size:11px; color:#5a4c3b; margin-top:3px; }
  /* 오행 */
  .ob { display:flex; align-items:center; gap:8px; margin:5px 0; }
  .obn { width:18px; font-size:12px; color:#5a4c3b; }
  .obt { flex:1; height:8px; background:#e7d8b8; border-radius:2px; overflow:hidden; }
  .obf { display:block; height:100%; }
  .obc { width:16px; font-size:11px; color:#93826a; text-align:right; }
  .chips { margin-top:8px; }
  .chip { display:inline-block; font-size:11px; color:#2f6f5e; border:1px solid #9cc5b9; background:#eef6f2; border-radius:3px; padding:2px 8px; margin:2px 2px 0 0; }
  .kv { font-size:12px; color:#5a4c3b; margin:6px 0 0; }
  /* 대운 */
  .duwrap { display:flex; gap:5px; flex-wrap:wrap; margin-top:4px; }
  .du { flex:1 1 0; min-width:54px; text-align:center; border:1px solid #e0cfa6; border-radius:5px; padding:6px 2px; background:#fff; }
  .du.on { border-color:#b8362a; background:#fbeeeb; }
  .dua { font-size:10px; color:#93826a; }
  .duh { font-size:15px; font-weight:800; }
  .dus { font-size:10px; color:#5a4c3b; }
  /* 본문 */
  .reading { margin-top:18px; }
  h2.rh { font-size:16px; font-weight:800; color:#16263f; margin:18px 0 6px; padding-bottom:5px; border-bottom:1px solid #d8c39a; page-break-after:avoid; }
  p.rp { font-size:13.5px; line-height:1.95; margin:0 0 8px; text-align:justify; }
  .ask { font-size:12px; color:#5a4c3b; background:#fbeeeb; border:1px solid #e7c3bb; border-radius:6px; padding:10px 12px; margin-top:10px; }
  .foot { margin-top:22px; padding-top:12px; border-top:1px solid #d8c39a; font-size:10.5px; color:#93826a; line-height:1.6; text-align:center; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
</style></head><body>

  <div class="cover">
    <div class="seal">四</div>
    <h1>${lang === 'en' ? 'JOSEON SAJU' : '조선사주'}</h1>
    <div class="sub">${t.cover_sub}</div>
    <div class="who">${esc(s.input.name)}${t.booklet}</div>
    <div class="meta">${esc(s.solar)} · ${esc(s.lunar)} · ${esc(s.zodiac)} · ${esc(t.gender[s.input.gender] || '-')}</div>
    <div class="meta">${t.issued} ${esc(today)}</div>
  </div>

  <div class="sec card">
    <p class="h-eye">${t.myeong}</p>
    <table class="myeong"><tr>
      ${pillarCol(t.pHour, s.pillars.hour)}
      ${pillarCol(t.pDay, s.pillars.day)}
      ${pillarCol(t.pMonth, s.pillars.month)}
      ${pillarCol(t.pYear, s.pillars.year)}
    </tr></table>
    <p class="kv">${t.dm}: <b>${esc(s.dayMaster.hanja)}(${esc(s.dayMaster.gan)})</b> · ${esc(s.dayMaster.eumyang)}${esc(s.dayMaster.ohaeng)}</p>
    <p class="kv">${t.strength}: <b>${esc(strengthTxt)}</b> (${t.support} ${esc(String(s.dayMaster.strengthScore))}%) · ${t.yongsin}: <b>${esc(s.dayMaster.yongsin.hanja)}(${esc(s.dayMaster.yongsin.element)})</b>${s.trueSolar && s.trueSolar.applied ? ` · ${t.truesolar} ${esc(String(s.trueSolar.offsetMin))}m` : ''}</p>
  </div>

  <div class="sec grid2">
    <div class="card">
      <p class="h-eye">${t.ohaeng}</p>
      ${ohaengBars(s.ohaeng)}
      <p class="kv">${t.strong} <b>${esc(s.ohaeng.dominant)}</b> · ${t.weak} <b>${esc(s.ohaeng.weakest)}</b></p>
    </div>
    <div class="card">
      <p class="h-eye">${t.sinsalHead}</p>
      <div class="chips">${sinsal || `<span class="chip" style="color:#93826a;border-color:#ddd;background:#f3f0e8">${t.noSinsal}</span>`}</div>
      <p class="kv">${t.gongmang}: ${esc(s.gongmang || '-')}</p>
      <p class="kv">${t.nayin} ${esc(s.nayin.day)}</p>
    </div>
  </div>

  <div class="sec card">
    <p class="h-eye">${t.daeun}</p>
    <div class="duwrap">${daeunStrip(s)}</div>
    ${s.currentDaeun ? `<p class="kv">${t.now} ${esc(String(s.input.age))}${t.nowMid} <b>${esc(s.currentDaeun.han)}</b> · <b>${esc(s.currentDaeun.shishen)}</b>${t.nowEnd}</p>` : ''}
  </div>

  <div class="reading">
    ${question ? `<div class="ask">${t.ask} “${esc(question)}”</div>` : ''}
    ${readingHtml(readingText)}
  </div>

  <div class="foot">
    ${t.foot1}<br/>
    ${t.foot2}<br/>
    © ${new Date().getFullYear()} ${lang === 'en' ? 'Joseon Saju' : '조선사주'}
  </div>
</body></html>`;
}

function genderK(g) { return g === 'M' ? '남' : g === 'F' ? '여' : '-'; }

/**
 * PDF 버퍼 생성. 실패/불가 시 null.
 */
async function renderPdf(saju, readingText, question, lang) {
  if (!chromium) { console.warn('[pdf] playwright(chromium) 없음 → PDF 생략'); return null; }
  let browser;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
    const page = await browser.newPage();
    await page.setContent(buildHtml(saju, readingText, question, lang), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const buf = await page.pdf({ format: 'A4', printBackground: true });
    return buf;
  } catch (e) {
    console.warn('[pdf] 렌더 실패:', e.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { renderPdf, buildHtml };
