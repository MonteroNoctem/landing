const query = window.matchMedia('(prefers-reduced-motion: reduce)');
// ?reduce-motion en la URL fuerza el modo reducido para revisarlo sin cambiar el sistema
const forced = new URLSearchParams(location.search).has('reduce-motion');
if (forced) document.documentElement.classList.add('reduce-motion');

export const prefersReducedMotion = () => forced || query.matches;
export const onReducedMotionChange = (fn) => query.addEventListener('change', fn);

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// Ejecuta fn solo mientras el elemento está en pantalla
export function whenVisible(el, fn, options = {}) {
  const io = new IntersectionObserver(([entry]) => fn(entry.isIntersecting), options);
  io.observe(el);
  return () => io.disconnect();
}

/**
 * FLIP: mide los contactos, aplica el cambio de DOM y anima cada uno desde
 * su posición anterior, con un pequeño salto para que se sigan con la mirada.
 */
export function flip(root, mutate, { duration = 700, hop = 22 } = {}) {
  const before = new Map();
  root.querySelectorAll('.lead').forEach((el) => before.set(el, el.getBoundingClientRect()));
  mutate();
  if (prefersReducedMotion()) return;

  root.querySelectorAll('.lead').forEach((el) => {
    const first = before.get(el);
    if (!first) return;
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const far = Math.hypot(dx, dy) > 60;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        far
          ? { transform: `translate(${dx / 2}px, ${dy / 2 - hop}px) scale(1.05)`, offset: 0.5 }
          : { transform: `translate(${dx / 2}px, ${dy / 2}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: far ? duration : duration * 0.6, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  });
}
