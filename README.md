# ai-HR

Тренажёр собеседований: ИИ проводит собеседование на выбранную должность и грейд (Стажёр, Junior, Middle, Senior), с уровнем сложности (щадящий, средний, высокий) и стилем (вежливый или грубый, с умеренным матом), на русском или узбекском. После собеседования — досье: ваши ответы дословно рядом с эталонными ответами ИИ, баллы и штамп-вердикт.

План: [PLAN.md](PLAN.md) → [PRD.md](PRD.md) (что и зачем), [SPEC.md](SPEC.md) (как устроено), [DESIGN.md](DESIGN.md) (как выглядит). Отчёт проверки моделей: [scripts/spike-report.md](scripts/spike-report.md).

## Ссылки

- Боевой сайт: https://ai-hr-uz.vercel.app (Vercel-проект `ai-hr`; push в `main` публикует сам)
- Демо: https://alexlojkov-code.github.io/ai-HR/ (GitHub Pages; интервьюер на заготовках, без ИИ)
- Репозиторий: https://github.com/alexlojkov-code/ai-HR

## Устройство

- `public/` — сайт без сборки: `index.html`, `css/` (токены, комната и свет, экраны, досье, печать), `js/`, `fonts/` (Golos Text, Spectral, PT Mono — урезанные woff2).
- `public/js/catalog.js` — должности, грейды, уровни, стили, языки; общий для браузера и сервера.
- `public/js/i18n.js` — тексты интерфейса RU / UZ (узбекский — черновик, нужна вычитка носителем).
- `api/` — функции Vercel на Node.js 22 без зависимостей: `start.js` (план), `turn.js` (реакция интервьюера), `review.js` (досье), `health.js`.
- `api/_lib/prompts.js` — промпты интервьюера; `gemini.js` — вызов Gemini с цепочкой запасных моделей.
- `public/js/mock-core.js` — интервьюер на заготовках: без ключа, в тестах и в демо.

## Локально

Создайте `.env` по образцу `.env.example`. С `AI_MOCK=1` интервьюер работает на заготовках и не тратит лимит ключа.

```bash
node server.mjs
```

Сайт откроется на http://localhost:5250.

```bash
npm test
```

```bash
npm run check
```

```bash
npm run spike
```

`npm test` — тесты API, промптов, проверки входа и цепочки моделей; `npm run check` — полнота словарей RU/UZ; `npm run spike` — проверка настоящих моделей (около 30 запросов к Gemini, отчёт в `scripts/spike-report.md`).

## Переменные Vercel

`GEMINI_API_KEY` (Sensitive, Production + Preview) уже добавлен. Необязательные: `GEMINI_MODELS`, `GEMINI_MODELS_UZ`, `PROFANITY_ENABLED=0` — аварийно выключить мат.
