'use strict';
/**
 * server.js — 조선사주 백엔드 + 정적 서빙
 *
 * 퍼널:
 *   ① 광고 → ② 무료 랜딩(/m/) → POST /api/free-reading (사주+AI 맛보기)
 *   → ③ TossPayments 결제 → POST /api/payment/confirm (승인검증+심층 리딩 생성+발송)
 *   → ④ 화면 표시 + 이메일/카톡 발송
 *
 * 키 없이도 mock 으로 끝까지 동작. 실제 연동은 .env 로 활성화.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');

const { computeSaju } = require('./src/saju');
const { freeReading, paidReading } = require('./src/reading');
const { confirmPayment, AMOUNT } = require('./src/payment');
const { deliver } = require('./src/deliver');
const { renderPdf } = require('./src/pdf');
const U = require('./src/util');

const app = express();
app.set('trust proxy', true);
app.use(U.securityHeaders);
app.use(express.json({ limit: '64kb' }));

// 정적 파일(루트의 /m, /assets 등) 서빙
const ROOT = path.join(__dirname, '..');
app.use(express.static(ROOT, { extensions: ['html'] }));

// 비용/남용 방어: AI·결제 엔드포인트 레이트리밋
const freeLimiter = U.rateLimit({ windowMs: 60000, max: 20, key: 'free' });
const payLimiter = U.rateLimit({ windowMs: 60000, max: 12, key: 'pay' });
const freeCache = U.makeCache({ ttlMs: 6 * 3600 * 1000, max: 500 });
const orders = U.makeOrderStore();
setInterval(() => orders.sweep(), 3600 * 1000).unref?.();

const ok = (res, data) => res.json({ ok: true, ...data });
const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg });
const asyncH = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  const code = e && e.status ? e.status : 500;
  if (code >= 500) console.error(e); else console.warn('[400]', e.message);
  fail(res, code, e.message || '서버 오류');
});

/* Toss 클라이언트 키 (위젯 초기화용) */
app.get('/api/client-key', (req, res) => {
  ok(res, { clientKey: process.env.TOSS_CLIENT_KEY || '', amount: AMOUNT });
});

/* 가격/설정 */
app.get('/api/config', (req, res) => {
  ok(res, {
    price: AMOUNT,
    clientKey: process.env.TOSS_CLIENT_KEY || '',
    aiEnabled: !!process.env.ANTHROPIC_API_KEY,
  });
});

/* ② 무료 맛보기 리딩 */
app.post('/api/free-reading', freeLimiter, asyncH(async (req, res) => {
  const birth = U.validateBirth(req.body || {});
  const ck = U.birthKey(birth);
  const cached = freeCache.get(ck);
  if (cached) return ok(res, Object.assign({ cached: true }, cached));

  const saju = computeSaju(birth);
  const reading = await freeReading(saju);
  const payload = { saju: publicSaju(saju), teaser: reading.text, source: reading.source };
  if (reading.source === 'ai') freeCache.set(ck, payload); // mock 은 캐시하지 않음
  ok(res, payload);
}));

/* ③④ 결제 승인 → 심층 리딩 생성 → 발송 */
app.post('/api/payment/confirm', payLimiter, asyncH(async (req, res) => {
  const { paymentKey, orderId, amount } = req.body || {};

  // 멱등성: 같은 주문의 중복 확정 방지
  if (orderId && orders.isConfirmed(orderId)) {
    return fail(res, 409, '이미 처리된 주문입니다.');
  }

  const birth = U.validateBirth((req.body || {}).birth);
  const question = U.sanitizeQuestion((req.body || {}).question);
  const contact = U.sanitizeContact((req.body || {}).contact);

  // 1) 결제 서버 검증
  const pay = await confirmPayment({ paymentKey, orderId, amount });
  orders.confirm(pay.orderId, pay.amount); // 확정 기록

  // 2) 심층 리딩 생성
  const saju = computeSaju(birth);
  const reading = await paidReading(saju, question);

  // 3) PDF 사주첩 생성
  const pdfBuffer = await renderPdf(saju, reading.text, question);

  // 4) 발송 (이메일=PDF첨부 / 카톡)
  const delivery = await deliver({
    email: contact.email,
    phone: contact.phone,
    name: saju.input.name,
    readingText: reading.text,
    pdfBuffer,
  });

  ok(res, {
    payment: { orderId: pay.orderId, mock: pay.mock },
    saju: publicSaju(saju),
    reading: reading.text,
    source: reading.source,
    delivery,
    pdfBase64: pdfBuffer ? pdfBuffer.toString('base64') : null,
    pdfName: `조선사주_${saju.input.name}_사주첩.pdf`,
  });
}));

/* 결제 없이 재발송 (관리/테스트용 — 실서비스에선 인증 필요) */
app.post('/api/deliver', payLimiter, asyncH(async (req, res) => {
  const birth = U.validateBirth((req.body || {}).birth);
  const question = U.sanitizeQuestion((req.body || {}).question);
  const contact = U.sanitizeContact((req.body || {}).contact);
  const saju = computeSaju(birth);
  const reading = await paidReading(saju, question);
  const pdfBuffer = await renderPdf(saju, reading.text, question);
  const delivery = await deliver({
    email: contact.email, phone: contact.phone,
    name: saju.input.name, readingText: reading.text, pdfBuffer,
  });
  ok(res, { delivery, source: reading.source });
}));

app.get('/api/health', (req, res) => ok(res, { time: new Date().toISOString() }));

/* SPA-ish 폴백: /m/ 로 */
app.get('/', (req, res) => res.redirect('/m/'));

// 민감정보(시/분 원본 등) 제외하고 화면에 노출할 사주 데이터만 추림
function publicSaju(s) {
  return {
    name: s.input.name,
    solar: s.solar,
    lunar: s.lunar,
    zodiac: s.zodiac,
    pillars: s.pillars,
    pillarsText: s.pillarsText,
    dayMaster: s.dayMaster,
    ohaeng: s.ohaeng,
    shishen: s.shishen,
    sinsal: s.sinsal,
    gongmang: s.gongmang,
    trueSolar: s.trueSolar,
    unknownTime: s.input.unknownTime,
  };
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🏯 조선사주 서버: http://localhost:${PORT}/m/`);
  console.log(`   AI(Claude): ${process.env.ANTHROPIC_API_KEY ? 'ON' : 'mock'} | Toss: ${process.env.TOSS_SECRET_KEY ? 'ON' : 'mock'} | 가격: ${AMOUNT}원`);
});

module.exports = app;
