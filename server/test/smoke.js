'use strict';
/* 간단 스모크 테스트 — 키 없이 mock 경로로 전체 퍼널 검증 */
const assert = require('assert');
const { computeSaju } = require('../src/saju');
const { freeReading, paidReading } = require('../src/reading');
const { confirmPayment } = require('../src/payment');
const { deliver } = require('../src/deliver');

(async () => {
  // 1) 사주 계산 (양력)
  const s = computeSaju({ name: '테스트', gender: 'F', birthdate: '1992-11-03', hour: 9, minute: 20, calendar: 'solar' });
  assert.match(s.pillarsText, /년주/);
  assert.ok(['목', '화', '토', '금', '수'].includes(s.dayMaster.ohaeng));

  // 2) 음력/윤달 변환 동작
  const sl = computeSaju({ name: '음력', gender: 'M', birthdate: '1988-08-15', calendar: 'lunar', unknownTime: true });
  assert.ok(sl.pillars.hour === null, '모름이면 시주 null');

  // 3) 무료 맛보기
  const free = await freeReading(s);
  assert.ok(free.text.length > 20, '맛보기 생성');

  // 4) 결제 승인 (mock)
  const pay = await confirmPayment({ paymentKey: 'pk_test', orderId: 'order_1', amount: 3900 });
  assert.ok(pay.ok && pay.mock);

  // 5) 심층 + 발송 (mock)
  const paid = await paidReading(s, '이직을 해도 될까요?');
  assert.match(paid.text, /1\./);
  const d = await deliver({ email: 'a@b.com', phone: '01000000000', name: s.input.name, readingText: paid.text });
  assert.ok(d.every((r) => r.ok));

  // 6) 금액 불일치 차단
  await assert.rejects(() => confirmPayment({ paymentKey: 'x', orderId: 'y', amount: 100 }));

  console.log('✓ smoke 통과');
  console.log('  사주:', s.pillarsText);
  console.log('  일간:', s.dayMaster.han || s.dayMaster.gan, '|', s.dayMaster.eumyang + s.dayMaster.ohaeng);
  console.log('  맛보기 source:', free.source);
})().catch((e) => { console.error('✗ 실패:', e); process.exit(1); });
