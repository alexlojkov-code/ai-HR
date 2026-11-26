// Интервьюер-диафрагма: 7 лепестков, отверстие сужается и раскрывается (DESIGN §6).
const BLADES = 7;
const TAU = Math.PI * 2;
const STATE_OPEN = { idle: 0.55, listening: 0.55, thinking: 0.4, speaking: 0.5 };
const MOOD_OPEN = { pleased: 0.7, neutral: 0.55, displeased: 0.28 };
const LEVEL = {
  gentle: { shift: 0.1, tau: 0.5 },
  medium: { shift: 0, tau: 0.3 },
  hard: { shift: -0.1, tau: 0.16 },
};

export class Iris {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.open = 0.55;
    this.state = 'idle';
    this.moodTarget = null;
    this.snap = false;
    this.rot = 0;
    this.pulse = 0;
    this.level = LEVEL.medium;
    this.last = performance.now();
    this.running = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.frame = this.frame.bind(this);
    new ResizeObserver(() => this.resize()).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.wake()));
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = this.canvas.clientWidth || 88;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.draw();
  }

  setLevel(level) { this.level = LEVEL[level] || LEVEL.medium; this.wake(); }

  setState(state) {
    this.state = state;
    if (state === 'thinking' || state === 'listening') this.moodTarget = null;
    this.wake();
  }

  setMood(mood) {
    this.moodTarget = MOOD_OPEN[mood] ?? null;
    this.snap = mood === 'displeased';
    this.wake();
  }

  kick(amount = 0.02) { this.pulse = Math.min(0.08, this.pulse + amount); this.wake(); }

  target() {
    const base = this.moodTarget ?? STATE_OPEN[this.state] ?? 0.55;
    return Math.max(0.12, Math.min(0.85, base + this.level.shift));
  }

  wake() {
    if (this.reduced) { this.open = this.target(); this.draw(); return; }
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() { this.running = false; }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const tau = this.snap ? 0.06 : this.level.tau;
    let target = this.target();
    const breathing = this.state === 'idle' || this.state === 'listening';
    if (breathing) target += 0.03 * Math.sin((now / 5000) * TAU);
    this.open += (target - this.open) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - this.open) < 0.005) this.snap = false;
    this.pulse *= Math.exp(-dt / 0.3);
    if (this.state === 'thinking') this.rot += (20 * Math.PI / 180) * dt;
    this.draw();
    const settled = !breathing && this.state !== 'thinking' && this.pulse < 0.001 && Math.abs(target - this.open) < 0.002;
    if (settled) { this.running = false; return; }
    requestAnimationFrame(this.frame);
  }

  draw() {
    const { ctx, size } = this;
    if (!size) return;
    const css = getComputedStyle(this.canvas);
    const col = (n, d) => css.getPropertyValue(n).trim() || d;
    const blade = col('--iris-blade', '#1b1d1c');
    const edge = col('--iris-edge', '#f6e7c1');
    const light = col('--iris-light', '#fff6df');
    const rim = col('--iris-rim', '#2a2d2a');
    const c = size / 2;
    const R = c - 2;
    const r = R * 0.9 * Math.min(0.95, this.open + this.pulse);
    const rot = this.rot + this.open * 1.4; // лепестки поворачиваются при раскрытии

    ctx.clearRect(0, 0, size, size);
    // Корпус.
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fillStyle = blade; ctx.fill();

    // Отверстие: свет за диафрагмой, затухание к краю.
    const pts = [];
    for (let i = 0; i < BLADES; i += 1) {
      const a = rot + (i * TAU) / BLADES;
      pts.push([c + r * Math.cos(a), c + r * Math.sin(a)]);
    }
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const g = ctx.createRadialGradient(c, c, 0, c, c, Math.max(1, r));
    g.addColorStop(0, light);
    g.addColorStop(0.7, light);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // Швы лепестков: от вершины по направлению следующей грани до корпуса.
    ctx.lineWidth = 1;
    for (let i = 0; i < BLADES; i += 1) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % BLADES];
      let dx = x1 - x0; let dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const px = x0 - c; const py = y0 - c;
      const b = px * dx + py * dy;
      const t = -b + Math.sqrt(Math.max(0, b * b - (px * px + py * py - (R * 0.97) ** 2)));
      const ex = x0 + dx * t; const ey = y0 + dy * t;
      const mx = (x0 + ex) / 2 - dy * t * 0.12; const my = (y0 + ey) / 2 + dx * t * 0.12;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, ex, ey);
      // Кромки, обращённые к лампе (сверху), подсвечены сильнее.
      ctx.globalAlpha = 0.25 + 0.45 * Math.max(0, -(y0 - c) / R);
      ctx.strokeStyle = edge; ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Обод и блик сверху.
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = rim; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, R - 1, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; ctx.strokeStyle = edge; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
