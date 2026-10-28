# Montero Noctem · Landing

Landing en Vite + HTML/CSS/JS sin framework.

## Arrancar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

## Enlaces de las acciones

Copia `.env.example` a `.env.local` y rellena:

- `VITE_AGENT_DEMO_URL`: canal real de demostración ("Probar el agente", p. ej. wa.me).

Mientras falte, el botón muestra un aviso y no simula ningún destino. Todo lo que empieza por `VITE_` se publica en el navegador: no pongas claves privadas.

"Agendar una llamada" no se configura por variable de entorno: lleva al formulario real de contacto (`#formulario-contacto`), que envía el lead directo al backend de Montero Noctem (Mi CRM / Friday) — ver `src/components/contactForm.js`.

## Estructura

- `index.html`: contenido y textos de todas las secciones (legibles sin JS).
- `src/styles/tokens.css`: colores, tipografía, espaciados y tiempos de animación.
- `src/styles/form.css`: estilos del formulario de contacto.
- `src/data/leads.js`: contactos ficticios de la demostración.
- `src/components/flow.js`: recorrido de leads (scroll en escritorio, reproducción automática en móvil, ficha al pulsar).
- `src/components/feed.js`, `trails.js`: panel y estelas de la primera pantalla.
- `src/components/contactForm.js`: formulario real de contacto → backend de Montero Noctem.
- `public/privacidad.html`: política de privacidad, enlazada desde el formulario y el pie.

## Revisión

- `?reduce-motion` en la URL fuerza el modo de movimiento reducido.
- El monograma MN es una composición tipográfica provisional (IBM Plex Sans Condensed Bold) hasta tener el logotipo original.
