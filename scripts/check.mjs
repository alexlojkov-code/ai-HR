// Полнота словарей RU / UZ, каталога, мок-данных и фраз (SPEC §7.5). Запуск: npm run check
import { _DICT } from '../public/js/i18n.js';
import { POSITIONS, GROUPS, GRADES, DIFFICULTIES, STYLE_LABELS, LANGS } from '../public/js/catalog.js';
import { PHRASES, SKIP_MARK } from '../public/js/phrases.js';
import { mockPlan } from '../public/js/mock-core.js';

const errors = [];
const keys = (o) => Object.keys(o).sort();
const [ru, uz] = [_DICT.ru, _DICT.uz];
for (const k of keys(ru)) if (!(k in uz)) errors.push(`i18n: нет UZ для ${k}`);
for (const k of keys(uz)) if (!(k in ru)) errors.push(`i18n: лишний UZ ключ ${k}`);
for (const lang of LANGS) for (const [k, v] of Object.entries(_DICT[lang])) {
  if (!String(v).trim()) errors.push(`i18n: пусто ${lang}.${k}`);
  const varsRu = (ru[k] || '').match(/\{\w+\}/g)?.sort().join() || '';
  const varsL = String(v).match(/\{\w+\}/g)?.sort().join() || '';
  if (varsRu !== varsL) errors.push(`i18n: разные переменные в ${lang}.${k}`);
}
for (const set of [POSITIONS, Object.values(GROUPS), Object.values(GRADES), Object.values(DIFFICULTIES), Object.values(STYLE_LABELS)]) {
  for (const x of set) for (const lang of LANGS) if (!x[lang]) errors.push(`catalog: нет ${lang} у ${JSON.stringify(x).slice(0, 60)}`);
}
const walk = (o, path) => {
  if (Array.isArray(o)) { if (!o.length) errors.push(`phrases: пустой список ${path}`); return; }
  if (typeof o === 'string') { if (!o.trim()) errors.push(`phrases: пусто ${path}`); return; }
  for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  if (('ru' in o) !== ('uz' in o)) errors.push(`phrases: нет пары ru/uz в ${path}`);
};
walk(PHRASES, 'PHRASES');
for (const lang of LANGS) if (!SKIP_MARK[lang]) errors.push(`SKIP_MARK: нет ${lang}`);
for (const lang of LANGS) for (const position of ['frontend', 'sales']) for (const difficulty of ['gentle', 'medium', 'hard']) {
  const p = mockPlan({ position, lang, difficulty, style: 'rude', grade: 'junior' });
  if (p.questions.length !== DIFFICULTIES[difficulty].questions) errors.push(`mock: ${lang}/${position}/${difficulty} — ${p.questions.length} вопросов`);
  for (const q of p.questions) if (!q.text || !q.keyPoints.length) errors.push(`mock: пустой вопрос ${lang}/${position}`);
}
// Узбекский: апостроф только ‘ после o/g (шрифты не содержат ʻ U+02BB).
const uzTexts = [...Object.values(uz), ...POSITIONS.map((p) => p.uz), ...JSON.stringify(PHRASES).match(/"[^"]*"/g)];
for (const s of uzTexts) if (/[oOgG][’'ʻʼ`]/.test(s) || /ʻ/.test(s)) errors.push(`uz: неверный апостроф в «${s.slice(0, 50)}»`);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ok: ${keys(ru).length} ключей × ${LANGS.length} языка, ${POSITIONS.length} должностей, фразы и мок-данные полные`);
