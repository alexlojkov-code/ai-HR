// Общая обвязка эндпоинтов: метод, тип, тело, лимиты, ошибки (SPEC §5).
import { send, readJson, header } from './http.js';
import { clientKey, take } from './ratelimit.js';
import { GeminiError } from './gemini.js';
import { log } from './log.js';

export async function prepare(req, res, bucket, deps = {}) {
  if (req.method !== 'POST') { send(res, 405, { ok: false, error: 'method' }, { Allow: 'POST' }); return null; }
  if (!/application\/json/i.test(header(req, 'content-type'))) { send(res, 415, { ok: false, error: 'content_type' }); return null; }
  const parsed = await readJson(req);
  if (!parsed.ok) {
    send(res, parsed.error === 'too_large' ? 413 : 400, { ok: false, error: parsed.error === 'too_large' ? 'too_long' : 'bad_json' });
    return null;
  }
  const rate = take(bucket, clientKey(req.headers || {}), deps.now ? deps.now() : Date.now());
  if (!rate.ok) {
    log('warn', 'rate.limited', { bucket });
    send(res, 429, { ok: false, error: 'rate_limited', retryAfter: rate.retryAfter }, { 'Retry-After': String(rate.retryAfter) });
    return null;
  }
  return parsed.data && typeof parsed.data === 'object' ? parsed.data : {};
}

export function sendInvalid(res, v) {
  send(res, v.status || 400, { ok: false, error: v.error });
}

export function sendModelError(res, err, endpoint) {
  const code = err instanceof GeminiError ? err.code : 'unavailable';
  if (!(err instanceof GeminiError)) log('error', 'endpoint.crash', { endpoint, message: String(err?.message || err).slice(0, 200) });
  if (code === 'rate_limited') return send(res, 429, { ok: false, error: 'rate_limited', retryAfter: 10 }, { 'Retry-After': '10' });
  if (code === 'daily_quota') return send(res, 429, { ok: false, error: 'daily_quota' });
  if (code === 'bad_request') return send(res, 502, { ok: false, error: 'model_error' });
  return send(res, 503, { ok: false, error: 'unavailable', retryAfter: 5 });
}

export const mockDelay = (deps) => (deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms))))(600 + Math.floor(Math.random() * 600));

// Нормализация строк ответа модели: обрезка, узбекские апострофы.
export function tidy(s, max, lang, normalizeUz) {
  let v = String(s ?? '').replace(/\s+\n/g, '\n').trim().slice(0, max);
  if (lang === 'uz') v = normalizeUz(v);
  return v;
}
