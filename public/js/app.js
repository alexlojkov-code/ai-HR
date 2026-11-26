// Машина состояний экранов (SPEC §7.1).
import { defaultConfig, LANGS } from './catalog.js';
import { setLang, getLang, t } from './i18n.js';
import { $, $$, esc, errorText } from './ui.js';
import { load, save, remove, archive, addToArchive } from './storage.js';
import { go, parsePath, initAnalytics, isDemo } from './router.js';
import { setRoom, setPower, setLit, reducedMotion } from './light.js';
import { renderSetup, setupError } from './setup.js';
import { mountInterview, newSession } from './interview.js';
import { renderDossier } from './dossier.js';
import { renderArchive } from './archive.js';
import * as api from './api.js';

const screens = Object.fromEntries($$('[data-screen]').map((el) => [el.dataset.screen, el]));
let current = null;
let interview = null;
let lastRecord = null;

function show(name, params = {}) {
  if (interview && name !== 'interview') { interview.destroy(); interview = null; }
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  current = name;
  document.documentElement.dataset.screen = name;
  go(name, { lang: getLang(), ...params });
  updateTop();
  window.scrollTo({ top: 0, behavior: 'instant' });
  const h = screens[name].querySelector('h1, [data-focus]');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

function updateTop() {
  const n = archive().length;
  const link = $('#top-archive');
  link.hidden = n === 0 || current === 'interview';
  link.innerHTML = `<span class="long">${esc(t('top.archive'))}</span><span class="short">${esc(t('top.archiveShort'))}</span> (${n})`;
  for (const b of $$('#top-lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  $('#top-lang').setAttribute('aria-label', t('top.lang'));
  $('#top-lang').hidden = current === 'interview' || current === 'reviewing';
}

// ── Вход ───────────────────────────────────────────────
function showEntry() {
  setLit(false);
  const session = load('session');
  const root = screens.entry;
  root.innerHTML = `
    <div class="entry">
      <h1 class="entry-title">${esc(t('entry.title'))}</h1>
      <p class="entry-lead">${esc(t('entry.lead'))}</p>
      <div class="entry-actions">
        <button type="button" class="btn btn-primary btn-big" data-act="enter">${esc(t('entry.enter'))}</button>
        ${session?.caseNo && session.phase !== 'done' ? `<button type="button" class="link-btn" data-act="resume">${esc(t('entry.resume', { n: session.caseNo }))}</button>` : ''}
      </div>
    </div>`;
  if (!document.documentElement.dataset.room) {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.room = dark ? 'lamp' : 'blinds';
    document.documentElement.dataset.level = 'medium';
  }
  setPower(false);
  root.querySelector('.entry-actions').addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'enter') {
      setPower(true);
      setTimeout(showSetup, reducedMotion() ? 0 : 650);
    }
    if (act === 'resume') { setPower(true); continueSession(load('session')); }
  });
  show('entry');
}

// ── Дело ───────────────────────────────────────────────
function showSetup() {
  setLit(false);
  const saved = load('config');
  const config = { ...defaultConfig(getLang()), ...(saved || {}) };
  if (!saved) config.lang = getLang();
  renderSetup(screens.setup, {
    config,
    adult: load('adult') === true,
    onStart: async (cfg, { adultConfirmed }) => {
      save('config', cfg);
      if (adultConfirmed) save('adult', true);
      const r = await api.start(cfg);
      if (!r.ok) { setupError(screens.setup, errorText(r.error)); return; }
      const session = newSession(cfg, r.data.plan);
      save('session', session);
      startInterview(session);
    },
  });
  show('setup');
}

// ── Собеседование ──────────────────────────────────────
function startInterview(session) {
  setLit(false);
  setRoom({ style: session.toneSoftened ? 'polite' : session.config.style, level: session.config.difficulty });
  show('interview', { difficulty: session.config.difficulty, style: session.config.style });
  interview = mountInterview(screens.interview, {
    session,
    persist: () => save('session', session),
    onFinish: (s) => showReviewing(s),
    onExit: () => { remove('session'); showEntry(); },
  });
}

function continueSession(session) {
  if (!session) return showEntry();
  if (session.phase === 'done') return showReviewing(session);
  startInterview(session);
}

