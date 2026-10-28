// Cada beneficio ilumina la parte de la ficha que lo hace posible
export function initResults(root) {
  if (!root) return;
  const benefits = [...root.querySelectorAll('[data-benefit]')];
  const parts = [...root.querySelectorAll('[data-part]')];

  const activate = (key) => {
    benefits.forEach((b) => b.classList.toggle('is-active', b.dataset.benefit === key));
    parts.forEach((p) => p.classList.toggle('is-lit', p.dataset.part === key));
  };

  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) activate(hit.target.dataset.benefit);
    },
    { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.5, 1] },
  );
  benefits.forEach((b) => {
    io.observe(b);
    b.addEventListener('pointerenter', () => activate(b.dataset.benefit));
  });
  activate(benefits[0].dataset.benefit);
}
