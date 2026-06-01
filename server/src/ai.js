'use strict';
/**
 * ai.js — AI 사주 풀이 어댑터
 * 기본은 Google Gemini(REST). GEMINI_API_KEY 가 없으면 mock 으로 끝까지 동작한다.
 */
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

async function generate(prompt, { maxTokens = 1024, temperature = 0.9 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null; // 호출 측에서 mock 으로 대체
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini 오류 ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return text.trim();
}

module.exports = { generate, hasKey: () => !!process.env.GEMINI_API_KEY };
