/* ============================================ */
/* UTILIDADES                                    */
/* ============================================ */

// ===== AVATARES =====
// Identidad editorial: las tintas de avatar son apagadas, no neón. Mapeo de los
// colores viejos saturados (ya guardados en la DB) a su tinta editorial, para que
// los usuarios existentes se vean bien sin migrar nada. Las tintas nuevas (las que
// ya elige el picker) no están en el map y pasan tal cual.
const AVATAR_INK_BY_LEGACY = {
  '#2563eb': '#4F6076', // azul     → pizarra
  '#ec4899': '#9A5E81', // rosa     → ciruela
  '#f59e0b': '#B17A3C', // naranja  → ocre
  '#10b981': '#5E7D5A', // verde    → salvia
  '#8b5cf6': '#74608C', // violeta  → lavanda
  '#06b6d4': '#4E7C80', // turquesa → verdemar
  '#ef4444': '#A8473B', // rojo     → terracota
};
// ponytail: mapeo por hex exacto, no conversión HSL. Colores fuera de la paleta
// pasan sin apagar — agregar un clamp solo si algún día hay colores libres.
function avatarColor(u) {
  const c = ((u && u.color) || '').toLowerCase();
  return AVATAR_INK_BY_LEGACY[c] || c || '#8A857B';
}

// ===== FECHAS =====

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS_FULL = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(timestamp) {
  return isSameDay(timestamp, new Date());
}

function isThisWeek(timestamp) {
  const date = new Date(timestamp);
  const start = startOfWeek(new Date());
  const end = endOfDay(addDays(start, 6));
  return date >= start && date <= end;
}

function startOfWeek(date) {
  // Lunes como primer día de la semana (cultura chilena)
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function formatDateShort(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatLongDate(timestamp) {
  const d = new Date(timestamp);
  return `${WEEKDAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDateForInput(timestamp) {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFromInput(str) {
  // 'YYYY-MM-DD' → timestamp local (no UTC)
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDaysUntil(timestamp) {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(new Date(timestamp)).getTime();
  return Math.round((target - today) / DAY_MS);
}

function relativeDate(timestamp) {
  const diff = getDaysUntil(timestamp);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 0 && diff <= 6) return `En ${diff} días`;
  if (diff < 0 && diff >= -6) return `Hace ${Math.abs(diff)} días`;
  return formatDateShort(timestamp);
}

/** Tiempo relativo pasado, con granularidad minuto/hora/día.
 *  Ej: "ahora", "hace 5 min", "hace 2 h", "ayer", "hace 3 días". */
function relativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 30) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return formatDateShort(timestamp);
}

// ===== PRIORIDADES =====

function priorityLabel(p) {
  return p === 3 ? 'Alta' : p === 2 ? 'Media' : 'Baja';
}

function priorityClass(p) {
  return p === 3 ? 'high' : p === 2 ? 'med' : 'low';
}

// ===== RECORDATORIOS / NOTIFICACIONES =====

const REMINDER_LEAD_MS = 60 * 60 * 1000; // 60 minutos antes del due

/** True si el navegador permite Notification API y el user ya dio permiso. */
function browserNotifGranted() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/** Pide el permiso si todavía no se decidió. Devuelve una promesa con el
 *  estado final ('granted' | 'denied' | 'default'). */
async function requestBrowserNotifPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (_) {
    return Notification.permission;
  }
}

/** Notifica al usuario: toast in-app siempre; si la pestaña está en
 *  background y hay permiso, también una Browser Notification. */
function notifyUser(title, body, { icon = 'bell' } = {}) {
  showToast(`${title}${body ? ' · ' + body : ''}`, icon);
  if (browserNotifGranted() && document.visibilityState === 'hidden') {
    try {
      new Notification(title, { body, tag: 'syncstudy-reminder' });
    } catch (err) {
      console.warn('Notification falló:', err);
    }
  }
}

// ===== ESTADO DE TAREA (vencida / tardía) =====

/** True si la tarea está pendiente y su fecha ya pasó (no es hoy). */
function isOverdue(task) {
  if (task.completed) return false;
  return task.dueDate < startOfDay(new Date()).getTime();
}

/** True si la tarea está completada pero después de su fecha original.
 *  Se basa en `completedAt`, que la app setea explícitamente al togglear.
 *  Tolerancia: si se marcó cualquier hora del día del due, sigue siendo
 *  "a tiempo" (usamos endOfDay para el corte). */
function isCompletedLate(task) {
  if (!task.completed || !task.completedAt) return false;
  return task.completedAt > endOfDay(new Date(task.dueDate)).getTime();
}

// ===== DOM HELPERS =====

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') node.innerHTML = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child == null) return;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  });
  return node;
}

function refreshIcons() {
  // Lucide expone window.lucide.createIcons() después de cargar
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
}

// ===== SONIDOS =====

const SOUND_PREF_KEY = 'syncstudy_sound_enabled';

function isSoundEnabled() {
  // Default: encendido. Solo "false" persistido lo apaga.
  return localStorage.getItem(SOUND_PREF_KEY) !== 'false';
}

function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_PREF_KEY, String(!!enabled));
}

/** "Ding" corto y agradable cuando se completa una tarea. Generado vía
 *  WebAudio para no depender de assets externos. */
let _audioCtx = null;
function playCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    // Algunos navegadores suspenden el contexto hasta que hay un gesto del user.
    if (ctx.state === 'suspended') ctx.resume();

    const t0 = ctx.currentTime;
    // Dos osciladores apilados para un timbre más cálido (campanita).
    const tones = [880, 1320];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = t0 + i * 0.05;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (err) {
    console.warn('No se pudo reproducir el sonido:', err);
  }
}

// ===== TOAST =====

let toastTimeout;
function showToast(message, icon = 'check') {
  const toast = $('#toast');
  // El icono es interno (controlado); el mensaje puede traer datos del usuario
  // (nombres de grupo, títulos de tarea), así que va por textContent para
  // evitar XSS — nunca por innerHTML.
  toast.innerHTML = `<i data-lucide="${icon}"></i><span></span>`;
  toast.querySelector('span').textContent = message;
  refreshIcons();
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
