// Досье (DESIGN §7.5, PRD §9): штамп-вердикт, характеристика, протокол «показания ↔ эталон».
import { positionLabel, GRADES, DIFFICULTIES, STYLE_LABELS, LANG_LABELS } from './catalog.js';
import { t, getLang } from './i18n.js';
import { $, $$, esc, formatDate } from './ui.js';
import { shake, reducedMotion } from './light.js';

// Детерминированный генератор по номеру дела: один и тот же оттиск для одного дела.
function rng(seedStr) {
  let h = 1779033703;
  for (const ch of String(seedStr)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function stampSvg(verdict, caseNo, lang) {
  const r = rng(`${caseNo}:${verdict}`);
  const angle = (-8 + r() * 14).toFixed(1);
  const seed1 = Math.floor(r() * 900) + 1;
  const seed2 = Math.floor(r() * 900) + 1;
  const ink = (0.78 + r() * 0.16).toFixed(2);
  const label = t(`d.verdict.${verdict}`, {}, lang);
  const words = label.split(' ');
  const lines = label.length > 12 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [label];
  const h = lines.length === 2 ? 150 : 110;
  const id = `ink-${esc(caseNo)}-${verdict}`;
  const text = lines.map((l, i) => `<text x="170" y="${lines.length === 2 ? 66 + i * 44 : 72}" text-anchor="middle" textLength="${Math.min(290, l.length * 26)}" lengthAdjust="spacingAndGlyphs">${esc(l)}</text>`).join('');
  return `<svg class="stamp stamp-${verdict}" viewBox="0 0 340 ${h}" data-rot="${angle}" data-ink="${ink}" role="img" aria-label="${esc(label)}">
    <defs><filter id="${id}" x="-4%" y="-6%" width="108%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${seed1}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${seed2}" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.75" result="holes"/>
      <feComposite in="rough" in2="holes" operator="in"/>
    </filter></defs>
    <g filter="url(#${id})">
      <rect x="6" y="6" width="328" height="${h - 12}" rx="10" fill="none" stroke="currentColor" stroke-width="6"/>
      <rect x="16" y="16" width="308" height="${h - 32}" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>
      ${text}
    </g>
  </svg>`;
}

const scoreClass = (s) => (s >= 7 ? 'hi' : s >= 4 ? 'mid' : 'lo');

function testimony(turns, lang) {
  return turns.slice(1).map((x) => {
    if (x.role === 'candidate') {
      const txt = x.text.startsWith('[') ? t('d.skipped') : x.text;
      return `<p class="cand">— ${esc(txt)}</p>`;
    }
    return `<p class="iv">${esc(x.text)}</p>`;
  }).join('') || `<p class="cand muted">${esc(t('d.notAsked'))}</p>`;
}

export function renderDossier(root, record, { onRetry, onNew, animate = false }) {
  const ui = getLang();
  const { dossier: d, config: c, plan, threads } = record;
  const lang = c.lang;
  const meta = [
    `${t('d.grade')}: ${GRADES[c.grade][ui]}`,
    `${t('d.level')}: ${DIFFICULTIES[c.difficulty][ui].toLowerCase()}`,
    `${t('d.style')}: ${STYLE_LABELS[c.style][ui].toLowerCase()}`,
    `${t('d.lang')}: ${LANG_LABELS[c.lang]}`,
  ];
  if (record.toneSoftened && record.softenedAt) meta.push(t('d.softened', { n: record.softenedAt }));

  const items = plan.questions.map((q, i) => {
    const it = d.items.find((x) => x.qid === q.id) || { score: 0, reference: '', covered: [], missed: q.keyPoints, why: '' };
    const th = threads.find((x) => x?.qid === q.id);
    const points = [
      ...it.covered.map((p) => `<li class="ok"><span class="mark">[+]</span> ${esc(p)}</li>`),
      ...it.missed.map((p) => `<li class="miss"><span class="mark">[–]</span> ${esc(p)}</li>`),
    ].join('');
    return `
    <article class="item" id="item-${q.id}">
      <header class="item-head mono caps">
        <span>${esc(t('d.question', { n: i + 1 }))} · ${esc(q.topic)}${th?.timedOut ? ` · ${esc(t('d.timedOut'))}` : ''}</span>
        <span class="score score-${scoreClass(it.score)}">${it.score}/10</span>
      </header>
      <p class="item-q" lang="${lang}">«${esc(q.text)}»</p>
      <div class="cols">
        <section class="testimony" lang="${lang}">
          <h4 class="mono caps">${esc(t('d.testimony'))}</h4>
          ${testimony(th?.turns || [], lang)}
        </section>
        <section class="reference" lang="${lang}">
          <h4 class="mono caps">${esc(t('d.reference'))}</h4>
          <p>${esc(it.reference)}</p>
        </section>
      </div>
      ${points ? `<ul class="points mono" lang="${lang}">${points}</ul>` : ''}
      ${it.why ? `<p class="why" lang="${lang}"><span class="mono">${esc(t('d.why', { s: it.score }))}</span> ${esc(it.why)}</p>` : ''}
    </article>`;
  }).join('');

  const list = (key, arr) => (arr?.length ? `<section class="col-list"><h3 class="mono caps">${esc(t(key))}</h3><ul lang="${lang}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '');

  root.innerHTML = `
  <div class="paper ${animate ? 'arrive' : ''}">
    <header class="paper-head">
      <div>
        <p class="mono caps case-no">${esc(t('d.case', { n: record.caseNo }))} · ${esc(formatDate(record.date, ui))}</p>
        <p class="candidate"><span class="muted">${esc(t('d.candidate'))}</span> <strong>${esc(positionLabel(c, ui))}</strong>${c.stack ? ` <span class="muted">· ${esc(c.stack)}</span>` : ''}</p>
        <p class="mono meta">${meta.map(esc).join(' · ')}</p>
      </div>
      <div class="verdict">
        <div class="stamp-wrap ${animate && !reducedMotion() ? 'drop' : ''}">${stampSvg(d.verdict, record.caseNo, ui)}</div>
        <p class="total mono"><strong>${d.total}</strong> / 100</p>
      </div>
    </header>

    ${d.characteristic ? `<section class="characteristic"><h3 class="mono caps">${esc(t('d.characteristic'))}</h3><p lang="${lang}">${esc(d.characteristic)}</p></section>` : ''}
    <div class="two-lists">${list('d.strengths', d.strengths)}${list('d.gaps', d.gaps)}</div>

    <h3 class="mono caps protocol-title">${esc(t('d.protocol'))}</h3>
    <nav class="qnav" aria-label="${esc(t('d.protocol'))}">
      ${plan.questions.map((q, i) => {
        const s = d.items.find((x) => x.qid === q.id)?.score ?? 0;
        return `<a class="mono score-${scoreClass(s)}" href="#item-${q.id}" aria-label="${esc(t('d.toQuestion', { n: i + 1 }))}: ${s}/10">${i + 1}</a>`;
      }).join('')}
    </nav>
    ${items}

    ${d.study?.length ? `<section class="study"><h3 class="mono caps">${esc(t('d.study'))}</h3><ol lang="${lang}">${d.study.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>` : ''}

    <div class="paper-actions no-print">
      <button type="button" class="btn btn-primary" data-act="retry">${esc(t('d.retry'))}</button>
      <button type="button" class="btn" data-act="new">${esc(t('d.new'))}</button>
      <button type="button" class="btn btn-ghost" data-act="copy">${esc(t('d.copy'))}</button>
      <button type="button" class="btn btn-ghost" data-act="pdf">${esc(t('d.pdf'))}</button>
    </div>
  </div>`;

  // Навигация по вопросам без смены адреса (адрес — для аналитики).
  for (const a of $$('.qnav a', root)) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      $(a.getAttribute('href'), root)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  }

  root.querySelector('.paper-actions').addEventListener('click', async (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'retry') onRetry(record);
    if (act === 'new') onNew();
    if (act === 'pdf') window.print();
    if (act === 'copy') {
      const ok = await copyText(protocolMarkdown(record));
      if (ok) {
        e.target.textContent = t('d.copied');
        setTimeout(() => { e.target.textContent = t('d.copy'); }, 1800);
      }
    }
  });

  // CSP запрещает style-атрибуты в разметке — переменные ставим через CSSOM.
  for (const svg of $$('.stamp', root)) {
    svg.style.setProperty('--rot', `${svg.dataset.rot}deg`);
    svg.style.setProperty('--ink', svg.dataset.ink);
  }
  if (animate && !reducedMotion()) setTimeout(shake, 320);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function protocolMarkdown(record) {
  const ui = getLang();
  const { dossier: d, config: c, plan, threads } = record;
  const out = [
    `# ${t('d.case', { n: record.caseNo })} — ${t(`d.verdict.${d.verdict}`)} (${d.total}/100)`,
    `${positionLabel(c, ui)}${c.stack ? ` · ${c.stack}` : ''} · ${GRADES[c.grade][ui]} · ${DIFFICULTIES[c.difficulty][ui]} · ${STYLE_LABELS[c.style][ui]}`,
    '',
  ];
  if (d.characteristic) out.push(`> ${d.characteristic}`, '');
  plan.questions.forEach((q, i) => {
    const it = d.items.find((x) => x.qid === q.id) || { score: 0, reference: '', covered: [], missed: [], why: '' };
    const th = threads.find((x) => x?.qid === q.id);
    out.push(`## ${i + 1}. ${q.topic} — ${it.score}/10`, '', `**${q.text}**`, '');
    for (const x of (th?.turns || []).slice(1)) {
      out.push(x.role === 'candidate' ? `- ${x.text.startsWith('[') ? t('d.skipped') : x.text}` : `  _${x.text}_`);
    }
    out.push('', `${t('d.reference')}: ${it.reference}`);
    if (it.covered.length) out.push(`✓ ${it.covered.join('; ')}`);
    if (it.missed.length) out.push(`✗ ${it.missed.join('; ')}`);
    if (it.why) out.push(`${t('d.why', { s: it.score })} ${it.why}`);
    out.push('');
  });
  if (d.study?.length) out.push(`## ${t('d.study')}`, ...d.study.map((x) => `- ${x}`));
  return out.join('\n');
}
