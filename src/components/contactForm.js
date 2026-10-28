// Formulario de contacto real: envía el lead al backend de Montero Noctem
// (mismo backend del panel/CRM). Cae en "Mi CRM" como prospecto nuevo; si se
// marca "prefiero que me llaméis", Friday avisa al instante y lo destaca en
// el informe diario. Nunca simula el envío: si falla, lo dice.
const API_URL = 'https://noctem-backend-production.up.railway.app/api/public/landing-lead';

export function initContactForm(form) {
  if (!form) return;

  const statusEl = form.querySelector('[data-form-status]');
  const submitBtn = form.querySelector('[data-form-submit]');

  const setStatus = (text, tone) => {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone || '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Campo trampa: invisible para personas, solo lo rellenan los bots.
    const honeypot = form.querySelector('[name="web"]');
    if (honeypot && honeypot.value) return;

    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const contacto = form.querySelector('[name="contacto"]').value.trim();
    const mensaje = form.querySelector('[name="mensaje"]').value.trim();
    const quiereLlamada = form.querySelector('[name="quiereLlamada"]').checked;
    const aceptaPrivacidad = form.querySelector('[name="aceptaPrivacidad"]').checked;

    if (!nombre || !contacto) {
      setStatus('Rellena tu nombre y un email o teléfono de contacto.', 'error');
      return;
    }
    if (!aceptaPrivacidad) {
      setStatus('Tienes que aceptar la política de privacidad para enviarlo.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Enviando…');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, contacto, mensaje, quiereLlamada, aceptaPrivacidad, web: honeypot ? honeypot.value : '' }),
      });

      if (res.ok) {
        setStatus('¡Recibido! Te contestamos lo antes posible.', 'ok');
        form.reset();
      } else if (res.status === 429) {
        setStatus('Ya hemos recibido tu mensaje hace un momento — dale un minuto.', 'error');
      } else {
        setStatus('No se ha podido enviar. Escríbenos directamente por WhatsApp o email.', 'error');
      }
    } catch {
      setStatus('No se ha podido enviar. Escríbenos directamente por WhatsApp o email.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
