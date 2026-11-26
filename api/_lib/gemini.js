// Вызов Gemini: JSON по схеме, цепочка запасных моделей, таймауты, safety (SPEC §3.2–3.4).
import { log } from './log.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code; // no_key | unavailable | rate_limited | daily_quota | blocked | bad_request
  }
}

// Модели с обязательными «размышлениями»: без лимита они съедают все токены (SPEC §3.1).
const THINKING = /hydrogen|argon|carbon|neon|-pro/;
// Flash (не lite) по умолчанию размышляет — просим минимум, иначе медленно.
const THINK_MIN = /^gemini-[\d.]+-flash$/;

export const SAFETY_RUDE = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
];

function isDailyQuota(body) {
  const details = body?.error?.details || [];
  const text = JSON.stringify(details) + String(body?.error?.message || '');
  return /PerDay|per day|RequestsPerDay/i.test(text);
}

/**
 * @returns {Promise<{ data: any, model: string, ms: number }>}
 */
export async function generate({
  apiKey, models, system, contents, schema,
  temperature = 0.7, maxTokens = 1024, timeoutMs = 12000, budgetMs = null, safety = null, passes = 1,
  fetchImpl = globalThis.fetch, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  if (!apiKey) throw new GeminiError('no_key');
  const started = now();
  const budget = budgetMs ?? Math.round(timeoutMs * 1.5);
  const failures = [];

  // Несколько проходов по цепочке: при перегрузке (503) модели часто оживают через пару секунд.
  const queue = [];
  for (let p = 0; p < passes; p += 1) queue.push(...models.map((m) => ({ model: m, pass: p })));
  for (const [idx, { model, pass }] of queue.entries()) {
    if (pass > 0 && queue[idx - 1].pass !== pass) {
      if (failures.every((f) => f === 'daily')) break;
      await sleep(1500);
    }
    const left = budget - (now() - started);
    if (left < 1500) break;
    const generationConfig = {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      responseSchema: schema,
    };
    if (THINK_MIN.test(model)) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };
    if (THINKING.test(model)) {
      generationConfig.thinkingConfig = { thinkingLevel: 'low' };
      generationConfig.maxOutputTokens = maxTokens + 4096;
    }
    const body = { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig };
    if (safety) body.safetySettings = safety;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, left));
    const t0 = now();
    let status = 0;
    let json = null;
    try {
      const res = await fetchImpl(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch (err) {
      clearTimeout(timer);
      const timeout = err?.name === 'AbortError';
      failures.push(timeout ? 'timeout' : 'network');
      log('warn', 'gemini.fail', { model, reason: timeout ? 'timeout' : 'network', ms: now() - t0 });
      continue;
    }
    clearTimeout(timer);

    if (status !== 200) {
      const reason = status === 429 ? (isDailyQuota(json) ? 'daily' : 'minute') : `http_${status}`;
      failures.push(reason);
      log('warn', 'gemini.fail', { model, reason, status, ms: now() - t0 });
      continue;
    }

    if (json?.promptFeedback?.blockReason) {
      log('warn', 'gemini.blocked', { model, reason: json.promptFeedback.blockReason });
      throw new GeminiError('blocked');
    }
    const cand = json?.candidates?.[0];
    const finish = cand?.finishReason;
    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST') {
      log('warn', 'gemini.blocked', { model, finish });
      throw new GeminiError('blocked');
    }
    const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      failures.push(text ? 'bad_json' : 'empty');
      log('warn', 'gemini.fail', { model, reason: text ? 'bad_json' : 'empty', finish, ms: now() - t0 });
      continue;
    }
    const ms = now() - t0;
    log('info', 'gemini.ok', { model, ms, finish, out: json?.usageMetadata?.candidatesTokenCount });
    return { data, model, ms };
  }

  if (failures.length && failures.every((f) => f === 'daily')) throw new GeminiError('daily_quota');
  if (failures.some((f) => f === 'minute' || f === 'daily')) throw new GeminiError('rate_limited');
  if (failures.length && failures.every((f) => /^http_4(00|03|04)$/.test(f))) throw new GeminiError('bad_request');
  throw new GeminiError('unavailable');
}
