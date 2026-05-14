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

    const initialGroup = {
      ...SEED_DATA.group,
      createdAt: Date.now(),
      hidden: false
    };

    const state = {
      currentUserId: SEED_DATA.currentUserId,
      activeGroupId: initialGroup.id,
      groups: [initialGroup],
      group: initialGroup, // compatibilidad con versiones anteriores del proyecto
      users: SEED_DATA.users,
      tasks
    };

    this._write(state);
    return state;
  },

  /** Devuelve el estado completo. */
  getState() {
    const state = this._read() || this.init();
    return this._migrateState(state);
  },

  /** Reemplaza completamente el estado. */
  setState(state) {
    this._write(this._migrateState(state));
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

  /** Devuelve todos los miembros del grupo actual. */
  getGroupMembers(groupId = null) {
    const state = this.getState();
    const group = groupId ? this.getGroup(groupId) : this.getGroup();
    const members = group?.members || [];
    return state.users.filter(u => members.includes(u.id));
  },

  /** Devuelve todos los grupos guardados. */
  getGroups() {
    return this.getState().groups || [];
  },

  /** Devuelve el grupo activo o uno por ID. */
  getGroup(groupId = null) {
    const state = this.getState();
    const id = groupId || state.activeGroupId || state.group?.id;
    return (state.groups || []).find(g => g.id === id) || state.group;
  },

  /** Cambia el grupo activo sin borrar los grupos anteriores. */
  setActiveGroup(groupId) {
    const state = this.getState();
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return null;

    state.activeGroupId = group.id;
    state.group = group; // compatibilidad con vistas antiguas
    this._write(state);
    return group;
  },

  /** Crea un nuevo grupo local y mantiene al usuario actual como primer integrante. */
  createGroup(groupName) {
    const state = this.getState();
    const cleanName = groupName.trim();
    if (!cleanName) return null;

    const currentUser = state.currentUserId;
    const group = {
      id: 'group-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: cleanName,
      members: [currentUser],
      createdAt: Date.now(),
      hidden: false
    };

    state.groups = state.groups || [];
    state.groups.push(group);
    state.activeGroupId = group.id;
    state.group = group;
    this._write(state);
    return group;
  },

  /** Agrega un integrante ficticio al grupo activo. */
  addMember(memberData) {
    const state = this.getState();
    const name = memberData.name.trim();
    if (!name) return null;

    const activeGroup = (state.groups || []).find(g => g.id === state.activeGroupId) || state.group;
    if (!activeGroup) return null;

    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const palette = ['#7c8a7a', '#8b8175', '#748293', '#6f767e', '#8a7f68', '#66756b'];
    const user = {
      id,
      name,
      initial: name.charAt(0).toUpperCase(),
      color: memberData.color || palette[Math.floor(Math.random() * palette.length)],
      isMe: false
    };

    state.users.push(user);
    activeGroup.members = activeGroup.members || [];
    if (!activeGroup.members.includes(id)) activeGroup.members.push(id);
    state.group = activeGroup;
    this._write(state);
    return user;
  },

  /** Oculta o muestra un grupo sin eliminarlo. */
  toggleGroupHidden(groupId) {
    const state = this.getState();
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return null;

    group.hidden = !group.hidden;

    // Si se oculta el grupo activo, cambia al primer grupo visible disponible.
    if (group.hidden && state.activeGroupId === group.id) {
      const nextVisible = (state.groups || []).find(g => !g.hidden);
      if (nextVisible) {
        state.activeGroupId = nextVisible.id;
        state.group = nextVisible;
      } else {
        // Si todos quedan ocultos, mantiene el grupo actual para no dejar la app sin contexto.
        group.hidden = false;
        state.activeGroupId = group.id;
        state.group = group;
      }
    } else if (state.activeGroupId === group.id) {
      state.group = group;
    }

    this._write(state);
    return group;
  },

  /** Resetea todos los datos (útil para testeo). */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.init();
  },

  // ===== Métodos internos =====

  _migrateState(state) {
    if (!state) return state;

    // Versión antigua: solo existía state.group. Versión nueva: state.groups + activeGroupId.
    if (!Array.isArray(state.groups)) {
      const fallbackGroup = state.group || SEED_DATA.group;
      state.groups = [{
        ...fallbackGroup,
        members: Array.isArray(fallbackGroup.members) ? fallbackGroup.members : [state.currentUserId],
        createdAt: fallbackGroup.createdAt || Date.now()
      }];
    }

    if (!state.activeGroupId) {
      state.activeGroupId = state.group?.id || state.groups[0]?.id;
    }

    state.groups.forEach(g => { g.hidden = !!g.hidden; });

    const activeGroup = state.groups.find(g => g.id === state.activeGroupId) || state.groups.find(g => !g.hidden) || state.groups[0];
    state.activeGroupId = activeGroup?.id;
    state.group = activeGroup;

    // Asegura que el usuario actual exista dentro del grupo activo.
    if (activeGroup) {
      activeGroup.members = Array.isArray(activeGroup.members) ? activeGroup.members : [];
      if (!activeGroup.members.includes(state.currentUserId)) {
        activeGroup.members.unshift(state.currentUserId);
      }
    }

    this._write(state);
    return state;
  },

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
