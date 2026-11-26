import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, GeminiError } from '../api/_lib/gemini.js';
import { fakeFetch, gem, gemErr, gemBlocked } from './helpers.js';

const args = (fetchImpl, over = {}) => ({ apiKey: 'k', models: ['m1', 'm2'], system: 's', contents: [], schema: {}, fetchImpl, timeoutMs: 5000, ...over });

test('gemini: первая модель отвечает', async () => {
  const f = fakeFetch([gem({ a: 1 })]);
  const r = await generate(args(f));
  assert.deepEqual(r.data, { a: 1 });
  assert.equal(r.model, 'm1');
  assert.equal(f.calls.length, 1);
  assert.match(f.calls[0].url, /m1:generateContent$/);
  assert.equal(f.calls[0].headers['x-goog-api-key'], 'k');
  assert.equal(f.calls[0].body.generationConfig.responseMimeType, 'application/json');
});

test('gemini: 503, 429, пустой ответ и плохой JSON → следующая модель', async () => {
  for (const bad of [gemErr(503), gemErr(429), { status: 200, json: { candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] } }, { status: 200, json: { candidates: [{ content: { parts: [{ text: '{oops' }] } }] } }]) {
    const f = fakeFetch([bad, gem({ ok: true })]);
    const r = await generate(args(f));
    assert.equal(r.model, 'm2');
  }
});

test('gemini: сетевая ошибка → следующая модель', async () => {
  const f = fakeFetch([new TypeError('fetch failed'), gem({ ok: 1 })]);
  assert.equal((await generate(args(f))).model, 'm2');
});

test('gemini: части-размышления отбрасываются, для hydrogen — thinkingLevel low', async () => {
  const f = fakeFetch([{ status: 200, json: { candidates: [{ content: { parts: [{ text: 'думаю…', thought: true }, { text: '{"x":2}' }] } }] } }]);
  const r = await generate(args(f, { models: ['gemini-4-hydrogen'] }));
  assert.deepEqual(r.data, { x: 2 });
  assert.equal(f.calls[0].body.generationConfig.thinkingConfig.thinkingLevel, 'low');
});

test('gemini: коды итоговых ошибок', async () => {
  const code = async (resps) => { try { await generate(args(fakeFetch(resps))); } catch (e) { return e.code; } return 'ok'; };
  assert.equal(await code([gemErr(429, 'Quota exceeded', [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] }])]), 'daily_quota');
  assert.equal(await code([gemErr(429, 'per minute')]), 'rate_limited');
  assert.equal(await code([gemErr(503)]), 'unavailable');
  assert.equal(await code([gemErr(404)]), 'bad_request');
  assert.equal(await code([gemBlocked]), 'blocked');
  await assert.rejects(generate(args(fakeFetch([gem({})]), { apiKey: '' })), (e) => e instanceof GeminiError && e.code === 'no_key');
});

test('gemini: второй проход по цепочке после паузы', async () => {
  const f = fakeFetch([gemErr(503), gemErr(503), gem({ ok: 2 })]);
  const slept = [];
  const r = await generate(args(f, { passes: 2, sleep: async (ms) => { slept.push(ms); } }));
  assert.equal(r.model, 'm1');
  assert.equal(f.calls.length, 3);
  assert.deepEqual(slept, [1500]);
});
