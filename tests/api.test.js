import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import start from '../api/start.js';
import turn from '../api/turn.js';
import review from '../api/review.js';
import health from '../api/health.js';
import { _resetRateLimit } from '../api/_lib/ratelimit.js';
import { mockReq, mockRes, mockEnv, realEnv, noSleep, fakeFetch, gem, gemErr, gemBlocked, config } from './helpers.js';

beforeEach(() => _resetRateLimit());

async function call(handler, body, deps = {}, reqOver = {}) {
  const res = mockRes();
  await handler(mockReq({ body, ...reqOver }), res, { env: mockEnv(), sleep: noSleep, ...deps });
  return { res, json: res.body ? res.json() : null };
}

test('api: полный путь start → turn → review в моке, оба языка', async () => {
  for (const lang of ['ru', 'uz']) {
    const c = config({ lang, difficulty: 'hard', style: 'rude' });
    const s = await call(start, { config: c });
    assert.equal(s.res.statusCode, 200);
    const plan = s.json.plan;
    assert.equal(plan.questions.length, 9);
    assert.match(plan.caseNo, /^\d{4}$/);
    const threads = [];
    for (const [i, q] of plan.questions.slice(0, 3).entries()) {
      const thread = [{ role: 'interviewer', text: q.text }, { role: 'candidate', text: 'Подробный ответ про DOM, CSSOM, layout и paint, с примером из моего проекта на React. '.repeat(2) }];
      const t = await call(turn, { config: c, plan, qIndex: i, thread, followupsUsed: 0 });
      assert.equal(t.res.statusCode, 200);
      assert.ok(['followup', 'next', 'hint'].includes(t.json.action));
      threads.push({ qid: q.id, turns: [...thread, { role: 'interviewer', text: t.json.say }] });
    }
    const r = await call(review, { config: c, plan, threads });
    assert.equal(r.res.statusCode, 200);
    assert.equal(r.json.dossier.items.length, 9);
    assert.ok(['hired', 'rework', 'rejected'].includes(r.json.dossier.verdict));
    assert.equal(r.json.dossier.caseNo, plan.caseNo);
  }
});

test('api: короткий ответ в моке → уточнение', async () => {
  const s = await call(start, { config: config() });
  const t = await call(turn, { config: config(), plan: s.json.plan, qIndex: 0, thread: [{ role: 'candidate', text: 'не уверен' }] });
  assert.equal(t.json.action, 'followup');
});

test('api: метод, тип, плохой конфиг', async () => {
  assert.equal((await call(start, { config: config() }, {}, { method: 'GET' })).res.statusCode, 405);
  assert.equal((await call(start, { config: config() }, {}, { headers: { 'content-type': 'text/plain' } })).res.statusCode, 415);
  const bad = await call(start, { config: config({ grade: 'lead' }) });
  assert.equal(bad.res.statusCode, 400);
  assert.equal(bad.json.error, 'bad_config');
});

test('api: лимит запросов start', async () => {
  const headers = { 'x-forwarded-for': '1.2.3.4' };
  for (let i = 0; i < 6; i += 1) assert.equal((await call(start, { config: config() }, {}, { headers })).res.statusCode, 200);
  const r = await call(start, { config: config() }, {}, { headers });
  assert.equal(r.res.statusCode, 429);
  assert.equal(r.json.error, 'rate_limited');
});

test('api: реальная модель — план нормализуется, ошибки квоты отдаются клиенту', async () => {
  const f = fakeFetch([gem({ interviewerTitle: 'Техлид', intro: 'Привет', questions: [{ kind: 'tech', topic: 'T', text: 'Q?', keyPoints: ['a', 'b', 'c'] }] })]);
  const s = await call(start, { config: config({ difficulty: 'gentle' }) }, { env: realEnv(), fetch: f });
  assert.equal(s.json.plan.questions.length, 5);
  assert.equal(s.json.model, 'm1');

  const daily = fakeFetch([gemErr(429, 'quota', [{ violations: [{ quotaId: 'RequestsPerDay' }] }])]);
  const d = await call(start, { config: config() }, { env: realEnv(), fetch: daily });
  assert.equal(d.res.statusCode, 429);
  assert.equal(d.json.error, 'daily_quota');

  const busy = fakeFetch([gemErr(503)]);
  const b = await call(start, { config: config() }, { env: realEnv(), fetch: busy });
  assert.equal(b.res.statusCode, 503);
});

test('api: блокировка в грубом стиле → повтор без мата → запасная реплика', async () => {
  const plan = (await call(start, { config: config() })).json.plan;
  const body = { config: config({ style: 'rude' }), plan, qIndex: 0, thread: [{ role: 'candidate', text: 'ответ' }] };
  const retried = fakeFetch([gemBlocked, gem({ say: 'Слабо.', action: 'next', mood: 'displeased', swore: false, note: '' })]);
  const a = await call(turn, body, { env: realEnv(), fetch: retried });
  assert.equal(a.json.say, 'Слабо.');
  assert.match(retried.calls[1].body.systemInstruction.parts[0].text, /Без мата/);
  const twice = fakeFetch([gemBlocked]);
  const b = await call(turn, body, { env: realEnv(), fetch: twice });
  assert.equal(b.json.model, 'fallback');
  assert.equal(b.json.action, 'next');
});

test('api: health', async () => {
  const res = mockRes();
  health(mockReq({ method: 'GET' }), res, { env: mockEnv({ apiKey: '' }) });
  assert.deepEqual(res.json().configured, false);
});

test('api: грубый план заблокирован → повтор без мата → вежливый → заготовка', async () => {
  const okPlan = gem({ interviewerTitle: 'Техлид', intro: 'Вежливое', questions: [{ kind: 'tech', topic: 'T', text: 'Q?', keyPoints: ['a'] }] });
  const f = fakeFetch([gemBlocked, gemBlocked, okPlan]);
  const s = await call(start, { config: config({ style: 'rude' }) }, { env: realEnv({ models: ['m1'] }), fetch: f });
  assert.equal(s.json.model, 'm1');
  assert.equal(f.calls.length, 3);
  assert.doesNotMatch(f.calls[2].body.systemInstruction.parts[0].text, /ГРУБЫЙ/);
  assert.notEqual(s.json.plan.intro, 'Вежливое', 'приветствие — в грубом стиле из заготовки');
  const all = fakeFetch([gemBlocked]);
  const fb = await call(start, { config: config({ style: 'rude' }) }, { env: realEnv({ models: ['m1'] }), fetch: all });
  assert.equal(fb.json.model, 'fallback');
});
