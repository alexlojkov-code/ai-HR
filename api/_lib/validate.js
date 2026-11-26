// Проверка входа (SPEC §5.5). Возвращает { ok, value } или { ok: false, error, status }.
import {
  LANGS, STYLES, GRADE_IDS, DIFFICULTY_IDS, POSITIONS, CUSTOM_POSITION, LIMITS, difficultyOf,
} from '../../public/js/catalog.js';

const POSITION_IDS = new Set([...POSITIONS.map((p) => p.id), CUSTOM_POSITION]);
const KINDS = new Set(['tech', 'behavioral', 'case']);

// Убираем управляющие символы, кроме перевода строки и табуляции.
export function clean(s) {
  return String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

const fail = (error, status = 400) => ({ ok: false, error, status });

export function validateConfig(c) {
  if (!c || typeof c !== 'object') return fail('bad_config');
  const v = {
    position: String(c.position || ''),
    positionCustom: clean(c.positionCustom).slice(0, LIMITS.positionCustom + 1),
    stack: clean(c.stack),
    grade: String(c.grade || ''),
    difficulty: String(c.difficulty || ''),
    style: String(c.style || ''),
    profanity: c.profanity !== false,
    lang: String(c.lang || 'ru'),
  };
  if (!POSITION_IDS.has(v.position)) return fail('bad_config');
  if (v.position === CUSTOM_POSITION) {
    if (v.positionCustom.length < 2 || v.positionCustom.length > LIMITS.positionCustom) return fail('bad_config');
  } else {
    v.positionCustom = '';
  }
  if (v.stack.length > LIMITS.stack) return fail('bad_config');
  if (!GRADE_IDS.includes(v.grade) || !DIFFICULTY_IDS.includes(v.difficulty)) return fail('bad_config');
  if (!STYLES.includes(v.style) || !LANGS.includes(v.lang)) return fail('bad_config');
  return { ok: true, value: v };
}

export function validatePlan(p, config) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.questions)) return fail('bad_plan');
  const max = difficultyOf(config).questions;
  if (p.questions.length < 1 || p.questions.length > max) return fail('bad_plan');
  const questions = [];
  for (const q of p.questions) {
    if (!q || typeof q !== 'object') return fail('bad_plan');
    const text = clean(q.text);
    const keyPoints = Array.isArray(q.keyPoints) ? q.keyPoints.map(clean).filter(Boolean) : [];
    if (!text || text.length > LIMITS.questionText) return fail('bad_plan');
    if (!keyPoints.length || keyPoints.length > LIMITS.keyPoints || keyPoints.some((k) => k.length > LIMITS.keyPoint)) return fail('bad_plan');
    questions.push({
      id: clean(q.id).slice(0, 8) || `q${questions.length + 1}`,
      kind: KINDS.has(q.kind) ? q.kind : 'tech',
      topic: clean(q.topic).slice(0, 80),
      text,
      keyPoints,
    });
  }
  return {
    ok: true,
    value: {
      caseNo: clean(p.caseNo).slice(0, 8),
      interviewer: { title: clean(p.interviewer?.title).slice(0, 60) },
      intro: clean(p.intro).slice(0, 400),
      questions,
    },
  };
}

function validateTurns(turns) {
  if (!Array.isArray(turns) || turns.length > LIMITS.threadTurns) return null;
  const out = [];
  for (const t of turns) {
    if (!t || (t.role !== 'interviewer' && t.role !== 'candidate')) return null;
    const text = clean(t.text);
    if (t.role === 'candidate' && text.length > LIMITS.answer) return 'too_long';
    if (t.role === 'interviewer' && text.length > 1200) return null;
    out.push({ role: t.role, text });
  }
  return out;
}

export function validateTurn(body) {
  const c = validateConfig(body?.config);
  if (!c.ok) return c;
  const p = validatePlan(body.plan, c.value);
  if (!p.ok) return p;
  const phase = body.phase === 'closing' ? 'closing' : 'question';
  const qIndex = Number.isInteger(body.qIndex) ? body.qIndex : -1;
  if (phase === 'question' && (qIndex < 0 || qIndex >= p.value.questions.length)) return fail('bad_turn');
  const thread = validateTurns(body.thread);
  if (thread === 'too_long') return fail('too_long', 413);
  if (!thread || !thread.length || thread[thread.length - 1].role !== 'candidate') return fail('bad_turn');
  return {
    ok: true,
    value: {
      config: c.value,
      plan: p.value,
      qIndex: Math.max(0, qIndex),
      phase,
      thread,
      followupsUsed: Math.max(0, Math.min(5, Number(body.followupsUsed) || 0)),
      profanityUsed: Math.max(0, Math.min(5, Number(body.profanityUsed) || 0)),
      toneSoftened: body.toneSoftened === true,
      prevSummary: clean(body.prevSummary).slice(0, LIMITS.prevSummary),
    },
  };
}

export function validateReview(body) {
  const c = validateConfig(body?.config);
  if (!c.ok) return c;
  const p = validatePlan(body.plan, c.value);
  if (!p.ok) return p;
  if (!Array.isArray(body.threads) || body.threads.length > p.value.questions.length) return fail('bad_review');
  const ids = new Set(p.value.questions.map((q) => q.id));
  const threads = [];
  let chars = 0;
  for (const th of body.threads) {
    if (!th || !ids.has(th.qid)) return fail('bad_review');
    const turns = validateTurns(th.turns || []);
    if (turns === 'too_long') return fail('too_long', 413);
    if (!turns) return fail('bad_review');
    chars += turns.reduce((a, t) => a + t.text.length, 0);
    threads.push({ qid: th.qid, turns, skipped: th.skipped === true, timedOut: th.timedOut === true });
  }
  if (chars > LIMITS.reviewChars) return fail('too_long', 413);
  if (!threads.some((t) => t.turns.some((x) => x.role === 'candidate'))) return fail('bad_review');
  return { ok: true, value: { config: c.value, plan: p.value, threads, toneSoftened: body.toneSoftened === true } };
}
