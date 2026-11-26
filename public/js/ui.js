// Мелкие помощники интерфейса: экранирование, печать реплик, подтверждение, объявления.
import { t } from './i18n.js';
import { reducedMotion } from './light.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function announce(text) {
  const live = $('#live');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}

// Печать реплики (DESIGN §8): вежливо — плавно, грубо — рывками по словам.
// Клик по реплике допечатывает сразу. Возвращает Promise, который резолвится по окончании.
// Расписание: [{ end: индекс конца куска, at: мс от начала }]. Вежливо — по знаку, грубо — по слову.
function schedule(text, rude) {
  const out = [];
  let at = 0;
  let i = 0;
  while (i < text.length) {
    const chunk = rude ? (text.slice(i).match(/^\S*\s*/)[0] || text[i]) : text[i];
    i += chunk.length;
    const ch = chunk.trimEnd().slice(-1);
    at += rude ? 10 * Math.max(3, Math.min(12, chunk.trim().length)) : 24;
    if (/[.?!…]/.test(ch)) at += rude ? 180 : 120;
    else if (/[,;:—]/.test(ch)) at += 60;
    out.push({ end: i, at, word: rude || /\s/.test(chunk) });
  }
  return out;
}

// На requestAnimationFrame и по времени: не зависит от того, как браузер тормозит таймеры.
export function typeText(el, text, { style = 'polite', onWord } = {}) {
  el.textContent = '';
  if (reducedMotion() || !text) { el.textContent = text; return Promise.resolve(); }
  const steps = schedule(text, style === 'rude');
  return new Promise((resolve) => {
    let done = false;
    let k = 0;
    const t0 = performance.now();
    const finish = () => {
      if (done) return;
      done = true;
      el.textContent = text;
      el.removeEventListener('click', finish);
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(guard);
      resolve();
    };
    const onHide = () => { if (document.hidden) finish(); };
    // Если кадры не рисуются (фоновая вкладка) — допечатываем по таймеру.
    const guard = setTimeout(finish, steps[steps.length - 1].at + 1500);
    el.addEventListener('click', finish);
    document.addEventListener('visibilitychange', onHide);
    const frame = (now) => {
      if (done) return;
      const elapsed = now - t0;
      let words = 0;
      while (k < steps.length && steps[k].at <= elapsed) { if (steps[k].word) words += 1; k += 1; }
      if (k > 0) el.textContent = text.slice(0, steps[k - 1].end);
      if (words) onWord?.();
      if (k >= steps.length) return finish();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

// Окно подтверждения на <dialog>. buttons: [{ id, label, primary }] → Promise<id|null>.
export function confirmDialog({ title, text = '', buttons }) {
  const dlg = $('#confirm');
  $('#confirm-title', dlg).textContent = title;
  $('#confirm-text', dlg).textContent = text;
  $('#confirm-text', dlg).hidden = !text;
  const box = $('#confirm-actions', dlg);
  box.innerHTML = buttons.map((b) => `<button type="button" class="btn ${b.primary ? 'btn-primary' : ''}" data-id="${esc(b.id)}">${esc(b.label)}</button>`).join('');
  return new Promise((resolve) => {
    const onClick = (e) => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      dlg.close(b.dataset.id);
    };
    box.addEventListener('click', onClick);
    dlg.addEventListener('close', () => {
      box.removeEventListener('click', onClick);
      resolve(dlg.returnValue && dlg.returnValue !== 'cancel' ? dlg.returnValue : null);
    }, { once: true });
    dlg.returnValue = '';
    dlg.showModal();
    box.querySelector('.btn-primary, button')?.focus();
  });
}

export function errorText(error) {
  if (error === 'daily_quota') return t('iv.daily');
  if (error === 'rate_limited') return t('err.rate');
  return t('err.generic');
}

export function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === 'uz' ? 'uz-Latn-UZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(iso).slice(0, 10); }
}
