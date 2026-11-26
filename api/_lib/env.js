// Переменные окружения (SPEC §9.1).
// Спайк 26.11.2026: по отдельности модели часто отвечают 503, выручает цепочка (SPEC §3.1).
export const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function getEnv(env = process.env) {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  const models = list(env.GEMINI_MODELS);
  const modelsUz = list(env.GEMINI_MODELS_UZ);
  return {
    apiKey,
    models: models.length ? models : DEFAULT_MODELS,
    modelsUz: modelsUz.length ? modelsUz : null,
    mock: env.AI_MOCK === '1' || !apiKey,
    profanityEnabled: env.PROFANITY_ENABLED !== '0',
  };
}

export function modelsFor(env, lang) {
  return lang === 'uz' && env.modelsUz ? env.modelsUz : env.models;
}
