'use strict';
/**
 * util.js — 실서비스 견고화 유틸
 * - 보안 헤더 / 레이트리밋(인메모리) / 입력 검증·정제
 * - 무료리딩 캐시(TTL) / 주문 대장(결제 멱등성)
 * 단일 인스턴스 가정의 경량 구현. 다중 인스턴스라면 Redis 등으로 교체.
 */

/* ── 보안 헤더 ── */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://cdn.jsdelivr.net https://t1.kakaocdn.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
    "img-src 'self' data: https:",
    "script-src-elem 'self' 'unsafe-inline' https://js.tosspayments.com https://cdn.jsdelivr.net https://t1.kakaocdn.net",
    "connect-src 'self' https://api.tosspayments.com https://kapi.kakao.com https://kauth.kakao.com",
    "frame-src https://js.tosspayments.com https://kauth.kakao.com",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
}

/* ── 레이트리밋 (고정 윈도우, IP+키) ── */
function rateLimit({ windowMs = 60000, max = 60, key = 'g' } = {}) {
  const hits = new Map(); // ip → { count, reset }
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref?.();
  return function (req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket.remoteAddress || 'x';
    const id = key + ':' + ip;
    const now = Date.now();
    let rec = hits.get(id);
    if (!rec || rec.reset < now) { rec = { count: 0, reset: now + windowMs }; hits.set(id, rec); }
    rec.count++;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));
    if (rec.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((rec.reset - now) / 1000)));
      return res.status(429).json({ ok: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' });
    }
    next();
  };
}

/* ── 입력 검증·정제 ── */
const GENDERS = new Set(['M', 'F', 'O']);
const CALENDARS = new Set(['solar', 'lunar', 'leap']);

function validateBirth(b) {
  b = b || {};
  const name = String(b.name || '').trim();
  if (!name || name.length > 40) throw badReq('이름을 1~40자로 입력해 주세요.');
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b.birthdate || '').trim());
  if (!m) throw badReq('생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  const Y = +m[1], M = +m[2], D = +m[3], nowY = new Date().getFullYear();
  if (Y < 1900 || Y > nowY || M < 1 || M > 12 || D < 1 || D > 31) throw badReq('생년월일 값이 올바르지 않습니다.');
  const gender = GENDERS.has(b.gender) ? b.gender : 'O';
  const calendar = CALENDARS.has(b.calendar) ? b.calendar : 'solar';
  const unknownTime = !!b.unknownTime;
  let hour = parseInt(b.hour, 10); if (Number.isNaN(hour) || hour < 0 || hour > 23) hour = 12;
  let minute = parseInt(b.minute, 10); if (Number.isNaN(minute) || minute < 0 || minute > 59) minute = 0;
  return {
    name, gender, birthdate: `${m[1]}-${m[2]}-${m[3]}`, calendar, unknownTime, hour, minute,
    birthPlace: String(b.birthPlace || '').trim().slice(0, 40),
    trueSolarTime: !!b.trueSolarTime,
    birthLongitude: b.birthLongitude != null ? Number(b.birthLongitude) : undefined,
  };
}

function sanitizeQuestion(q) { return String(q || '').replace(/\s+/g, ' ').trim().slice(0, 100); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }
function sanitizeContact(c) {
  c = c || {};
  const email = String(c.email || '').trim().slice(0, 120);
  const phone = String(c.phone || '').replace(/[^\d]/g, '').slice(0, 11);
  return { email: validEmail(email) ? email : '', phone };
}

function badReq(msg) { const e = new Error(msg); e.status = 400; return e; }

/* ── TTL 캐시(무료 리딩 결과 재사용으로 AI 비용 절감) ── */
function makeCache({ ttlMs = 6 * 3600 * 1000, max = 500 } = {}) {
  const map = new Map(); // key → { v, exp }
  return {
    get(k) {
      const r = map.get(k);
      if (!r) return undefined;
      if (r.exp < Date.now()) { map.delete(k); return undefined; }
      map.delete(k); map.set(k, r); // LRU 갱신
      return r.v;
    },
    set(k, v) {
      map.set(k, { v, exp: Date.now() + ttlMs });
      if (map.size > max) map.delete(map.keys().next().value);
    },
  };
}
function birthKey(b) {
  return [b.birthdate, b.calendar, b.unknownTime ? 'u' : `${b.hour}:${b.minute}`,
    b.gender, b.trueSolarTime ? 't' + (b.birthLongitude || b.birthPlace || '') : 's'].join('|');
}

/* ── 주문 대장(결제 멱등성·재처리 방지) ── */
function makeOrderStore({ ttlMs = 24 * 3600 * 1000 } = {}) {
  const map = new Map(); // orderId → { status, amount, at }
  return {
    get(id) { return map.get(id); },
    isConfirmed(id) { const r = map.get(id); return !!r && r.status === 'confirmed'; },
    confirm(id, amount) { map.set(id, { status: 'confirmed', amount, at: Date.now() }); },
    sweep() { const now = Date.now(); for (const [k, v] of map) if (now - v.at > ttlMs) map.delete(k); },
  };
}

/* ── 결과 저장소(재열람: 발송일로부터 2주) ──
 * 인메모리 + 14일 TTL. 토큰으로만 접근. 다중 인스턴스/영속이 필요하면 DB로 교체.
 */
const crypto = require('crypto');
function makeResultStore({ ttlMs = 14 * 24 * 3600 * 1000, max = 5000 } = {}) {
  const map = new Map(); // token → { data, exp }
  return {
    save(data) {
      const token = crypto.randomBytes(18).toString('base64url');
      map.set(token, { data, exp: Date.now() + ttlMs });
      if (map.size > max) map.delete(map.keys().next().value);
      return token;
    },
    get(token) {
      const r = map.get(token);
      if (!r) return null;
      if (r.exp < Date.now()) { map.delete(token); return null; }
      return r.data;
    },
    sweep() { const now = Date.now(); for (const [k, v] of map) if (v.exp < now) map.delete(k); },
  };
}

module.exports = {
  securityHeaders, rateLimit, validateBirth, sanitizeQuestion, sanitizeContact,
  validEmail, makeCache, birthKey, makeOrderStore, makeResultStore, badReq,
};
