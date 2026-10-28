// Reloj de demostración: empieza fuera de horario (23:47) y avanza a ritmo acelerado
let minutes = 23 * 60 + 47;
const fmt = () => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function advanceClock(step = 1) {
  minutes = (minutes + step) % (24 * 60);
  document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = fmt()));
}
export const clockNow = fmt;
