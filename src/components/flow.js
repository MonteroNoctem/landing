import { featured, ambient, channels, slotLabels } from '../data/leads.js';
import { prefersReducedMotion, onReducedMotionChange, clamp, flip, whenVisible } from '../lib/motion.js';

const STEPS = 6;
const AUTOPLAY_MS = 3200;
// Qué zona se ilumina y qué conexión se activa en cada paso
const STEP_ZONE = ['channels', 'core', 'core', 'core', 'crm', 'out'];
const STEP_WIRE = [null, 'wa-core', 'wa-core', null, 'core-crm', 'crm-out'];

export function initFlow(root) {
  if (!root) return;
  const stage = root.querySelector('[data-stage]');
  const plane = root.querySelector('[data-stage-plane]');
  const svg = root.querySelector('[data-wires]');
  const stepsEl = root.querySelector('[data-steps]');
  const stepItems = [...root.querySelectorAll('.step')];
  const playBtn = root.querySelector('[data-flow-play]');
  const card = root.querySelector('[data-lead-card]');
  const slot = (name) => plane.querySelector(`[data-slot="${name}"]`);
  const msgs = [...root.querySelectorAll('[data-msg]')];
  const fields = [...root.querySelectorAll('[data-field]')];
  const agendaNote = root.querySelector('[data-out-note]');
  const teamNote = root.querySelector('[data-team-note]');

  const leadsById = new Map();
  let step = -1;
  let pinned = false;
  let autoplay = false;
  let userPaused = false;
  let visible = false;
  let cardOpenFor = null;
  let autoTimer = 0;

  stepItems.forEach((li) => {
    const text = li.querySelector('.step__text');
    text.dataset.label = li.querySelector('.step__label').textContent;
  });

  /* ── Contactos ── */
  function makeLead(lead, isFeatured = false) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lead' + (isFeatured ? ' lead--featured' : '');
    el.dataset.lead = lead.id;
    el.setAttribute('aria-haspopup', 'dialog');
    el.innerHTML = `
      <span class="avatar" aria-hidden="true">${lead.initials}</span>
      <span class="lead__text"><span class="lead__name">${lead.name}</span><span class="lead__need">${lead.need}</span></span>`;
    el.setAttribute('aria-label', `${lead.name}, ${lead.need}. Ver ficha de demostración`);
    el.addEventListener('click', () => openCard(lead, el));
    leadsById.set(lead.id, lead);
    return el;
  }

  const featuredEl = makeLead(featured, true);

  /* ── Conexiones ── */
  function drawWires() {
    if (!svg || getComputedStyle(svg).display === 'none') return;
    const w = plane.clientWidth;
    const h = plane.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const box = (el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    const zone = (name) => box(plane.querySelector(`[data-zone="${name}"]`));
    const channelsZone = zone('channels');
    const core = zone('core');
    const crm = zone('crm');
    const out = zone('out');
    const curve = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2;
      return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    };
    const paths = [];
    ['ch-whatsapp', 'ch-instagram', 'ch-form'].forEach((a) => {
      const ch = plane.querySelector(`[data-anchor="${a}"]`);
      // .channel está dentro de la zona: sumamos el offset de la zona
      const y = channelsZone.y + ch.offsetTop + ch.offsetHeight / 2;
      const key = a === 'ch-whatsapp' ? 'wa-core' : a === 'ch-instagram' ? 'ig-core' : 'form-core';
      paths.push([key, curve(channelsZone.x + channelsZone.w, y, core.x, core.y + core.h * 0.3)]);
    });
    paths.push(['core-crm', curve(core.x + core.w, core.y + core.h / 2, crm.x, crm.y + crm.h / 2)]);
    paths.push(['crm-out', curve(crm.x + crm.w, crm.y + crm.h / 2, out.x, out.y + out.h * 0.3)]);
    svg.innerHTML = paths.map(([k, d]) => `<path class="wire" data-wire="${k}" d="${d}"/>`).join('');
    applyWire();
  }

  const flashes = new Map();
  function applyWire() {
    svg.querySelectorAll('.wire').forEach((p) => {
      const k = p.dataset.wire;
      p.classList.toggle('is-active', k === STEP_WIRE[step] || flashes.has(k));
    });
  }
  function flashWire(key) {
    if (!key) return;
    clearTimeout(flashes.get(key));
    flashes.set(key, setTimeout(() => { flashes.delete(key); applyWire(); }, 900));
    applyWire();
  }
  const wireFor = (from, to) => {
    if (to === 'core') return { whatsapp: 'wa-core', instagram: 'ig-core', form: 'form-core' }[from];
    if (from === 'core' && to.startsWith('crm')) return 'core-crm';
    if (from.startsWith('crm') && to.startsWith('out')) return 'crm-out';
    return null;
  };

  /* ── Estado del paso ── */
  function setStep(next, { animate = true } = {}) {
    next = clamp(next, 0, STEPS - 1);
    if (next === step) return;
    const prev = step;
    step = next;

    stepItems.forEach((li, i) => {
      li.classList.toggle('is-active', i === step);
      li.classList.toggle('is-done', i < step);
      li.querySelector('.step__btn').setAttribute('aria-current', i === step ? 'step' : 'false');
    });
    stepsEl.style.setProperty('--progress', step / (STEPS - 1));

    plane.querySelectorAll('[data-zone]').forEach((z) => z.classList.toggle('is-active', z.dataset.zone === STEP_ZONE[step]));

    const target = slot(featured.path[step]);
    const move = () => {
      if (featuredEl.parentElement !== target) target.prepend(featuredEl);
    };
    animate ? flip(plane, move, { duration: 900, hop: 34 }) : move();

    msgs.forEach((m, i) => m.classList.toggle('is-on', (step >= 1 && i === 0) || (step >= 2 && i > 0)));
    fields.forEach((f, i) => {
      const on = step >= 3;
      clearTimeout(f._t);
      if (on && prev < 3 && animate && !prefersReducedMotion()) f._t = setTimeout(() => f.classList.add('is-on'), 180 * i);
      else f.classList.toggle('is-on', on);
    });
    agendaNote.classList.toggle('is-on', step >= 5);
    teamNote.classList.toggle('is-on', step >= 5);

    if (cardOpenFor === featured.id) fillCard(featured);
    applyWire();
  }

  /* ── Contactos de fondo ── */
  const runners = ambient.map((lead, i) => ({ lead, el: null, idx: -1, wait: 900 + i * 1700 }));
  let last = 0;
  let raf = 0;

  const ambientCount = (name) => slot(name).querySelectorAll('.lead:not(.lead--featured)').length;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (!visible || cardOpenFor || document.hidden) return;
    runners.forEach((r) => {
      r.wait -= dt;
      if (r.wait > 0) return;
      const { route, pace } = r.lead;
      if (r.idx === -1) {
        if (ambientCount(r.lead.channel) >= 1) { r.wait = 800; return; }
        r.el = makeLead(r.lead);
        r.el.classList.add('is-arriving');
        flip(plane, () => slot(route[0]).append(r.el));
        r.idx = 0;
        r.wait = pace;
      } else if (r.idx < route.length - 1) {
        const to = route[r.idx + 1];
        if (ambientCount(to) >= (to === 'core' ? 2 : 2)) { r.wait = 700; return; }
        flashWire(wireFor(route[r.idx], to));
        r.el.classList.remove('is-arriving');
        flip(plane, () => slot(to).append(r.el));
        r.idx += 1;
        r.wait = pace * (r.idx === route.length - 1 ? 1.6 : 1);
      } else {
        const el = r.el;
        el.classList.add('is-leaving');
        setTimeout(() => flip(plane, () => el.remove()), 450);
        r.el = null;
        r.idx = -1;
        r.wait = 1800 + Math.random() * 2600;
      }
    });
  }

  function placeAmbientStatic() {
    runners.forEach((r) => {
      if (!r.el) r.el = makeLead(r.lead);
      slot(r.lead.staticSlot).append(r.el);
      r.idx = r.lead.route.indexOf(r.lead.staticSlot);
    });
  }

  /* ── Ficha ── */
  function stageOf(el) {
    const s = el.closest('[data-slot]')?.dataset.slot;
    return slotLabels[s] || '—';
  }
  function fillCard(lead) {
    const el = lead.id === featured.id ? featuredEl : runners.find((r) => r.lead.id === lead.id)?.el;
    card.querySelector('[data-lc="name"]').textContent = lead.name;
    card.querySelector('[data-lc="need"]').textContent = lead.need;
    const featuredData = lead.id === featured.id ? featured.data.slice(0, step >= 3 ? 4 : 1) : lead.data;
    const rows = [
      ...(lead.id === featured.id ? [] : [['Canal', channels[lead.channel]]]),
      ...featuredData,
      ['Etapa', el ? stageOf(el) : '—'],
      ['Siguiente paso', lead.id === featured.id && step < 5 ? 'En curso' : lead.next],
    ];
    card.querySelector('[data-lc="data"]').innerHTML = rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
  }
  function openCard(lead, el) {
    cardOpenFor = lead.id;
    fillCard(lead);
    card.hidden = false;
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let left = r.left - s.left + r.width / 2 - cw / 2;
    left = clamp(left, 8, s.width - cw - 8);
    let top = r.bottom - s.top + 8;
    if (top + ch > s.height - 8) top = Math.max(8, r.top - s.top - ch - 8);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card._opener = el;
    card.querySelector('[data-lead-close]').focus({ preventScroll: true });
  }
  function closeCard() {
    if (card.hidden) return;
    card.hidden = true;
    cardOpenFor = null;
    const opener = card._opener;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  card.querySelector('[data-lead-close]').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeCard());
  document.addEventListener('pointerdown', (e) => {
    if (!card.hidden && !card.contains(e.target) && !e.target.closest('.lead')) closeCard();
  });

  /* ── Scroll (escritorio) y reproducción automática (móvil) ── */
  function sectionProgress() {
    const r = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    return clamp(-r.top / total);
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const r = root.getBoundingClientRect();
      // Inclinación mientras la escena entra en pantalla
      const tilt = pinned ? clamp(r.top / window.innerHeight) : 0;
      stage.style.setProperty('--tilt', tilt.toFixed(3));
      if (pinned) setStep(Math.min(STEPS - 1, Math.floor(sectionProgress() * STEPS * 0.999)));
    });
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (!autoplay || userPaused || !visible) return;
    autoTimer = setTimeout(() => {
      setStep(step >= STEPS - 1 ? 0 : step + 1);
      scheduleAuto();
    }, step >= STEPS - 1 ? AUTOPLAY_MS * 1.8 : AUTOPLAY_MS);
  }

  stepItems.forEach((li, i) => {
    li.querySelector('.step__btn').addEventListener('click', () => {
      if (pinned) {
        const total = root.offsetHeight - window.innerHeight;
        const y = window.scrollY + root.getBoundingClientRect().top + ((i + 0.5) / STEPS) * total;
        window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        setStep(i);
        if (autoplay) { userPaused = true; syncPlay(); }
      }
    });
  });

  function syncPlay() {
    playBtn.hidden = !autoplay;
    playBtn.textContent = userPaused ? 'Reproducir' : 'Pausar';
    playBtn.setAttribute('aria-pressed', String(userPaused));
    scheduleAuto();
  }
  playBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    if (!userPaused && step >= STEPS - 1) setStep(0);
    syncPlay();
  });

  // Profundidad: la escena sigue levemente al puntero
  plane.addEventListener('pointermove', (e) => {
    if (!pinned || e.pointerType !== 'mouse') return;
    const r = plane.getBoundingClientRect();
    stage.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    stage.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });
  plane.addEventListener('pointerleave', () => {
    stage.style.setProperty('--mx', 0);
    stage.style.setProperty('--my', 0);
  });

  /* ── Modo según dispositivo y preferencias ── */
  const wideQuery = window.matchMedia('(min-width: 1000px) and (min-height: 640px)');
  function configure() {
    const reduced = prefersReducedMotion();
    pinned = wideQuery.matches && !reduced;
    autoplay = !pinned && !reduced;
    root.classList.toggle('is-pinned', pinned);
    root.classList.toggle('is-static', reduced);
    if (!pinned) stage.style.setProperty('--tilt', 0);

    cancelAnimationFrame(raf);
    if (reduced) {
      placeAmbientStatic();
      setStep(STEPS - 1, { animate: false });
    } else {
      raf = requestAnimationFrame(tick);
      if (step < 0) setStep(0, { animate: false });
    }
    syncPlay();
    drawWires();
    onScroll();
  }

  whenVisible(stage, (v) => {
    visible = v;
    last = 0;
    scheduleAuto();
  }, { threshold: 0.25 });

  window.addEventListener('scroll', onScroll, { passive: true });
  new ResizeObserver(() => drawWires()).observe(plane);
  wideQuery.addEventListener('change', configure);
  onReducedMotionChange(configure);
  configure();
}
