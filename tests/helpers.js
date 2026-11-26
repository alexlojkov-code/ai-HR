// Подделки req/res и fetch для тестов обработчиков.
export function mockReq({ method = 'POST', headers = {}, body } = {}) {
  return {
    method,
    headers: { 'content-type': 'application/json', 'user-agent': 'test', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b ?? ''; this.ended = true; },
    json() { return JSON.parse(this.body); },
  };
}

// Ответ Gemini с JSON-текстом.
export const gem = (data, extra = {}) => ({ status: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] }, finishReason: 'STOP' }], ...extra } });
export const gemErr = (status, message = 'err', details = []) => ({ status, json: { error: { code: status, message, details } } });
export const gemBlocked = { status: 200, json: { candidates: [{ finishReason: 'SAFETY' }] } };

// Fetch, отвечающий из очереди. Ошибка-объект → бросается.
export function fakeFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const f = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), headers: init.headers });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return { status: next.status, json: async () => next.json };
  };
  f.calls = calls;
  return f;
}

export const realEnv = (over = {}) => ({ apiKey: 'k', models: ['m1', 'm2'], modelsUz: null, mock: false, profanityEnabled: true, ...over });
export const mockEnv = (over = {}) => ({ ...realEnv(), mock: true, ...over });
export const noSleep = async () => {};

export const config = (over = {}) => ({ position: 'frontend', positionCustom: '', stack: 'React', grade: 'junior', difficulty: 'medium', style: 'polite', profanity: true, lang: 'ru', ...over });

export const plan = (n = 7) => ({
  caseNo: '0347',
  interviewer: { title: 'Техлид' },
  intro: 'Начнём.',
  questions: Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, kind: 'tech', topic: `Тема ${i + 1}`, text: `Вопрос ${i + 1}?`, keyPoints: ['пункт один', 'пункт два', 'пункт три'] })),
});
