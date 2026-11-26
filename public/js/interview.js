// Экран собеседования (DESIGN §7.3, SPEC §7.2).
import { difficultyOf, timerFor, positionLabel, GRADES, DIFFICULTIES, LIMITS } from './catalog.js';
import { PHRASES, SKIP_MARK, pick } from './phrases.js';
import { t, getLang } from './i18n.js';
import { $, esc, typeText, announce, confirmDialog, errorText } from './ui.js';
import { Iris } from './iris.js';
import { setRoom, flicker, randomFlicker } from './light.js';
import { voiceSupported, createVoice } from './voice.js';
import * as api from './api.js';

const styleOf = (s) => (s.toneSoftened ? 'polite' : s.config.style);

// Новая сессия из плана (SPEC §4.3).
export function newSession(config, plan) {
  return {
    config,
    plan,
    caseNo: plan.caseNo,
    startedAt: new Date().toISOString(),
    toneSoftened: false,
    softenedAt: null,
    phase: 'intro',
    qIndex: 0,
    followupsUsed: 0,
    threads: [],
    swore: [],
    notes: [],
    closing: [],
  };
}

export function mountInterview(root, { session, persist, onFinish, onExit }) {
  const s = session;
  const lang = s.config.lang;
  const d = difficultyOf(s.config);
  const timerSec = timerFor(s.config);
  const uiLang = getLang();

  root.innerHTML = `
    <div class="iv-bar">
      <p class="mono caps iv-case">${esc(t('d.case', { n: s.caseNo }))} · ${esc(positionLabel(s.config, uiLang))} · ${esc(GRADES[s.config.grade][uiLang])} · ${esc(DIFFICULTIES[s.config.difficulty][uiLang].toLowerCase())}</p>
      <div class="iv-bar-actions">
        <button type="button" class="link-btn" id="iv-soften" ${s.config.style === 'rude' && !s.toneSoftened ? '' : 'hidden'}>${esc(t('iv.soften'))}</button>
        <button type="button" class="link-btn" id="iv-exit">${esc(t('iv.exit'))}</button>
      </div>
    </div>
    <div class="iv-head">
      <canvas class="iris" width="160" height="160" aria-hidden="true"></canvas>
      <p class="mono caps iv-counter" id="iv-counter"></p>
    </div>
    <div class="script" id="script" lang="${lang}"></div>
    <div class="desk">
      <div class="filament" id="filament" role="timer" aria-live="off" hidden><i></i></div>
      <p class="iv-status" id="iv-status" role="status"></p>
      <label class="sr-only" for="answer">${esc(t('iv.yourAnswer'))}</label>
      <textarea id="answer" class="answer" lang="${lang}" rows="3" maxlength="${LIMITS.answer}" placeholder="${esc(t('iv.placeholder'))}" disabled></textarea>
      <p class="interim" id="interim" aria-hidden="true"></p>
      <div class="iv-actions">
        <button type="button" class="btn btn-ghost" id="iv-mic" hidden><span class="mic-dot" aria-hidden="true"></span><span class="label">${esc(t('iv.mic'))}</span></button>
        <button type="button" class="btn btn-ghost" id="iv-skip" disabled>${esc(t('iv.skip'))}</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" id="iv-send" disabled>${esc(t('iv.send'))} <kbd class="mono">${esc(t('iv.sendHint'))}</kbd></button>
      </div>
      <p class="mic-note" id="mic-note" hidden></p>
    </div>`;

  const script = $('#script', root);
  const answer = $('#answer', root);
  const sendBtn = $('#iv-send', root);
  const skipBtn = $('#iv-skip', root);
  const micBtn = $('#iv-mic', root);
  const status = $('#iv-status', root);
  const filament = $('#filament', root);
  const iris = new Iris($('.iris', root));
  iris.setLevel(s.config.difficulty);
  let busy = false;
  let alive = true;
  let timer = null;
  let thinkingNote = null;

  setRoom({ style: styleOf(s), level: s.config.difficulty });
  randomFlicker(s.config.difficulty === 'hard' && styleOf(s) === 'rude');

  // ── вывод реплик ─────────────────────────────────────
  function line(cls, text) {
    for (const old of script.querySelectorAll('.line:not(.past)')) if (cls === 'q') old.classList.add('past');
    const p = document.createElement('p');
    p.className = `line ${cls}`;
    p.textContent = text;
    script.append(p);
    p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return p;
  }

  async function speak(cls, text) {
    const p = line(cls, '');
    iris.setState('speaking');
    await typeText(p, text, { style: styleOf(s), onWord: () => iris.kick(0.015) });
    iris.setState('idle');
    announce(text);
    p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function counter() {
    $('#iv-counter', root).textContent = s.phase === 'closing'
      ? t('iv.closing')
      : t('iv.counter', { i: s.qIndex + 1, n: s.plan.questions.length });
  }

  const thread = () => s.threads[s.qIndex];

  // ── ввод ─────────────────────────────────────────────
  function setInput(on) {
    answer.disabled = !on;
    sendBtn.disabled = !on || !answer.value.trim();
    skipBtn.disabled = !on;
    micBtn.disabled = !on;
    if (on) {
      answer.placeholder = s.phase === 'closing' ? t('iv.closingPlaceholder') : t('iv.placeholder');
      skipBtn.textContent = s.phase === 'closing' ? t('iv.noQuestions') : t('iv.skip');
      if (!matchMedia('(pointer: coarse)').matches) answer.focus();
      iris.setState('listening');
      startTimer();
    } else {
      stopTimer();
      voice?.stop();
    }
  }

  answer.addEventListener('input', () => {
    sendBtn.disabled = answer.disabled || !answer.value.trim();
    iris.kick(0.012);
  });
  answer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!sendBtn.disabled) send(); }
  });
  sendBtn.addEventListener('click', () => send());
  skipBtn.addEventListener('click', () => (s.phase === 'closing' ? noQuestions() : skip()));

  // ── таймер «нить накала» (высокий уровень) ───────────
  function startTimer() {
    if (!timerSec || s.phase !== 'question') return;
    stopTimer();
    filament.hidden = false;
    const t0 = performance.now();
    let announced60 = false; let announced15 = false;
    const tick = () => {
      if (!alive) return;
      const left = Math.max(0, timerSec - (performance.now() - t0) / 1000);
      filament.style.setProperty('--left', String(left / timerSec));
      filament.classList.toggle('hot', left <= 15);
      filament.setAttribute('aria-label', t('iv.timeLeft', { s: Math.ceil(left) }));
      if (!announced60 && left <= 60 && timerSec > 60) { announced60 = true; announce(t('iv.timeLeft', { s: 60 })); }
      if (!announced15 && left <= 15) { announced15 = true; announce(t('iv.timeLeft', { s: 15 })); }
      if (left <= 0) {
        timer = null;
        announce(t('iv.timeUp'));
        if (answer.value.trim()) send({ timedOut: true }); else skip({ timedOut: true });
        return;
      }
      timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  }
  function stopTimer() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
  }

  // ── голос ────────────────────────────────────────────
  let voice = null;
  if (voiceSupported(lang)) {
    micBtn.hidden = false;
    voice = createVoice({
      lang,
      onFinal: (text) => {
        if (!text) return;
        answer.value = `${answer.value.trimEnd()}${answer.value.trim() ? ' ' : ''}${text}`.slice(0, LIMITS.answer);
        answer.dispatchEvent(new Event('input'));
        answer.dataset.via = 'voice';
      },
      onInterim: (text) => { $('#interim', root).textContent = text; },
      onPulse: () => iris.kick(0.03),
      onState: (on) => {
        micBtn.classList.toggle('rec', on);
        micBtn.setAttribute('aria-pressed', String(on));
        $('.label', micBtn).textContent = on ? t('iv.micStop') : t('iv.mic');
        const note = $('#mic-note', root);
        if (on) { note.hidden = false; note.textContent = t('iv.micNote'); }
      },
      onError: (kind) => {
        const note = $('#mic-note', root);
        note.hidden = false;
        if (kind === 'denied') note.textContent = t('iv.micDenied');
        if (kind === 'lang') { note.textContent = t('iv.micNoLang'); micBtn.hidden = true; }
      },
    });
    micBtn.addEventListener('click', () => (voice.active ? voice.stop() : voice.start()));
  }

  // ── сеть ─────────────────────────────────────────────
  function thinking(on) {
    clearTimeout(thinkingNote);
    if (on) {
      iris.setState('thinking');
      thinkingNote = setTimeout(() => { status.textContent = t('iv.thinking'); }, 4000);
    } else {
      status.textContent = '';
    }
  }

  function showFailure(error, retry) {
    iris.setState('idle');
    status.innerHTML = '';
    const msg = document.createElement('span');
    msg.textContent = error === 'daily_quota' ? t('iv.daily') : `${t('iv.away')} `;
    status.append(msg);
    if (error !== 'daily_quota' && error !== 'bad_turn' && error !== 'bad_plan') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'link-btn';
      b.textContent = t('iv.callAgain');
      b.addEventListener('click', () => { status.textContent = ''; retry(); }, { once: true });
      status.append(b);
    } else if (error !== 'daily_quota') {
      msg.textContent = errorText(error);
    }
  }

  // ── ход собеседования ────────────────────────────────
  async function askQuestion(i) {
    s.phase = 'question';
    s.qIndex = i;
    s.followupsUsed = 0;
    const q = s.plan.questions[i];
    if (!s.threads[i]) s.threads[i] = { qid: q.id, turns: [{ role: 'interviewer', text: q.text }], skipped: false, timedOut: false };
    persist();
    counter();
    await speak('q', q.text);
    if (alive) setInput(true);
  }

  async function next() {
    if (s.qIndex + 1 < s.plan.questions.length) return askQuestion(s.qIndex + 1);
    s.phase = 'closing';
    s.closing = [{ role: 'interviewer', text: PHRASES.closingAsk[styleOf(s)][lang] }];
    persist();
    counter();
    await speak('q', s.closing[0].text);
    if (alive) setInput(true);
  }

  function prevSummary() {
    return s.notes.map((n, i) => (n ? `Q${i + 1}: ${n}` : '')).filter(Boolean).join('; ').slice(-LIMITS.prevSummary);
  }

  async function requestTurn() {
    const phase = s.phase === 'closing' ? 'closing' : 'question';
    const threadTurns = phase === 'closing' ? s.closing : thread().turns;
    thinking(true);
    const r = await api.turn({
      config: s.config,
      plan: s.plan,
      qIndex: s.qIndex,
      phase,
      thread: threadTurns.map(({ role, text }) => ({ role, text })),
      followupsUsed: s.followupsUsed,
      profanityUsed: s.swore.slice(-2).filter(Boolean).length,
      toneSoftened: s.toneSoftened,
      prevSummary: prevSummary(),
    });
    thinking(false);
    if (!alive) return;
    if (!r.ok) { showFailure(r.error, () => requestTurn()); return; }
    const { say, action, mood, swore, note } = r.data;
    threadTurns.push({ role: 'interviewer', text: say, action });
    s.swore.push(Boolean(swore));
    if (phase === 'question' && note) s.notes[s.qIndex] = note;
    if (action === 'followup' || action === 'hint') s.followupsUsed += 1;
    persist();
    iris.setMood(mood);
    if (mood === 'displeased' && s.config.difficulty !== 'gentle') flicker();
    await speak('r', say);
    if (!alive) return;
    if (action === 'followup' || action === 'hint') { setInput(true); return; }
    if (action === 'finish') {
      if (phase === 'question') s.toneSoftened = true; // интервьюер вышел из роли
      return finish();
    }
    await pause(500);
    await next();
  }

  async function send({ timedOut = false } = {}) {
    if (busy) return;
    const text = answer.value.trim().slice(0, LIMITS.answer);
    if (!text) return;
    busy = true;
    setInput(false);
    const turns = s.phase === 'closing' ? s.closing : thread().turns;
    turns.push({ role: 'candidate', text, via: answer.dataset.via || 'text' });
    if (timedOut && thread()) thread().timedOut = true;
    answer.value = '';
    delete answer.dataset.via;
    $('#interim', root).textContent = '';
    persist();
    line('a', text);
    try { await requestTurn(); } finally { busy = false; }
  }

  async function skip({ timedOut = false } = {}) {
    if (busy) return;
    busy = true;
    setInput(false);
    const th = thread();
    th.turns.push({ role: 'candidate', text: SKIP_MARK[lang] });
    if (timedOut) th.timedOut = true;
    line('a', t('d.skipped'));
    try {
      // На щадящем уровне «Не знаю» даёт подсказку от интервьюера, иначе — заготовленная реплика без запроса.
      if (d.hints && s.followupsUsed < d.followups && !timedOut) {
        persist();
        await requestTurn();
        return;
      }
      th.skipped = true;
      const say = pick(PHRASES.skip[styleOf(s)][lang]);
      th.turns.push({ role: 'interviewer', text: say, action: 'next' });
      s.swore.push(false);
      persist();
      iris.setMood('displeased');
      await speak('r', say);
      await pause(400);
      if (alive) await next();
    } finally { busy = false; }
  }

  async function noQuestions() {
    if (busy) return;
    busy = true;
    setInput(false);
    const say = PHRASES.closingBye[styleOf(s)][lang];
    s.closing.push({ role: 'interviewer', text: say, action: 'finish' });
    persist();
    await speak('r', say);
    busy = false;
    finish();
  }

  async function finish() {
    s.phase = 'done';
    persist();
    setInput(false);
    await pause(700);
    if (alive) onFinish(s);
  }

  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── «Сбавить тон» и «Выйти» ──────────────────────────
  $('#iv-soften', root).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('confirm.softenTitle'),
      text: t('confirm.softenText'),
      buttons: [{ id: 'cancel', label: t('confirm.cancel') }, { id: 'soften', label: t('confirm.soften'), primary: true }],
    });
    if (ok !== 'soften') return;
    s.toneSoftened = true;
    s.softenedAt = s.qIndex + 1;
    persist();
    $('#iv-soften', root).hidden = true;
    setRoom({ style: 'polite', level: s.config.difficulty });
    randomFlicker(false);
  });

  $('#iv-exit', root).addEventListener('click', async () => {
    const answered = s.threads.some((th) => th?.turns.some((x) => x.role === 'candidate' && !x.text.startsWith('[')));
    const buttons = [{ id: 'stay', label: t('confirm.stay') }];
    if (answered) buttons.push({ id: 'dossier', label: t('confirm.exitDossier'), primary: true });
    buttons.push({ id: 'leave', label: t('confirm.exitNoDossier') });
    const choice = await confirmDialog({ title: t('confirm.exitTitle'), buttons });
    if (choice === 'dossier') { s.phase = 'done'; persist(); destroy(); onFinish(s); }
    if (choice === 'leave') { destroy(); onExit(); }
  });

  function destroy() {
    alive = false;
    stopTimer();
    voice?.stop();
    iris.stop();
    randomFlicker(false);
    clearTimeout(thinkingNote);
  }

  // ── старт или продолжение ────────────────────────────
  async function resume() {
    counter();
    if (s.phase === 'intro') {
      await speak('r', s.plan.intro);
      await pause(300);
      if (alive) await askQuestion(0);
      return;
    }
    if (s.phase === 'done') { onFinish(s); return; }
    // Восстановление после перезагрузки: показываем текущую ветку без печати.
    const turns = s.phase === 'closing' ? s.closing : thread()?.turns || [];
    if (!turns.length) { await askQuestion(s.qIndex); return; }
    for (const [i, x] of turns.entries()) {
      line(i === 0 ? 'q' : x.role === 'candidate' ? 'a' : 'r', x.role === 'candidate' && x.text.startsWith('[') ? t('d.skipped') : x.text);
    }
    const last = turns[turns.length - 1];
    if (last.role === 'candidate') {
      busy = true;
      try { await requestTurn(); } finally { busy = false; }
    } else if (last.action === 'finish') {
      await finish();
    } else if (last.action === 'next') {
      await next();
    } else {
      setInput(true);
    }
  }

  resume();
  return { destroy };
}
