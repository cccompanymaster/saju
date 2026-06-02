'use strict';
/**
 * deliver.js — 결과 전달 (이메일 / 카카오 알림톡)
 * - 이메일: SMTP(nodemailer). 미설정 시 콘솔 mock.
 * - 카카오 알림톡: Solapi(대행사) 어댑터. SOLAPI_* + KAKAO_PFID/TEMPLATE 설정 시 실발송, 아니면 mock.
 *   (알림톡 템플릿은 카카오 비즈채널에서 사전 승인 필요)
 */
const crypto = require('crypto');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (_) { /* optional */ }

const T = {
  ko: {
    title: '조선사주 — 심층 사주', forName: (n) => `${n}님을 위한 사주 리딩`,
    subject: (n) => `[조선사주] ${n}님의 심층 사주가 도착했습니다`,
    reopen: (u) => `이 결과는 발송일로부터 2주간 아래 링크로 다시 보실 수 있습니다.<br/><a href="${u}" style="color:#2f6f5e">내 결과 다시 보기</a>`,
    disc: '사주(四柱)·명리의 상징 체계를 함께 읽는 문화적·상징적 리딩입니다. 의료·법률·투자·재무·심리치료 등 전문 자문을 대체하지 않습니다.',
    pdfName: (n) => `조선사주_${n}_사주첩.pdf`,
    alimtalk: (n, u) => `[조선사주] ${n}님, 심층 사주가 도착했습니다.\n발송일로부터 2주간 아래에서 다시 보실 수 있어요.\n${u}`,
  },
  en: {
    title: 'Joseon Saju — In-depth Reading', forName: (n) => `A Saju reading for ${n}`,
    subject: (n) => `[Joseon Saju] ${n}, your in-depth Saju has arrived`,
    reopen: (u) => `You can re-open this result for 2 weeks from delivery via the link below.<br/><a href="${u}" style="color:#2f6f5e">Re-open my result</a>`,
    disc: 'A cultural, symbolic reading of the Saju and Myeongri tradition. It does not replace professional medical, legal, financial or psychological advice.',
    pdfName: (n) => `Joseon_Saju_${n}_booklet.pdf`,
    alimtalk: (n, u) => `[Joseon Saju] ${n}, your in-depth Saju has arrived.\nRe-open it for 2 weeks from delivery:\n${u}`,
  },
};
const tr = (lang) => T[lang === 'en' ? 'en' : 'ko'];

function buildEmailHtml(name, readingText, lang, reAccessUrl) {
  const t = tr(lang);
  const body = String(readingText).split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;line-height:1.7">${escapeHtml(line)}</p>` : '')).join('');
  return `<!DOCTYPE html><html><body style="margin:0;background:#0d1a2e;padding:24px;font-family:'Nanum Myeongjo','Noto Serif KR',serif">
    <div style="max-width:560px;margin:auto;background:#f7f0df;border:1px solid #a9842f;border-radius:6px;padding:28px;color:#221b14">
      <table style="border-collapse:collapse;margin:0 0 4px"><tr>
        <td style="background:#b8362a;color:#fff;width:34px;height:34px;text-align:center;font-weight:800;border-radius:4px">四</td>
        <td style="padding-left:10px;color:#221b14;font-size:20px;font-weight:800">${t.title}</td>
      </tr></table>
      <p style="color:#93826a;font-size:13px;margin:8px 0 20px">${escapeHtml(t.forName(name))}</p>
      ${body}
      ${reAccessUrl ? `<p style="font-size:12px;color:#5a4c3b;background:#eef6f2;border:1px solid #9cc5b9;border-radius:6px;padding:10px 12px;margin:18px 0 0">${t.reopen(reAccessUrl)}</p>` : ''}
      <hr style="border:none;border-top:1px solid #d8c39a;margin:20px 0" />
      <p style="color:#93826a;font-size:12px;line-height:1.6;margin:0">${t.disc}</p>
    </div></body></html>`;
}

async function sendEmail(to, name, readingText, pdfBuffer, lang, reAccessUrl) {
  if (!to) return { ok: false, skipped: true, reason: 'no-email' };
  const t = tr(lang);
  const host = process.env.SMTP_HOST;
  const attachments = pdfBuffer ? [{ filename: t.pdfName(name), content: pdfBuffer, contentType: 'application/pdf' }] : [];
  if (!nodemailer || !host) {
    console.warn(`[deliver] SMTP 미설정 → mock 이메일 (to=${to}, PDF=${attachments.length ? 'Y' : 'N'})`);
    return { ok: true, mock: true, channel: 'email', to, pdf: !!attachments.length };
  }
  const transporter = nodemailer.createTransport({
    host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Joseon Saju" <no-reply@majatalk.com>',
    to, subject: t.subject(name), html: buildEmailHtml(name, readingText, lang, reAccessUrl), attachments,
  });
  return { ok: true, mock: false, channel: 'email', to, pdf: !!attachments.length };
}

/* ── 카카오 알림톡 (Solapi 대행사) ── */
async function sendKakao(phone, name, reAccessUrl, lang) {
  if (!phone) return { ok: false, skipped: true, reason: 'no-phone' };
  const apiKey = process.env.SOLAPI_API_KEY, apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.KAKAO_PFID, templateId = process.env.KAKAO_TEMPLATE_ID;
  const t = tr(lang);
  if (!apiKey || !apiSecret || !pfId || !templateId) {
    console.warn(`[deliver] 알림톡 미설정 → mock (to=${phone}, link=${reAccessUrl || '-'})`);
    return { ok: true, mock: true, channel: 'kakao', to: phone };
  }
  // Solapi HMAC 인증
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  const body = {
    message: {
      to: phone, from: process.env.SOLAPI_SENDER || '',
      type: 'ATA', // 알림톡
      kakaoOptions: {
        pfId, templateId,
        // 템플릿 변수 — 승인된 템플릿의 치환자에 맞춰 조정
        variables: { '#{name}': name, '#{link}': reAccessUrl || '' },
        disableSms: false,
      },
      text: t.alimtalk(name, reAccessUrl || ''), // 대체 발송(친구 아님/실패 시 SMS)
    },
  };
  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[deliver] 알림톡 실패:', res.status, JSON.stringify(data).slice(0, 200));
    return { ok: false, channel: 'kakao', to: phone, error: data.errorMessage || String(res.status) };
  }
  return { ok: true, mock: false, channel: 'kakao', to: phone };
}

async function deliver({ email, phone, name, readingText, pdfBuffer, lang, reAccessUrl }) {
  const out = await Promise.allSettled([
    sendEmail(email, name, readingText, pdfBuffer, lang, reAccessUrl),
    sendKakao(phone, name, reAccessUrl, lang),
  ]);
  return out.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) }));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { deliver, sendEmail, sendKakao, buildEmailHtml };
