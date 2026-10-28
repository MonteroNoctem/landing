// Formulario de reserva real, en 3 pasos:
//   1. Quién eres (nombre, email, agencia)
//   2. 4 preguntas de cualificación, opción múltiple (chips)
//   3. Calendario (el backend de disponibilidad real) — siempre lo último
// Al enviar crea la reserva (que entra en Mi CRM como prospecto en fase
// "Demo agendada" y, si Google Calendar está conectado, crea también el
// Meet). Ver noctem-backend/src/server.js (/api/public/landing-disponibilidad
// y /api/public/landing-reserva).

const API_BASE = 'https://noctem-backend-production.up.railway.app';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initBookingForm(form) {
  if (!form) return;

  const steps = [...form.querySelectorAll('[data-form-step]')];
  const dots = [...form.querySelectorAll('[data-form-step-dot]')];
  const dateTabs = form.querySelector('[data-date-tabs]');
  const slotsContainer = form.querySelector('[data-slots]');
  const selectedLabel = form.querySelector('[data-selected-slot]');
  const fieldsWrap = form.querySelector('[data-booking-fields]');
  const fechaHoraInput = form.querySelector('input[name="fechaHora"]');
  const statusEl = form.querySelector('[data-form-status]');
  const submitBtn = form.querySelector('[data-form-submit]');

  if (!steps.length || !dateTabs || !slotsContainer || !fechaHoraInput) return;

  const setStatus = (text, tone) => {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone || '';
  };

  /* ── Navegación entre pasos ── */
  let current = 0;
  let disponibilidadCargada = false;

  function goToStep(i) {
    current = i;
    steps.forEach((s, idx) => { s.hidden = idx !== i; });
    dots.forEach((d, idx) => {
      d.classList.toggle('is-active', idx === i);
      d.classList.toggle('is-done', idx < i);
    });
    const focusable = steps[i].querySelector('input, button');
    focusable?.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (i === 2 && !disponibilidadCargada) {
      disponibilidadCargada = true;
      cargarDisponibilidad();
    }
  }

  function validarPaso0() {
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const correo = form.querySelector('[name="contacto"]').value.trim();
    if (!nombre) { setStatus('Dinos tu nombre para continuar.', 'error'); return false; }
    if (!correo || !EMAIL_RE.test(correo)) { setStatus('Escribe un email válido para continuar.', 'error'); return false; }
    setStatus('');
    return true;
  }

  function validarPaso1() {
    const sinResponder = [...form.querySelectorAll('[data-question]')].find(
      (q) => !q.querySelector('input[type="hidden"]').value
    );
    if (sinResponder) { setStatus('Responde las 4 preguntas para continuar.', 'error'); return false; }
    setStatus('');
    return true;
  }

  form.querySelectorAll('[data-step-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (current === 0 && !validarPaso0()) return;
      if (current === 1 && !validarPaso1()) return;
      goToStep(current + 1);
    });
  });
  form.querySelectorAll('[data-step-back]').forEach((btn) => {
    btn.addEventListener('click', () => { setStatus(''); goToStep(current - 1); });
  });

  /* ── Preguntas de opción múltiple (chips) ── */
  form.querySelectorAll('[data-question]').forEach((q) => {
    const opts = [...q.querySelectorAll('[data-opt]')];
    const hidden = q.querySelector('input[type="hidden"]');
    opts.forEach((opt) => {
      opt.setAttribute('aria-pressed', 'false');
      opt.addEventListener('click', () => {
        opts.forEach((o) => o.setAttribute('aria-pressed', 'false'));
        opt.setAttribute('aria-pressed', 'true');
        hidden.value = opt.textContent.trim();
      });
    });
  });

  /* ── Calendario (igual que antes, pero ahora es el último paso) ── */
  const setBookingStatus = (text, tone) => setStatus(text, tone);

  let franjasPorFecha = {};
  let fechaActiva = null;

  function formatearFecha(fechaISO) {
    const d = new Date(`${fechaISO}T00:00:00`);
    const texto = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function limpiarSeleccion() {
    fechaHoraInput.value = '';
    selectedLabel.textContent = '';
    fieldsWrap.hidden = true;
  }

  async function cargarDisponibilidad({ preserveStatus = false } = {}) {
    limpiarSeleccion();
    if (!preserveStatus) setBookingStatus('Cargando horarios disponibles…');
    try {
      const res = await fetch(`${API_BASE}/api/public/landing-disponibilidad`);
      if (!res.ok) throw new Error('bad_status');
      const data = await res.json();
      franjasPorFecha = {};
      (data.franjas || []).forEach(f => {
        (franjasPorFecha[f.fecha] = franjasPorFecha[f.fecha] || []).push(f);
      });
      renderFechas();
      if (!preserveStatus) setBookingStatus('');
    } catch {
      dateTabs.innerHTML = '';
      slotsContainer.innerHTML = '';
      if (!preserveStatus) setBookingStatus('No hemos podido cargar los horarios. Escríbenos directamente por WhatsApp o email.', 'error');
    }
  }

  function renderFechas() {
    const fechas = Object.keys(franjasPorFecha);
    dateTabs.innerHTML = '';
    slotsContainer.innerHTML = '';

    if (!fechas.length) {
      dateTabs.innerHTML = '<p class="booking-form__empty">No hay horarios libres ahora mismo — escríbenos por WhatsApp o email y lo hablamos.</p>';
      return;
    }

    fechas.forEach((fecha, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-form__date';
      btn.textContent = formatearFecha(fecha);
      btn.dataset.fecha = fecha;
      btn.setAttribute('aria-pressed', String(i === 0));
      btn.addEventListener('click', () => seleccionarFecha(fecha));
      dateTabs.appendChild(btn);
    });

    seleccionarFecha(fechas[0]);
  }

  function seleccionarFecha(fecha) {
    fechaActiva = fecha;
    [...dateTabs.children].forEach(b => {
      if (b.dataset) b.setAttribute('aria-pressed', String(b.dataset.fecha === fecha));
    });
    limpiarSeleccion();
    renderHoras();
  }

  function renderHoras() {
    slotsContainer.innerHTML = '';
    (franjasPorFecha[fechaActiva] || []).forEach(f => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-form__hora';
      btn.textContent = f.hora;
      btn.addEventListener('click', () => seleccionarHora(f));
      slotsContainer.appendChild(btn);
    });
  }

  function seleccionarHora(franja) {
    [...slotsContainer.children].forEach(b => b.setAttribute('aria-pressed', String(b.textContent === franja.hora)));
    fechaHoraInput.value = franja.fechaHora;
    selectedLabel.textContent = `Elegido: ${franja.etiqueta}`;
    fieldsWrap.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const honeypot = form.querySelector('[name="web"]');
    if (honeypot && honeypot.value) return;

    if (!fechaHoraInput.value) {
      setStatus('Elige primero un día y una hora.', 'error');
      return;
    }

    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const contacto = form.querySelector('[name="contacto"]').value.trim();
    const agencia = form.querySelector('[name="agencia"]').value.trim();
    const numAgentes = form.querySelector('[name="numAgentes"]').value.trim();
    const crmActual = form.querySelector('[name="crmActual"]').value.trim();
    const problemaPrincipal = form.querySelector('[name="problemaPrincipal"]').value.trim();
    const urgencia = form.querySelector('[name="urgencia"]').value.trim();
    const aceptaPrivacidad = form.querySelector('[name="aceptaPrivacidad"]').checked;

    if (!nombre || !EMAIL_RE.test(contacto)) {
      setStatus('Falta tu nombre o el email no es válido — revisa el paso 1.', 'error');
      goToStep(0);
      return;
    }
    if (!numAgentes || !crmActual || !problemaPrincipal || !urgencia) {
      setStatus('Faltan preguntas por responder — revisa el paso 2.', 'error');
      goToStep(1);
      return;
    }
    if (!aceptaPrivacidad) {
      setStatus('Tienes que aceptar la política de privacidad para reservar.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Reservando…');

    try {
      const res = await fetch(`${API_BASE}/api/public/landing-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, contacto, agencia, numAgentes, crmActual, problemaPrincipal, urgencia,
          fechaHora: fechaHoraInput.value,
          aceptaPrivacidad,
          web: honeypot ? honeypot.value : '',
        }),
      });

      if (res.ok) {
        const etiqueta = selectedLabel.textContent.replace('Elegido: ', '');
        setStatus(`¡Reservado! Nos vemos el ${etiqueta}. Te hemos enviado la confirmación por email.`, 'ok');
        form.reset();
        form.querySelectorAll('[data-opt]').forEach((o) => o.setAttribute('aria-pressed', 'false'));
        disponibilidadCargada = false;
        goToStep(0);
      } else if (res.status === 429) {
        setStatus('Ya hemos recibido una reserva tuya hace un momento — dale un minuto y vuelve a intentarlo.', 'error');
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'franja_no_disponible') {
          setStatus('Esa hora se acaba de reservar. Elige otra, por favor.', 'error');
          await cargarDisponibilidad({ preserveStatus: true });
        } else {
          setStatus('No se ha podido reservar. Escríbenos directamente por WhatsApp o email.', 'error');
        }
      }
    } catch {
      setStatus('No se ha podido reservar. Escríbenos directamente por WhatsApp o email.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  goToStep(0);
}
