// Каталог тренажёра: должности, грейды, уровни, стили, языки, лимиты (PRD §7, SPEC §4.1).
// Общий модуль для браузера и функций Vercel — без DOM и без зависимостей.

export const LANGS = ['ru', 'uz'];
export const STYLES = ['polite', 'rude'];
export const GRADE_IDS = ['intern', 'junior', 'middle', 'senior'];
export const DIFFICULTY_IDS = ['gentle', 'medium', 'hard'];

export const GRADES = {
  intern: { ru: 'Стажёр', uz: 'Stajyor' },
  junior: { ru: 'Junior', uz: 'Junior' },
  middle: { ru: 'Middle', uz: 'Middle' },
  senior: { ru: 'Senior', uz: 'Senior' },
};

// Параметры уровня задаёт каталог, а не модель (SPEC §4.1).
export const DIFFICULTIES = {
  gentle: { questions: 5, followups: 1, hints: true, timerSec: null, ru: 'Щадящий', uz: 'Yumshoq' },
  medium: { questions: 7, followups: 1, hints: false, timerSec: null, ru: 'Средний', uz: 'O‘rta' },
  hard: { questions: 9, followups: 2, hints: false, timerSec: 120, timerSecSenior: 180, ru: 'Высокий', uz: 'Yuqori' },
};

export const STYLE_LABELS = {
  polite: { ru: 'Вежливо', uz: 'Xushmuomala' },
  rude: { ru: 'Грубо', uz: 'Qo‘pol' },
};

export const LANG_LABELS = { ru: 'Русский', uz: 'O‘zbekcha' };

export const GROUPS = {
  dev: { ru: 'Разработка', uz: 'Dasturlash' },
  data: { ru: 'Данные и анализ', uz: 'Ma’lumotlar va tahlil' },
  product: { ru: 'Продукт и дизайн', uz: 'Mahsulot va dizayn' },
  business: { ru: 'Бизнес и обслуживание', uz: 'Biznes va xizmat ko‘rsatish' },
};

// 21 должность (PRD §7.1). `tech: true` — больше профессиональных вопросов, false — больше кейсов.
export const POSITIONS = [
  { id: 'frontend', group: 'dev', tech: true, ru: 'Frontend-разработчик', uz: 'Frontend-dasturchi' },
  { id: 'backend', group: 'dev', tech: true, ru: 'Backend-разработчик', uz: 'Backend-dasturchi' },
  { id: 'fullstack', group: 'dev', tech: true, ru: 'Fullstack-разработчик', uz: 'Fullstack-dasturchi' },
  { id: 'mobile', group: 'dev', tech: true, ru: 'Mobile-разработчик (iOS / Android / Flutter)', uz: 'Mobil dasturchi (iOS / Android / Flutter)' },
  { id: 'onec', group: 'dev', tech: true, ru: '1С-программист', uz: '1C dasturchisi' },
  { id: 'devops', group: 'dev', tech: true, ru: 'DevOps / SRE-инженер', uz: 'DevOps / SRE muhandisi' },
  { id: 'qa', group: 'dev', tech: true, ru: 'QA-инженер / тестировщик', uz: 'QA muhandisi / testlovchi' },
  { id: 'sysadmin', group: 'dev', tech: true, ru: 'Системный администратор', uz: 'Tizim administratori' },
  { id: 'data_analyst', group: 'data', tech: true, ru: 'Аналитик данных', uz: 'Ma’lumotlar tahlilchisi' },
  { id: 'data_scientist', group: 'data', tech: true, ru: 'Data Scientist / ML-инженер', uz: 'Data Scientist / ML muhandisi' },
  { id: 'business_analyst', group: 'data', tech: true, ru: 'Бизнес- / системный аналитик', uz: 'Biznes / tizim tahlilchisi' },
  { id: 'product_manager', group: 'product', tech: false, ru: 'Product Manager', uz: 'Product Manager' },
  { id: 'project_manager', group: 'product', tech: false, ru: 'Project Manager', uz: 'Project Manager' },
  { id: 'uxui', group: 'product', tech: true, ru: 'UI/UX-дизайнер', uz: 'UI/UX dizayner' },
  { id: 'graphic_designer', group: 'product', tech: true, ru: 'Графический дизайнер', uz: 'Grafik dizayner' },
  { id: 'sales', group: 'business', tech: false, ru: 'Менеджер по продажам', uz: 'Savdo menejeri' },
  { id: 'call_center', group: 'business', tech: false, ru: 'Оператор колл-центра', uz: 'Call-markaz operatori' },
  { id: 'marketing', group: 'business', tech: false, ru: 'Маркетолог / SMM-специалист', uz: 'Marketolog / SMM mutaxassisi' },
  { id: 'hr', group: 'business', tech: false, ru: 'HR-менеджер / рекрутер', uz: 'HR menejeri / rekruter' },
  { id: 'accountant', group: 'business', tech: false, ru: 'Бухгалтер', uz: 'Buxgalter' },
  { id: 'banking', group: 'business', tech: false, ru: 'Банковский специалист (кредиты, операционист)', uz: 'Bank mutaxassisi (kredit, operatsionist)' },
];

