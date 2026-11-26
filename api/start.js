// POST /api/start — конфиг → план собеседования (SPEC §5.1).
import { send } from './_lib/http.js';
import { getEnv, modelsFor } from './_lib/env.js';
import { validateConfig } from './_lib/validate.js';
import { generate, SAFETY_RUDE } from './_lib/gemini.js';
import { startPrompt } from './_lib/prompts.js';
import { PLAN_SCHEMA } from './_lib/schemas.js';
import { prepare, sendInvalid, sendModelError, mockDelay, tidy } from './_lib/endpoint.js';
import { difficultyOf, normalizeUz } from '../public/js/catalog.js';
import { mockPlan } from '../public/js/mock-core.js';
import { log } from './_lib/log.js';

export function newCaseNo(rand = Math.random) {
  return String(1000 + Math.floor(rand() * 9000));
}

// Приводит план модели к контракту: ровно N вопросов, 3–6 пунктов, id q1…qN.
export function normalizePlan(raw, config) {
  const n = difficultyOf(config).questions;
  const lang = config.lang;
  const fallback = mockPlan(config);
  const qs = Array.isArray(raw?.questions) ? raw.questions : [];
  const questions = [];
  for (const q of qs) {
    if (questions.length >= n) break;
    const text = tidy(q?.text, 500, lang, normalizeUz);
    const keyPoints = (Array.isArray(q?.keyPoints) ? q.keyPoints : []).map((k) => tidy(k, 160, lang, normalizeUz)).filter(Boolean).slice(0, 6);
    if (!text || !keyPoints.length) continue;
    questions.push({
      kind: ['tech', 'behavioral', 'case'].includes(q.kind) ? q.kind : 'tech',
      topic: tidy(q.topic, 60, lang, normalizeUz),
      text,
      keyPoints,
    });
  }
  let filled = 0;
  for (const q of fallback.questions) {
    if (questions.length >= n) break;
    questions.push(q); filled += 1;
  }
  if (filled) log('warn', 'plan.filled', { filled });
  return {
    interviewer: { title: tidy(raw?.interviewerTitle, 40, lang, normalizeUz) || fallback.interviewer.title },
    intro: tidy(raw?.intro, 300, lang, normalizeUz) || fallback.intro,
    questions: questions.map((q, i) => ({ ...q, id: `q${i + 1}` })),
  };
}

export default async function handler(req, res, deps = {}) {
  const env = deps.env || getEnv();
  const body = await prepare(req, res, 'start', deps);
  if (!body) return;
  const v = validateConfig(body.config);
  if (!v.ok) return sendInvalid(res, v);
  const config = v.value;

  if (env.mock) {
    await mockDelay(deps);
    return send(res, 200, { ok: true, plan: { caseNo: newCaseNo(), ...mockPlan(config) }, model: 'mock' });
  }
  // Фильтр модели иногда блокирует грубый план целиком: повторяем без мата, затем вежливо, и только потом — заготовка.
  const attempts = config.style === 'rude'
    ? [{ cfg: config, profanity: env.profanityEnabled }, { cfg: config, profanity: false }, { cfg: { ...config, style: 'polite' }, profanity: false }]
    : [{ cfg: config, profanity: false }];
  for (const [i, a] of attempts.entries()) {
    try {
      const { system, contents } = startPrompt(a.cfg, { profanityEnabled: a.profanity });
      const r = await generate({
        apiKey: env.apiKey, models: modelsFor(env, config.lang), system, contents, schema: PLAN_SCHEMA,
        temperature: 0.9, maxTokens: 2500, timeoutMs: 12000, budgetMs: 21000, passes: 2,
        safety: a.cfg.style === 'rude' ? SAFETY_RUDE : null, fetchImpl: deps.fetch, sleep: deps.sleep,
      });
      const plan = { caseNo: newCaseNo(), ...normalizePlan(r.data, config) };
      if (a.cfg.style !== config.style) plan.intro = mockPlan(config).intro; // приветствие — в выбранном стиле
      return send(res, 200, { ok: true, plan, model: r.model });
    } catch (err) {
      if (err?.code !== 'blocked') return sendModelError(res, err, 'start');
      log('warn', 'start.blocked', { attempt: i + 1 });
    }
  }
  return send(res, 200, { ok: true, plan: { caseNo: newCaseNo(), ...mockPlan(config) }, model: 'fallback' });
}
