/* ============================================ */
/* APP PRINCIPAL — orquestación e interacción    */
/* ============================================ */

const App = {
  currentView: 'today',

  async init() {
    this.bindEvents();

    let authed = false;
    try {
      authed = await Storage.init();
    } catch (err) {
      console.error('Storage.init falló:', err);
      showToast('No se pudo conectar al servidor PocketBase', 'alert-circle');
      this._showLogin();
      return;
    }

    if (authed) {
      try {
        await Storage.resume();
        this._startUI();
      } catch (err) {
        console.error('Resume falló:', err);
        Storage.logout();
        this._showLogin();
        showToast('Tu sesión expiró', 'alert-circle');
      }
    } else {
      this._showLogin();
    }
  },

  _showLogin() {
    const screen = $('#loginScreen');
    screen.classList.add('open');
    screen.setAttribute('aria-hidden', 'false');
    refreshIcons();
    setTimeout(() => $('#loginEmail').focus(), 50);
  },

  _hideLogin() {
    const screen = $('#loginScreen');
    screen.classList.remove('open');
    screen.setAttribute('aria-hidden', 'true');
  },

  /** Arranca la UI después de tener sesión + estado cargados. */
  _startUI() {
    this._hideLogin();
    Views.renderAll();
    Storage.onChange(() => {
      Views.renderAll();
      this._renderTaskCommentsIfOpen();
      // Re-evaluar recordatorios si llegan cambios remotos (nueva tarea,
      // dueDate movido, etc.).
      this._checkReminders();
    });
    Storage.onPeerTaskCreated((task) => {
      const author = Storage.getUser(task.userId);
      const firstName = author ? author.name.split(' ')[0] : 'Alguien';
      const group = Storage.getMyGroups().find(g => g.id === task.groupId);
      const groupSuffix = group ? ` · ${group.name}` : '';
      showToast(`${firstName} agregó: ${task.title}${groupSuffix}`, 'plus-circle');
    });
    // (Quitado) startPeerSimulation: era un truco de demo que marcaba tareas de
    // compañeros como completadas al azar en la vista local, para fingir
    // actividad cuando los usuarios eran ficticios. Ahora la colaboración es
    // real (PocketBase realtime), así que ya no se simula nada.
    this._startReminderScheduler();

    // Onboarding: si el user no tiene grupos, forzar el modal sin opción a cerrar.
    if (Storage.getMyGroups().length === 0) {
      this.openGroupModal({ forced: true });
      return;
    }

    setTimeout(() => {
      const me = Storage.getCurrentUser();
      const firstName = me ? me.name.split(' ')[0] : '';
      const greeting = firstName ? `Hola, ${firstName}` : 'Bienvenido a SyncStudy';

      const s = Storage.getMyPendingSummary();
      let suffix = '';
      let icon = 'sparkles';
      if (s.overdue > 0) {
        suffix = ` · ${s.overdue} atrasada${s.overdue === 1 ? '' : 's'}`;
        icon = 'alert-circle';
      } else if (s.today > 0) {
        suffix = ` · ${s.today} para hoy`;
        icon = 'sun';
      } else if (s.tomorrow > 0) {
        suffix = ` · ${s.tomorrow} para mañana`;
        icon = 'calendar-clock';
      } else {
        suffix = ' · sin pendientes urgentes';
      }
      showToast(greeting + suffix, icon);
    }, 400);
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const submitBtn = $('#loginSubmit');
    const errorEl = $('#loginError');

    errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      await Storage.login(email, password);
      $('#loginForm').reset();
      this._startUI();
    } catch (err) {
      console.error('Login falló:', err);
      errorEl.textContent = 'Correo o contraseña inválidos.';
      errorEl.hidden = false;
      $('#loginPassword').focus();
    } finally {
      submitBtn.disabled = false;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = $('#registerName').value.trim();
    const email = $('#registerEmail').value.trim();
    const password = $('#registerPassword').value;
    const submitBtn = $('#registerSubmit');
    const errorEl = $('#registerError');

    errorEl.hidden = true;

    if (!name) { errorEl.textContent = 'Escribe tu nombre.'; errorEl.hidden = false; return; }
    if (password.length < 8) {
      errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      errorEl.hidden = false; return;
    }

    submitBtn.disabled = true;
    try {
      await Storage.register(name, email, password);
      $('#registerForm').reset();
      this._startUI();
    } catch (err) {
      console.error('Registro falló:', err);
      const data = err?.response?.data || {};
      if (data.email) {
        errorEl.textContent = 'Ese correo ya tiene una cuenta o no es válido.';
      } else if (data.password) {
        errorEl.textContent = 'La contraseña no cumple los requisitos (mínimo 8 caracteres).';
      } else {
        errorEl.textContent = 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.';
      }
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  },

  /** Alterna entre el formulario de login y el de registro. */
  _showAuthMode(mode) {
    const isRegister = mode === 'register';
    $('#loginForm').hidden = isRegister;
    $('#registerForm').hidden = !isRegister;
    $('#toGoRegister').hidden = isRegister;
    $('#toGoLogin').hidden = !isRegister;
    $('#loginTitle').textContent = isRegister ? 'Crea tu cuenta' : 'Inicia sesión';
    $('#loginSubtitle').textContent = isRegister
      ? 'Regístrate para empezar a coordinar tu grupo.'
      : 'Conéctate para ver el calendario de tu grupo.';
    $('#loginError').hidden = true;
    $('#registerError').hidden = true;
    setTimeout(() => $(isRegister ? '#registerName' : '#loginEmail').focus(), 50);
  },

  handleLogout() {
    showToast('Cerrando sesión…', 'log-out');
    Storage.logout();
    // Limpiamos cualquier ?user= (dev shortcut) y agregamos un cache-buster
    // para garantizar un reload fresco.
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('_t', Date.now().toString());
    setTimeout(() => { window.location.href = url.toString(); }, 200);
  },

  // ============================================
  // MODAL DE PERFIL
  // ============================================
  openProfileModal() {
    const user = Storage.getCurrentUser();
    if (!user) return;

    $('#profileEmail').textContent = Storage.getCurrentEmail() || '—';
    $('#profileName').value = user.name;
    $('#profileInitial').value = user.initial;
    $('#profileNickname').value = user.nickname || '';
    this._pendingAvatarFile = null;
    this._previewAvatarUrl = user.avatarUrl || null;
    $('#profileForm').dataset.color = user.color;
    $('#profileSoundToggle').checked = isSoundEnabled();
    this._refreshNotifBtnState();
    this._selectProfileColor(user.color);
    this._refreshProfilePreview();

    const modal = $('#profileModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    refreshIcons();
    setTimeout(() => $('#profileName').focus(), 100);
  },

  closeProfileModal() {
    const modal = $('#profileModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  },

  _selectProfileColor(color) {
    $('#profileForm').dataset.color = color;
    $$('#profileColorSwatches .color-swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === color);
    });
    this._refreshProfilePreview();
  },

  _refreshNotifBtnState() {
    const btn = $('#profileNotifBtn');
    const label = $('#profileNotifLabel');
    if (typeof Notification === 'undefined') {
      label.textContent = 'Notificaciones no disponibles';
      btn.disabled = true;
      return;
    }
    switch (Notification.permission) {
      case 'granted':
        label.textContent = 'Notificaciones activas';
        btn.disabled = true;
        break;
      case 'denied':
        label.textContent = 'Bloqueadas (habilita en el navegador)';
        btn.disabled = true;
        break;
      default:
        label.textContent = 'Activar notificaciones del navegador';
        btn.disabled = false;
    }
  },

 _refreshProfilePreview() {
    const preview = $('#profilePreviewAvatar');
    const url = this._previewAvatarUrl;
    if (url) {
      preview.textContent = '';
      preview.style.background = `center / cover no-repeat url("${url}")`;
      return;
    }
    const initial = ($('#profileInitial').value.trim() || $('#profileName').value.trim().charAt(0) || '?')
      .toUpperCase().slice(0, 2);
    const color = $('#profileForm').dataset.color || '#64748b';
    preview.textContent = initial;
    preview.style.background = color;
  },

  _onAvatarPicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Elegí un archivo de imagen', 'alert-circle');
      return;
    }
    this._pendingAvatarFile = file;
    this._previewAvatarUrl = URL.createObjectURL(file);
    this._refreshProfilePreview();
  },

  // ============================================
  // SCHEDULER DE RECORDATORIOS
  // ============================================

  // IDs de tareas que ya recordamos en esta sesión (evita re-notificar).
  _remindedIds: new Set(),
  _reminderTimer: null,

  _startReminderScheduler() {
    if (this._reminderTimer) clearInterval(this._reminderTimer);
    // Primer chequeo inmediato + tick cada 60s.
    this._checkReminders();
    this._reminderTimer = setInterval(() => this._checkReminders(), 60_000);
  },

  _checkReminders() {
    const meId = Storage.getState().currentUserId;
    if (!meId) return;
    const now = Date.now();
    const upper = now + REMINDER_LEAD_MS;
    const candidates = Storage.getAllTasks().filter(t =>
      t.userId === meId
      && !t.completed
      && t.dueDate > now
      && t.dueDate <= upper
      && !this._remindedIds.has(t.id)
    );
    candidates.forEach(t => {
      const minutes = Math.max(1, Math.round((t.dueDate - now) / 60000));
      const when = minutes >= 60
        ? `Vence en ${Math.round(minutes / 60)} h`
        : `Vence en ${minutes} min`;
      notifyUser(t.title, when, { icon: 'bell' });
      this._remindedIds.add(t.id);
    });
  },

  async handleSaveProfile() {
    const name = $('#profileName').value.trim();
    const initial = $('#profileInitial').value.trim().toUpperCase();
    const color = $('#profileForm').dataset.color;
    const nickname = $('#profileNickname').value.trim();

    if (!name) {
      showToast('El nombre no puede estar vacío', 'alert-circle');
      return;
    }

    const submitBtn = $('#profileForm button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await Storage.updateProfile({
        name,
        initial: initial || name.charAt(0),
        color,
        nickname,
        avatar: this._pendingAvatarFile || undefined
      });
      this._pendingAvatarFile = null;
      this.closeProfileModal();
      showToast('Perfil actualizado', 'check-circle-2');
      Views.renderAll();
    } catch (err) {
      console.error('updateProfile falló:', err);
      showToast('No se pudo guardar el perfil', 'alert-circle');
    } finally {
      submitBtn.disabled = false;
    }
  },

  // ============================================
  // GRUPOS — SWITCHER, MODAL, INVITE CODE
  // ============================================
  _toggleGroupSwitcher() {
    const sw = $('#groupSwitcher');
    const list = $('#groupSwitcherList');
    const trigger = $('#groupSwitcherTrigger');
    const open = sw.classList.toggle('open');
    list.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  },

  _closeGroupSwitcher() {
    const sw = $('#groupSwitcher');
    if (!sw.classList.contains('open')) return;
    sw.classList.remove('open');
    $('#groupSwitcherList').hidden = true;
    $('#groupSwitcherTrigger').setAttribute('aria-expanded', 'false');
  },

  openGroupModal({ forced = false } = {}) {
    const modal = $('#groupModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    $('#groupModalIntro').hidden = !forced;
    $('#groupModalClose').hidden = !!forced;
    // El primer tab por defecto: si está forzado (onboarding) ofrecer "Unirse"
    // (más probable que tengan un código que les pasó alguien). Si no forzado,
    // sigue siendo "Unirse" como default razonable.
    this._switchGroupTab('join');
    $('#joinError').hidden = true;
    $('#createError').hidden = true;
    $('#joinCodeInput').value = '';
    $('#createGroupName').value = '';
    refreshIcons();
    setTimeout(() => $('#joinCodeInput').focus(), 100);
  },

  closeGroupModal() {
    // Si el user no tiene grupos, no permitir cerrar (onboarding obligatorio).
    if (Storage.getMyGroups().length === 0) return;
    const modal = $('#groupModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  },

  _switchGroupTab(tab) {
    $$('#groupModal .group-modal__tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    $$('#groupModal [data-tab-panel]').forEach(p => {
      p.hidden = p.dataset.tabPanel !== tab;
    });
    const focusEl = tab === 'join' ? $('#joinCodeInput') : $('#createGroupName');
    setTimeout(() => focusEl.focus(), 50);
  },

  async handleJoinGroup() {
    const code = $('#joinCodeInput').value.trim().toUpperCase();
    const submitBtn = $('#joinGroupForm button[type="submit"]');
    const errorEl = $('#joinError');
    errorEl.hidden = true;
    submitBtn.disabled = true;
    try {
      const group = await Storage.joinGroupByCode(code);
      showToast(`Bienvenido a ${group.name}`, 'check-circle-2');
      this.closeGroupModal();
      Views.renderAll();
    } catch (err) {
      console.error('joinGroupByCode falló:', err);
      errorEl.textContent = err.message || 'No se pudo unir al grupo';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  },

  async handleKickMember(groupId, userId, memberName) {
    if (!confirm(`¿Expulsar a ${memberName} del grupo?\n\nPodrá volver a entrar si tiene el código.`)) return;
    try {
      await Storage.kickMember(groupId, userId);
      Views.renderAll();
      showToast(`${memberName} fue expulsado del grupo`, 'user-minus');
    } catch (err) {
      console.error('kickMember falló:', err);
      showToast(err.message || 'No se pudo expulsar al miembro', 'alert-circle');
    }
  },

  async handleCreateGroup() {
    const name = $('#createGroupName').value.trim();
    const submitBtn = $('#createGroupForm button[type="submit"]');
    const errorEl = $('#createError');
    errorEl.hidden = true;
    submitBtn.disabled = true;
    try {
      const group = await Storage.createGroup(name);
      showToast(`Grupo "${group.name}" creado · código ${group.inviteCode}`, 'sparkles');
      this.closeGroupModal();
      Views.renderAll();
      // Después de crear, llevamos al user a la vista del grupo para que vea
      // el código de invitación que tiene que compartir.
      this.changeView('group');
    } catch (err) {
      console.error('createGroup falló:', err);
      errorEl.textContent = err.message || 'No se pudo crear el grupo';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  },

  async handleCopyInviteCode() {
    const group = Storage.getGroup();
    if (!group || !group.inviteCode) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      showToast('Código copiado', 'copy');
    } catch (_) {
      showToast('No se pudo copiar (revisa los permisos del navegador)', 'alert-circle');
    }
  },

  // ============================================
  // EVENTOS
  // ============================================
  toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('syncstudy_theme', next); } catch (_) {}
    this._updateThemeIcon();
  },

  _updateThemeIcon() {
    const btn = $('#btnTheme');
    if (!btn) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}"></i>`;
    refreshIcons();
  },

  bindEvents() {
    // Login / registro / logout
    $('#loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    $('#registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    $('#linkToRegister').addEventListener('click', (e) => { e.preventDefault(); this._showAuthMode('register'); });
    $('#linkToLogin').addEventListener('click', (e) => { e.preventDefault(); this._showAuthMode('login'); });
    $('#btnLogout').addEventListener('click', () => this.handleLogout());
    $('#btnTheme').addEventListener('click', () => this.toggleTheme());
    this._updateThemeIcon();

    // Perfil de usuario
    const profileTrigger = $('#btnProfile');
    profileTrigger.addEventListener('click', () => this.openProfileModal());
    profileTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openProfileModal();
      }
    });
    $('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveProfile();
    });
    $('#profileName').addEventListener('input', () => this._refreshProfilePreview());
    $('#profileInitial').addEventListener('input', () => this._refreshProfilePreview());
    $('#profileAvatarBtn').addEventListener('click', () => $('#profileAvatarInput').click());
    $('#profileAvatarInput').addEventListener('change', (e) => this._onAvatarPicked(e));
    $('#profileSoundToggle').addEventListener('change', (e) => {
      setSoundEnabled(e.target.checked);
      // Si lo acaban de activar, una previa de cortesía.
      if (e.target.checked) playCompleteSound();
    });
    $('#profileNotifBtn').addEventListener('click', async () => {
      const result = await requestBrowserNotifPermission();
      this._refreshNotifBtnState();
      if (result === 'granted') {
        new Notification('SyncStudy', {
          body: 'Listo. Te avisaré cuando una tarea esté por vencer.'
        });
      } else if (result === 'denied') {
        showToast('El navegador rechazó la notificación', 'alert-circle');
      }
    });
    $$('#profileColorSwatches .color-swatch').forEach(sw => {
      sw.addEventListener('click', () => this._selectProfileColor(sw.dataset.color));
    });
    $$('#profileModal [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeProfileModal());
    });
    $('#profileModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__backdrop')) this.closeProfileModal();
    });

    // Switcher de grupo (sidebar)
    $('#groupSwitcherTrigger').addEventListener('click', () => this._toggleGroupSwitcher());
    $('#groupSwitcherList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-group-id]');
      if (!btn) return;
      const id = btn.dataset.groupId;
      this._closeGroupSwitcher();
      if (id === '__new__') {
        this.openGroupModal();
      } else {
        Storage.setCurrentGroupId(id || null);
        Views.renderAll();
      }
    });
    // Cerrar el switcher al hacer click fuera
    document.addEventListener('click', (e) => {
      const sw = $('#groupSwitcher');
      if (sw && !sw.contains(e.target)) this._closeGroupSwitcher();
    });

    // Modal Crear/Unirse a grupo
    $$('#groupModal .group-modal__tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchGroupTab(tab.dataset.tab));
    });
    $('#joinGroupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleJoinGroup();
    });
    $('#createGroupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateGroup();
    });
    $$('#groupModal [data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeGroupModal());
    });
    $('#groupModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__backdrop')) this.closeGroupModal();
    });

    // Copiar invite code al portapapeles
    $('#groupInviteCode').addEventListener('click', () => this.handleCopyInviteCode());

    // Navegación entre vistas
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeView(btn.dataset.view);
      });
    });

    // Links internos "ir a vista"
    $$('[data-go-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeView(btn.dataset.goView);
      });
    });

    // Botón "Nueva tarea"
    $('#btnNewTask').addEventListener('click', () => this.openTaskModal());

    // Modal
    $$('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeTaskModal());
    });

    // Formulario de tarea
    $('#taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveTask();
    });

    // Botón eliminar
    $('#btnDeleteTask').addEventListener('click', () => this.handleDeleteTask());

    // Composer de comentarios (submit + Cmd/Ctrl+Enter)
    $('#taskCommentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePostComment();
    });
    $('#taskCommentInput').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handlePostComment();
      }
    });

    // Navegación del calendario
    $('#calPrev').addEventListener('click', () => this.calendarNav(-1));
    $('#calNext').addEventListener('click', () => this.calendarNav(1));

    // Cambio entre semana / mes
    $$('[data-cal-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-cal-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calendarState.mode = btn.dataset.calMode;
        calendarState.anchorDate = new Date();
        calendarState.zoomDate = null;
        Views._hideCalTooltip();
        Views.renderCalendar();
      });
    });

    // Menú móvil
    $('#menuToggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
    });

    // Cerrar sidebar al hacer click en una opción (móvil)
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          $('#sidebar').classList.remove('open');
        }
      });
    });

    // Cerrar cualquier modal/overlay abierto con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTaskModal();
        this.closeProfileModal();
        if (calendarState.zoomDate) this.closeDayZoom();
      }
    });

    // Click fuera del modal cierra
    $('#taskModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__backdrop')) {
        this.closeTaskModal();
      }
    });
  },

  // ============================================
  // NAVEGACIÓN DE VISTAS
  // ============================================
  changeView(viewName) {
    this.currentView = viewName;
    // Cualquier tooltip del calendario debe limpiarse al salir de la vista.
    Views._hideCalTooltip();

    // Activar nav
    $$('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Mostrar vista
    $$('.view').forEach(v => {
      v.classList.toggle('active', v.dataset.view === viewName);
    });

    // Título de la barra superior
    const titles = {
      today: 'Hoy',
      calendar: 'Calendario',
      group: 'Mi grupo',
      weekly: 'Resumen semanal'
    };
    $('#topbarTitle').textContent = titles[viewName] || '';

    // Re-renderizar la vista activa
    if (viewName === 'today') Views.renderToday();
    else if (viewName === 'calendar') Views.renderCalendar();
    else if (viewName === 'group') Views.renderGroup();
    else if (viewName === 'weekly') Views.renderWeekly();
  },

  // ============================================
  // MODAL DE TAREA
  // ============================================
  openTaskModal(taskId = null) {
    const modal = $('#taskModal');
    const form = $('#taskForm');
    const readonlyView = $('#taskReadonlyView');
    const title = $('#modalTitle');
    const commentsSection = $('#taskComments');

    form.reset();
    $('#taskId').value = '';
    this._currentTaskModalId = null;

    if (taskId) {
      const task = Storage.getTask(taskId);
      if (!task) return;

      const me = Storage.getState().currentUserId;
      const isMine = task.userId === me;
      this._currentTaskModalId = task.id;

      if (isMine) {
        // Modo edición: form visible, vista readonly oculta.
        readonlyView.hidden = true;
        form.hidden = false;
        title.textContent = 'Editar tarea';
        $('#taskId').value = task.id;
        $('#taskTitle').value = task.title;
        $('#taskDescription').value = task.description || '';
        $('#taskDate').value = formatDateForInput(task.dueDate);
        $('#taskSubject').value = task.subject || 'General';
        const radio = document.querySelector(`input[name="priority"][value="${task.priority}"]`);
        if (radio) radio.checked = true;
        // Toggle de completada visible solo al editar (no al crear).
        $('#taskCompleteToggle').hidden = false;
        $('#taskCompleted').checked = !!task.completed;
        $('#taskCompleteHint').textContent = isOverdue(task)
          ? 'Esta tarea está vencida; quedará marcada como "completada tarde".'
          : 'Cierra el ciclo de la tarea.';
      } else {
        // Tarea de un compañero: solo título + meta + comentarios. Sin form.
        form.hidden = true;
        readonlyView.hidden = false;
        const author = Storage.getUser(task.userId);
        const group = Storage.getMyGroups().find(g => g.id === task.groupId);
        title.textContent = author
          ? `Tarea de ${author.name.split(' ')[0]}`
          : 'Tarea del grupo';
        const titleEl = $('#readonlyTitle');
        titleEl.textContent = task.title;
        titleEl.classList.toggle('completed', !!task.completed);

        const meta = $('#readonlyMeta');
        meta.innerHTML = '';
        if (author) {
          meta.appendChild(el('span', { class: 'task-readonly__meta-item' }, [
            el('div', {
              class: 'user-avatar task-comment__avatar',
              style: `background: ${author.color}; width:20px; height:20px; font-size:11px;`
            }, author.initial),
            el('span', { class: 'task-readonly__author' }, author.name)
          ]));
        }
        meta.appendChild(el('span', { class: 'task-readonly__meta-item' }, [
          el('i', { 'data-lucide': 'calendar' }),
          formatLongDate(task.dueDate)
        ]));
        if (task.subject) {
          meta.appendChild(el('span', { class: 'task-readonly__meta-item' }, [
            el('i', { 'data-lucide': 'tag' }),
            task.subject
          ]));
        }
        if (group) {
          meta.appendChild(el('span', { class: 'task-readonly__meta-item' }, [
            el('i', { 'data-lucide': 'users' }),
            group.name
          ]));
        }
        meta.appendChild(el('span', {
          class: `priority-pill priority-pill--${priorityClass(task.priority)}`
        }, priorityLabel(task.priority)));
        meta.appendChild(el('span', {
          class: 'task-readonly__meta-item',
          style: `color: ${task.completed ? 'var(--color-success)' : 'var(--color-warning)'}; font-weight: 500;`
        }, task.completed ? '✓ Completada' : 'Pendiente'));

        const desc = $('#readonlyDesc');
        if (task.description) {
          desc.textContent = task.description;
          desc.hidden = false;
        } else {
          desc.hidden = true;
        }
      }

      commentsSection.hidden = false;
      this._renderTaskComments(task.id);
    } else {
      // Crear tarea nueva: form visible, sin comentarios (la tarea aún no existe).
      readonlyView.hidden = true;
      form.hidden = false;
      title.textContent = 'Nueva tarea';
      $('#taskDate').value = formatDateForInput(new Date());
      $('#btnDeleteTask').hidden = true;
      $('#taskCompleteToggle').hidden = true;
      $('#taskCompleted').checked = false;
      commentsSection.hidden = true;
    }

    // Si es edición de tarea propia, el botón Eliminar está visible.
    if (taskId && Storage.getTask(taskId)?.userId === Storage.getState().currentUserId) {
      $('#btnDeleteTask').hidden = false;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      if (!form.hidden) $('#taskTitle').focus();
      else $('#taskCommentInput').focus();
    }, 100);
    refreshIcons();
  },

  closeTaskModal() {
    const modal = $('#taskModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    this._currentTaskModalId = null;
    // Reset: la próxima apertura debe tener form visible y readonly oculto.
    $('#taskForm').hidden = false;
    $('#taskReadonlyView').hidden = true;
  },

  // ============================================
  // ACCIONES DE TAREA
  // ============================================
  async handleSaveTask() {
    // Defensa: si el modal está mostrando una tarea ajena no debería ni
    // llegar acá (el form está oculto), pero por las dudas cortamos antes
    // de tocar el backend.
    if (this._currentTaskModalId) {
      const cur = Storage.getTask(this._currentTaskModalId);
      if (cur && cur.userId !== Storage.getState().currentUserId) {
        showToast('No puedes modificar tareas de compañeros', 'info');
        return;
      }
    }

    const id = $('#taskId').value;
    const title = $('#taskTitle').value.trim();
    const description = $('#taskDescription').value.trim();
    const dateStr = $('#taskDate').value;
    const subject = $('#taskSubject').value;
    const priority = parseInt(
      document.querySelector('input[name="priority"]:checked')?.value || 2,
      10
    );

    if (!title || !dateStr) {
      showToast('Falta título o fecha', 'alert-circle');
      return;
    }

    const dueDate = parseDateFromInput(dateStr);

    try {
      if (id) {
        // El checkbox del modal permite completar/reabrir desde acá.
        const completed = $('#taskCompleted').checked;
        const before = Storage.getTask(id);
        Storage.updateTask(id, { title, description, dueDate, subject, priority, completed });
        if (completed && before && !before.completed) {
          playCompleteSound();
        }
        showToast('Tarea actualizada', 'check');
      } else {
        await Storage.createTask({ title, description, dueDate, subject, priority });
        showToast('Tarea creada', 'check');
      }
    } catch (err) {
      console.error('Guardar tarea falló:', err);
      showToast('No se pudo guardar la tarea', 'alert-circle');
      return;
    }

    this.closeTaskModal();
    Views.renderAll();
  },

  handleDeleteTask() {
    const id = $('#taskId').value;
    if (!id) return;
    const task = Storage.getTask(id);
    // Defensa: solo el dueño puede borrar (el backend ya bloquea con su
    // updateRule, pero en la UI tampoco debería ofrecerlo).
    if (!task || task.userId !== Storage.getState().currentUserId) {
      showToast('Solo puedes eliminar tus propias tareas', 'info');
      return;
    }
    if (!confirm('¿Eliminar esta tarea?')) return;

    Storage.deleteTask(id);
    this.closeTaskModal();
    showToast('Tarea eliminada', 'trash-2');
    Views.renderAll();
  },

  // ============================================
  // COMENTARIOS
  // ============================================

  _renderTaskComments(taskId) {
    const list = $('#taskCommentsList');
    list.innerHTML = '';
    const comments = Storage.getCommentsForTask(taskId);
    const meId = Storage.getState().currentUserId;

    if (comments.length === 0) {
      list.appendChild(el('div', { class: 'task-comments__empty' },
        'Aún no hay comentarios. Sé el primero.'));
      return;
    }

    comments.forEach(c => {
      const author = Storage.getUser(c.authorId);
      const isMine = c.authorId === meId;
      const headerChildren = [
        el('span', { class: 'task-comment__author' },
          author ? (isMine ? `${author.name.split(' ')[0]} (tú)` : author.name) : 'Anónimo'),
        el('span', { class: 'task-comment__time' }, relativeTime(c.createdAt))
      ];
      if (isMine) {
        headerChildren.push(el('button', {
          type: 'button',
          class: 'task-comment__delete',
          'aria-label': 'Borrar comentario',
          onClick: () => this.handleDeleteComment(c.id)
        }, el('i', { 'data-lucide': 'x' })));
      }
      list.appendChild(el('article', { class: 'task-comment' }, [
        el('div', {
          class: 'user-avatar task-comment__avatar',
          style: `background: ${author ? author.color : '#9ca3af'}`
        }, author ? author.initial : '?'),
        el('div', { class: 'task-comment__body' }, [
          el('header', { class: 'task-comment__header' }, headerChildren),
          el('p', { class: 'task-comment__text' }, c.body)
        ])
      ]));
    });

    refreshIcons();
    // Mantener scroll al final para ver el último comentario
    list.scrollTop = list.scrollHeight;
  },

  /** Si el modal de tarea está abierto, re-renderiza los comentarios. */
  _renderTaskCommentsIfOpen() {
    if (this._currentTaskModalId) {
      this._renderTaskComments(this._currentTaskModalId);
    }
  },

  async handlePostComment() {
    const taskId = this._currentTaskModalId;
    if (!taskId) return;
    const input = $('#taskCommentInput');
    const body = input.value.trim();
    if (!body) return;

    input.disabled = true;
    try {
      await Storage.addComment(taskId, body);
      input.value = '';
      this._renderTaskComments(taskId);
    } catch (err) {
      console.error('addComment falló:', err);
      showToast('No se pudo publicar el comentario', 'alert-circle');
    } finally {
      input.disabled = false;
      input.focus();
    }
  },

  async handleDeleteComment(commentId) {
    if (!confirm('¿Borrar este comentario?')) return;
    try {
      await Storage.deleteComment(commentId);
      if (this._currentTaskModalId) {
        this._renderTaskComments(this._currentTaskModalId);
      }
    } catch (err) {
      console.error('deleteComment falló:', err);
      showToast(err.message || 'No se pudo borrar el comentario', 'alert-circle');
    }
  },

  handleToggleTask(taskId) {
    const task = Storage.getTask(taskId);
    if (!task) return;

    // No togglear tareas de compañeros desde la vista del usuario
    if (task.userId !== Storage.getState().currentUserId) {
      showToast('No puedes modificar tareas de compañeros', 'info');
      return;
    }

    const updated = Storage.toggleTask(taskId);
    if (updated.completed) playCompleteSound();
    showToast(
      updated.completed ? '¡Tarea completada!' : 'Tarea reabierta',
      updated.completed ? 'check-circle-2' : 'rotate-ccw'
    );
    Views.renderAll();
  },

  // ============================================
  // NAVEGACIÓN DEL CALENDARIO
  // ============================================
  calendarNav(direction) {
    // Si estamos en el zoom del Mes, navegar entre días vecinos en lugar de meses.
    if (calendarState.mode === 'month' && calendarState.zoomDate) {
      calendarState.zoomDate = addDays(calendarState.zoomDate, direction);
      Views.renderCalendar();
      return;
    }
    if (calendarState.mode === 'week') {
      calendarState.anchorDate = addDays(calendarState.anchorDate, direction * 7);
    } else {
      const d = new Date(calendarState.anchorDate);
      d.setMonth(d.getMonth() + direction);
      calendarState.anchorDate = d;
    }
    Views.renderCalendar();
  },

  // ============================================
  // ZOOM DE DÍA (vista Mes)
  // ============================================
  openDayZoom(day) {
    calendarState.zoomDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    Views._hideCalTooltip();
    Views.renderCalendar();
  },

  closeDayZoom() {
    if (!calendarState.zoomDate) return;
    // Volver al mes que contenía ese día.
    calendarState.anchorDate = new Date(calendarState.zoomDate);
    calendarState.zoomDate = null;
    Views.renderCalendar();
  }
};

// ============================================
// ARRANQUE DE LA APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  App.init();
});
