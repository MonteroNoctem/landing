import { feedLeads, feedStates } from '../data/leads.js';
import { prefersReducedMotion, whenVisible } from '../lib/motion.js';
import { advanceClock, clockNow } from './clock.js';

const MAX_ROWS = 4;
const TICK_MS = 1500;

// Panel de la primera pantalla: entran contactos y avanzan por las cuatro fases
export function initFeed(root) {
  if (!root) return;
  const list = root.querySelector('[data-feed-list]');
  const mobile = window.matchMedia('(max-width: 560px)');
  let cursor = 0;
  let rows = [];
  let timer = 0;
  let ticks = 0;
  let visible = true;

  const statusOf = (r) => (r.state >= 3 ? r.lead.next : `${r.lead.channel} · ${feedStates[r.state]}`);

  function render(row) {
    row.el.dataset.state = row.state;
    row.el.querySelector('.feed-row__status').textContent = statusOf(row);
    row.el.querySelectorAll('.feed-row__track span').forEach((s, i) => s.classList.toggle('on', i <= row.state));
    row.el.classList.toggle('is-new', row.state === 0);
  }

  function addRow(state = 0, animate = true) {
    const lead = feedLeads[cursor++ % feedLeads.length];
    const el = document.createElement('li');
    el.className = 'feed-row' + (animate ? ' is-enter' : '');
    el.innerHTML = `
      <span class="avatar" aria-hidden="true">${lead.initials}</span>
      <span class="feed-row__who"><strong>${lead.name}</strong> · ${lead.need}</span>
      <span class="feed-row__status"></span>
      <span class="feed-row__track" aria-hidden="true"><span></span><span></span><span></span><span></span></span>`;
    const row = { lead, el, state };
    rows.unshift(row);
    list.prepend(el);
    render(row);
    const max = mobile.matches ? 3 : MAX_ROWS;
    while (rows.length > max) rows.pop().el.remove();
  }

  function tick() {
    ticks += 1;
    // Cada tres pasos entra una consulta nueva; entre medias, avanza la más antigua pendiente
    if (ticks % 3 === 0) {
      advanceClock(Math.ceil(Math.random() * 6));
      addRow();
    } else {
      const pending = [...rows].reverse().find((r) => r.state < 3);
      if (pending) {
        pending.state += 1;
        render(pending);
      }
    }
  }

  function loop() {
    clearTimeout(timer);
    if (!visible || document.hidden) return;
    timer = setTimeout(() => {
      tick();
      loop();
    }, TICK_MS);
  }

  // Estado inicial con contactos en fases distintas (el más reciente arriba)
  list.innerHTML = '';
  [3, 2, 1].forEach((s) => addRow(s, false));
  root.querySelector('[data-clock]').textContent = clockNow();

  if (prefersReducedMotion()) return;
  whenVisible(root, (v) => {
    visible = v;
    loop();
  });
  document.addEventListener('visibilitychange', loop);
}
