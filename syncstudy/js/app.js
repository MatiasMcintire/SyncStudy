/* ============================================ */
/* APP PRINCIPAL — orquestación e interacción    */
/* ============================================ */

const App = {
  currentView: 'today',

  init() {
    // 1. Inicializa storage (carga datos seed si es primera vez)
    Storage.init();

    // 2. Renderiza todas las vistas
    Views.renderAll();

    // 3. Conecta eventos
    this.bindEvents();

    // 4. Inicia simulación de actividad del grupo (sensación de "en vivo")
    startPeerSimulation(() => Views.renderAll());

    // 5. Muestra toast de bienvenida después de un instante
    setTimeout(() => {
      showToast('Bienvenido a SyncStudy', 'sparkles');
    }, 600);
  },

  // ============================================
  // EVENTOS
  // ============================================
  bindEvents() {
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

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeTaskModal();
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
    const title = $('#modalTitle');
    const deleteBtn = $('#btnDeleteTask');

    form.reset();
    $('#taskId').value = '';

    if (taskId) {
      const task = Storage.getTask(taskId);
      if (!task) return;

      // No editar tareas de compañeros
      if (task.userId !== Storage.getState().currentUserId) {
        showToast('Solo puedes editar tus propias tareas', 'info');
        return;
      }

      title.textContent = 'Editar tarea';
      $('#taskId').value = task.id;
      $('#taskTitle').value = task.title;
      $('#taskDescription').value = task.description || '';
      $('#taskDate').value = formatDateForInput(task.dueDate);
      $('#taskSubject').value = task.subject || 'General';
      const radio = document.querySelector(`input[name="priority"][value="${task.priority}"]`);
      if (radio) radio.checked = true;
      deleteBtn.hidden = false;
    } else {
      title.textContent = 'Nueva tarea';
      $('#taskDate').value = formatDateForInput(new Date());
      deleteBtn.hidden = true;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#taskTitle').focus(), 100);
    refreshIcons();
  },

  closeTaskModal() {
    const modal = $('#taskModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  },

  // ============================================
  // ACCIONES DE TAREA
  // ============================================
  handleSaveTask() {
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

    if (id) {
      Storage.updateTask(id, { title, description, dueDate, subject, priority });
      showToast('Tarea actualizada', 'check');
    } else {
      Storage.createTask({ title, description, dueDate, subject, priority });
      showToast('Tarea creada', 'check');
    }

    this.closeTaskModal();
    Views.renderAll();
  },

  handleDeleteTask() {
    const id = $('#taskId').value;
    if (!id) return;

    if (!confirm('¿Eliminar esta tarea?')) return;

    Storage.deleteTask(id);
    this.closeTaskModal();
    showToast('Tarea eliminada', 'trash-2');
    Views.renderAll();
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
    if (calendarState.mode === 'week') {
      calendarState.anchorDate = addDays(calendarState.anchorDate, direction * 7);
    } else {
      const d = new Date(calendarState.anchorDate);
      d.setMonth(d.getMonth() + direction);
      calendarState.anchorDate = d;
    }
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
