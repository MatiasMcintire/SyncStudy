/* ============================================ */
/* UTILIDADES                                    */
/* ============================================ */

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

// ===== PRIORIDADES =====

function priorityLabel(p) {
  return p === 3 ? 'Alta' : p === 2 ? 'Media' : 'Baja';
}

function priorityClass(p) {
  return p === 3 ? 'high' : p === 2 ? 'med' : 'low';
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

// ===== TOAST =====

let toastTimeout;
function showToast(message, icon = 'check') {
  const toast = $('#toast');
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
  refreshIcons();
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ===== SIMULACIÓN DE COMPAÑEROS =====

/**
 * Simula que un compañero realiza una acción aleatoria
 * cada X segundos. Esto da sensación de "actividad real"
 * del grupo durante la demo.
 *
 * NO afecta las tareas del usuario; solo las de los compañeros.
 */
function startPeerSimulation(onChange) {
  // Cada 25 segundos, un compañero al azar completa una tarea
  // (si tiene tareas pendientes)
  setInterval(() => {
    const state = Storage.getState();
    const peers = state.users.filter(u => !u.isMe);
    const peerIds = peers.map(p => p.id);

    // Buscar tareas pendientes de compañeros
    const candidates = state.tasks.filter(
      t => peerIds.includes(t.userId) && !t.completed
    );

    if (candidates.length === 0) return;

    const task = candidates[Math.floor(Math.random() * candidates.length)];
    Storage.toggleTask(task.id);

    const user = Storage.getUser(task.userId);
    showToast(`${user.name.split(' ')[0]} completó: ${task.title}`, 'check-circle-2');

    if (typeof onChange === 'function') onChange();
  }, 25000);
}
