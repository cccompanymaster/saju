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
const SS_EN = { 비견: 'Companion', 겁재: 'Rival', 식신: 'Output', 상관: 'Hurting Off.', 편재: 'Ind.Wealth', 정재: 'Dir.Wealth', 편관: 'Seven Kill.', 정관: 'Dir.Officer', 편인: 'Ind.Resource', 정인: 'Dir.Resource' };
const DI_EN = { 장생: 'Growth', 목욕: 'Bath', 관대: 'Cap', 건록: 'Officer', 제왕: 'Peak', 쇠: 'Decline', 병: 'Sickness', 사: 'Death', 묘: 'Tomb', 절: 'Severance', 태: 'Womb', 양: 'Nurture' };
const en = (x) => x === 'en';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// 뜻풀이: '용어 — 설명' 에서 용어를 굵게
function defHtml(s) {
  const m = /^(.+?)\s—\s([\s\S]+)$/.exec(String(s));
  if (m) return `<b>${esc(m[1])}</b> — ${esc(m[2])}`;
  return esc(s);
}

function pillarCol(label, p, lang) {
  if (!p) return `<td class="mx"><div class="lbl">${label}</div><div class="gan" style="color:#999">·</div><div class="ji" style="color:#999">·</div><div class="sub">${en(lang) ? 'unknown' : '모름'}</div><div class="sub"></div><div class="sub"></div></td>`;
  return `<td class="mx">
    <div class="lbl">${label}</div>
    <div class="gan" style="color:${O_COLOR[p.ohaeng] || '#221b14'}">${esc(p.hanja[0])}</div>
    <div class="ji" style="color:${O_COLOR[p.jiOhaeng] || '#221b14'}">${esc(p.hanja[1])}</div>
    <div class="sub">${en(lang) ? esc(DI_EN[p.dishi] || p.dishi || '') : esc(p.han)}</div>
    <div class="sub">${en(lang) ? '' : esc(p.dishi || '')}</div>
    <div class="sub">${en(lang) ? '' : esc(p.hideGan.join('·'))}</div>
  </td>`;
}

function ohaengBars(o) {
  const max = Math.max.apply(null, Object.values(o.count)) || 1;
  return ['목', '화', '토', '금', '수'].map((k) => {
    const pct = Math.round((o.count[k] / max) * 100);
    return `<div class="ob"><span class="obn">${k}</span><span class="obt"><span class="obf" style="width:${pct}%;background:${O_COLOR[k]}"></span></span><span class="obc">${o.count[k]}</span></div>`;
  }).join('');
}

function daeunStrip(s, lang) {
  return s.daeun.slice(0, 8).map((d) => {
    const on = s.currentDaeun && d.age === s.currentDaeun.age;
    const age = en(lang) ? d.age : (d.age + '세');
    const gz = en(lang) ? d.hanja : d.han;
    const ss = en(lang) ? (SS_EN[d.shishen] || d.shishen) : d.shishen;
    return `<div class="du ${on ? 'on' : ''}"><div class="dua">${age}</div><div class="duh">${esc(gz)}</div><div class="dus">${esc(ss)}</div></div>`;
  }).join('');
}

