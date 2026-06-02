'use strict';
/**
 * payment.js — TossPayments 결제 승인(서버 검증)
 * https://docs.tosspayments.com/reference#결제-승인
 * TOSS_SECRET_KEY 가 없으면 개발용 mock 승인.
 */
const AMOUNT = Number(process.env.READING_PRICE || 3900);
function badReq(msg) { const e = new Error(msg); e.status = 400; return e; }

async function confirmPayment({ paymentKey, orderId, amount }) {
  if (!paymentKey || !orderId || amount == null) {
    throw badReq('결제 정보(paymentKey, orderId, amount)가 부족합니다.');
  }
  if (Number(amount) !== AMOUNT) {
    throw badReq(`결제 금액이 올바르지 않습니다 (기대 ${AMOUNT}원).`);
  }

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    // 개발 모드: 실제 승인 없이 통과 (실서비스에서는 반드시 키 설정)
    console.warn('[payment] TOSS_SECRET_KEY 없음 → mock 승인');
    return { ok: true, mock: true, orderId, amount: Number(amount), approvedAt: new Date().toISOString() };
  }

  const auth = Buffer.from(`${secret}:`).toString('base64');
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`결제 승인 실패: ${data.code || res.status} ${data.message || ''}`);
  }
  return { ok: true, mock: false, orderId, amount: Number(amount), approvedAt: data.approvedAt, raw: data };
}

module.exports = { confirmPayment, AMOUNT };
