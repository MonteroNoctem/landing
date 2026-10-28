// Enlaces de las acciones principales. Se configuran en .env.local (ver .env.example).
// Si falta alguno, el botón lo indica en lugar de simular un destino.
// "Agendar una llamada" ya NO es un enlace externo: lleva al formulario real
// de la página (#formulario-contacto, ver src/components/contactForm.js), que
// manda el lead al backend de Montero Noctem. Por eso aquí solo queda "agent".
export const links = {
  agent: {
    url: (import.meta.env.VITE_AGENT_DEMO_URL || '').trim(),
    env: 'VITE_AGENT_DEMO_URL',
    label: 'Probar el agente',
  },
};
