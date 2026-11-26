// Архив дел (DESIGN §7.6): стопка папок, новые сверху, последние 20.
import { positionLabel, GRADES } from './catalog.js';
import { t, getLang } from './i18n.js';
import { esc, formatDate, confirmDialog } from './ui.js';
import { archive, clearArchive, removeFromArchive } from './storage.js';

export function renderArchive(root, { onOpen, onBack }) {
  const ui = getLang();
  const list = archive();
  root.innerHTML = `
    <div class="archive">
      <div class="archive-head">
        <h1 class="mono caps">${esc(t('a.title'))}</h1>
        <button type="button" class="link-btn" data-act="back">${esc(t('a.back'))}</button>
      </div>
      ${list.length ? `<ol class="folders">${list.map((r) => `
        <li class="folder">
          <button type="button" class="folder-btn" data-open="${esc(r.caseNo)}">
            <span class="mono caps folder-no">${esc(t('d.case', { n: r.caseNo }))}</span>
            <span class="folder-title">${esc(positionLabel(r.config, ui))} · ${esc(GRADES[r.config.grade][ui])}</span>
            <span class="mono folder-date">${esc(formatDate(r.date, ui))}</span>
            <span class="mini-stamp stamp-${r.dossier.verdict} mono caps">${esc(t(`d.verdict.${r.dossier.verdict}`))} · ${r.dossier.total}</span>
          </button>
          <button type="button" class="link-btn folder-del" data-del="${esc(r.caseNo)}">${esc(t('a.delete'))}</button>
        </li>`).join('')}</ol>
        <button type="button" class="link-btn danger" data-act="clear">${esc(t('a.clear'))}</button>`
    : `<p class="empty">${esc(t('a.empty'))}</p>`}
    </div>`;

  root.querySelector('.archive').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'back') onBack();
    if (b.dataset.open) onOpen(list.find((r) => r.caseNo === b.dataset.open));
    if (b.dataset.del) { removeFromArchive(b.dataset.del); renderArchive(root, { onOpen, onBack }); }
    if (b.dataset.act === 'clear') {
      const ok = await confirmDialog({ title: t('a.clear'), text: t('a.clearConfirm'), buttons: [{ id: 'cancel', label: t('confirm.cancel') }, { id: 'clear', label: t('a.clear'), primary: true }] });
      if (ok === 'clear') { clearArchive(); renderArchive(root, { onOpen, onBack }); }
    }
  });
}
