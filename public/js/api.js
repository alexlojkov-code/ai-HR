// Запросы к /api с повторами (SPEC §7.2). На GitHub Pages — клиентский мок (SPEC §3.6).
import { isDemo } from './router.js';
import { mockPlan, mockTurn, mockReview } from './mock-core.js';
import { difficultyOf } from './catalog.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY = [2000, 5000, 10000];

async function post(path, body, { retries = RETRY } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let status = 0;
    let data = null;
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch { status = 0; }
    if (status === 200 && data?.ok) return { ok: true, data };
    const error = data?.error || (status === 0 ? 'network' : 'unavailable');
    const retriable = status === 0 || status === 503 || (status === 429 && error === 'rate_limited') || status >= 500;
    if (!retriable || attempt >= retries.length) return { ok: false, error, status };
    await sleep(Math.max(retries[attempt], (Number(data?.retryAfter) || 0) * 1000));
  }
}

async function demo(fn) {
  await sleep(700 + Math.random() * 700);
  return { ok: true, data: { ok: true, ...fn(), model: 'demo' } };
}

export function start(config) {
  if (isDemo()) return demo(() => ({ plan: { caseNo: String(1000 + Math.floor(Math.random() * 9000)), ...mockPlan(config) } }));
  return post('/api/start', { config });
}

export function turn(payload) {
  if (isDemo()) {
    return demo(() => {
      const r = mockTurn(payload);
      const left = difficultyOf(payload.config).followups - (payload.followupsUsed || 0);
      if ((r.action === 'followup' || r.action === 'hint') && left <= 0) r.action = 'next';
      return r;
    });
  }
  return post('/api/turn', payload);
}

export function review(payload) {
  if (isDemo()) return demo(() => ({ dossier: { caseNo: payload.plan.caseNo, ...mockReview(payload) } }));
  return post('/api/review', payload, { retries: [3000, 8000] });
}
