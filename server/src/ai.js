'use strict';
/**
 * ai.js — Claude(Anthropic) 어댑터
 * 공식 SDK(@anthropic-ai/sdk) 사용. ANTHROPIC_API_KEY 가 없으면 null 반환 → 호출 측 mock.
 *
 * - 모델: Claude Opus 4.8 (claude-opus-4-8)
 * - adaptive thinking: 사주 해석은 다단 추론이 필요하므로 켠다
 * - 스트리밍: 출력이 길어 요청 타임아웃을 피하려고 stream + finalMessage 사용
 * - 프롬프트 캐싱: 재사용되는 페르소나/용어집(system)에 cache_control 부여
 */
let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); Anthropic = Anthropic.default || Anthropic; }
catch (_) { /* SDK 미설치 → mock 경로 */ }

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
const EFFORT = process.env.CLAUDE_EFFORT || 'high'; // low | medium | high | xhigh | max

let client = null;
function getClient() {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용
  return client;
}

/**
 * @param {string} system  재사용되는 안정적 프롬프트(페르소나·용어집) → 캐싱 대상
 * @param {string} user    요청별로 달라지는 사주 데이터·지시문
 * @param {object} opts    { maxTokens }
 * @returns {Promise<string|null>}  실패/키없음이면 null
 */
async function generate(system, user, { maxTokens = 2048 } = {}) {
  const c = getClient();
  if (!c) return null;

  const stream = c.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system: [
      { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: user }],
  });

  const msg = await stream.finalMessage();
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

module.exports = {
  generate,
  hasKey: () => !!(Anthropic && process.env.ANTHROPIC_API_KEY),
  model: () => MODEL,
};
