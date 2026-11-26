// Экран «Дело» — бланк настройки (DESIGN §7.2, PRD §7).
import {
  POSITIONS, GROUPS, GRADES, GRADE_IDS, DIFFICULTY_IDS, DIFFICULTIES, STYLE_LABELS, LANG_LABELS, LANGS,
  CUSTOM_POSITION, LIMITS, timerFor,
} from './catalog.js';
import { t, getLang } from './i18n.js';
import { esc, $, $$, formatDate } from './ui.js';
import { setRoom } from './light.js';

function ticks(name, ids, labelOf, value) {
  return ids.map((id) => `
    <label class="tick"><input type="radio" name="${name}" value="${id}" ${id === value ? 'checked' : ''}><span>${esc(labelOf(id))}</span></label>`).join('');
}

export function renderSetup(root, { config, adult, onStart }) {
  const lang = getLang();
  const groups = Object.entries(GROUPS).map(([g, label]) => `
    <optgroup label="${esc(label[lang])}">
      ${POSITIONS.filter((p) => p.group === g).map((p) => `<option value="${p.id}" ${p.id === config.position ? 'selected' : ''}>${esc(p[lang])}</option>`).join('')}
    </optgroup>`).join('');
  const levelAngle = { gentle: -50, medium: 0, hard: 50 };

  root.innerHTML = `
  <form class="blank" novalidate>
    <div class="blank-head mono caps">
      <span>${esc(t('setup.case'))} <span class="blank-line">____</span></span>
      <span>${esc(t('setup.date'))} ${esc(formatDate(new Date().toISOString(), lang))}</span>
    </div>

    <div class="row">
      <label class="field-label mono caps" for="f-position">${esc(t('setup.position'))}</label>
      <div class="field">
        <select id="f-position" class="input">
          ${groups}
          <option value="${CUSTOM_POSITION}" ${config.position === CUSTOM_POSITION ? 'selected' : ''}>${esc(t('setup.positionOther'))}</option>
        </select>
        <input id="f-custom" class="input" type="text" maxlength="${LIMITS.positionCustom}" placeholder="${esc(t('setup.positionCustom'))}" value="${esc(config.positionCustom || '')}" ${config.position === CUSTOM_POSITION ? '' : 'hidden'} autocomplete="organization-title">
      </div>
    </div>

    <div class="row">
      <label class="field-label mono caps" for="f-stack">${esc(t('setup.stack'))}</label>
      <div class="field"><input id="f-stack" class="input" type="text" maxlength="${LIMITS.stack}" placeholder="${esc(t('setup.stackPlaceholder'))}" value="${esc(config.stack || '')}"></div>
    </div>

    <fieldset class="row">
      <legend class="field-label mono caps">${esc(t('setup.grade'))}</legend>
      <div class="ticks">${ticks('grade', GRADE_IDS, (id) => GRADES[id][lang], config.grade)}</div>
    </fieldset>

    <fieldset class="row">
      <legend class="field-label mono caps">${esc(t('setup.lang'))}</legend>
      <div class="ticks">${ticks('lang', LANGS, (id) => LANG_LABELS[id], config.lang)}</div>
    </fieldset>

    <div class="controls">
      <fieldset class="switch">
        <legend class="field-label mono caps">${esc(t('setup.style'))}</legend>
        <div class="plate" data-on="${config.style}">
          <span class="screw" aria-hidden="true"></span>
          <label class="rocker-opt top"><input type="radio" name="style" value="polite" ${config.style === 'polite' ? 'checked' : ''}><span>${esc(STYLE_LABELS.polite[lang])}</span></label>
          <span class="rocker" aria-hidden="true"><i></i></span>
          <label class="rocker-opt bottom"><input type="radio" name="style" value="rude" ${config.style === 'rude' ? 'checked' : ''}><span>${esc(STYLE_LABELS.rude[lang])}</span></label>
          <span class="screw" aria-hidden="true"></span>
        </div>
      </fieldset>

      <fieldset class="dimmer">
        <legend class="field-label mono caps">${esc(t('setup.level'))}</legend>
        <div class="dial">
          <span class="knob" aria-hidden="true"><i></i></span>
          ${DIFFICULTY_IDS.map((id) => `<label class="dial-opt ${id}"><input type="radio" name="difficulty" value="${id}" ${id === config.difficulty ? 'checked' : ''}><span>${esc(DIFFICULTIES[id][lang])}</span></label>`).join('')}
        </div>
      </fieldset>
    </div>

    <p class="level-note" id="level-note" aria-live="polite"></p>

    <label class="tick tick-line" id="no-profanity" ${config.style === 'rude' ? '' : 'hidden'}>
      <input type="checkbox" ${config.profanity ? '' : 'checked'}><span>${esc(t('setup.noProfanity'))}</span>
    </label>
    <label class="tick tick-line" id="adult" ${config.style === 'rude' && !adult ? '' : 'hidden'}>
      <input type="checkbox"><span>${esc(t('setup.adult'))}</span>
    </label>

    <p class="form-error" role="alert"></p>
    <div class="blank-actions">
      <button type="submit" class="btn btn-primary btn-big">${esc(t('setup.start'))}</button>
    </div>
  </form>`;

  const form = $('form', root);
  const sel = $('#f-position', form);
  const custom = $('#f-custom', form);
  const err = $('.form-error', form);
  const value = (name) => $(`input[name="${name}"]:checked`, form)?.value;

  const updateLevel = () => {
    const d = value('difficulty');
    const min = Math.round((timerFor({ difficulty: d, grade: value('grade') }) || 0) / 60);
    $('#level-note', form).textContent = t(`setup.level.${d}`, { min });
    $('.knob', form).style.setProperty('--angle', `${levelAngle[d]}deg`);
  };

  const updateStyle = () => {
    const style = value('style');
    $('.plate', form).dataset.on = style;
    $('#no-profanity', form).hidden = style !== 'rude';
    $('#adult', form).hidden = style !== 'rude' || adult;
    setRoom({ style, level: value('difficulty') });
  };

  sel.addEventListener('change', () => {
    custom.hidden = sel.value !== CUSTOM_POSITION;
    if (!custom.hidden) custom.focus();
  });
  for (const r of $$('input[name="style"]', form)) r.addEventListener('change', updateStyle);
  // Клавиша выключателя тоже переключает стиль (радиокнопки остаются для клавиатуры и диктора).
  $('.rocker', form).addEventListener('click', () => {
    const other = $(`input[name="style"][value="${value('style') === 'rude' ? 'polite' : 'rude'}"]`, form);
    other.checked = true;
    updateStyle();
  });
  for (const r of $$('input[name="difficulty"]', form)) r.addEventListener('change', () => { updateLevel(); updateStyle(); });
  for (const r of $$('input[name="grade"]', form)) r.addEventListener('change', updateLevel);
  updateLevel();
  setRoom({ style: config.style, level: config.difficulty });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    const next = {
      position: sel.value,
      positionCustom: custom.value.trim(),
      stack: $('#f-stack', form).value.trim().slice(0, LIMITS.stack),
      grade: value('grade'),
      difficulty: value('difficulty'),
      style: value('style'),
      profanity: !$('#no-profanity input', form).checked,
      lang: value('lang'),
    };
    if (next.position === CUSTOM_POSITION && (next.positionCustom.length < 2 || next.positionCustom.length > LIMITS.positionCustom)) {
      err.textContent = t('setup.errPosition');
      custom.focus();
      return;
    }
    const adultBox = $('#adult input', form);
    if (next.style === 'rude' && !adult && !adultBox.checked) {
      err.textContent = t('setup.errAdult');
      adultBox.focus();
      return;
    }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = t('setup.starting');
    onStart(next, { adultConfirmed: next.style === 'rude' }).finally(() => {
      if (!btn.isConnected) return;
      btn.disabled = false;
      btn.textContent = t('setup.start');
    });
  });
}

export function setupError(root, text) {
  const el = $('.form-error', root);
  if (el) el.textContent = text;
}
