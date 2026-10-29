// Formulario de reserva real, en 3 pasos:
//   1. Quién eres (nombre, email, WhatsApp, agencia) + privacidad
//   2. 4 preguntas de cualificación, opción múltiple (chips)
//   3. Calendario, en una ventana aparte (modal) — siempre lo último
//
// En cuanto se completan las 4 preguntas del paso 2, el lead ya se guarda
// en Mi CRM (fase "Formulario iniciado") usando un formId generado en el
// navegador — así Friday lo ve aunque la persona cierre la pestaña antes
// de elegir hora. Si luego sí reserva, el envío final usa el mismo formId
// para actualizar esa misma ficha en vez de crear una duplicada.
// Ver noctem-backend/src/server.js (/api/public/landing-lead-parcial,
// /api/public/landing-disponibilidad y /api/public/landing-reserva).

const API_BASE = 'https://noctem-backend-production.up.railway.app';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nuevoFormId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  // Fallback para navegadores muy antiguos sin crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function initBookingForm(form) {
  if (!form) return;

  const steps = [...form.querySelectorAll('[data-form-step]')];
  const dots = [...form.querySelectorAll('[data-form-step-dot]')];
  const statusEl = form.querySelector('[data-form-status]');
  const submitBtn = form.querySelector('[data-form-submit]');
  const fechaHoraInput = form.querySelector('input[name="fechaHora"]');
  const selectedLabel = form.querySelector('[data-selected-slot]');
  const openCalendarBtn = form.querySelector('[data-open-calendar]');

  const modal = form.parentElement?.querySelector('[data-calendar-modal]');
  const dateTabs = modal?.querySelector('[data-date-tabs]');
  const slotsContainer = modal?.querySelector('[data-slots]');
  const confirmBtn = modal?.querySelector('[data-calendar-confirm]');
  const closeBtns = modal ? [...modal.querySelectorAll('[data-calendar-close]')] : [];

  const thanksBox = form.parentElement?.querySelector('[data-booking-thanks]');
  const thanksName = thanksBox?.querySelector('[data-thanks-name]');
  const thanksWhen = thanksBox?.querySelector('[data-thanks-when]');
  const thanksEmail = thanksBox?.querySelector('[data-thanks-email]');
  const thanksResetBtn = thanksBox?.querySelector('[data-thanks-reset]');

  if (!steps.length || !fechaHoraInput || !modal || !dateTabs || !slotsContainer) return;

  let formId = nuevoFormId();
  let leadParcialGuardado = false;

  /* ── Preguntas del Paso 2, de una en una ── */
  const questions = [...form.querySelectorAll('[data-question]')];
  const questionProgress = form.querySelector('[data-question-progress]');
  let currentQuestion = 0;

  function showQuestion(i) {
    currentQuestion = i;
    questions.forEach((q, idx) => { q.hidden = idx !== i; });
    if (questionProgress) questionProgress.textContent = `Pregunta ${i + 1} de ${questions.length}`;
  }

  function primeraPreguntaSinResponder() {
    const idx = questions.findIndex((q) => !q.querySelector('input[type="hidden"]').value);
    return idx === -1 ? questions.length - 1 : idx;
  }

  const setStatus = (text, tone) => {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone || '';
  };

  /* ── Navegación entre pasos ── */
  let current = 0;

  function goToStep(i) {
    current = i;
    steps.forEach((s, idx) => { s.hidden = idx !== i; });
    dots.forEach((d, idx) => {
      d.classList.toggle('is-active', idx === i);
      d.classList.toggle('is-done', idx < i);
    });
    if (i === 1) showQuestion(primeraPreguntaSinResponder());
    const focusable = steps[i].querySelector('input, button');
    focusable?.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validarPaso0() {
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const correo = form.querySelector('[name="contacto"]').value.trim();
    const telefono = form.querySelector('[name="telefono"]').value.trim();
    const aceptaPrivacidad = form.querySelector('[name="aceptaPrivacidad"]').checked;
    if (!nombre) { setStatus('Dinos tu nombre para continuar.', 'error'); return false; }
    if (!correo || !EMAIL_RE.test(correo)) { setStatus('Escribe un email válido para continuar.', 'error'); return false; }
    if (!telefono) { setStatus('Déjanos tu WhatsApp para continuar.', 'error'); return false; }
    if (!aceptaPrivacidad) { setStatus('Tienes que aceptar la política de privacidad para continuar.', 'error'); return false; }
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

  function datosFormulario() {
    return {
      nombre: form.querySelector('[name="nombre"]').value.trim(),
      contacto: form.querySelector('[name="contacto"]').value.trim(),
      telefono: form.querySelector('[name="telefono"]').value.trim(),
      agencia: form.querySelector('[name="agencia"]').value.trim(),
      numAgentes: form.querySelector('[name="numAgentes"]').value.trim(),
      crmActual: form.querySelector('[name="crmActual"]').value.trim(),
      problemaPrincipal: form.querySelector('[name="problemaPrincipal"]').value.trim(),
      urgencia: form.querySelector('[name="urgencia"]').value.trim(),
      aceptaPrivacidad: form.querySelector('[name="aceptaPrivacidad"]').checked,
    };
  }

  async function guardarLeadParcial() {
    const honeypot = form.querySelector('[name="web"]');
    if (honeypot && honeypot.value) return; // bot: no guardamos nada
    try {
      await fetch(`${API_BASE}/api/public/landing-lead-parcial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, ...datosFormulario(), web: honeypot ? honeypot.value : '' }),
      });
      leadParcialGuardado = true;
    } catch {
      // Si falla, seguimos sin bloquear al usuario: el envío final del
      // paso 3 ya manda todos los datos de todas formas.
    }
  }

  form.querySelectorAll('[data-step-next]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (current === 0 && !validarPaso0()) return;
      if (current === 1) {
        if (!validarPaso1()) return;
        submitBtn.disabled = true;
        await guardarLeadParcial();
      }
      goToStep(current + 1);
    });
  });
  form.querySelectorAll('[data-step-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setStatus('');
      if (current === 1 && currentQuestion > 0) {
        showQuestion(currentQuestion - 1);
        return;
      }
      goToStep(current - 1);
    });
  });

  /* ── Preguntas de opción múltiple (chips), de una en una ── */
  questions.forEach((q, idx) => {
    const opts = [...q.querySelectorAll('[data-opt]')];
    const hidden = q.querySelector('input[type="hidden"]');
    opts.forEach((opt) => {
      opt.setAttribute('aria-pressed', 'false');
      opt.addEventListener('click', () => {
        opts.forEach((o) => o.setAttribute('aria-pressed', 'false'));
        opt.setAttribute('aria-pressed', 'true');
        hidden.value = opt.textContent.trim();
        // Avanza sola a la siguiente pregunta, con un pequeño respiro para
        // que se vea la selección antes de cambiar.
        if (idx < questions.length - 1) {
          setTimeout(() => showQuestion(idx + 1), 180);
        }
      });
    });
  });

  /* ── Calendario, dentro de la ventana modal ── */
  let franjasPorFecha = {};
  let fechaActiva = null;
  let horaElegida = null;
  let disponibilidadCargada = false;

  function formatearFecha(fechaISO) {
    const d = new Date(`${fechaISO}T00:00:00`);
    const texto = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function abrirModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!disponibilidadCargada) {
      disponibilidadCargada = true;
      cargarDisponibilidad();
    }
    (modal.querySelector('.booking-form__date, .calendar-modal__close'))?.focus({ preventScroll: true });
  }

  function cerrarModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    openCalendarBtn?.focus({ preventScroll: true });
  }

  openCalendarBtn?.addEventListener('click', abrirModal);
  closeBtns.forEach((btn) => btn.addEventListener('click', cerrarModal));
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  async function cargarDisponibilidad() {
    setStatus('');
    dateTabs.innerHTML = '<p class="booking-form__empty">Cargando horarios disponibles…</p>';
    try {
      const res = await fetch(`${API_BASE}/api/public/landing-disponibilidad`);
      if (!res.ok) throw new Error('bad_status');
      const data = await res.json();
      franjasPorFecha = {};
      (data.franjas || []).forEach((f) => {
        (franjasPorFecha[f.fecha] = franjasPorFecha[f.fecha] || []).push(f);
      });
      renderFechas();
    } catch {
      dateTabs.innerHTML = '';
      slotsContainer.innerHTML = '<p class="booking-form__empty">No hemos podido cargar los horarios. Escríbenos directamente por WhatsApp o email.</p>';
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
    [...dateTabs.children].forEach((b) => {
      if (b.dataset) b.setAttribute('aria-pressed', String(b.dataset.fecha === fecha));
    });
    horaElegida = null;
    if (confirmBtn) confirmBtn.disabled = true;
    renderHoras();
  }

  function renderHoras() {
    slotsContainer.innerHTML = '';
    (franjasPorFecha[fechaActiva] || []).forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-form__hora';
      btn.textContent = f.hora;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => seleccionarHora(f, btn));
      slotsContainer.appendChild(btn);
    });
  }

  function seleccionarHora(franja, btn) {
    [...slotsContainer.children].forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    horaElegida = franja;
    if (confirmBtn) confirmBtn.disabled = false;
  }

  confirmBtn?.addEventListener('click', () => {
    if (!horaElegida) return;
    fechaHoraInput.value = horaElegida.fechaHora;
    selectedLabel.textContent = `Elegido: ${horaElegida.etiqueta}`;
    submitBtn.disabled = false;
    cerrarModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const honeypot = form.querySelector('[name="web"]');
    if (honeypot && honeypot.value) return;

    if (!fechaHoraInput.value) {
      setStatus('Elige primero un día y una hora.', 'error');
      return;
    }

    const datos = datosFormulario();

    if (!datos.nombre || !EMAIL_RE.test(datos.contacto) || !datos.telefono) {
      setStatus('Falta tu nombre, email o WhatsApp — revisa el paso 1.', 'error');
      goToStep(0);
      return;
    }
    if (!datos.numAgentes || !datos.crmActual || !datos.problemaPrincipal || !datos.urgencia) {
      setStatus('Faltan preguntas por responder — revisa el paso 2.', 'error');
      goToStep(1);
      return;
    }
    if (!datos.aceptaPrivacidad) {
      setStatus('Tienes que aceptar la política de privacidad para reservar.', 'error');
      goToStep(0);
      return;
    }

    submitBtn.disabled = true;
    setStatus('Reservando…');

    try {
      const res = await fetch(`${API_BASE}/api/public/landing-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: leadParcialGuardado ? formId : null,
          ...datos,
          fechaHora: fechaHoraInput.value,
          web: honeypot ? honeypot.value : '',
        }),
      });

      if (res.ok) {
        const etiqueta = selectedLabel.textContent.replace('Elegido: ', '');
        mostrarAgradecimiento(datos.nombre, etiqueta, datos.contacto);
        formId = nuevoFormId();
        leadParcialGuardado = false;
      } else if (res.status === 429) {
        setStatus('Ya hemos recibido una reserva tuya hace un momento — dale un minuto y vuelve a intentarlo.', 'error');
        submitBtn.disabled = false;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'franja_no_disponible') {
          setStatus('Esa hora se acaba de reservar. Elige otra, por favor.', 'error');
          disponibilidadCargada = false;
          fechaHoraInput.value = '';
          selectedLabel.textContent = 'Aún no has elegido horario.';
          submitBtn.disabled = true;
        } else {
          setStatus('No se ha podido reservar. Escríbenos directamente por WhatsApp o email.', 'error');
          submitBtn.disabled = false;
        }
      }
    } catch {
      setStatus('No se ha podido reservar. Escríbenos directamente por WhatsApp o email.', 'error');
      submitBtn.disabled = false;
    }
  });

  function mostrarAgradecimiento(nombre, etiqueta, contacto) {
    form.hidden = true;
    if (!thanksBox) return;
    thanksBox.hidden = false;
    if (thanksName) thanksName.textContent = nombre || '';
    if (thanksWhen) thanksWhen.textContent = etiqueta ? `Tu videollamada queda agendada: ${etiqueta}.` : '';
    if (thanksEmail) thanksEmail.hidden = !EMAIL_RE.test(contacto || '');
    thanksBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetFormulario() {
    form.reset();
    form.hidden = false;
    if (thanksBox) thanksBox.hidden = true;
    form.querySelectorAll('[data-opt]').forEach((o) => o.setAttribute('aria-pressed', 'false'));
    selectedLabel.textContent = 'Aún no has elegido horario.';
    fechaHoraInput.value = '';
    submitBtn.disabled = true;
    disponibilidadCargada = false;
    setStatus('');
    goToStep(0);
  }

  thanksResetBtn?.addEventListener('click', resetFormulario);

  goToStep(0);
}