// ── «Заседание окончено» и досье ───────────────────────
async function showReviewing(session) {
  if (interview) { interview.destroy(); interview = null; }
  setLit(true);
  const root = screens.reviewing;
  const ui = getLang();
  const steps = t('rv.steps').split('|');
  root.innerHTML = `
    <div class="folder-big" data-focus>
      <p class="mono caps folder-cover" id="rv-cover"></p>
      <p class="mono rv-step" id="rv-step" aria-live="polite"></p>
      <p class="rv-error" id="rv-error" hidden></p>
    </div>`;
  show('reviewing');
  const cover = $('#rv-cover', root);
  const title = t('d.case', { n: session.caseNo });
  if (reducedMotion()) cover.textContent = title;
  else for (let i = 1; i <= title.length; i += 1) setTimeout(() => { cover.textContent = title.slice(0, i); }, i * 45);
  let k = 0;
  const stepTimer = setInterval(() => { $('#rv-step', root).textContent = steps[Math.min(k, steps.length - 1)]; k += 1; }, 2800);

  const payload = {
    config: session.config,
    plan: session.plan,
    threads: session.threads.filter(Boolean).map((th) => ({ qid: th.qid, turns: th.turns.map(({ role, text }) => ({ role, text })), skipped: th.skipped, timedOut: th.timedOut })),
    toneSoftened: session.toneSoftened,
  };
  const r = await api.review(payload);
  clearInterval(stepTimer);
  if (current !== 'reviewing') return;
  if (!r.ok) {
    const err = $('#rv-error', root);
    err.hidden = false;
    err.innerHTML = `<span>${esc(r.error === 'daily_quota' ? t('iv.daily') : t('rv.fail'))}</span> ${r.error === 'daily_quota' ? '' : `<button type="button" class="link-btn">${esc(t('rv.retry'))}</button>`}`;
    err.querySelector('button')?.addEventListener('click', () => showReviewing(session), { once: true });
    $('#rv-step', root).textContent = '';
    return;
  }
  const record = {
    caseNo: session.caseNo,
    date: new Date().toISOString(),
    config: session.config,
    plan: session.plan,
    threads: payload.threads,
    toneSoftened: session.toneSoftened,
    softenedAt: session.softenedAt,
    dossier: r.data.dossier,
  };
  addToArchive(record);
  remove('session');
  showDossier(record, { animate: true, ui });
}

function showDossier(record, { animate = false } = {}) {
  lastRecord = record;
  setLit(true);
  setRoom({ style: record.config.style, level: record.config.difficulty });
  renderDossier(screens.dossier, record, {
    animate,
    onRetry: (rec) => {
      // Тот же план, новые ответы, без нового запроса к /api/start (SPEC §7.4).
      const session = newSession(rec.config, { ...rec.plan, caseNo: String(1000 + Math.floor(Math.random() * 9000)) });
      save('session', session);
      startInterview(session);
    },
    onNew: () => showSetup(),
  });
  show('dossier', { verdict: record.dossier.verdict });
}

function showArchive(caseNo = null) {
  setLit(true);
  if (caseNo) {
    const rec = archive().find((r) => r.caseNo === caseNo);
    if (rec) return showDossier(rec);
  }
  renderArchive(screens.archive, {
    onOpen: (rec) => rec && showDossier(rec),
    onBack: () => showEntry(),
  });
  show('archive');
}

// ── Язык ───────────────────────────────────────────────
function switchLang(lang) {
  if (lang === getLang()) return;
  setLang(lang);
  save('lang', lang);
  if (current === 'setup') showSetup();
  else if (current === 'dossier' && lastRecord) showDossier(lastRecord);
  else if (current === 'archive') showArchive();
  else showEntry();
}

// ── Запуск ─────────────────────────────────────────────
function boot() {
  const fromPath = parsePath(location.pathname);
  const saved = load('lang');
  const browser = (navigator.language || '').toLowerCase().startsWith('uz') ? 'uz' : 'ru';
  const lang = fromPath.lang || (LANGS.includes(saved) ? saved : browser);
  setLang(lang);
  if (isDemo()) $('#demo-bar').hidden = false;

  $('#top-lang').addEventListener('click', (e) => { const b = e.target.closest('button[data-lang]'); if (b) switchLang(b.dataset.lang); });
  $('#top-archive').addEventListener('click', () => showArchive());
  $('#top-home').addEventListener('click', () => { if (current !== 'interview') showEntry(); });
  $('#privacy-open').addEventListener('click', () => $('#privacy').showModal());
  window.addEventListener('popstate', () => {
    if (current === 'interview') { go('interview', { lang: getLang(), difficulty: load('session')?.config?.difficulty, style: load('session')?.config?.style }); return; }
    const p = parsePath(location.pathname);
    if (p.archive) showArchive(p.caseNo); else showEntry();
  });

  if (fromPath.archive) showArchive(fromPath.caseNo); else showEntry();
  initAnalytics();
}

boot();
