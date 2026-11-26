// GET /api/health — настроен ли ключ, какие модели в цепочке (SPEC §5.4). Без вызова модели.
import { send } from './_lib/http.js';
import { getEnv } from './_lib/env.js';

export default function handler(req, res, deps = {}) {
  const env = deps.env || getEnv();
  send(res, 200, { ok: true, configured: Boolean(env.apiKey), mock: env.mock, models: env.models, modelsUz: env.modelsUz });
}
