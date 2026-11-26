// POST /api/turn — реакция интервьюера на ответ (SPEC §5.2).
import { send } from './_lib/http.js';
import { getEnv, modelsFor } from './_lib/env.js';
import { validateTurn } from './_lib/validate.js';
import { generate, SAFETY_RUDE } from './_lib/gemini.js';
import { turnPrompt } from './_lib/prompts.js';
import { TURN_SCHEMA } from './_lib/schemas.js';
import { prepare, sendInvalid, sendModelError, mockDelay, tidy } from './_lib/endpoint.js';
import { difficultyOf, normalizeUz } from '../public/js/catalog.js';
import { mockTurn } from '../public/js/mock-core.js';
import { PHRASES, pick } from '../public/js/phrases.js';
import { log } from './_lib/log.js';

const ACTIONS = ['followup', 'hint', 'next', 'finish'];
const MOODS = ['pleased', 'neutral', 'displeased'];

// Правила действий по уровню (SPEC §5.2): уточнения сверх нормы → next, hint только на щадящем.
export function enforceTurn(raw, input) {
  const d = difficultyOf(input.config);
  const lang = input.config.lang;
  let action = ACTIONS.includes(raw?.action) ? raw.action : 'next';
  const left = d.followups - input.followupsUsed;
  if (input.phase === 'closing') action = 'finish';
  if (action === 'hint' && !d.hints) action = left > 0 ? 'followup' : 'next';
  if ((action === 'followup' || action === 'hint') && left <= 0) action = 'next';
  const say = tidy(raw?.say, 500, lang, normalizeUz) || pick(PHRASES.skip[input.toneSoftened ? 'polite' : input.config.style][lang]);
  return {
    say,
    action,
    mood: MOODS.includes(raw?.mood) ? raw.mood : 'neutral',
    swore: raw?.swore === true,
    note: tidy(raw?.note, 60, lang, normalizeUz),
  };
}

export default async function handler(req, res, deps = {}) {
  const env = deps.env || getEnv();
  const body = await prepare(req, res, 'turn', deps);
  if (!body) return;
  const v = validateTurn(body);
  if (!v.ok) return sendInvalid(res, v);
  const input = v.value;

  if (env.mock) {
    await mockDelay(deps);
    return send(res, 200, { ok: true, ...enforceTurn(mockTurn(input), input), model: 'mock' });
  }

  const rude = input.config.style === 'rude' && !input.toneSoftened;
  const call = (extra = {}) => {
    const p = turnPrompt(input, { profanityEnabled: env.profanityEnabled && !extra.noProfanity, profanityUsed: input.profanityUsed });
    const system = extra.soften ? `${p.system}\n\nБез мата. Смягчи формулировки, сарказм оставь.` : p.system;
    return generate({
      apiKey: env.apiKey, models: modelsFor(env, input.config.lang), system, contents: p.contents, schema: TURN_SCHEMA,
      temperature: 0.8, maxTokens: 400, timeoutMs: 7000, budgetMs: 17000, safety: rude ? SAFETY_RUDE : null, fetchImpl: deps.fetch,
    });
  };

  try {
    let r;
    try {
      r = await call();
    } catch (err) {
      if (err?.code !== 'blocked') throw err;
      log('warn', 'turn.blocked_retry');
      try {
        r = await call({ soften: true, noProfanity: true });
      } catch (err2) {
        if (err2?.code !== 'blocked') throw err2;
        log('warn', 'turn.blocked_fallback');
        const list = rude ? PHRASES.blocked[input.config.lang] : PHRASES.skip.polite[input.config.lang];
        return send(res, 200, { ok: true, say: pick(list), action: input.phase === 'closing' ? 'finish' : 'next', mood: 'displeased', swore: false, note: '', model: 'fallback' });
      }
    }
    return send(res, 200, { ok: true, ...enforceTurn(r.data, input), model: r.model });
  } catch (err) {
    return sendModelError(res, err, 'turn');
  }
}
