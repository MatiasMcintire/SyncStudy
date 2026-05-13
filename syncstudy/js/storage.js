/* ============================================ */
/* CAPA DE PERSISTENCIA — localStorage           */
/* ============================================ */

/**
 * Storage es la única capa que toca localStorage.
 * Todo el resto de la app habla con esta capa.
 *
 * Esto facilita una migración futura a Firebase: solo
 * cambiamos esta capa, el resto del código sigue igual.
 */

const STORAGE_KEY = 'syncstudy.v1';

const Storage = {
  /**
   * Inicializa el storage con los datos seed si está vacío.
   * Convierte los dayOffset relativos a fechas reales (timestamps).
   */
  init() {
    const existing = this._read();
    if (existing && existing.tasks) {
      return existing;
    }

    // Primera carga: convertir SEED_DATA a estado persistible
    const today = startOfDay(new Date());
    const tasks = SEED_DATA.tasks.map(t => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      description: t.description || '',
      dueDate: addDays(today, t.dayOffset).getTime(),
      subject: t.subject || 'General',
      priority: t.priority || 2,
      completed: !!t.completed,
      createdAt: Date.now()
    }));

    const state = {
      currentUserId: SEED_DATA.currentUserId,
      group: SEED_DATA.group,
      users: SEED_DATA.users,
      tasks
    };

    this._write(state);
    return state;
  },

  /** Devuelve el estado completo. */
  getState() {
    return this._read() || this.init();
  },

  /** Reemplaza completamente el estado. */
  setState(state) {
    this._write(state);
  },

  /** Devuelve todas las tareas. */
  getAllTasks() {
    return this.getState().tasks;
  },

  /** Devuelve las tareas de un usuario específico. */
  getTasksByUser(userId) {
    return this.getAllTasks().filter(t => t.userId === userId);
  },

  /** Devuelve una tarea por ID. */
  getTask(id) {
    return this.getAllTasks().find(t => t.id === id);
  },

  /** Crea una nueva tarea. */
  createTask(taskData) {
    const state = this.getState();
    const task = {
      id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      userId: state.currentUserId,
      title: taskData.title,
      description: taskData.description || '',
      dueDate: taskData.dueDate,
      subject: taskData.subject || 'General',
      priority: taskData.priority || 2,
      completed: false,
      createdAt: Date.now()
    };
    state.tasks.push(task);
    this._write(state);
    return task;
  },

  /** Actualiza una tarea existente. */
  updateTask(id, patch) {
    const state = this.getState();
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    state.tasks[idx] = { ...state.tasks[idx], ...patch };
    this._write(state);
    return state.tasks[idx];
  },

  /** Marca tarea como completada o no completada. */
  toggleTask(id) {
    const task = this.getTask(id);
    if (!task) return null;
    return this.updateTask(id, { completed: !task.completed });
  },

  /** Elimina una tarea. */
  deleteTask(id) {
    const state = this.getState();
    state.tasks = state.tasks.filter(t => t.id !== id);
    this._write(state);
  },

  /** Devuelve el usuario actual. */
  getCurrentUser() {
    const state = this.getState();
    return state.users.find(u => u.id === state.currentUserId);
  },

  /** Devuelve un usuario por ID. */
  getUser(userId) {
    return this.getState().users.find(u => u.id === userId);
  },

  /** Devuelve todos los miembros del grupo. */
  getGroupMembers() {
    return this.getState().users;
  },

  /** Devuelve el grupo. */
  getGroup() {
    return this.getState().group;
  },

  /** Resetea todos los datos (útil para testeo). */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.init();
  },

  // ===== Métodos internos =====

  _read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error leyendo storage:', e);
      return null;
    }
  },

  _write(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error escribiendo storage:', e);
    }
  }
};
