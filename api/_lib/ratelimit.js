// Лимиты по клиенту в памяти экземпляра функции (SPEC §5.6).
// У Vercel несколько экземпляров — защита «по возможности», от случайных циклов.
import { createHash } from 'node:crypto';

export const WINDOW_MS = 10 * 60 * 1000;
export const LIMITS = { start: 6, turn: 60, review: 6 };
const CAP = 5000;
const hits = new Map(); // `${bucket}:${key}` -> [timestamps]

export function clientKey(headers = {}) {
  const h = (k) => String(headers[k] || '');
  const ip = h('x-forwarded-for').split(',')[0].trim();
  // Храним только хеш, не IP.
  return createHash('sha256').update(`${h('user-agent')}|${ip}`).digest('hex').slice(0, 32);
}

function sweep(now) {
  for (const [k, list] of hits) {
    const fresh = list.filter((t) => now - t < WINDOW_MS);
    if (fresh.length) hits.set(k, fresh); else hits.delete(k);
  }
  while (hits.size > CAP) hits.delete(hits.keys().next().value);
}

// Проверяет и сразу засчитывает обращение. { ok } или { ok: false, retryAfter }.
export function take(bucket, key, now = Date.now()) {
  sweep(now);
  const id = `${bucket}:${key}`;
  const list = hits.get(id) || [];
  if (list.length >= (LIMITS[bucket] ?? 30)) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((WINDOW_MS - (now - list[0])) / 1000)) };
  }
  list.push(now);
  hits.set(id, list);
  return { ok: true };
}

export function _resetRateLimit() { hits.clear(); }
