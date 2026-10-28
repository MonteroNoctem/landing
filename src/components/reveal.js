// Aparición progresiva de bloques al entrar en pantalla
export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (entry.target.matches('.bridge')) entry.target.closest('.problem')?.classList.add('is-solved');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
  );
  targets.forEach((el) => io.observe(el));
}
