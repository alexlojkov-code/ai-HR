// Адреса экранов для аналитики (SPEC §7.1, §12). В адресах нет личных данных.
export const SCREENS = ['entry', 'setup', 'interview', 'reviewing', 'dossier', 'archive'];

export function screenPath(screen, { lang = 'ru', difficulty, style, verdict, caseNo } = {}) {
  const prefix = lang === 'uz' ? '/uz' : '';
  switch (screen) {
    case 'setup': return `${prefix}/delo`;
    case 'interview': return `${prefix}/interview/${difficulty}-${style}`;
    case 'reviewing': return `${prefix}/reviewing`;
    case 'dossier': return `${prefix}/dossier/${verdict}`;
    case 'archive': return caseNo ? `${prefix}/archive/${caseNo}` : `${prefix}/archive`;
    default: return prefix || '/';
  }
}

// Разбор адреса при загрузке: только язык и архив, остальное — из хранилища.
export function parsePath(pathname) {
  const m = String(pathname).match(/^(\/uz)?(\/.*)?$/);
  const lang = m?.[1] ? 'uz' : null;
  const rest = (m?.[2] || '/').replace(/\/+$/, '') || '/';
  const arch = rest.match(/^\/archive(?:\/(\d{4}))?$/);
  return { lang, archive: Boolean(arch), caseNo: arch?.[1] || null };
}

const isStatic = () => /github\.io$/.test(location.hostname);
const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export function go(screen, params) {
  if (isStatic()) return;
  const path = screenPath(screen, params);
  if (location.pathname !== path) history.pushState({ screen }, '', path);
}

// Vercel Web Analytics: только на боевом домене (SPEC §12.3).
export function initAnalytics() {
  if (isStatic() || isLocal()) return;
  window.va = window.va || function va(...args) { (window.vaq = window.vaq || []).push(args); };
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.append(s);
}

export const isDemo = isStatic;