export const CUSTOM_POSITION = 'custom';

export const LIMITS = {
  answer: 2000,
  positionCustom: 60,
  stack: 80,
  threadTurns: 8,
  reviewChars: 40000,
  questionText: 600,
  keyPoint: 200,
  keyPoints: 8,
  prevSummary: 300,
};

export const VERDICTS = ['hired', 'rework', 'rejected'];

export function positionById(id) {
  return POSITIONS.find((p) => p.id === id) || null;
}

// Название должности на языке `lang` (для custom — то, что ввёл кандидат).
export function positionLabel(config, lang = 'ru') {
  if (config.position === CUSTOM_POSITION) return String(config.positionCustom || '').trim();
  const p = positionById(config.position);
  return p ? p[lang] || p.ru : '';
}

export function isTechPosition(config) {
  if (config.position === CUSTOM_POSITION) return null; // неизвестно — пусть решает модель
  return positionById(config.position)?.tech ?? true;
}

export function difficultyOf(config) {
  return DIFFICULTIES[config.difficulty] || DIFFICULTIES.medium;
}

// Секунд на ответ или null (PRD §7.3).
export function timerFor(config) {
  const d = difficultyOf(config);
  if (!d.timerSec) return null;
  return config.grade === 'senior' && d.timerSecSenior ? d.timerSecSenior : d.timerSec;
}

// Итог 0–100 по баллам 0–10 (пропуск = 0) и вердикт (PRD §9, SPEC §4.4).
export function totalScore(scores) {
  if (!scores.length) return 0;
  const sum = scores.reduce((a, s) => a + (Number.isFinite(s) ? Math.max(0, Math.min(10, s)) : 0), 0);
  return Math.round((sum / scores.length) * 10);
}

export function verdictFor(total) {
  if (total >= 75) return 'hired';
  if (total >= 50) return 'rework';
  return 'rejected';
}

// Узбекские апострофы → символы, которые есть во всех шрифтах (SPEC §6, DESIGN §5.1):
// после o/g (oʻ, gʻ) — ‘ U+2018, иначе (тутуқ белгиси) — ’ U+2019.
export function normalizeUz(text) {
  return String(text).replace(/([oOgG])['‘’ʻʼ`´]/g, '$1‘').replace(/(\p{L})['ʻʼ`´](?=\p{L})/gu, '$1’');
}

export function defaultConfig(lang = 'ru') {
  return {
    position: 'frontend',
    positionCustom: '',
    stack: '',
    grade: 'junior',
    difficulty: 'medium',
    style: 'polite',
    profanity: true,
    lang,
  };
}
