// Formulario de reserva real: carga los huecos libres del backend de
// Montero Noctem, deja elegir día + hora, y al enviar crea la reserva (que
// entra en Mi CRM como prospecto en fase "Demo agendada" y, si Google
// Calendar está conectado, crea también el Meet). Ver
// noctem-backend/src/server.js (/api/public/landing-disponibilidad y
// /api/public/landing-reserva).

const API_BASE = 'https://noctem-backend-production.up.railway.app';

export function initBookingForm(form) {
  if (!form) return;

  const dateTabs = form.querySelector('[data-date-tabs]');
  const slotsContainer = form.querySelector('[data-slots]');
  const selectedLabel = form.querySelector('[data-selected-slot]');
  const fieldsWrap = form.querySelector('[data-booking-fields]');
  const fechaHoraInput = form.querySelector('input[name="fechaHora"]');
  const statusEl = form.querySelector('[data-form-status]');
  const submitBtn = form.querySelector('[data-form-submit]');

  if (!dateTabs || !slotsContainer || !fechaHoraInput) return;

  const setStatus = (text, tone) => {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone || '';
  };

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
    if (!preserveStatus) setStatus('Cargando horarios disponibles…');
    try {
      const res = await fetch(`${API_BASE}/api/public/landing-disponibilidad`);
      if (!res.ok) throw new Error('bad_status');
      const data = await res.json();
      franjasPorFecha = {};
      (data.franjas || []).forEach(f => {
        (franjasPorFecha[f.fecha] = franjasPorFecha[f.fecha] || []).push(f);
      });
      renderFechas();
      if (!preserveStatus) setStatus('');
    } catch {
      dateTabs.innerHTML = '';
      slotsContainer.innerHTML = '';
      if (!preserveStatus) setStatus('No hemos podido cargar los horarios. Escríbenos directamente por WhatsApp o email.', 'error');
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

  cargarDisponibilidad();

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
    const aceptaPrivacidad = form.querySelector('[name="aceptaPrivacidad"]').checked;

    if (!nombre || !contacto) {
      setStatus('Rellena tu nombre y un email o teléfono de contacto.', 'error');
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
          nombre, contacto, agencia, numAgentes, crmActual, problemaPrincipal,
          fechaHora: fechaHoraInput.value,
          aceptaPrivacidad,
          web: honeypot ? honeypot.value : '',
        }),
      });

      if (res.ok) {
        const etiqueta = selectedLabel.textContent.replace('Elegido: ', '');
        setStatus(`¡Reservado! Nos vemos el ${etiqueta}. Te confirmamos el enlace de la videollamada por email o WhatsApp.`, 'ok');
        form.reset();
        await cargarDisponibilidad({ preserveStatus: true });
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
}
