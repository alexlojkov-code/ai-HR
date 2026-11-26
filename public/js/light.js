// Свет комнаты (DESIGN §3): стиль → источник (лампа / жалюзи), уровень → жёсткость.
const root = document.documentElement;

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function restart(cls, ms) {
  root.classList.remove(cls);
  void root.offsetWidth; // перезапуск CSS-анимации
  root.classList.add(cls);
  clearTimeout(restart[cls]);
  restart[cls] = setTimeout(() => root.classList.remove(cls), ms);
}

export function roomFor(style) { return style === 'rude' ? 'lamp' : 'blinds'; }

// Переключение источника и жёсткости. При смене источника — «щелчок» с миганием.
export function setRoom({ style, level = 'medium' }) {
  const room = roomFor(style);
  const changed = root.dataset.room !== room;
  root.dataset.room = room;
  root.dataset.level = level;
  root.dataset.power = 'on';
  if (changed && !reducedMotion()) restart(room === 'lamp' ? 'ignite' : 'daylight', 900);
}

export function setPower(on) {
  const was = root.dataset.power === 'on';
  root.dataset.power = on ? 'on' : 'off';
  if (on && !was && !reducedMotion()) restart('ignite', 900);
}

// Верхний свет «Заседание окончено» (DESIGN §7.4).
export function setLit(on) {
  if (on && root.dataset.lit !== 'full' && !reducedMotion()) restart('fluoro', 1400);
  root.dataset.lit = on ? 'full' : '';
}

// Мерцание лампы: 2–3 провала за 450 мс, не чаще 3 вспышек в секунду (DESIGN §3.2).
export function flicker() {
  if (reducedMotion() || root.dataset.room !== 'lamp') return;
  restart('flicker', 500);
}

let randomTimer = null;
export function randomFlicker(enabled) {
  clearTimeout(randomTimer);
  if (!enabled || reducedMotion()) return;
  const next = () => {
    randomTimer = setTimeout(() => { flicker(); next(); }, 40000 + Math.random() * 50000);
  };
  next();
}

// Микро-дрожь экрана при ударе штампа (DESIGN §7.5).
export function shake() {
  if (reducedMotion()) return;
  restart('shake', 160);
}
