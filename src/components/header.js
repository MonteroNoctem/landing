export function initHeader(header) {
  if (!header) return;
  const toggle = header.querySelector('[data-nav-toggle]');
  const menu = header.querySelector('[data-nav-menu]');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.visually-hidden').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    menu.classList.toggle('is-open', open);
    if (open) header.classList.add('is-scrolled');
    else onScroll();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}
