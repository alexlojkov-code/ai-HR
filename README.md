# ai-HR

Тренажёр собеседований: ИИ проводит собеседование на выбранную должность и грейд (Стажёр, Junior, Middle, Senior), с уровнем сложности (щадящий, средний, высокий) и стилем (вежливый или грубый), а после выдаёт досье — ваши ответы рядом с эталонными.

План: [PLAN.md](PLAN.md) → [PRD.md](PRD.md) (что и зачем), [SPEC.md](SPEC.md) (как устроено), [DESIGN.md](DESIGN.md) (как выглядит).

## Ссылки

- Боевой сайт: https://ai-hr-uz.vercel.app (Vercel-проект `ai-hr`; push в `main` публикует сам)
- Демо: https://alexlojkov-code.github.io/ai-HR/ (GitHub Pages)
- Репозиторий: https://github.com/alexlojkov-code/ai-HR

## Устройство

- `public/` — статика без сборки (сейчас — страница-заглушка).
- `server.mjs` — локальный сервер для проверки.
- `vercel.json` — настройки Vercel, `.github/workflows/pages.yml` — публикация демо.

## Локально

```bash
node server.mjs
```

Сайт откроется на http://localhost:5250.