function renderReading(text, lang) {
  const lines = String(text || '').split('\n');
  let body = '', toc = '', chapN = 0;
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (/^◆\s/.test(t)) {
      chapN++;
      const full = t.replace(/^◆\s*/, '');
      const parts = full.split(' :: ');
      const title = parts[0], sub = parts[1] || '';
      toc += `<div class="toc-chap">${esc(title)}</div>`;
      body += `<section class="chap-divider"><div class="chap-kicker">${en(lang) ? 'CHAPTER' : '章'}</div><div class="chap-title">${esc(title)}</div>${sub ? `<div class="chap-sub">${esc(sub)}</div>` : ''}<div class="chap-seal">四</div></section>`;
    } else if (/^○\s/.test(t)) {
      const title = t.replace(/^○\s*/, '');
      toc += `<div class="toc-sec">${esc(title)}</div>`;
      body += `<h2 class="rh">${esc(title)}</h2>`;
    } else if (/^▷\s/.test(t)) {
      body += `<p class="rdef">${defHtml(t.replace(/^▷\s*/, ''))}</p>`;
    } else {
      body += `<p class="rp">${esc(t)}</p>`;
    }
  }
  return { body, toc };
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
  const { body, toc } = renderReading(readingText, lang);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<style>
  ${fontFaceCss()}
  * { box-sizing: border-box; }
  @page { size: A4; margin: 0; }
  .pad { padding: 14mm 14mm; }
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
  h2.rh { font-size:17px; font-weight:800; color:#16263f; margin:20px 0 10px; padding:0 0 6px; border-bottom:1.5px solid #b8362a; page-break-after:avoid; }
  h2.rh:first-child { margin-top:4px; }
  h2.rh::before { content:"❖ "; color:#b8362a; }
  p.rp { font-size:14.5px; line-height:2.2; margin:0 0 14px; text-align:justify; }
  p.rdef { font-size:13.5px; line-height:1.95; margin:0 0 14px; padding:13px 16px; background:#f3ead4; border-left:4px solid #b8362a; border-radius:0 5px 5px 0; color:#3a2f22; }
  p.rdef b { color:#16263f; }

  /* 표지 */
  .cover-page { height:270mm; page-break-after:always; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
    background:linear-gradient(180deg,#16263f,#0d1a2e); color:#f3ead4; }
  .cover-page::before { content:""; position:absolute; inset:10mm; border:1.5px solid rgba(201,166,74,.5); border-radius:4px; }
  .cover-page::after { content:""; position:absolute; inset:12mm; border:0.5px solid rgba(201,166,74,.3); border-radius:3px; }
  .cv-seal { width:64px;height:64px;display:grid;place-items:center;background:#b8362a;color:#fff;font-weight:800;font-size:26px;border-radius:8px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35);margin-bottom:22px; }
  .cv-title { font-size:46px;font-weight:800;letter-spacing:12px;color:#fff;margin:0 0 6px; }
  .cv-sub { font-size:15px;letter-spacing:10px;color:#c9a64a;margin:0 0 30px; }
  .cv-line { width:42px;height:2px;background:#c9a64a;margin:0 auto 30px; }
  .cv-who { font-size:20px;color:#f3ead4;margin:0 0 6px; }
  .cv-meta { font-size:12px;color:rgba(243,234,212,.7);margin:3px 0; }
  .cv-foot { position:absolute; bottom:18mm; left:0; right:0; font-size:11px; color:rgba(243,234,212,.55); letter-spacing:2px; }

  /* 목차 */
  .toc-page { page-break-after:always; }
  .toc-h { font-size:24px;font-weight:800;color:#16263f;letter-spacing:4px;text-align:center;margin:6mm 0 2mm; }
  .toc-h-sub { text-align:center;color:#b8362a;letter-spacing:3px;font-size:12px;margin:0 0 8mm; }
  .toc-chap { font-size:15px;font-weight:800;color:#16263f;margin:14px 0 4px;padding-bottom:4px;border-bottom:1px dotted #c9b27f; }
  .toc-sec { font-size:12.5px;color:#5a4c3b;margin:3px 0 3px 14px; }
  .toc-sec::before { content:"· "; color:#b8362a; }

  /* 장(章) 표지 — 전면 한 페이지 */
  .chap-divider { page-break-before:always; page-break-after:always; height:248mm; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; position:relative; }
  .chap-divider::before { content:""; position:absolute; left:50%; top:74mm; transform:translateX(-50%); width:46px; height:2px; background:#c9a64a; }
  .chap-divider::after { content:""; position:absolute; left:50%; bottom:74mm; transform:translateX(-50%); width:46px; height:2px; background:#c9a64a; }
  .chap-kicker { color:#b8362a; letter-spacing:8px; font-size:13px; margin-bottom:16px; }
  .chap-title { font-size:30px; font-weight:800; color:#16263f; letter-spacing:4px; margin:0 0 14px; }
  .chap-sub { font-size:13.5px; color:#8a7d6c; margin:0 0 26px; }
  .chap-seal { width:46px;height:46px;display:inline-grid;place-items:center;background:#b8362a;color:#fff;font-weight:800;border-radius:7px;font-size:19px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35); }
  .chart-page { page-break-after:always; }
  .ask { font-size:12px; color:#5a4c3b; background:#fbeeeb; border:1px solid #e7c3bb; border-radius:6px; padding:10px 12px; margin-top:10px; }
  .foot { margin-top:22px; padding-top:12px; border-top:1px solid #d8c39a; font-size:10.5px; color:#93826a; line-height:1.6; text-align:center; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
</style></head><body>

  <div class="cover-page">
    <div class="cv-seal">四</div>
    <div class="cv-title">${lang === 'en' ? 'JOSEON SAJU' : '조선사주'}</div>
    <div class="cv-sub">${t.cover_sub}</div>
    <div class="cv-line"></div>
    <div class="cv-who">${esc(s.input.name)}${t.booklet}</div>
    <div class="cv-meta">${esc(s.solar)} · ${esc(s.lunar)} · ${esc(s.zodiac)} · ${esc(t.gender[s.input.gender] || '-')}</div>
    <div class="cv-meta">${t.issued} ${esc(today)}</div>
    <div class="cv-foot">${lang === 'en' ? 'based on the patent-pending reading structure of Maja-saem Kim Kyung-hee' : '마자샘 김경희 특허출원 리딩 구조 기반'}</div>
  </div>

  <div class="toc-page pad">
    <div class="toc-h">${lang === 'en' ? 'Contents' : '목 차'}</div>
    <div class="toc-h-sub">${t.cover_sub}</div>
    ${toc}
  </div>

  <div class="chart-page pad">
    <div class="sec card">
      <p class="h-eye">${t.myeong}</p>
      <table class="myeong"><tr>
        ${pillarCol(t.pHour, s.pillars.hour, lang)}
        ${pillarCol(t.pDay, s.pillars.day, lang)}
        ${pillarCol(t.pMonth, s.pillars.month, lang)}
        ${pillarCol(t.pYear, s.pillars.year, lang)}
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
      <div class="duwrap">${daeunStrip(s, lang)}</div>
      ${s.currentDaeun ? `<p class="kv">${t.now} ${esc(String(s.input.age))}${t.nowMid} <b>${esc(en(lang) ? s.currentDaeun.hanja : s.currentDaeun.han)}</b> · <b>${esc(en(lang) ? (SS_EN[s.currentDaeun.shishen] || s.currentDaeun.shishen) : s.currentDaeun.shishen)}</b>${t.nowEnd}</p>` : ''}
    </div>
    ${question ? `<div class="ask">${t.ask} “${esc(question)}”</div>` : ''}
  </div>

  <div class="reading pad">
    ${body}
    <div class="foot">
      ${t.foot1}<br/>${t.foot2}<br/>© ${new Date().getFullYear()} ${lang === 'en' ? 'Joseon Saju' : '조선사주'}
    </div>
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
    const brand = lang === 'en' ? 'Joseon Saju' : '조선사주';
    const buf = await page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#a99a7a;text-align:center;font-family:serif;padding-top:2mm;">${brand} &middot; <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: { top: '6mm', bottom: '12mm', left: '0mm', right: '0mm' },
    });
    return buf;
  } catch (e) {
    console.warn('[pdf] 렌더 실패:', e.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { renderPdf, buildHtml };
