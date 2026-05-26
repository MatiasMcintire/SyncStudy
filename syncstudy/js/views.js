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

const Views = {
  // ============================================
  // VISTA HOY
  // ============================================
  renderToday() {
    const user = Storage.getCurrentUser();
    const allTasks = Storage.getAllTasks();
    const today = new Date();

    // Saludo
    $('#todayGreeting').textContent = `${getGreeting()}, ${user.name.split(' ')[0]}`;
    $('#todayDate').textContent = formatDate(today);

    // Tareas del usuario: prioridad combinada para "Hoy".
    // 1) Atrasadas (más viejas primero — las más urgentes).
    // 2) Pendientes de hoy (por prioridad descendente).
    // 3) Si sobra hueco, completadas de hoy.
    const myTasks = Storage.getTasksByUser(user.id);
    const overduePending = myTasks
      .filter(t => isOverdue(t))
      .sort((a, b) => a.dueDate - b.dueDate);
    const todayPending = myTasks
      .filter(t => isToday(t.dueDate) && !t.completed)
      .sort((a, b) => b.priority - a.priority);
    const todayDone = myTasks
      .filter(t => isToday(t.dueDate) && t.completed)
      .sort((a, b) => b.priority - a.priority);
    const todayTasks = [...overduePending, ...todayPending, ...todayDone].slice(0, 3);

    const taskList = $('#todayTaskList');
    taskList.innerHTML = '';

    if (todayTasks.length === 0) {
      taskList.appendChild(
        el('div', { class: 'empty-state' }, [
          el('i', { 'data-lucide': 'coffee' }),
          el('div', {}, 'Sin tareas para hoy. Disfruta el día o adelanta lo de mañana.')
        ])
      );
    } else {
      todayTasks.forEach(task => taskList.appendChild(this._renderTaskItem(task)));
    }

    // Progreso del grupo: tareas del grupo para hoy
    const groupMembers = Storage.getGroupMembers();
    const groupTasksToday = allTasks.filter(t => isToday(t.dueDate));
    const completedToday = groupTasksToday.filter(t => t.completed).length;
    const totalToday = groupTasksToday.length;

    const percent = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
    $('#progressBarFill').style.width = `${percent}%`;
    $('#progressStat').textContent = `${completedToday} / ${totalToday}`;

    if (totalToday === 0) {
      $('#progressCaption').textContent = 'Tu grupo no tiene tareas para hoy.';
    } else if (completedToday === totalToday) {
      $('#progressCaption').textContent = '¡Todos al día! 🎉';
    } else {
      const others = totalToday - completedToday;
      $('#progressCaption').textContent = `${others} ${others === 1 ? 'tarea pendiente' : 'tareas pendientes'} en el grupo.`;
    }

    // Strip de compañeros (excluye al usuario actual)
    const peerStrip = $('#peerStrip');
    peerStrip.innerHTML = '';

    groupMembers
      .filter(u => !u.isMe)
      .forEach(peer => {
        const peerTasks = Storage.getTasksByUser(peer.id);
        const peerToday = peerTasks.filter(t => isToday(t.dueDate));
        const peerDone = peerToday.filter(t => t.completed).length;
        const peerTotal = peerToday.length;

        const card = el('div', { class: 'peer-card' }, [
          el('div', { class: 'peer-card__header' }, [
            el('div', {
              class: 'peer-avatar',
              style: `background: ${peer.color}`
            }, peer.initial),
            el('div', {}, [
              el('div', { class: 'peer-card__name' }, peer.name.split(' ')[0]),
              el('div', { class: 'peer-card__status' }, [
                el('span', { class: 'status-dot' }),
                peerTotal > 0 ? `${peerDone}/${peerTotal} hoy` : 'sin tareas hoy'
              ])
            ])
          ]),
          el('div', { class: 'peer-card__progress' }, [
            el('div', { class: 'progress-bar' }, [
              el('div', {
                class: 'progress-bar__fill',
                style: `width: ${peerTotal > 0 ? (peerDone / peerTotal) * 100 : 0}%`
              })
            ])
          ])
        ]);

        peerStrip.appendChild(card);
      });

    refreshIcons();
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
        return el('div', {
          class: `cal-task ${priorityClass(t.priority)}`
            + (t.completed ? ' completed' : '')
            + (author && author.isMe ? ' is-mine' : ''),
          onClick: () => App.openTaskModal(t.id),
          title: `${t.title} · ${authorName}`
        }, [
          el('span', {
            class: 'cal-task__avatar',
            style: `background: ${author ? author.color : '#9ca3af'}`
          }, author ? author.initial : '?'),
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
        class: 'cal-day' + (isToday(day.getTime()) ? ' today' : '')
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
        return el('span', {
          class: 'cal-month__dot' + (t.completed ? ' completed' : ''),
          style: `background: ${author ? author.color : '#9ca3af'}`
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
        el('span', {}, 'Volver al mes')
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
      list.appendChild(el('div', { class: 'empty-state' }, 'Sin actividades este día.'));
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
    return el('article', {
      class: `cal-day-zoom__task ${priorityClass(t.priority)}`
        + (t.completed ? ' completed' : ''),
      onClick: () => App.openTaskModal(t.id)
    }, [
      // Avatar del autor
      el('div', {
        class: 'cal-day-zoom__avatar',
        style: `background: ${author ? author.color : '#9ca3af'}`
      }, author ? author.initial : '?'),
      // Bloque de contenido
      el('div', { class: 'cal-day-zoom__content' }, [
        el('div', { class: 'cal-day-zoom__top' }, [
          el('h4', { class: 'cal-day-zoom__task-title' }, t.title),
          el('span', {
            class: `priority-pill priority-pill--${priorityClass(t.priority)}`
          }, priorityLabel(t.priority))
        ]),
        el('div', { class: 'cal-day-zoom__meta' }, [
          el('span', { class: 'cal-day-zoom__author' },
            (author ? (author.isMe ? `${author.name} (tú)` : author.name) : 'Autor desconocido')),
          group
            ? el('span', { class: 'cal-day-zoom__group' }, [
                el('i', { 'data-lucide': 'users' }), group.name
              ])
            : null,
          el('span', { class: 'cal-day-zoom__status' + (t.completed ? ' completed' : '') },
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
        ul.appendChild(el('li', {
          class: 'cal-tooltip__item' + (t.completed ? ' completed' : '')
        }, [
          el('span', {
            class: 'cal-tooltip__bullet',
            style: `background: ${author ? author.color : '#9ca3af'}`
          }),
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

    members.forEach(member => {
      const tasks = Storage.getTasksByUser(member.id);
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
            style: `background: ${member.color}`
          }, member.initial),
          el('div', {}, [
            el('div', { class: 'member-card__name' },
              member.isMe ? `${member.name} (tú)` : member.name),
            el('div', { class: 'member-card__sub' },
              `${done}/${total} tareas esta semana`)
          ])
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

    // Tarjetas principales
    $('#weeklyDoneCount').textContent = myDone.length;
    $('#weeklyOnTime').textContent = myOnTime.length;
    $('#weeklyLate').textContent = myLate.length;
    $('#weeklyOnTimeBreakdown').hidden = myDone.length === 0;

    const activeDays = new Set();
    myDone.forEach(t => {
      const d = new Date(t.completedAt);
      activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    $('#weeklyActiveDays').textContent = activeDays.size;
    $('#weeklyGroupDone').textContent = doneThisWeek.length;

    // Mensaje contextual basado en la mezcla a tiempo / tarde
    const message = $('#weeklyMessage');
    if (myDone.length === 0) {
      message.textContent = 'Esta semana aún está en blanco. Hoy es buen día para arrancar.';
    } else if (myLate.length === 0) {
      message.textContent = `¡${myDone.length} ${myDone.length === 1 ? 'tarea' : 'tareas'} y todas a tiempo! Tu grupo va contigo en este ritmo.`;
    } else if (myOnTime.length >= myLate.length) {
      message.textContent = `${myDone.length} cerradas (${myOnTime.length} a tiempo). Sigue así.`;
    } else {
      message.textContent = `${myDone.length} cerradas, varias fuera de plazo. Una idea: prueba marcar la fecha apenas la conozcas.`;
    }

    this._renderWeeklyRanking(doneThisWeek, members, meId);
    this._renderWeeklyLate(doneThisWeek, members, meId);
  },

  _renderWeeklyRanking(doneThisWeek, members, meId) {
    const section = $('#weeklyRankingSection');
    const list = $('#weeklyRanking');
    if (doneThisWeek.length === 0 || members.length === 0) {
      section.hidden = true;
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
          style: `background: ${entry.user.color}`
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
            style: `background: ${author ? author.color : '#9ca3af'}`
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
    $('#sidebarAvatar').style.background = user.color;
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
