import { links } from '../config.js';

// Conecta los botones con las URLs reales. Si falta alguna, lo dice; nunca simula el destino.
export function initCtas() {
  const missing = [];
  let toast;

  const notify = (text) => {
    if (!toast) {
      toast = document.createElement('p');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('is-on'), 4200);
  };

  document.querySelectorAll('[data-cta]').forEach((el) => {
    const link = links[el.dataset.cta];
    if (!link) return;
    if (link.url) {
      el.href = link.url;
      el.target = '_blank';
      el.rel = 'noopener';
      return;
    }
    if (!missing.includes(link.env)) missing.push(link.env);
    el.dataset.pending = '';
    el.removeAttribute('href');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-disabled', 'true');
    const activate = (e) => {
      e.preventDefault();
      notify(
        import.meta.env.DEV
          ? `«${link.label}» aún no tiene enlace. Configura ${link.env} en .env.local.`
          : `«${link.label}» estará disponible en breve.`,
      );
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && activate(e));
  });

  if (missing.length) console.warn(`[Montero Noctem] Enlaces pendientes: ${missing.join(', ')}`);
}
