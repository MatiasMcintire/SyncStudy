/* ============================================ */
/* RENDERIZADO DE VISTAS                          */
/* ============================================ */

/**
 * Cada función render___ se encarga de pintar una vista.
 * Todas leen el estado actual desde Storage y reconstruyen el DOM.
 *
 * Patrón intencional: simple > performante. Para un MVP, re-renderizar
 * todo es más mantenible y rápido de construir que un sistema de diffs.
 */

let calendarState = {
  mode: 'week',          // 'week' o 'month'
  anchorDate: new Date(), // fecha de referencia para nav
  zoomDate: null          // si está activo el zoom del Mes, qué día (Date) se está mirando
};

// Estado interno del tooltip flotante del Mes (no se persiste).
const _calTooltip = {
  el: null,
  showTimer: null,
  visible: false
};

// Ilustraciones SVG para estados vacíos. Usan rgba de marca para verse bien
// tanto en modo claro como oscuro.
const ILLUS = {
  done: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="42" fill="rgba(34,197,94,0.14)"/><path d="M42 61 l13 13 l25 -28" stroke="#22C55E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="97" cy="33" r="5" fill="#22C55E" opacity="0.55"/><circle cx="24" cy="42" r="4" fill="#22C55E" opacity="0.45"/><circle cx="33" cy="93" r="3.5" fill="#22C55E" opacity="0.4"/></svg>`,
  activity: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="44" fill="rgba(139,92,246,0.12)"/><circle cx="48" cy="52" r="13" fill="#8B5CF6"/><path d="M28 86 a20 20 0 0 1 40 0 z" fill="#8B5CF6"/><circle cx="78" cy="56" r="11" fill="#A78BFA"/><path d="M61 86 a17 17 0 0 1 34 0 z" fill="#A78BFA"/></svg>`,
  week: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="42" fill="rgba(99,102,241,0.13)"/><rect x="40" y="64" width="11" height="20" rx="3" fill="#6366F1" opacity="0.55"/><rect x="55" y="50" width="11" height="34" rx="3" fill="#6366F1"/><rect x="70" y="58" width="11" height="26" rx="3" fill="#6366F1" opacity="0.8"/></svg>`,
  calendar: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="42" fill="rgba(99,102,241,0.12)"/><rect x="38" y="42" width="44" height="42" rx="9" fill="#6366F1"/><rect x="38" y="42" width="44" height="14" rx="9" fill="#4F46E5"/><rect x="48" y="36" width="6" height="12" rx="3" fill="#4F46E5"/><rect x="66" y="36" width="6" height="12" rx="3" fill="#4F46E5"/><rect x="50" y="66" width="20" height="5" rx="2.5" fill="#ffffff" opacity="0.9"/></svg>`
};

const Views = {
  // ============================================
  // VISTA HOY
  // ============================================
  renderToday() {
    const user = Storage.getCurrentUser();
    if (!user) return;
    const myTasks = Storage.getTasksByUser(user.id);
    const members = Storage.getGroupMembers();
    const group = Storage.getGroup();

    // ---------- SALUDO + FECHA ----------
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#todayDate').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    $('#todayGreeting').textContent = `${getGreeting()}, ${user.name.split(' ')[0]}.`;

    // ---------- STRIP DE SEMANA ----------
    this._renderWeekStrip(now);

    // ---------- HOY: tareas (atrasadas → hoy → próximas) + notas de hoy ----------
    // Las notas/recordatorios no son pendientes: no se completan ni cuentan acá.
    const tasksOnly = myTasks.filter(t => t.type !== 'note');
    const overdue = tasksOnly.filter(t => isOverdue(t)).sort((a, b) => a.dueDate - b.dueDate);
    const todayPending = tasksOnly.filter(t => isToday(t.dueDate) && !t.completed).sort((a, b) => b.priority - a.priority);
    const upcoming = tasksOnly
      .filter(t => !t.completed && !isOverdue(t) && !isToday(t.dueDate))
      .sort((a, b) => a.dueDate - b.dueDate);
    const top = [...overdue, ...todayPending, ...upcoming].slice(0, 5);
    const pending = tasksOnly.filter(t => !t.completed).length;
    $('#todayCount').textContent = `Pendientes (${pending})`;

    const todayNotes = myTasks.filter(t => t.type === 'note' && isToday(t.dueDate));

    const list = $('#todayTaskList');
    list.innerHTML = '';
    if (top.length === 0 && todayNotes.length === 0) {
      list.appendChild(this._emptyState('done', '¡Sin pendientes!', 'Estás al día.'));
    } else {
      top.forEach(task => list.appendChild(this._renderHoyTaskRow(task)));
      todayNotes.forEach(note => list.appendChild(this._renderHoyNoteRow(note)));
    }

    // ---------- TU GRUPO ----------
    this._renderHoyGroup(group, members);

    refreshIcons();
  },

  _emptyState(key, title, text) {
    return el('div', { class: 'empty-state empty-state--rich' }, [
      el('div', { class: 'empty-illus', html: ILLUS[key] || ILLUS.done }),
      el('div', { class: 'empty-state__title' }, title),
      text ? el('div', { class: 'empty-state__text' }, text) : null
    ]);
  },

  // Strip de los 7 días de la semana actual (lunes→domingo), hoy resaltado.
  _renderWeekStrip(now) {
    const strip = $('#weekStrip');
    strip.innerHTML = '';
    const dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const monday = startOfWeek(now);
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      strip.append(el('div', { class: 'weekstrip__day' + (isSameDay(d, now) ? ' is-today' : '') }, [
        el('span', { class: 'weekstrip__dow' }, dows[i]),
        el('span', { class: 'weekstrip__num' }, String(d.getDate()).padStart(2, '0'))
      ]));
    }
  },

  // Fila de tarea reglada (editorial): barra de prioridad + checkbox + cuerpo + estado.
  _renderHoyTaskRow(task) {
    const done = task.completed;
    const overdue = isOverdue(task);
    const pcls = priorityClass(task.priority);
    const subject = (task.subject && task.subject !== 'General') ? task.subject : 'Tarea';

    const check = el('button', {
      class: 'rl-item__check' + (done ? ' is-checked' : ''),
      'aria-label': done ? 'Marcar como pendiente' : 'Completar tarea',
      onClick: (e) => { e.stopPropagation(); App.handleToggleTask(task.id); }
    }, done ? [el('i', { 'data-lucide': 'check' })] : []);

    let right;
    if (done) right = el('span', { class: 'rl-item__tag rl-item__tag--done' }, 'Hecho');
    else if (overdue) right = el('span', { class: 'rl-item__tag rl-item__tag--overdue' }, 'Vencida');
    else right = el('span', { class: 'rl-item__when' }, relativeDate(task.dueDate));

    const row = el('div', {
      class: 'rl-item' + (done ? ' is-done' : ''),
      dataset: { taskId: task.id }
    }, [
      el('span', { class: `rl-item__bar rl-item__bar--${pcls}` }),
      check,
      el('div', { class: 'rl-item__body' }, [
        el('div', { class: 'rl-item__title' }, task.title),
        el('div', { class: 'rl-item__meta' }, subject)
      ]),
      right
    ]);
    row.addEventListener('click', () => App.openTaskModal(task.id));
    return row;
  },

  // Fila de nota/recordatorio (editorial): sin checkbox, marcador en vez de check.
  _renderHoyNoteRow(note) {
    const base = (note.subject && note.subject !== 'General') ? note.subject : 'Recordatorio';
    const label = note.private ? `${base} · privada` : base;
    const row = el('div', {
      class: 'rl-item rl-item--note',
      dataset: { taskId: note.id }
    }, [
      el('span', { class: 'rl-item__bar rl-item__bar--note' }),
      el('span', { class: 'rl-item__dot', 'aria-hidden': 'true' },
        [el('i', { 'data-lucide': note.private ? 'lock' : 'bookmark' })]),
      el('div', { class: 'rl-item__body' }, [
        el('div', { class: 'rl-item__title' }, note.title),
        el('div', { class: 'rl-item__meta' }, label)
      ]),
      el('span', { class: 'rl-item__tag rl-item__tag--note' }, 'Nota')
    ]);
    row.addEventListener('click', () => App.openTaskModal(note.id));
    return row;
  },

  // Bloque "Tu grupo": nombre, avatares, código de invitación y progreso.
  _renderHoyGroup(group, members) {
    const section = $('#hoyGroupSection');
    if (!group) { section.hidden = true; return; }
    section.hidden = false;

    $('#groupCount').textContent = `Miembros (${members.length})`;
    $('#hoyGroupName').textContent = group.name;

    const stack = $('#hoyGroupAvatars');
    stack.innerHTML = '';
    members.slice(0, 4).forEach(m =>
      stack.append(el('span', { class: 'av', style: `background:${avatarColor(m)}` }, m.initial)));
    if (members.length > 4) stack.append(el('span', { class: 'av av--more' }, `+${members.length - 4}`));

    $('#hoyInviteCode').textContent = group.inviteCode || '——————';

    // Progreso del grupo: tareas de la semana (hechas / total). Sin %, sin "faltan".
    const week = Storage.getAllTasks().filter(t => t.type !== 'note' && isThisWeek(t.dueDate));
    const done = week.filter(t => t.completed).length;
    $('#hoyProgDone').textContent = done;
    $('#hoyProgTotal').textContent = week.length;
    $('#hoyProgFill').style.width = (week.length ? (done / week.length) * 100 : 0) + '%';
  },

  // ============================================
  // ELEMENTO DE TAREA
  // ============================================
  /** Badge sutil que indica si una tarea tiene comentarios. null si no tiene. */
  _renderCommentBadge(taskId) {
    const n = Storage.getCommentCountForTask(taskId);
    if (n === 0) return null;
    return el('span', {
      class: 'comment-badge',
      title: `${n} ${n === 1 ? 'comentario' : 'comentarios'}`
    }, [
      el('i', { 'data-lucide': 'message-square' }),
      el('span', {}, String(n))
    ]);
  },

  _renderTaskItem(task) {
    const item = el('div', {
      class: 'task-item' + (task.completed ? ' completed' : ''),
      dataset: { taskId: task.id }
    });

    const checkbox = el('div', {
      class: 'task-checkbox' + (task.completed ? ' checked' : ''),
      onClick: (e) => {
        e.stopPropagation();
        App.handleToggleTask(task.id);
      }
    });

    const overdue = isOverdue(task);
    const late = isCompletedLate(task);

    const content = el('div', { class: 'task-item__content' }, [
      el('div', { class: 'task-item__title' }, task.title),
      el('div', { class: 'task-item__meta' }, [
        el('span', {
          class: 'task-item__meta-item' + (overdue ? ' is-overdue' : '')
        }, [
          el('i', { 'data-lucide': overdue ? 'alert-triangle' : 'calendar' }),
          relativeDate(task.dueDate)
        ]),
        task.subject !== 'General'
          ? el('span', { class: 'task-item__meta-item' }, [
              el('i', { 'data-lucide': 'book-open' }),
              task.subject
            ])
          : null,
        el('span', { class: `priority-pill priority-pill--${priorityClass(task.priority)}` },
          priorityLabel(task.priority)),
        overdue
          ? el('span', { class: 'status-pill status-pill--overdue' }, 'Vencida')
          : null,
        late
          ? el('span', { class: 'status-pill status-pill--late' }, 'Completada tarde')
          : null,
        this._renderCommentBadge(task.id)
      ])
    ]);

    item.appendChild(checkbox);
    item.appendChild(content);

    item.addEventListener('click', () => App.openTaskModal(task.id));

    return item;
  },

  // ============================================
  // VISTA CALENDARIO
  // ============================================
  renderCalendar() {
    const container = $('#calendarContainer');
    container.innerHTML = '';

    if (calendarState.mode === 'week') {
      this._renderWeekView(container);
    } else {
      this._renderMonthView(container);
    }

    refreshIcons();
  },

  _renderWeekView(container) {
    const start = startOfWeek(calendarState.anchorDate);
    const end = addDays(start, 6);

    $('#calendarLabel').textContent =
      `${formatDateShort(start)} – ${formatDateShort(end)}`;

    const week = el('div', { class: 'calendar-week' });

    // Calendario colaborativo: muestra todas las tareas del grupo activo
    // (o de todos mis grupos en la vista combinada).
    const tasks = Storage.getAllTasks();
    // Máximo de chips visibles por columna para mantener todas las columnas
    // a la misma altura. Lo que excede se muestra como "+N más".
    const MAX_VISIBLE = 6;

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const dayTasks = tasks
        .filter(t => isSameDay(t.dueDate, day))
        .sort((a, b) => b.priority - a.priority);

      const visible = dayTasks.slice(0, MAX_VISIBLE);
      const overflow = dayTasks.slice(MAX_VISIBLE);

      const chips = visible.map(t => {
        const author = Storage.getUser(t.userId);
        const authorName = author ? author.name : '?';
        const isNote = t.type === 'note';
        const marker = isNote
          ? el('span', { class: 'cal-task__note-mark', 'aria-hidden': 'true' },
              [el('i', { 'data-lucide': 'bookmark' })])
          : el('span', {
              class: 'cal-task__avatar',
              style: `background: ${avatarColor(author)}`
            }, author ? author.initial : '?');
        return el('div', {
          class: 'cal-task ' + (isNote ? 'cal-task--note' : priorityClass(t.priority))
            + (t.completed ? ' completed' : '')
            + (author && author.isMe ? ' is-mine' : ''),
          onClick: (e) => { e.stopPropagation(); App.openTaskModal(t.id); },
          title: `${t.title} · ${authorName}`
        }, [
          marker,
          el('span', { class: 'cal-task__title' }, t.title),
          this._renderCommentBadge(t.id)
        ]);
      });

      if (overflow.length > 0) {
        chips.push(el('div', {
          class: 'cal-day__overflow',
          title: overflow.map(t => `• ${t.title}`).join('\n')
        }, `+${overflow.length} más`));
      }

      const dayEl = el('div', {
        class: 'cal-day' + (isToday(day.getTime()) ? ' today' : ''),
        // Click en la columna → zoom del día (igual que en la vista Mes).
        onClick: () => App.openDayZoom(day),
        title: 'Ver el día'
      }, [
        el('div', { class: 'cal-day__header' }, [
          el('span', { class: 'cal-day__name' }, WEEKDAYS_SHORT[day.getDay()]),
          el('span', { class: 'cal-day__number' }, String(day.getDate()))
        ]),
        el('div', { class: 'cal-day__tasks' }, chips)
      ]);

      week.appendChild(dayEl);
    }

    container.appendChild(week);
  },

  _renderMonthView(container) {
    if (calendarState.zoomDate) {
      this._renderDayZoom(container, calendarState.zoomDate);
    } else {
      this._renderMonthGrid(container);
    }
  },

  _renderMonthGrid(container) {
    const anchor = calendarState.anchorDate;
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    $('#calendarLabel').textContent = `${MONTHS[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const startDate = startOfWeek(firstDay);

    const tasks = Storage.getAllTasks();
    const monthContainer = el('div', { class: 'calendar-month' });

    // Encabezados de días de la semana
    const weekdaysHeader = el('div', { class: 'cal-month__weekdays' });
    for (let i = 0; i < 7; i++) {
      weekdaysHeader.appendChild(
        el('div', { class: 'cal-month__weekday' }, WEEKDAYS_SHORT[(i + 1) % 7])
      );
    }
    monthContainer.appendChild(weekdaysHeader);

    const grid = el('div', { class: 'cal-month__grid' });

    for (let i = 0; i < 42; i++) {
      const day = addDays(startDate, i);
      const dayTs = day.getTime();
      const isCurrentMonth = day.getMonth() === month;
      const dayTasks = tasks
        .filter(t => isSameDay(t.dueDate, day))
        .sort((a, b) => b.priority - a.priority);
      const hasTasks = dayTasks.length > 0;

      const dots = dayTasks.slice(0, 4).map(t => {
        const author = Storage.getUser(t.userId);
        if (t.type === 'note') {
          return el('span', { class: 'cal-month__dot cal-month__dot--note' });
        }
        return el('span', {
          class: 'cal-month__dot' + (t.completed ? ' completed' : ''),
          style: `background: ${avatarColor(author)}`
        });
      });

      const dayCell = el('div', {
        class: 'cal-month__day' +
               (!isCurrentMonth ? ' muted' : '') +
               (isToday(dayTs) ? ' today' : '') +
               (hasTasks ? ' has-tasks' : ''),
        // Sólo días con tareas son interactivos (click / hover).
        onClick: hasTasks ? () => App.openDayZoom(day) : null,
        onMouseenter: hasTasks ? (e) => Views._showCalTooltip(e.currentTarget, day, dayTasks) : null,
        onMouseleave: hasTasks ? () => Views._hideCalTooltip() : null
      }, [
        el('span', { class: 'cal-month__day-number' }, String(day.getDate())),
        el('div', { class: 'cal-month__day-tasks' }, dots),
        dayTasks.length > 4
          ? el('span', { class: 'cal-month__overflow' }, `+${dayTasks.length - 4} más`)
          : null
      ]);

      grid.appendChild(dayCell);
    }

    monthContainer.appendChild(grid);
    container.appendChild(monthContainer);
  },

  _renderDayZoom(container, day) {
    const tasks = Storage.getAllTasks()
      .filter(t => isSameDay(t.dueDate, day))
      .sort((a, b) => {
        // No completadas primero, luego por prioridad descendente
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.priority - a.priority;
      });

    // Etiqueta del breadcrumb del topbar del calendario (no cambia, pero
    // sí actualizamos el "calendarLabel" para que se vea el contexto).
    $('#calendarLabel').textContent = formatLongDate(day);

    const zoom = el('div', { class: 'cal-day-zoom' });

    // Header del zoom: botón volver + título grande
    const header = el('div', { class: 'cal-day-zoom__header' }, [
      el('button', {
        type: 'button',
        class: 'cal-day-zoom__back',
        onClick: () => App.closeDayZoom()
      }, [
        el('i', { 'data-lucide': 'arrow-left' }),
        el('span', {}, calendarState.zoomReturnMode === 'week' ? 'Volver a la semana' : 'Volver al mes')
      ]),
      el('div', { class: 'cal-day-zoom__title-block' }, [
        el('h3', { class: 'cal-day-zoom__title' }, formatLongDate(day)),
        el('p', { class: 'cal-day-zoom__subtitle' },
          `${tasks.length} ${tasks.length === 1 ? 'actividad' : 'actividades'}`)
      ])
    ]);
    zoom.appendChild(header);

    // Lista de tareas con detalle completo
    const list = el('div', { class: 'cal-day-zoom__list' });
    if (tasks.length === 0) {
      list.appendChild(this._emptyState('calendar', 'Día libre', 'No hay tareas para este día.'));
    } else {
      tasks.forEach(t => {
        const author = Storage.getUser(t.userId);
        const group = Storage.getMyGroups().find(g => g.id === t.groupId);
        list.appendChild(this._renderZoomTaskItem(t, author, group));
      });
    }
    zoom.appendChild(list);

    container.appendChild(zoom);
  },

  _renderZoomTaskItem(t, author, group) {
    const isNote = t.type === 'note';
    const marker = isNote
      ? el('div', { class: 'cal-day-zoom__avatar cal-day-zoom__avatar--note', 'aria-hidden': 'true' },
          [el('i', { 'data-lucide': 'bookmark' })])
      : el('div', {
          class: 'cal-day-zoom__avatar',
          style: `background: ${avatarColor(author)}`
        }, author ? author.initial : '?');

    const tag = isNote
      ? el('span', { class: 'cal-day-zoom__tag-note' }, 'Nota')
      : el('span', { class: `priority-pill priority-pill--${priorityClass(t.priority)}` }, priorityLabel(t.priority));

    return el('article', {
      class: 'cal-day-zoom__task ' + (isNote ? 'cal-day-zoom__task--note' : priorityClass(t.priority))
        + (t.completed ? ' completed' : ''),
      onClick: () => App.openTaskModal(t.id)
    }, [
      marker,
      el('div', { class: 'cal-day-zoom__content' }, [
        el('div', { class: 'cal-day-zoom__top' }, [
          el('h4', { class: 'cal-day-zoom__task-title' }, t.title),
          tag
        ]),
        el('div', { class: 'cal-day-zoom__meta' }, [
          el('span', { class: 'cal-day-zoom__author' },
            (author ? (author.isMe ? `${author.name} (tú)` : author.name) : 'Autor desconocido')),
          group
            ? el('span', { class: 'cal-day-zoom__group' }, [
                el('i', { 'data-lucide': 'users' }), group.name
              ])
            : null,
          isNote
            ? null
            : el('span', { class: 'cal-day-zoom__status' + (t.completed ? ' completed' : '') },
                t.completed ? '✓ Completada' : 'Pendiente'),
          this._renderCommentBadge(t.id)
        ]),
        t.description
          ? el('p', { class: 'cal-day-zoom__desc' }, t.description)
          : null
      ])
    ]);
  },

  // ----- Tooltip flotante de la vista Mes -----

  _showCalTooltip(dayEl, day, tasks) {
    const tip = $('#calendarTooltip');
    if (!_calTooltip.el) _calTooltip.el = tip;
    if (_calTooltip.showTimer) clearTimeout(_calTooltip.showTimer);

    _calTooltip.showTimer = setTimeout(() => {
      tip.innerHTML = '';
      tip.appendChild(el('div', { class: 'cal-tooltip__date' },
        formatLongDate(day)));
      const ul = el('ul', { class: 'cal-tooltip__list' });
      tasks.slice(0, 8).forEach(t => {
        const author = Storage.getUser(t.userId);
        const bullet = t.type === 'note'
          ? el('span', { class: 'cal-tooltip__bullet cal-tooltip__bullet--note' })
          : el('span', { class: 'cal-tooltip__bullet', style: `background: ${avatarColor(author)}` });
        ul.appendChild(el('li', {
          class: 'cal-tooltip__item' + (t.completed ? ' completed' : '')
        }, [
          bullet,
          el('span', { class: 'cal-tooltip__title' }, t.title)
        ]));
      });
      if (tasks.length > 8) {
        ul.appendChild(el('li', { class: 'cal-tooltip__more' },
          `+${tasks.length - 8} más`));
      }
      tip.appendChild(ul);

      tip.hidden = false;
      _calTooltip.visible = true;
      this._positionCalTooltip(dayEl, tip);
    }, 250);
  },

  _hideCalTooltip() {
    if (_calTooltip.showTimer) {
      clearTimeout(_calTooltip.showTimer);
      _calTooltip.showTimer = null;
    }
    if (_calTooltip.visible && _calTooltip.el) {
      _calTooltip.el.hidden = true;
      _calTooltip.visible = false;
    }
  },

  _positionCalTooltip(dayEl, tip) {
    const rect = dayEl.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const margin = 8;

    // Por defecto, aparece debajo y alineado a la izquierda del día.
    let left = rect.left;
    let top = rect.bottom + margin;

    // Si se desborda por la derecha → alinear al borde derecho del día.
    if (left + tipRect.width > window.innerWidth - margin) {
      left = rect.right - tipRect.width;
    }
    if (left < margin) left = margin;

    // Si se desborda por abajo → mostrar arriba del día.
    if (top + tipRect.height > window.innerHeight - margin) {
      top = rect.top - tipRect.height - margin;
    }
    if (top < margin) top = margin;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  },

  // ============================================
  // VISTA GRUPO
  // ============================================
  renderGroup() {
    const members = Storage.getGroupMembers();
    const allTasks = Storage.getAllTasks();
    const group = Storage.getGroup();
    const myGroups = Storage.getMyGroups();

    // Header dinámico: nombre del grupo activo o vista combinada.
    if (group) {
      $('#groupHeaderName').textContent = group.name;
      $('#groupHeaderCaption').textContent =
        `${members.length} ${members.length === 1 ? 'estudiante' : 'estudiantes'} · sincronización en tiempo real`;
      $('#groupInviteCard').hidden = false;
      $('#groupInviteCodeText').textContent = group.inviteCode || '——————';
    } else {
      $('#groupHeaderName').textContent = myGroups.length > 0 ? 'Todos mis grupos' : 'Sin grupos';
      $('#groupHeaderCaption').textContent = myGroups.length > 0
        ? `${myGroups.length} ${myGroups.length === 1 ? 'grupo' : 'grupos'} · ${members.length} personas en total`
        : 'Crea un grupo o únete con un código para empezar.';
      $('#groupInviteCard').hidden = true;
    }

    // Tareas completadas esta semana en la vista actual.
    const weekDone = allTasks.filter(t => t.completed && isThisWeek(t.dueDate)).length;
    $('#groupTotalDone').textContent = weekDone;

    const container = $('#groupMembers');
    container.innerHTML = '';

    // El dueño del grupo puede expulsar miembros (menos a sí mismo).
    const meId = Storage.getState().currentUserId;
    const iAmOwner = !!(group && group.owner && group.owner === meId);

    members.forEach(member => {
      // Las notas no son tareas: fuera de los porcentajes y listas de progreso.
      const tasks = Storage.getTasksByUser(member.id).filter(t => t.type !== 'note');
      const weekTasks = tasks.filter(t => isThisWeek(t.dueDate));
      const done = weekTasks.filter(t => t.completed).length;
      const total = weekTasks.length;
      const percent = total > 0 ? (done / total) * 100 : 0;

      // Próximas tareas (top 3 pendientes o las más recientes)
      const upcomingTasks = tasks
        .filter(t => !t.completed)
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 3);

      const recentlyDone = tasks
        .filter(t => t.completed)
        .sort((a, b) => b.dueDate - a.dueDate)
        .slice(0, 2);

      const toShow = upcomingTasks.length > 0 ? upcomingTasks : recentlyDone;

      const card = el('div', {
        class: 'member-card' + (member.isMe ? ' is-me' : '')
      }, [
        el('div', { class: 'member-card__header' }, [
          el('div', {
            class: 'peer-avatar',
            style: `background: ${avatarColor(member)}`
          }, member.initial),
          el('div', {}, [
            el('div', { class: 'member-card__name' },
              member.isMe ? `${member.name} (tú)` : member.name),
            el('div', { class: 'member-card__sub' },
              `${done}/${total} tareas esta semana`)
          ]),
          (iAmOwner && member.id !== group.owner)
            ? el('button', {
                class: 'member-kick',
                title: `Expulsar a ${member.name}`,
                'aria-label': `Expulsar a ${member.name}`,
                onClick: (e) => {
                  e.stopPropagation();
                  App.handleKickMember(group.id, member.id, member.name);
                }
              }, [el('i', { 'data-lucide': 'user-minus' })])
            : null
        ]),
        el('div', { class: 'member-card__tasks' },
          toShow.length === 0
            ? [el('div', { class: 'mini-task' }, [
                el('span', {}, 'Sin tareas activas')
              ])]
            : toShow.map(t =>
                el('div', { class: 'mini-task' + (t.completed ? ' done' : '') }, [
                  el('span', { class: 'mini-task__check' }),
                  el('span', { class: 'mini-task__title' }, t.title)
                ])
              )
        ),
        el('div', { class: 'member-card__progress' }, [
          el('div', { class: 'member-card__progress-label' }, [
            el('span', {}, 'Progreso semanal'),
            el('span', {}, `${Math.round(percent)}%`)
          ]),
          el('div', { class: 'progress-bar' }, [
            el('div', {
              class: 'progress-bar__fill',
              style: `width: ${percent}%`
            })
          ])
        ])
      ]);

      container.appendChild(card);
    });

    refreshIcons();
  },

  // ============================================
  // VISTA RESUMEN SEMANAL
  // ============================================
  renderWeekly() {
    const meId = Storage.getState().currentUserId;
    const allTasks = Storage.getAllTasks();
    const members = Storage.getGroupMembers();

    // Filtramos por "completada esta semana" usando completedAt (cuando
    // realmente se cerró), no dueDate. Así una tarea atrasada que se completó
    // hoy cuenta para ESTA semana, no para la del due.
    const doneThisWeek = allTasks.filter(
      t => t.completed && t.completedAt && isThisWeek(t.completedAt)
    );
    const myDone = doneThisWeek.filter(t => t.userId === meId);
    const myOnTime = myDone.filter(t => !isCompletedLate(t));
    const myLate = myDone.filter(t => isCompletedLate(t));

    const activeDays = new Set();
    myDone.forEach(t => {
      const d = new Date(t.completedAt);
      activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    const done = myDone.length;
    const groupDone = doneThisWeek.length;

    // Dateline de la semana (a modo de antetítulo de periódico).
    const wkStart = startOfWeek(new Date());
    const wkEnd = addDays(wkStart, 6);
    $('#weeklyKicker').textContent = `${formatDateShort(wkStart)} – ${formatDateShort(wkEnd)}`;

    // Titular + bajada: los números van en prosa, no en cuadros.
    const headline = $('#weeklyHeadline');
    const deck = $('#weeklyDeck');
    if (done === 0) {
      headline.textContent = 'Tu semana recién empieza.';
      deck.textContent = 'Cuando cierres tu primera tarea, va a aparecer acá.';
    } else {
      headline.textContent = `Cerraste ${done} ${done === 1 ? 'tarea' : 'tareas'} esta semana.`;
      const parts = [];
      if (myLate.length === 0) parts.push('Todas a tiempo.');
      else if (myOnTime.length === 0) parts.push('Todas fuera de plazo.');
      else parts.push(`${myOnTime.length} a tiempo, ${myLate.length} fuera de plazo.`);
      parts.push(`Avanzaste ${activeDays.size} de 7 días.`);
      if (groupDone > done) parts.push(`El grupo cerró ${groupDone} en total.`);
      deck.textContent = parts.join(' ');
    }

    // Nota al margen: solo cuando hay algo que sugerir (tareas fuera de plazo).
    const message = $('#weeklyMessage');
    if (done > 0 && myLate.length > 0) {
      message.textContent = myOnTime.length >= myLate.length
        ? 'Vas bien. Cierra en fecha lo que puedas para no arrastrar.'
        : 'Varias se cerraron fuera de plazo. Prueba marcar la fecha apenas la conozcas.';
      message.hidden = false;
    } else {
      message.hidden = true;
    }

    this._renderWeeklyRanking(doneThisWeek, members, meId);
    this._renderWeeklyLate(doneThisWeek, members, meId);
  },

  _renderWeeklyRanking(doneThisWeek, members, meId) {
    const section = $('#weeklyRankingSection');
    const list = $('#weeklyRanking');
    if (doneThisWeek.length === 0 || members.length === 0) {
      section.hidden = false;
      list.innerHTML = '';
      list.appendChild(this._emptyState('week', 'Semana en blanco', 'Cuando completen tareas esta semana, acá aparece el ranking del grupo.'));
      return;
    }
    // Agrupar por usuario
    const byUser = new Map();
    members.forEach(m => byUser.set(m.id, { user: m, total: 0, onTime: 0 }));
    doneThisWeek.forEach(t => {
      const entry = byUser.get(t.userId);
      if (!entry) return;
      entry.total++;
      if (!isCompletedLate(t)) entry.onTime++;
    });
    const ranking = Array.from(byUser.values())
      .filter(e => e.total > 0)
      .sort((a, b) => {
        // Primero por onTime (más a tiempo gana), luego por total
        if (b.onTime !== a.onTime) return b.onTime - a.onTime;
        return b.total - a.total;
      })
      .slice(0, 5);

    if (ranking.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = '';
    ranking.forEach((entry, idx) => {
      const pct = entry.total > 0 ? Math.round((entry.onTime / entry.total) * 100) : 0;
      list.appendChild(el('li', {
        class: 'weekly__ranking-row' + (entry.user.id === meId ? ' is-me' : '')
      }, [
        el('span', { class: 'weekly__ranking-pos' }, `#${idx + 1}`),
        el('div', {
          class: 'weekly__ranking-avatar',
          style: `background: ${avatarColor(entry.user)}`
        }, entry.user.initial),
        el('div', { class: 'weekly__ranking-info' }, [
          el('div', { class: 'weekly__ranking-name' },
            entry.user.id === meId ? `${entry.user.name} (tú)` : entry.user.name),
          el('div', { class: 'weekly__ranking-stat' },
            `${entry.total} ${entry.total === 1 ? 'tarea' : 'tareas'} · ${entry.onTime} a tiempo (${pct}%)`)
        ]),
        el('div', { class: 'weekly__ranking-bar' }, [
          el('div', { class: 'weekly__ranking-bar-fill', style: `width: ${pct}%` })
        ])
      ]));
    });
  },

  _renderWeeklyLate(doneThisWeek, members, meId) {
    const section = $('#weeklyLateSection');
    const list = $('#weeklyLateList');
    const lateOnes = doneThisWeek
      .filter(t => isCompletedLate(t))
      .sort((a, b) => b.completedAt - a.completedAt);
    if (lateOnes.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = '';
    lateOnes.slice(0, 8).forEach(t => {
      const author = Storage.getUser(t.userId);
      const daysLate = Math.max(
        1,
        Math.floor((t.completedAt - new Date(t.dueDate).setHours(23, 59, 59, 999)) / 86400000)
      );
      list.appendChild(el('li', { class: 'weekly__late-item' }, [
        el('span', { class: 'weekly__late-author' }, [
          el('span', {
            class: 'weekly__late-avatar',
            style: `background: ${avatarColor(author)}`
          }, author ? author.initial : '?'),
          el('span', {}, author
            ? (author.id === meId ? 'Tú' : author.name.split(' ')[0])
            : '?')
        ]),
        el('span', { class: 'weekly__late-title' }, t.title),
        el('span', { class: 'weekly__late-delay' },
          `+${daysLate} ${daysLate === 1 ? 'día' : 'días'}`)
      ]));
    });
  },

  // ============================================
  // RENDER GLOBAL — actualiza todas las vistas
  // ============================================
  renderAll() {
    const steps = [
      ['today', () => this.renderToday()],
      ['calendar', () => this.renderCalendar()],
      ['group', () => this.renderGroup()],
      ['weekly', () => this.renderWeekly()],
      ['sidebar', () => this._updateSidebar()]
    ];
    for (const [name, fn] of steps) {
      try { fn(); } catch (err) { console.error(`render ${name} falló:`, err); }
    }
    refreshIcons();
  },

  _updateSidebar() {
    const user = Storage.getCurrentUser();
    if (!user) return;
    const group = Storage.getGroup();
    const myGroups = Storage.getMyGroups();
    $('#sidebarAvatar').textContent = user.initial;
    $('#sidebarAvatar').style.background = avatarColor(user);
    $('#sidebarUserName').textContent = user.name;
    $('#sidebarUserGroup').textContent = group
      ? group.name
      : (myGroups.length > 0 ? `Todos mis grupos · ${myGroups.length}` : 'Sin grupos');
    this._renderGroupSwitcher();
    this._updateTodayBadge();
  },

  /** Pinta el contador de pendientes urgentes (atrasadas + hoy) en el nav. */
  _updateTodayBadge() {
    const badge = $('#navTodayBadge');
    if (!badge) return;
    const s = Storage.getMyPendingSummary();
    const total = s.overdue + s.today;
    if (total === 0) {
      badge.hidden = true;
      return;
    }
    badge.hidden = false;
    badge.textContent = String(total);
    badge.classList.toggle('overdue', s.overdue > 0);
    badge.title = s.overdue > 0
      ? `${s.overdue} atrasada${s.overdue === 1 ? '' : 's'}${s.today ? ` · ${s.today} para hoy` : ''}`
      : `${s.today} para hoy`;
  },

  _renderGroupSwitcher() {
    const list = $('#groupSwitcherList');
    if (!list) return;
    const groups = Storage.getMyGroups();
    const currentId = Storage.getCurrentGroupId();
    list.innerHTML = '';

    // Opción "Todos mis grupos" sólo si hay más de uno.
    if (groups.length > 1) {
      list.appendChild(el('button', {
        type: 'button',
        class: 'group-option' + (currentId === null ? ' active' : ''),
        'data-group-id': ''
      }, [
        el('i', { 'data-lucide': 'layers' }),
        el('span', { class: 'group-option__name' }, 'Todos mis grupos')
      ]));
    }
    groups.forEach(g => {
      list.appendChild(el('button', {
        type: 'button',
        class: 'group-option' + (currentId === g.id ? ' active' : ''),
        'data-group-id': g.id
      }, [
        el('i', { 'data-lucide': 'users' }),
        el('span', { class: 'group-option__name' }, g.name)
      ]));
    });
    list.appendChild(el('button', {
      type: 'button',
      class: 'group-option group-option--new',
      'data-group-id': '__new__'
    }, [
      el('i', { 'data-lucide': 'plus' }),
      el('span', { class: 'group-option__name' }, 'Nuevo o unirse')
    ]));

    // El label del trigger refleja el grupo activo.
    const triggerLabel = $('#groupSwitcherLabel');
    if (triggerLabel) {
      const active = groups.find(g => g.id === currentId);
      triggerLabel.textContent = active
        ? active.name
        : (groups.length === 0 ? 'Sin grupos' : 'Todos mis grupos');
    }
  }
};
