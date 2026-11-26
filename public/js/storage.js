// localStorage с try/catch: без хранилища всё работает, только не сохраняется (SPEC §7.3).
const PREFIX = 'aihr.';
const ARCHIVE_MAX = 20;

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* нет хранилища */ }
}

export function archive() {
  const list = load('archive', []);
  return Array.isArray(list) ? list : [];
}

export function addToArchive(record) {
  const list = archive().filter((r) => r.caseNo !== record.caseNo);
  list.unshift(record);
  // Если места не хватает — выкидываем старые дела по одному.
  let rest = list.slice(0, ARCHIVE_MAX);
  while (rest.length && !save('archive', rest)) rest = rest.slice(0, -1);
}

export function removeFromArchive(caseNo) {
  save('archive', archive().filter((r) => r.caseNo !== caseNo));
}

export function clearArchive() { remove('archive'); }
