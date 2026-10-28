// Contactos ficticios de la demostración. Ninguno representa actividad real.

export const channels = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  form: 'Formulario web',
};

export const slotLabels = {
  whatsapp: 'Entrada · WhatsApp',
  instagram: 'Entrada · Instagram',
  form: 'Entrada · Formulario web',
  core: 'En atención',
  'crm-new': 'CRM · Nuevo',
  'crm-qualified': 'CRM · Cualificado',
  'crm-follow': 'CRM · Seguimiento',
  'out-agenda': 'Visita propuesta',
  'out-team': 'Aviso al equipo',
};

// Contacto protagonista: su recorrido lo marca el scroll (o los pasos)
export const featured = {
  id: 'laura',
  name: 'Laura',
  initials: 'LA',
  need: 'Busca piso en Cambrils',
  channel: 'whatsapp',
  data: [
    ['Canal', 'WhatsApp · 23:47'],
    ['Operación', 'Compra'],
    ['Zona', 'Cambrils'],
    ['Plazo', 'Antes del verano'],
  ],
  next: 'Visita jueves 18:00 · equipo avisado',
  // Ubicación del contacto en cada uno de los 6 pasos
  path: ['whatsapp', 'core', 'core', 'core', 'crm-qualified', 'out-agenda'],
};

// Contactos de fondo: avanzan solos, con ritmos distintos
export const ambient = [
  {
    id: 'marc',
    name: 'Marc',
    initials: 'MA',
    need: 'Alquiler en Reus',
    channel: 'instagram',
    route: ['instagram', 'core', 'crm-new', 'crm-follow'],
    pace: 2600,
    data: [['Operación', 'Alquiler'], ['Zona', 'Reus'], ['Plazo', 'Un mes']],
    next: 'Seguimiento programado en 2 días',
    staticSlot: 'crm-follow',
  },
  {
    id: 'carmen',
    name: 'Carmen',
    initials: 'CA',
    need: 'Vender su casa en Salou',
    channel: 'form',
    route: ['form', 'core', 'crm-qualified', 'out-team'],
    pace: 3300,
    data: [['Operación', 'Venta'], ['Zona', 'Salou'], ['Interés', 'Valoración']],
    next: 'El equipo la llama para la valoración',
    staticSlot: 'out-team',
  },
  {
    id: 'jordi',
    name: 'Jordi',
    initials: 'JO',
    need: 'Local en Tarragona',
    channel: 'whatsapp',
    route: ['whatsapp', 'core', 'crm-new'],
    pace: 2900,
    data: [['Operación', 'Alquiler'], ['Zona', 'Tarragona'], ['Uso', 'Comercial']],
    next: 'Pendiente de que confirme la superficie',
    staticSlot: 'crm-new',
  },
  {
    id: 'nuria',
    name: 'Núria',
    initials: 'NU',
    need: 'Ático en Salou',
    channel: 'instagram',
    route: ['instagram', 'core', 'crm-qualified', 'crm-follow'],
    pace: 3800,
    data: [['Operación', 'Compra'], ['Zona', 'Salou'], ['Plazo', 'Este año']],
    next: 'Recibirá novedades de áticos en la zona',
    staticSlot: 'crm-qualified',
  },
];

// Panel de la primera pantalla
export const feedLeads = [
  { initials: 'LA', name: 'Laura', need: 'Busca piso en Cambrils', channel: 'WhatsApp', next: 'Visita propuesta · jueves 18:00' },
  { initials: 'MA', name: 'Marc', need: 'Alquiler en Reus', channel: 'Instagram', next: 'Seguimiento en 2 días' },
  { initials: 'CA', name: 'Carmen', need: 'Vender su casa en Salou', channel: 'Formulario', next: 'Aviso al equipo' },
  { initials: 'PA', name: 'Pau', need: 'Casa con jardín en Vila-seca', channel: 'WhatsApp', next: 'Visita propuesta · sábado 11:00' },
  { initials: 'NU', name: 'Núria', need: 'Ático en Salou', channel: 'Instagram', next: 'Seguimiento programado' },
  { initials: 'JO', name: 'Jordi', need: 'Local en Tarragona', channel: 'WhatsApp', next: 'Aviso al equipo' },
  { initials: 'EL', name: 'Elena', need: 'Alquiler de temporada en Salou', channel: 'Formulario', next: 'Seguimiento en 1 semana' },
];

export const feedStates = ['Respondido al momento', 'Datos recogidos', 'Registrado en el CRM'];
