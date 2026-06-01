'use strict';
/**
 * deliver.js — 결과 전달 (이메일 / 카카오)
 * - 이메일: SMTP(nodemailer). SMTP 환경변수 없으면 콘솔 mock.
 * - 카카오: 알림톡은 사업자 채널·템플릿 승인 필요 → 어댑터만 두고 mock.
 *   (KAKAO_ALIMTALK_* 설정 시 실제 발송 연동 지점)
 */
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (_) { /* optional */ }

function buildEmailHtml(name, readingText) {
  const body = readingText
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;line-height:1.7">${escapeHtml(line)}</p>` : ''))
    .join('');
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;background:#0d1a2e;padding:24px;font-family:'Nanum Myeongjo','Noto Serif KR',serif">
    <div style="max-width:560px;margin:auto;background:#f7f0df;border:1px solid #a9842f;border-radius:6px;padding:28px;color:#221b14">
      <table style="border-collapse:collapse;margin:0 0 4px"><tr>
        <td style="background:#b8362a;color:#fff;width:34px;height:34px;text-align:center;font-weight:800;border-radius:4px">四</td>
        <td style="padding-left:10px;color:#221b14;font-size:20px;font-weight:800">조선사주 — 심층 사주</td>
      </tr></table>
      <p style="color:#93826a;font-size:13px;margin:8px 0 20px">${escapeHtml(name)}님을 위한 사주 리딩</p>
      ${body}
      <hr style="border:none;border-top:1px solid #d8c39a;margin:20px 0" />
      <p style="color:#93826a;font-size:12px;line-height:1.6;margin:0">사주(四柱)·명리의 상징 체계를 함께 읽는 문화적·상징적 리딩입니다. 의료·법률·투자·재무·심리치료 등 전문 자문을 대체하지 않습니다.</p>
    </div></body></html>`;
}

async function sendEmail(to, name, readingText) {
  if (!to) return { ok: false, skipped: true, reason: 'no-email' };
  const host = process.env.SMTP_HOST;
  if (!nodemailer || !host) {
    console.warn(`[deliver] SMTP 미설정 → mock 이메일 (to=${to})`);
    return { ok: true, mock: true, channel: 'email', to };
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"조선사주" <no-reply@majatalk.com>',
    to,
    subject: `[조선사주] ${name}님의 심층 사주가 도착했습니다`,
    html: buildEmailHtml(name, readingText),
  });
  return { ok: true, mock: false, channel: 'email', to };
}

async function sendKakao(phone, name, readingText) {
  if (!phone) return { ok: false, skipped: true, reason: 'no-phone' };
  const token = process.env.KAKAO_ALIMTALK_TOKEN;
  if (!token) {
    console.warn(`[deliver] 카카오 알림톡 미설정 → mock (to=${phone})`);
    return { ok: true, mock: true, channel: 'kakao', to: phone };
  }
  // TODO: 실제 알림톡 API(카카오 비즈메시지/대행사) 연동 지점
  // 템플릿 승인 필요. 여기서 provider 호출.
  return { ok: true, mock: false, channel: 'kakao', to: phone };
}

async function deliver({ email, phone, name, readingText }) {
  const results = await Promise.allSettled([
    sendEmail(email, name, readingText),
    sendKakao(phone, name, readingText),
  ]);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) }));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { deliver, sendEmail, sendKakao, buildEmailHtml };
