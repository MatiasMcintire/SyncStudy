/* ============================================ */
/* CAPA DE PERSISTENCIA — PocketBase + cache     */
/* ============================================ */

/**
 * Storage es la única capa que toca el backend.
 * El resto de la app le habla con una API síncrona (igual
 * que cuando usábamos localStorage), pero por dentro:
 *
 *   - init() es async: autentica contra PocketBase y carga
 *     todo el estado a un cache en memoria.
 *   - Lecturas: van al cache (síncronas).
 *   - Escrituras: actualizan el cache de forma optimista y
 *     empujan el cambio a PocketBase en background.
 *   - Suscripción realtime: cuando otro cliente cambia algo,
 *     se actualiza el cache y se dispara onChange().
 *
 * Esto permite que views.js y app.js no se enteren del
 * cambio de backend.
 */

// Dónde vive el backend PocketBase.
//   - En desarrollo el frontend se sirve aparte (python http.server en :5500)
//     mientras PocketBase corre en :8090, así que apuntamos a 127.0.0.1:8090.
//   - En producción/demo PocketBase sirve TAMBIÉN el frontend (carpeta pb_public),
//     entonces API y página comparten origen: usamos location.origin. Esto hace
//     que funcione igual por LAN o por un túnel HTTPS (Cloudflare/ngrok) sin tocar
//     nada más.
const PB_URL = location.port === '5500'
  ? 'http://127.0.0.1:8090'
  : location.origin;

