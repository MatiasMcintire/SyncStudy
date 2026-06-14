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
  anchorDate: new Date() // fecha de referencia para nav
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

    // Tareas del usuario para hoy (top 3 por prioridad)
    const myTasks = Storage.getTasksByUser(user.id);
    const todayTasks = myTasks
      .filter(t => isToday(t.dueDate))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.priority - a.priority;
      })
      .slice(0, 3);

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

    const content = el('div', { class: 'task-item__content' }, [
      el('div', { class: 'task-item__title' }, task.title),
      el('div', { class: 'task-item__meta' }, [
        el('span', { class: 'task-item__meta-item' }, [
          el('i', { 'data-lucide': 'calendar' }),
          relativeDate(task.dueDate)
        ]),
        task.subject !== 'General'
          ? el('span', { class: 'task-item__meta-item' }, [
              el('i', { 'data-lucide': 'book-open' }),
              task.subject
            ])
          : null,
        el('span', { class: `priority-pill priority-pill--${priorityClass(task.priority)}` },
          priorityLabel(task.priority))
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
    const end = addDays(start, 13);

    // Etiqueta del rango de 2 semanas
    $('#calendarLabel').textContent =
      `${formatDateShort(start)} – ${formatDateShort(end)}`;

    const week = el('div', { class: 'calendar-week calendar-week--two' });

    const userId = Storage.getState().currentUserId;
    const tasks = Storage.getTasksByUser(userId);

    for (let i = 0; i < 14; i++) {
      const day = addDays(start, i);
      const dayTasks = tasks
        .filter(t => isSameDay(t.dueDate, day))
        .sort((a, b) => b.priority - a.priority);

      const dayEl = el('div', {
        class: 'cal-day' + (isToday(day.getTime()) ? ' today' : '')
      }, [
        el('div', { class: 'cal-day__header' }, [
          el('span', { class: 'cal-day__name' }, WEEKDAYS_SHORT[day.getDay()]),
          el('span', { class: 'cal-day__number' }, String(day.getDate()))
        ]),
        el('div', { class: 'cal-day__tasks' },
          dayTasks.map(t =>
            el('div', {
              class: `cal-task ${priorityClass(t.priority)}` + (t.completed ? ' completed' : ''),
              onClick: () => App.openTaskModal(t.id),
              title: t.title
            }, t.title)
          )
        )
      ]);

      week.appendChild(dayEl);
    }

    container.appendChild(week);
  },

  _renderMonthView(container) {
    const anchor = calendarState.anchorDate;
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    $('#calendarLabel').textContent = `${MONTHS[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const startDate = startOfWeek(firstDay);

    const userId = Storage.getState().currentUserId;
    const tasks = Storage.getTasksByUser(userId);

    const monthContainer = el('div', { class: 'calendar-month' });

    // Encabezados
    const weekdaysHeader = el('div', { class: 'cal-month__weekdays' });
    WEEKDAYS_SHORT.forEach((wd, i) => {
      // Mover domingo al final
      const idx = i === 0 ? 6 : i - 1;
      weekdaysHeader.appendChild(
        el('div', { class: 'cal-month__weekday' }, WEEKDAYS_SHORT[(i + 1) % 7])
      );
    });
    monthContainer.appendChild(weekdaysHeader);

    // Grid de días (6 semanas)
    const grid = el('div', { class: 'cal-month__grid' });

    for (let i = 0; i < 42; i++) {
      const day = addDays(startDate, i);
      const isCurrentMonth = day.getMonth() === month;
      const dayTasks = tasks.filter(t => isSameDay(t.dueDate, day));

      const dots = dayTasks.slice(0, 4).map(t =>
        el('span', { class: `cal-month__dot ${priorityClass(t.priority)}` })
      );

      const dayCell = el('div', {
        class: 'cal-month__day' +
               (!isCurrentMonth ? ' muted' : '') +
               (isToday(day.getTime()) ? ' today' : '')
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

  // ============================================
  // VISTA GRUPO
  // ============================================
  renderGroup() {
    const members = Storage.getGroupMembers();
    const group = Storage.getGroup();
    const allTasks = Storage.getAllTasks();

    $('#groupNameTitle').textContent = group.name;
    $('#groupMemberCount').textContent = members.length;

    const groupSelector = $('#activeGroupSelect');
    if (groupSelector) {
      const groups = Storage.getGroups();
      groupSelector.innerHTML = '';
      groups.forEach(g => {
        const option = el('option', { value: g.id }, g.hidden ? `${g.name} (oculto)` : g.name);
        option.selected = g.id === group.id;
        groupSelector.appendChild(option);
      });
    }

    const memberIds = members.map(m => m.id);
    // Tareas completadas esta semana por el grupo activo
    const weekDone = allTasks.filter(t => memberIds.includes(t.userId) && t.completed && isThisWeek(t.dueDate)).length;
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
    this.renderGroupManager();
    this.renderSidebarGroups();

    refreshIcons();
  },

  // ============================================
  // VISTA RESUMEN SEMANAL
  // ============================================
  renderWeekly() {
    const userId = Storage.getState().currentUserId;
    const myTasks = Storage.getTasksByUser(userId);
    const allTasks = Storage.getAllTasks();

    const weekStart = startOfWeek(new Date());

    // Mis tareas completadas esta semana
    const myDoneThisWeek = myTasks.filter(
      t => t.completed && isThisWeek(t.dueDate)
    );
    $('#weeklyDoneCount').textContent = myDoneThisWeek.length;

    // Días con avance (días distintos en que completó algo esta semana)
    const activeDays = new Set();
    myDoneThisWeek.forEach(t => {
      const d = new Date(t.dueDate);
      activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    $('#weeklyActiveDays').textContent = activeDays.size;

    // Grupo total esta semana
    const activeMemberIds = Storage.getGroupMembers().map(m => m.id);
    const groupDoneThisWeek = allTasks.filter(
      t => activeMemberIds.includes(t.userId) && t.completed && isThisWeek(t.dueDate)
    ).length;
    $('#weeklyGroupDone').textContent = groupDoneThisWeek;

    // Mensaje contextual
    const message = $('#weeklyMessage');
    if (myDoneThisWeek.length === 0) {
      message.textContent = 'Esta semana aún está en blanco. Hoy es buen día para arrancar.';
    } else if (myDoneThisWeek.length < 3) {
      message.textContent = `Llevas ${myDoneThisWeek.length} ${myDoneThisWeek.length === 1 ? 'tarea' : 'tareas'} esta semana. Vas, sigue.`;
    } else {
      message.textContent = `¡${myDoneThisWeek.length} tareas completadas! Tu grupo va contigo en este ritmo.`;
    }
  },


  // ============================================
  // GESTIÓN VISUAL DE GRUPOS
  // ============================================
  renderGroupManager() {
    const container = $('#groupManagerList');
    if (!container) return;

    const groups = Storage.getGroups ? Storage.getGroups() : [];
    const activeGroup = Storage.getGroup ? Storage.getGroup() : null;
    const searchInput = $('#groupSearchInput');
    const showHiddenInput = $('#showHiddenGroups');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const showHidden = showHiddenInput ? showHiddenInput.checked : false;

    const filteredGroups = groups.filter(group => {
      const matchesName = !query || group.name.toLowerCase().includes(query);
      const visibleByHidden = showHidden || !group.hidden;
      return matchesName && visibleByHidden;
    });

    container.innerHTML = '';

    if (!filteredGroups.length) {
      container.appendChild(
        el('div', { class: 'group-manager-empty' }, [
          el('i', { 'data-lucide': 'search-x' }),
          el('span', {}, 'No hay grupos que coincidan con el filtro.')
        ])
      );
      refreshIcons();
      return;
    }

    filteredGroups.forEach(group => {
      const members = Storage.getGroupMembers(group.id);
      const isActive = activeGroup && activeGroup.id === group.id;

      const card = el('div', {
        class: 'group-manager-item' +
          (isActive ? ' active' : '') +
          (group.hidden ? ' is-hidden' : '')
      }, [
        el('button', {
          class: 'group-manager-item__main',
          type: 'button',
          onClick: () => {
            Storage.setActiveGroup(group.id);
            showToast(`Grupo activo: ${group.name}`, 'users');
            Views.renderAll();
            App.changeView('group');
          }
        }, [
          el('span', { class: 'group-manager-item__name' }, group.name),
          el('span', { class: 'group-manager-item__meta' }, `${members.length} integrantes`)
        ]),
        el('button', {
          class: 'group-manager-item__action',
          type: 'button',
          title: group.hidden ? 'Mostrar grupo' : 'Ocultar grupo',
          onClick: (e) => {
            e.stopPropagation();
            const changed = Storage.toggleGroupHidden(group.id);
            if (changed) {
              showToast(changed.hidden ? 'Grupo oculto' : 'Grupo visible', changed.hidden ? 'eye-off' : 'eye');
            }
            Views.renderAll();
          }
        }, [
          el('i', { 'data-lucide': group.hidden ? 'eye' : 'eye-off' })
        ])
      ]);

      container.appendChild(card);
    });

    refreshIcons();
  },

  renderSidebarGroups() {
    const container = $('#sidebarGroupsList');
    if (!container) return;

    const groups = Storage.getGroups ? Storage.getGroups() : [];
    const activeGroup = Storage.getGroup ? Storage.getGroup() : null;
    const searchInput = $('#sidebarGroupSearch');
    const toggleBtn = $('#sidebarToggleHiddenGroups');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const showHidden = toggleBtn ? toggleBtn.classList.contains('is-active') : false;

    const filteredGroups = groups.filter(group => {
      const matchesName = !query || group.name.toLowerCase().includes(query);
      const visibleByHidden = showHidden || !group.hidden;
      return matchesName && visibleByHidden;
    });

    container.innerHTML = '';

    if (!filteredGroups.length) {
      container.appendChild(
        el('div', { class: 'sidebar-group-empty' }, 'Sin grupos visibles')
      );
      return;
    }

    filteredGroups.forEach(group => {
      const members = Storage.getGroupMembers(group.id);
      const isActive = activeGroup && activeGroup.id === group.id;

      const item = el('button', {
        class: 'sidebar-group-chip' +
          (isActive ? ' active' : '') +
          (group.hidden ? ' is-hidden' : ''),
        type: 'button',
        title: group.hidden ? 'Grupo oculto' : 'Cambiar a este grupo',
        onClick: () => {
          Storage.setActiveGroup(group.id);
          showToast(`Grupo activo: ${group.name}`, 'users');
          Views.renderAll();
          App.changeView('group');
        }
      }, [
        el('span', { class: 'sidebar-group-chip__name' }, group.name),
        el('span', { class: 'sidebar-group-chip__count' }, String(members.length))
      ]);

      container.appendChild(item);
    });
  },

  // ============================================
  // RENDER GLOBAL — actualiza todas las vistas
  // ============================================
  renderAll() {
    this.renderToday();
    this.renderCalendar();
    this.renderGroup();
    this.renderWeekly();
    this.renderSidebarGroups();
    this._updateSidebar();
  },

  _updateSidebar() {
    const user = Storage.getCurrentUser();
    const group = Storage.getGroup();
    $('#sidebarAvatar').textContent = user.initial;
    $('#sidebarAvatar').style.background = user.color;
    $('#sidebarUserName').textContent = user.name;
    $('#sidebarUserGroup').textContent = group.name;
  }
};
