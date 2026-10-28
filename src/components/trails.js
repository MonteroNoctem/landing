import { prefersReducedMotion, whenVisible } from '../lib/motion.js';

// Estelas de luz que convergen en un punto: contactos que llegan desde muchos sitios a un mismo centro
export function initTrails(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  let w = 0;
  let h = 0;
  let lines = [];
  let pulses = [];
  let raf = 0;
  let px = 0;
  let py = 0;

  const vp = () => ({ x: w * (w > 1000 ? 0.74 : 0.8) + px * 18, y: h * 0.42 + py * 12 });

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = w < 700 ? 14 : 26;
    lines = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const r = Math.max(w, h) * (0.7 + Math.random() * 0.4);
      return { a, r, bend: (Math.random() - 0.5) * 0.9, alpha: 0.05 + Math.random() * 0.1 };
    });
    pulses = Array.from({ length: Math.round(count * 0.6) }, () => spawn());
  }

  const spawn = () => ({ line: Math.floor(Math.random() * lines.length), t: Math.random(), speed: 0.0012 + Math.random() * 0.0022 });

  // Punto sobre la curva cuadrática que va del borde al punto de fuga
  function point(l, t, c) {
    const sx = c.x + Math.cos(l.a) * l.r;
    const sy = c.y + Math.sin(l.a) * l.r * 0.7;
    const cx = (sx + c.x) / 2 + Math.cos(l.a + Math.PI / 2) * l.r * l.bend * 0.4;
    const cy = (sy + c.y) / 2 + Math.sin(l.a + Math.PI / 2) * l.r * l.bend * 0.3;
    const u = 1 - t;
    return { x: u * u * sx + 2 * u * t * cx + t * t * c.x, y: u * u * sy + 2 * u * t * cy + t * t * c.y };
  }

  function draw() {
    const c = vp();
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    lines.forEach((l) => {
      ctx.strokeStyle = `rgba(217,128,20,${l.alpha})`;
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const p = point(l, t, c);
        t === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    pulses.forEach((p) => {
      const l = lines[p.line];
      const head = point(l, p.t, c);
      const tail = point(l, Math.max(0, p.t - 0.06), c);
      const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      g.addColorStop(0, 'rgba(217,128,20,0)');
      g.addColorStop(1, 'rgba(240,170,80,0.85)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    });
    // Núcleo
    const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 90);
    glow.addColorStop(0, 'rgba(217,128,20,0.35)');
    glow.addColorStop(1, 'rgba(217,128,20,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(c.x - 90, c.y - 90, 180, 180);
  }

  function frame() {
    pulses.forEach((p) => {
      p.t += p.speed;
      if (p.t > 1) Object.assign(p, spawn(), { t: 0 });
    });
    draw();
    raf = requestAnimationFrame(frame);
  }

  build();
  draw();
  new ResizeObserver(() => {
    build();
    draw();
  }).observe(canvas);

  if (reduced) return;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX / window.innerWidth - 0.5;
    py = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  whenVisible(canvas, (v) => {
    cancelAnimationFrame(raf);
    if (v) raf = requestAnimationFrame(frame);
  });
}