const Storage = {
  _pb: null,
  _state: {
    currentUserId: null,
    groups: [],           // todos los grupos donde el current user es miembro
    currentGroupId: null, // null = vista "Todos mis grupos"
    users: [],            // todos los users que aparecen en alguno de mis grupos
    tasks: [],            // todas las tareas de mis grupos
    comments: []          // todos los comentarios de tareas visibles
  },
  _onChange: null,
  _unsubTasks: null,
  _unsubUsers: null,
  _unsubGroups: null,
  _unsubComments: null,

  /**
   * Configura el cliente PocketBase + el authStore. NO autentica.
   * Devuelve true si ya había una sesión guardada válida.
   */
  async init() {
    // El bundle UMD de PocketBase no expone LocalAuthStore como estática,
    // así que tomamos la clase via reflection sobre un store por defecto.
    const probe = new PocketBase(PB_URL);
    const AuthStoreClass = probe.authStore.constructor;
    const authStore = new AuthStoreClass('syncstudy_auth');
    this._pb = new PocketBase(PB_URL, authStore);
    this._pb.autoCancellation(false);

    return this.isAuthenticated();
  },

  /** True si hay una sesión PB válida en este momento. */
  isAuthenticated() {
    return !!(this._pb && this._pb.authStore.isValid);
  },

  /** Autentica con email/password. Si pasa, carga el estado y se suscribe. */
  async login(email, password) {
    await this._pb.collection('users').authWithPassword(email, password);
    await this._refreshAll();
    this._subscribeRealtime();
    return this._state;
  },

  /**
   * Crea una cuenta nueva (registro público) y deja la sesión iniciada.
   * El correo es la identidad de login. La verificación de correo queda
   * desactivada por ahora (no se exige verified para usar la app).
   */
  async register(name, email, password) {
    const clean = (name || '').trim();
    const initial = (clean[0] || '?').toUpperCase();
    const palette = ['#4F6076', '#5E7D5A', '#B17A3C', '#9A5E81', '#74608C', '#4E7C80', '#A8473B'];
    const color = palette[Math.floor(Math.random() * palette.length)];
    await this._pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: clean,
      initial,
      color
      // emailVisibility queda en false (default): la app nunca muestra el
      // email de otros usuarios, así no se filtran correos a cualquier logueado.
    });
    // Reutiliza login(): autentica, carga estado y se suscribe en realtime.
    return this.login(email, password);
  },

  /**
   * Pide a PocketBase que envíe el correo de reseteo de contraseña.
   * Requiere SMTP configurado en el server. PocketBase responde igual exista
   * o no el correo (no filtra cuáles están registrados).
   */
  async requestPasswordReset(email) {
    await this._pb.collection('users').requestPasswordReset(email);
  },

  /** Continúa una sesión ya autenticada: carga estado y se suscribe. */
  async resume() {
    if (!this.isAuthenticated()) return false;
    await this._refreshAll();
    this._subscribeRealtime();
    return true;
  },

  /** Cierra sesión local: limpia token, cancela suscripciones y vacía el cache. */
  logout() {
    ['_unsubTasks', '_unsubUsers', '_unsubGroups', '_unsubComments'].forEach(k => {
      if (this[k]) {
        try { this[k](); } catch (_) {}
        this[k] = null;
      }
    });
    if (this._pb) this._pb.authStore.clear();
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('syncstudy_auth')) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
    this._state = { currentUserId: null, groups: [], currentGroupId: null, users: [], tasks: [], comments: [] };
  },

  /** Permite a app.js registrar un callback que se llama cuando llega un cambio remoto. */
  onChange(cb) {
    this._onChange = cb;
  },

  /** Callback opcional disparado cuando un compañero crea una tarea visible
   *  para el usuario actual. Argumento: el objeto task (formato app). */
  onPeerTaskCreated(cb) {
    this._onPeerTaskCreated = cb;
  },

  // ============================================
  // Carga inicial completa
  // ============================================
  async _refreshAll() {
    const me = this._pb.authStore.record;
    this._state.currentUserId = me.id;

    // 1. Grupos donde soy miembro
    const groupsRes = await this._pb.collection('groups').getFullList({
      sort: 'created',
      filter: `members.id ?= "${me.id}"`
    });
    this._state.groups = groupsRes.map(g => this._groupFromPB(g));

    // 2. Restaurar el grupo activo desde localStorage si sigue siendo válido
    let stored = null;
    try { stored = localStorage.getItem(`syncstudy_currentGroup_${me.id}`); } catch (_) {}
    if (stored && this._state.groups.some(g => g.id === stored)) {
      this._state.currentGroupId = stored;
    } else if (this._state.groups.length === 1) {
      this._state.currentGroupId = this._state.groups[0].id;
    } else if (this._state.groups.length === 0) {
      this._state.currentGroupId = null;
    } else {
      this._state.currentGroupId = null; // "Todos mis grupos" si hay varios y no hay preferencia
    }

    // 3. Cargar users que aparecen en cualquiera de mis grupos
    const memberIds = new Set([me.id]);
    this._state.groups.forEach(g => (g.members || []).forEach(id => memberIds.add(id)));
    if (memberIds.size > 0) {
      const filter = Array.from(memberIds).map(id => `id = "${id}"`).join(' || ');
      const users = await this._pb.collection('users').getFullList({ filter });
      this._state.users = users.map(u => this._userFromPB(u, me.id));
    } else {
      this._state.users = [{ id: me.id, name: me.name || me.email, initial: (me.initial || (me.name || '?')[0]), color: me.color || '#64748b', isMe: true }];
    }

    // 4. Cargar tareas de mis grupos
    if (this._state.groups.length > 0) {
      const filter = this._state.groups.map(g => `group = "${g.id}"`).join(' || ');
      const tasks = await this._pb.collection('tasks').getFullList({
        sort: '-created', perPage: 500, filter
      });
      this._state.tasks = tasks.map(t => this._taskFromPB(t));
    } else {
      this._state.tasks = [];
    }

    // 5. Comentarios visibles. La regla list/view ya filtra por miembro del
    // grupo de la tarea, así que no necesitamos filtro adicional.
    if (this._state.tasks.length > 0) {
      const comments = await this._pb.collection('comments').getFullList({
        sort: 'created', perPage: 1000
      });
      this._state.comments = comments.map(c => this._commentFromPB(c));
    } else {
      this._state.comments = [];
    }
  },

  _groupFromPB(g) {
    return {
      id: g.id,
      name: g.name,
      members: g.members || [],
      inviteCode: g.inviteCode || '',
      owner: g.owner || null
    };
  },

  _subscribeRealtime() {
    if (this._unsubTasks) this._unsubTasks();
    if (this._unsubUsers) this._unsubUsers();

    this._pb.collection('tasks').subscribe('*', (e) => {
      const tasks = this._state.tasks;
      if (e.action === 'delete') {
        const i = tasks.findIndex(t => t.id === e.record.id);
        if (i >= 0) tasks.splice(i, 1);
      } else {
        const task = this._taskFromPB(e.record);
        const i = tasks.findIndex(t => t.id === task.id);
        const wasNew = i < 0;
        if (i >= 0) tasks[i] = task;
        else tasks.push(task);

        // Notificar SOLO si es la primera vez que vemos la tarea, fue un
        // evento create real, y la creó alguien distinto al usuario actual.
        if (wasNew && e.action === 'create'
            && task.userId !== this._state.currentUserId
            && this._onPeerTaskCreated) {
          try { this._onPeerTaskCreated(task); } catch (err) { console.error(err); }
        }
      }
      if (this._onChange) this._onChange();
    }).then(unsub => { this._unsubTasks = unsub; });

    this._pb.collection('users').subscribe('*', (e) => {
      if (e.action === 'delete') return;
      const users = this._state.users;
      const user = this._userFromPB(e.record, this._state.currentUserId);
      const i = users.findIndex(u => u.id === user.id);
      if (i >= 0) users[i] = user;
      else users.push(user);
      if (this._onChange) this._onChange();
    }).then(unsub => { this._unsubUsers = unsub; });

    this._pb.collection('comments').subscribe('*', (e) => {
      const comments = this._state.comments;
      if (e.action === 'delete') {
        const i = comments.findIndex(c => c.id === e.record.id);
        if (i >= 0) comments.splice(i, 1);
      } else {
        const c = this._commentFromPB(e.record);
        const i = comments.findIndex(x => x.id === c.id);
        if (i >= 0) comments[i] = c;
        else comments.push(c);
      }
      if (this._onChange) this._onChange();
    }).then(unsub => { this._unsubComments = unsub; });

    this._pb.collection('groups').subscribe('*', async (e) => {
      const me = this._state.currentUserId;
      if (e.action === 'delete') {
        const i = this._state.groups.findIndex(g => g.id === e.record.id);
        if (i >= 0) this._state.groups.splice(i, 1);
        if (this._state.currentGroupId === e.record.id) {
          this._state.currentGroupId = this._state.groups[0]?.id || null;
        }
      } else {
        const g = this._groupFromPB(e.record);
        const includesMe = g.members.includes(me);
        const i = this._state.groups.findIndex(x => x.id === g.id);
        if (includesMe) {
          if (i >= 0) this._state.groups[i] = g;
          else {
            // Me acaban de añadir a un grupo nuevo: traer tareas y users nuevos
            this._state.groups.push(g);
            await this._loadGroupExtras(g);
          }
        } else if (i >= 0) {
          // Me sacaron de este grupo
          this._state.groups.splice(i, 1);
          if (this._state.currentGroupId === g.id) {
            this._state.currentGroupId = this._state.groups[0]?.id || null;
          }
        }
      }
      if (this._onChange) this._onChange();
    }).then(unsub => { this._unsubGroups = unsub; });
  },

  /** Trae tareas y users de un grupo recién unido (para realtime). */
  async _loadGroupExtras(group) {
    try {
      const tasks = await this._pb.collection('tasks').getFullList({
        filter: `group = "${group.id}"`, sort: '-created', perPage: 500
      });
      tasks.forEach(t => {
        const task = this._taskFromPB(t);
        if (!this._state.tasks.find(x => x.id === task.id)) this._state.tasks.push(task);
      });
      const knownUserIds = new Set(this._state.users.map(u => u.id));
      const missing = group.members.filter(id => !knownUserIds.has(id));
      if (missing.length) {
        const filter = missing.map(id => `id = "${id}"`).join(' || ');
        const users = await this._pb.collection('users').getFullList({ filter });
        users.forEach(u => {
          const user = this._userFromPB(u, this._state.currentUserId);
          if (!this._state.users.find(x => x.id === user.id)) this._state.users.push(user);
        });
      }
    } catch (err) { console.error('_loadGroupExtras falló:', err); }
  },

  // ============================================
  // API pública (síncrona — igual que antes)
  // ============================================

  getState() { return this._state; },
  getCurrentUser() { return this._state.users.find(u => u.id === this._state.currentUserId); },
  getCurrentEmail() { return this._pb?.authStore.record?.email || null; },
  getUser(userId) { return this._state.users.find(u => u.id === userId); },

  // ----- Multi-grupo -----
  getMyGroups() { return this._state.groups; },
  getCurrentGroupId() { return this._state.currentGroupId; },
  /** Grupo activo (objeto). null si está en vista "Todos mis grupos". */
  getGroup() {
    const id = this._state.currentGroupId;
    return id ? this._state.groups.find(g => g.id === id) || null : null;
  },
  /** IDs de miembros visibles: del grupo activo, o unión si "todos". */
  _visibleMemberIds() {
    const g = this.getGroup();
    if (g) return new Set(g.members);
    const ids = new Set([this._state.currentUserId]);
    this._state.groups.forEach(g => g.members.forEach(id => ids.add(id)));
    return ids;
  },
  /** IDs de los grupos visibles en la vista actual. */
  _visibleGroupIds() {
    const id = this._state.currentGroupId;
    return id ? new Set([id]) : new Set(this._state.groups.map(g => g.id));
  },
  /** Miembros del grupo activo (o unión de todos los grupos). */
  getGroupMembers() {
    const ids = this._visibleMemberIds();
    return this._state.users.filter(u => ids.has(u.id));
  },

  // ----- Tareas (filtradas por grupo activo) -----
  getAllTasks() {
    const gids = this._visibleGroupIds();
    return this._state.tasks.filter(t => !t.groupId || gids.has(t.groupId));
  },
  getTasksByUser(userId) {
    return this.getAllTasks().filter(t => t.userId === userId);
  },
  getTask(id) { return this._state.tasks.find(t => t.id === id); },

  /** Cambia el grupo activo. id puede ser null para "Todos mis grupos". */
  setCurrentGroupId(id) {
    if (id && !this._state.groups.find(g => g.id === id)) return;
    this._state.currentGroupId = id;
    try {
      const key = `syncstudy_currentGroup_${this._state.currentUserId}`;
      if (id) localStorage.setItem(key, id);
      else localStorage.removeItem(key);
    } catch (_) {}
    if (this._onChange) this._onChange();
  },

  /** Crea una tarea en el grupo activo (o en el grupo `groupId` si se pasa).
   *  Async: espera la respuesta de PB y devuelve el record real. */
  async createTask(taskData) {
    const groupId = taskData.groupId
      || this._state.currentGroupId
      || (this._state.groups[0] && this._state.groups[0].id);
    if (!groupId) {
      throw new Error('Necesitas estar en un grupo para crear tareas');
    }
    const payload = this._taskToPB({
      userId: this._state.currentUserId,
      groupId,
      title: taskData.title,
      description: taskData.description || '',
      dueDate: taskData.dueDate,
      subject: taskData.subject || 'General',
      priority: taskData.priority || 2,
      type: taskData.type || 'task',
      completed: false
    });
    const real = await this._pb.collection('tasks').create(payload);
    const task = this._taskFromPB(real);
    const i = this._state.tasks.findIndex(t => t.id === task.id);
    if (i >= 0) this._state.tasks[i] = task;
    else this._state.tasks.push(task);
    return task;
  },

  /** Actualiza una tarea existente. Si cambia `completed`, ajusta también
   *  `completedAt` (timestamp del cierre real, o null al reabrir). */
  updateTask(id, patch) {
    const i = this._state.tasks.findIndex(t => t.id === id);
    if (i === -1) return null;
    const before = this._state.tasks[i];
    const finalPatch = { ...patch };
    if (typeof finalPatch.completed === 'boolean'
        && finalPatch.completed !== before.completed) {
      finalPatch.completedAt = finalPatch.completed ? Date.now() : null;
    }
    this._state.tasks[i] = { ...before, ...finalPatch };
    const updated = this._state.tasks[i];

    if (!String(id).startsWith('temp-')) {
      this._pb.collection('tasks').update(id, this._taskToPB(updated))
        .catch(err => console.error('updateTask falló:', err));
    }
    return updated;
  },

  toggleTask(id) {
    const task = this.getTask(id);
    if (!task) return null;
    return this.updateTask(id, { completed: !task.completed });
  },

  deleteTask(id) {
    this._state.tasks = this._state.tasks.filter(t => t.id !== id);
    if (!String(id).startsWith('temp-')) {
      this._pb.collection('tasks').delete(id)
        .catch(err => console.error('deleteTask falló:', err));
    }
  },

  /** Crea un grupo nuevo, agrega al usuario actual como dueño y miembro,
   *  y lo activa como grupo actual. Devuelve el grupo creado. */
  async createGroup(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('El nombre del grupo es obligatorio');
    const uid = this._state.currentUserId;
    const real = await this._pb.collection('groups').create({
      name: trimmed,
      owner: uid,
      members: [uid]
    });
    const group = this._groupFromPB(real);
    if (!this._state.groups.find(g => g.id === group.id)) {
      this._state.groups.push(group);
    }
    this.setCurrentGroupId(group.id);
    return group;
  },

  /** Busca un grupo por código de invitación y agrega al usuario actual a sus
   *  miembros. Si ya era miembro, simplemente lo activa. Devuelve el grupo. */
  async joinGroupByCode(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error('El código debe tener 6 caracteres (letras y números)');
    }
    // El alta como miembro la hace un endpoint controlado del server (hook),
    // para que la colección "groups" pueda tener reglas estrictas (solo miembros).
    let res;
    try {
      res = await this._pb.send('/api/syncstudy/join', { method: 'POST', body: { code } });
    } catch (err) {
      throw new Error(err?.response?.message || err?.message || 'No se pudo unir al grupo');
    }
    // Recargar el estado para traer el grupo recién unido (miembros + tareas).
    await this._refreshAll();
    this.setCurrentGroupId(res.id);
    return this.getGroup() || { id: res.id, name: res.name };
  },

  /** Expulsa a un miembro del grupo. Solo el dueño puede (lo refuerza la regla
   *  updateRule = owner del lado del server). */
  async kickMember(groupId, userId) {
    const g = this._state.groups.find(x => x.id === groupId);
    if (!g) throw new Error('Grupo no encontrado');
    if (g.owner !== this._state.currentUserId) {
      throw new Error('Solo el dueño del grupo puede expulsar miembros');
    }
    if (userId === g.owner) {
      throw new Error('No podés expulsar al dueño del grupo');
    }
    const newMembers = (g.members || []).filter(id => id !== userId);
    await this._pb.collection('groups').update(groupId, { members: newMembers });
    await this._refreshAll();
  },

  /** Quita al usuario actual del grupo. Si era el último miembro, no borra
   *  el grupo (lo dejamos sin miembros). */
  async leaveGroup(groupId) {
    const g = this._state.groups.find(x => x.id === groupId);
    if (!g) return;
    const uid = this._state.currentUserId;
    const newMembers = g.members.filter(id => id !== uid);
    await this._pb.collection('groups').update(groupId, { members: newMembers });
    const i = this._state.groups.findIndex(x => x.id === groupId);
    if (i >= 0) this._state.groups.splice(i, 1);
    if (this._state.currentGroupId === groupId) {
      this.setCurrentGroupId(this._state.groups[0]?.id || null);
    }
  },

  /** Actualiza el perfil del usuario logueado (name, initial, color).
   *  La regla de PB ya restringe a "id = @request.auth.id". */
  async updateProfile({ name, initial, color }) {
    const uid = this._state.currentUserId;
    if (!uid) throw new Error('No hay usuario logueado');
    const payload = {};
    if (typeof name === 'string') payload.name = name.trim();
    if (typeof initial === 'string') payload.initial = initial.trim().slice(0, 2).toUpperCase();
    if (typeof color === 'string') payload.color = color;
    const real = await this._pb.collection('users').update(uid, payload);
    const updated = this._userFromPB(real, uid);
    const i = this._state.users.findIndex(u => u.id === uid);
    if (i >= 0) this._state.users[i] = updated;
    return updated;
  },

  // ----- Comentarios -----

  /** Comentarios de una tarea ordenados cronológicamente (más antiguo primero). */
  getCommentsForTask(taskId) {
    return this._state.comments
      .filter(c => c.taskId === taskId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  /** Cuántos comentarios tiene una tarea (rápido, no crea arrays nuevos). */
  getCommentCountForTask(taskId) {
    let n = 0;
    for (const c of this._state.comments) if (c.taskId === taskId) n++;
    return n;
  },

  /** Resumen de tareas propias pendientes:
   *  { overdue, today, tomorrow } — todo respecto al usuario y la fecha actual. */
  getMyPendingSummary() {
    const me = this._state.currentUserId;
    const todayStart = startOfDay(new Date()).getTime();
    const tomorrowStart = addDays(new Date(todayStart), 1).getTime();
    const dayAfterStart = addDays(new Date(todayStart), 2).getTime();
    let overdue = 0, today = 0, tomorrow = 0;
    for (const t of this._state.tasks) {
      if (t.userId !== me || t.completed || t.type === 'note') continue;
      if (t.dueDate < todayStart) overdue++;
      else if (t.dueDate < tomorrowStart) today++;
      else if (t.dueDate < dayAfterStart) tomorrow++;
    }
    return { overdue, today, tomorrow };
  },

  /** Crea un comentario en una tarea. Devuelve el record real. */
  async addComment(taskId, body) {
    const trimmed = (body || '').trim();
    if (!trimmed) throw new Error('El comentario no puede estar vacío');
    const real = await this._pb.collection('comments').create({
      task: taskId,
      author: this._state.currentUserId,
      body: trimmed
    });
    const comment = this._commentFromPB(real);
    const i = this._state.comments.findIndex(c => c.id === comment.id);
    if (i >= 0) this._state.comments[i] = comment;
    else this._state.comments.push(comment);
    return comment;
  },

  /** Borra un comentario propio. */
  async deleteComment(commentId) {
    const c = this._state.comments.find(x => x.id === commentId);
    if (!c) return;
    if (c.authorId !== this._state.currentUserId) {
      throw new Error('Solo puedes borrar tus propios comentarios');
    }
    await this._pb.collection('comments').delete(commentId);
    this._state.comments = this._state.comments.filter(x => x.id !== commentId);
  },

  /** Para devs: cierra sesión y recarga la app. */
  async reset() {
    this._pb.authStore.clear();
    location.reload();
  },

  // ============================================
  // Adapters PocketBase ↔ modelo de la app
  // ============================================

  _userFromPB(u, meId) {
    const name = u.name || u.email || 'Sin nombre';
    return {
      id: u.id,
      name,
      initial: u.initial || name.trim().charAt(0).toUpperCase() || '?',
      color: u.color || '#64748b',
      isMe: u.id === meId
    };
  },

  _taskFromPB(t) {
    return {
      id: t.id,
      userId: t.user,
      groupId: t.group || null,
      title: t.title,
      description: t.description || '',
      dueDate: new Date(t.dueDate).getTime(),
      subject: t.subject || 'General',
      priority: t.priority || 2,
      type: t.type || 'task',
      completed: !!t.completed,
      createdAt: new Date(t.created).getTime(),
      updatedAt: new Date(t.updated || t.created).getTime(),
      completedAt: t.completedAt ? new Date(t.completedAt).getTime() : null
    };
  },

  _taskToPB(t) {
    const payload = {
      user: t.userId,
      group: t.groupId || null,
      title: t.title,
      description: t.description || '',
      dueDate: new Date(t.dueDate).toISOString().replace('T', ' '),
      subject: t.subject || 'General',
      priority: t.priority || 2,
      type: t.type || 'task',
      completed: !!t.completed
    };
    // PocketBase espera 'YYYY-MM-DD HH:mm:ss.sssZ' o cadena vacía para null.
    payload.completedAt = t.completedAt
      ? new Date(t.completedAt).toISOString().replace('T', ' ')
      : '';
    return payload;
  },

  _commentFromPB(c) {
    return {
      id: c.id,
      taskId: c.task,
      authorId: c.author,
      body: c.body || '',
      createdAt: new Date(c.created).getTime()
    };
  }
};
