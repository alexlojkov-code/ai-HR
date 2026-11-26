// POST /api/review — досье: баллы, эталоны, вердикт (SPEC §5.3).
import { send } from './_lib/http.js';
import { getEnv, modelsFor } from './_lib/env.js';
import { validateReview } from './_lib/validate.js';
import { generate, SAFETY_RUDE } from './_lib/gemini.js';
import { reviewPrompt } from './_lib/prompts.js';
import { REVIEW_SCHEMA } from './_lib/schemas.js';
import { prepare, sendInvalid, sendModelError, mockDelay, tidy } from './_lib/endpoint.js';
import { normalizeUz, totalScore, verdictFor } from '../public/js/catalog.js';
import { mockReview } from '../public/js/mock-core.js';

const NO_REF = {
  ru: 'Эталон не получен — пройдите этот вопрос заново.',
  uz: 'Namunaviy javob olinmadi — bu savolni qaytadan topshiring.',
};

const list = (a, n, max, lang) => (Array.isArray(a) ? a : []).map((s) => tidy(s, max, lang, normalizeUz)).filter(Boolean).slice(0, n);

// Итог и вердикт считает сервер, не модель (SPEC §1.3).
export function buildDossier(raw, input) {
  const lang = input.config.lang;
  const byId = new Map((Array.isArray(raw?.items) ? raw.items : []).map((it) => [String(it?.qid), it]));
  const items = input.plan.questions.map((q) => {
    const th = input.threads.find((t) => t.qid === q.id);
    const answered = th?.turns.some((t) => t.role === 'candidate' && !t.text.startsWith('['));
    const it = byId.get(q.id);
    if (!it) return { qid: q.id, score: 0, reference: NO_REF[lang], covered: [], missed: q.keyPoints, why: '' };
    const score = answered ? Math.max(0, Math.min(10, Math.round(Number(it.score) || 0))) : 0;
    return {
      qid: q.id,
      score,
      reference: tidy(it.reference, 1200, lang, normalizeUz) || NO_REF[lang],
      covered: list(it.covered, 8, 200, lang),
      missed: list(it.missed, 8, 200, lang),
      why: tidy(it.why, 240, lang, normalizeUz),
    };
  });
  const total = totalScore(items.map((i) => i.score));
  return {
    caseNo: input.plan.caseNo,
    total,
    verdict: verdictFor(total),
    characteristic: tidy(raw?.characteristic, 600, lang, normalizeUz),
    strengths: list(raw?.strengths, 4, 200, lang),
    gaps: list(raw?.gaps, 4, 200, lang),
    items,
    study: list(raw?.study, 5, 200, lang),
  };
}

export default async function handler(req, res, deps = {}) {
  const env = deps.env || getEnv();
  const body = await prepare(req, res, 'review', deps);
  if (!body) return;
  const v = validateReview(body);
  if (!v.ok) return sendInvalid(res, v);
  const input = v.value;

  if (env.mock) {
    await mockDelay(deps);
    return send(res, 200, { ok: true, dossier: { ...buildDossier(mockReview(input), input), model: 'mock' } });
  }
  const rude = input.config.style === 'rude' && !input.toneSoftened;
  const run = (soft) => {
    const p = reviewPrompt(input, { profanityEnabled: env.profanityEnabled && !soft });
    return generate({
      apiKey: env.apiKey, models: modelsFor(env, input.config.lang), system: p.system, contents: p.contents,
      schema: REVIEW_SCHEMA, temperature: 0.2, maxTokens: 8000, timeoutMs: 30000, budgetMs: 56000, passes: 2,
      safety: rude ? SAFETY_RUDE : null, fetchImpl: deps.fetch, sleep: deps.sleep,
    });
  };
  try {
    let r;
    try { r = await run(false); } catch (err) {
      if (err?.code !== 'blocked') throw err;
      r = await run(true);
    }
    return send(res, 200, { ok: true, dossier: { ...buildDossier(r.data, input), model: r.model } });
  } catch (err) {
    return sendModelError(res, err, 'review');
  }
}
