# SyncStudy — Fase 2

> Bitácora detallada de los cambios realizados en la sesión del **2026-05-20 / 21**, que llevaron a SyncStudy desde un MVP con `localStorage` hasta una aplicación colaborativa con backend real, autenticación, multi-grupo, comentarios, recordatorios y estadísticas grupales.
>
> Este documento sirve tres propósitos:
> 1. Dejar registro de lo que se construyó y por qué.
> 2. Permitir retomar el proyecto en futuras sesiones sin re-derivar todo de la conversación.
> 3. Ser entregable parcial para la asignatura *Tecnología y Prototipado* (UCT, 2026).

---

## 1. Contexto

### Equipo y rol académico

- **Matías Mcintire** — Líder técnico, encargado del desarrollo móvil (Flutter, Fase 3).
- **Leonardo Aguilera** — Desarrollo web y diseño visual.
- **Alfredo San Juan** — Backend, modelo de datos, testeo con usuarios.

Proyecto académico para *Tecnología y Prototipado*, Técnico Universitario en Informática, Universidad Católica de Temuco. Docente: Walter Noack Pérez. Año 2026.

### Punto de partida (Fase 1)

Web app vanilla (HTML5 + CSS3 + JavaScript ES6, sin frameworks) con persistencia en `localStorage`. Estructura:

```
syncstudy/
├── index.html
├── css/  (reset, variables, layout, components, views)
└── js/   (data.js, storage.js, utils.js, views.js, app.js)
```

Funcionalidades MoSCoW Must Have (F1–F10) operativas. Visibilidad cruzada simulada con tareas pre-cargadas para 6 usuarios del grupo TUPA.

### Decisión inicial: backend self-hosted con PocketBase

Originalmente la Fase 2 contemplaba Firebase. Se descartó en favor de **PocketBase** auto-hospedado.

**Por qué PocketBase y no Firebase:**

- **Aprendizaje técnico alineado con la carrera** — operar un servidor propio, schema explícito, reglas de seguridad transparentes. Más valioso académicamente que conectar a un BaaS opaco.
- **Sin cuotas externas** — la app puede crecer sin afectar costos.
- **Hardware disponible** — Matías tiene un Lenovo con 16 GB RAM y SSD SATA 1 TB con Ubuntu Server.
- **Stack mínimo** — PocketBase es un único binario en Go (≈30 MB), SQLite embebido, sin contenedores. Supabase auto-hospedado fue descartado por sobredimensionado (6–7 contenedores, mucha RAM en idle).

PocketBase aporta:

- Colecciones tipadas con reglas de acceso por record (`@request.auth.id`).
- API REST estándar.
- **Realtime via Server-Sent Events** (SSE) — clave para la dimensión colaborativa.
- Admin UI sin código en `:8090/_/`.
- SDK JS oficial (`pocketbase@0.26.9`).

---

## 2. Stack final de la Fase 2

| Capa | Tecnología | Justificación |
|:--|:--|:--|
| Backend | PocketBase v0.38.1 (Linux amd64, binario único) | Sin frameworks, sin dependencias, SQLite embebido. |
| Cliente HTTP | `pocketbase@0.26.9` UMD via CDN jsdelivr | Cero `npm install` en el frontend. |
| Persistencia local | `localStorage` (solo tokens auth + preferencias) | El estado real vive en PB. |
| Schema seed | Python 3 + urllib (`pocketbase/setup.py`) | Reproducible, idempotente. |
| Frontend | HTML/CSS/JS vanilla (sin frameworks) | Heredado de Fase 1, intencional. |

---

## 3. Cambios por orden cronológico

### 3.1 PoC PocketBase (Sub-fase 1)

Bajamos el binario, inicializamos `pb_data`, creamos el superusuario admin, y escribimos `setup.py` para definir el schema y sembrar datos. Schema inicial:

- **`users`** (auth collection extendida) con campos custom: `slug` (identificador estable de la fase de seed), `initial` (1 char), `color` (#RRGGBB).
- **`groups`** (base) con `name` + `members[]` (relation multi a users).
- **`tasks`** (base) con `user`, `group`, `title`, `description`, `dueDate`, `subject`, `priority`, `completed`.

Reglas iniciales: cualquier user autenticado lee, solo el dueño crea/edita/borra sus tareas.

Sembramos los 6 usuarios del seed original (`fabian`, `camila`, `joaquin`, `valentina`, `diego`, `sofia` con password `syncstudy123`), un grupo TUPA con los 6 como miembros, y ~21 tareas con `dueDate` calculado como `today + dayOffset` para que las fechas siempre se vean vigentes.

**Cómo se reescribió `storage.js`:**

El reto principal fue que `views.js` y `app.js` consumían `Storage` con una **API síncrona** (`getAllTasks()`, `createTask({...})` que devuelven inmediatamente). PocketBase es asíncrono por naturaleza.

Solución: **`Storage` se convirtió en un cache en memoria respaldado por PocketBase**, con la siguiente división:

- `init()` async. Crea el cliente PB + el authStore.
- `login(email, password)` async. Autentica, hace `_refreshAll()` (carga todo el estado), y `_subscribeRealtime()`.
- **Lecturas síncronas** contra el cache (`getAllTasks`, `getTasksByUser`, etc.). El código de las vistas no cambió.
- **Escrituras** actualizan el cache de forma optimista y empujan async a PB. Si PB rechaza, se logea (en producción se revertiría).
- **Suscripción realtime**: cuando llega un evento desde otro cliente, se actualiza el cache y se dispara `_onChange` (registrado por `app.js` → `Views.renderAll()`).

Esta arquitectura permitió tocar **un solo archivo** (`storage.js`) para todo el cambio backend.

#### Gotchas que costaron tiempo y conviene recordar:

1. **PB v0.38 no incluye `created`/`updated` por defecto en colecciones base** — hay que declararlos explícitamente como `autodate`. Sin esto, `sort: '-created'` devuelve 400 `invalid sort field`.
2. **El bundle UMD del SDK no expone `LocalAuthStore`** como propiedad estática. Para usar storage keys distintos (necesario para abrir varias pestañas como usuarios distintos en testing), se obtiene la clase vía reflexión:

    ```js
    const probe = new PocketBase(PB_URL);
    const AuthStoreClass = probe.authStore.constructor;
    const authStore = new AuthStoreClass(customKey);
    ```

3. **La suscripción realtime también dispara al cliente que originó el evento.** Si haces un insert optimista + el handler de subscription también inserta, la tarea aparece duplicada. **Patrón correcto:** `createTask` espera la respuesta del backend y hace `upsert` por id en el cache. Idempotente — si la subscription llegó primero, no duplica.
4. **`maxSelect: null` en relations significa "single", no "ilimitado".** Para multi (un grupo con N miembros) hay que pasar un número > 1 (usamos 999).

---

### 3.2 Fase A — Autenticación real

**#1 del wishlist del equipo: "Login con correo real".**

Cambios:

- Eliminamos el auto-login con credenciales fijas (era un atajo de PoC).
- Pantalla de login como overlay `position: fixed; inset: 0; z-index: 9999`.
- Login form (email + password), con manejo de error visible inline.
- Sesión persistida en `localStorage` (token PB).
- `Storage.resume()` reanuda la sesión sin pedir credenciales si el token sigue válido.
- Botón **Logout** en el sidebar, junto al avatar.

#### Trampa importante del logout

El reload tras `Storage.logout()` no era suficiente: si la URL traía `?user=<slug>` (dev shortcut usado para probar realtime con varias pestañas), el `init()` re-autenticaba automáticamente con esas credenciales y el dashboard volvía a aparecer.

**Fix:** al cerrar sesión, se quita el `?user=` con `URL.searchParams.delete('user')` y se agrega un `?_t=Date.now()` para forzar reload fresco (incluso si el navegador estaba reciclando la pestaña). Además se barre el localStorage con un loop que borra todas las claves `syncstudy_auth*` por defensa en profundidad.

#### Trampa del CSS (≈30 min perdidos)

El form de tarea estaba con `display: flex` y el atributo `hidden` no lo ocultaba (la regla del autor pisa al user-agent stylesheet). Esto generó un bug donde una tarea de un compañero abría el modal mostrando inputs y permitiendo "guardar", lo que creaba una **tarea nueva** porque el `taskId` quedaba vacío.

**Fix:** reforzar `[hidden] { display: none !important; }` en el reset CSS. Y como defensa en profundidad, `handleSaveTask` valida que el `taskId` corresponde a una tarea propia antes de tocar el backend.

**Dev shortcut conservado:** la URL acepta `?user=camila` para auto-login durante testing. Cada slug usa su propia storage key (`syncstudy_auth_camila`), así dos pestañas distintas no se pisan el token.

---

### 3.3 Fase A — Perfil de usuario

**#11 del wishlist: "Perfil de usuario".**

Modal de perfil con:

- Avatar grande pre-visualización en vivo (cambia con el color/inicial).
- Email read-only.
- Nombre y inicial editables.
- 6 swatches de colores (matching los del seed original).
- Toggle "Sonido al completar tarea" (ver Fase C).
- Botón "Activar notificaciones del navegador" (ver Fase C).

**Realtime de perfiles:** se agregó `_unsubUsers` que escucha cambios en la colección `users`. Si Fabián cambia su color, todas las cards de "Fabián" en las pestañas de los demás miembros se actualizan al instante sin recargar.

**Acceso al perfil:** click sobre la zona del avatar+nombre en el sidebar (envuelto en `role="button"` para accesibilidad de teclado).

---

### 3.4 Fase B — Multi-grupo

**#3 y #2 del wishlist: "Vista de calendario por grupo + dashboard para escoger" y "Calendario integral con todas las fechas de los grupos".**

Cambio más estructural de toda la sesión. Implicó:

#### Schema

- **`groups`**: agregados `inviteCode` (text, único, autogenerado `[A-Z0-9]{6}`) y `owner` (relation a user, opcional).
- **`tasks`**: reglas actualizadas para que solo se vean tareas de grupos donde uno es miembro: `listRule = "@request.auth.id != '' && group.members.id ?= @request.auth.id"`.

#### Mecanismo de invitación

**Por qué código de invitación y no aprobación por owner:**

- Refleja un patrón real conocido (Slack, Discord, GitHub Codespaces, etc.).
- Sin pantallas de admin ni búsqueda pública.
- No requiere intercambio in-band con cada participante.
- Suficientemente seguro para un prototipo académico (6 chars `[A-Z0-9]` = 2.1 × 10⁹ combinaciones).

#### Storage API

```js
Storage.getMyGroups()           // todos los grupos donde soy miembro
Storage.getCurrentGroupId()     // null = "Todos mis grupos"
Storage.setCurrentGroupId(id)   // persiste en localStorage por user
Storage.createGroup(name)       // crea + me agrega + activa
Storage.joinGroupByCode(code)   // busca por code y me agrega
Storage.leaveGroup(groupId)     // me saca del grupo
```

Las vistas existentes (`renderToday`, `renderCalendar`, `renderGroup`, `renderWeekly`) **no necesitaron cambios fundamentales**: `Storage.getAllTasks()` y `Storage.getGroupMembers()` ahora filtran automáticamente por `currentGroupId`. Si es `null`, devuelven la **unión** de todos los grupos (eso resuelve gratis el feature #2 del wishlist: "calendario integral").

#### UI

- **Switcher de grupo** en el sidebar (arriba del nav): dropdown con la lista de grupos del user + "Todos mis grupos" (si tiene más de uno) + "+ Nuevo o unirse".
- **Modal "Grupos"** con tabs:
  - **Unirse con código** → input 6 chars con uppercase automático.
  - **Crear grupo** → input nombre. Al crear, se navega automáticamente a la vista del grupo para que el usuario vea su código nuevo.
- **Tarjeta de código de invitación** en la vista del grupo, con botón para copiar al portapapeles vía `navigator.clipboard.writeText`.
- **Onboarding:** si el usuario no pertenece a ningún grupo, el modal se abre forzado, sin opción a cerrar.

#### Realtime multi-grupo

Se agregó subscripción a `groups`. Cuando Camila se une al grupo de Fabián, la pestaña de Fabián recibe el evento `update`, detecta que se agregó un nuevo miembro al grupo activo y refresca el render. Si a un usuario lo añaden a un grupo nuevo, el handler de subscription también carga las **tareas y users de ese grupo** que aún no conocía vía `_loadGroupExtras()`.

---

### 3.5 Fase B — Comentarios en tareas

**#4 del wishlist: "Comentarios en tareas".**

#### Schema

Nueva colección `comments` con:

- `task` (relation, cascadeDelete a tasks).
- `author` (relation a users).
- `body` (text, 1–2000 chars).
- `created` / `updated` (autodate).

Reglas:

- `listRule` y `viewRule`: visible si el user es miembro del grupo de la tarea (`task.group.members.id ?= @request.auth.id`).
- `createRule`: solo se puede crear comentarios como uno mismo, en tareas de grupos donde se es miembro.
- `updateRule` y `deleteRule`: solo el autor.

#### UI

Sección de comentarios dentro del modal de tarea, debajo del form. Sólo visible al editar una tarea existente (no en "Nueva tarea", porque la tarea aún no tiene id).

Cada comentario muestra:

- Avatar del autor (color + inicial).
- Nombre + tiempo relativo (`relativeTime()` helper: "ahora", "hace 5 min", "hace 2 h", "ayer", etc.).
- Texto del comentario (`white-space: pre-wrap` para respetar saltos de línea).
- Botón "×" sutil para borrar **solo si el comentario es del usuario actual**.

Composer: textarea + botón "Comentar" (también Ctrl/Cmd+Enter).

#### Comentarios en tareas ajenas

Esto cambió el diseño del modal. **Iteración importante** que pasó por tres formas:

1. **Versión inicial**: tareas ajenas mostraban el form completo con inputs `disabled`. Visualmente ruidoso.
2. **Versión 2 (a pedido del usuario)**: el form se oculta entero. Solo aparece título, meta (autor, fecha, asignatura, grupo, prioridad, estado) y descripción en formato read-only + la sección de comentarios.
3. **Bug fix CSS (descrito arriba)**: el `[hidden]` no funcionaba sobre el form con `display: flex`. Se agregó `[hidden] { display: none !important; }` al reset global, y se reforzó con un guard en `handleSaveTask` que detecta si el modal está mostrando una tarea ajena y aborta.

#### Indicador sutil de comentarios

A pedido del usuario: cualquier tarea con comentarios muestra un **mini-badge** con ícono de bocadillo + número. Aparece en:

- Lista "Hoy" (en la meta).
- Chips del calendario semana (versión compacta sin número visible o más pequeño).
- Items del zoom de día del calendario mes.

Helper `Storage.getCommentCountForTask(taskId)` síncrono desde el cache. Sin queries extra al backend.

**Fix de strike-through (refinamiento):** cuando una tarea está completada en el calendario semana, el `text-decoration: line-through` se aplicaba a todo el chip (avatar + título + badge). Visualmente desagradable. Se reescribió:

```css
.cal-task.completed { opacity: 0.5; }
.cal-task.completed .cal-task__title { text-decoration: line-through; }
```

El tachado se limita al título; avatar y badge mantienen su forma original con menor opacidad.

---

### 3.6 Mejoras transversales del calendario

#### Paso 1: vista Semana con columnas simétricas

**Problema:** las 7 columnas tenían altura variable según cantidad de tareas. El día actual con su recuadro azul quedaba más alto que los vecinos, desalineado.

**Fix:**

- `min-height: 200px` → `height: 320px` (fijo).
- `overflow: hidden` defensivo.
- Máximo 6 chips por columna; el resto se muestra como **"+N más"** al final con tooltip nativo (`title="..."`) que lista los títulos restantes.

#### Paso 2: aprovechamiento del ancho

**Problema:** el calendario quedaba encogido respecto al área disponible.

**Causa:** `.view { max-width: 960px; margin: 0 auto; }` heredado de la Fase 1.

**Fix iterativo:**

1. **Primera iteración**: añadir `.view.view--calendar { max-width: none; }` para que solo el calendario respire.
2. **Iteración final (a pedido del usuario)**: quitar el `max-width` global de `.view` y eliminar el override del calendario. **Las cuatro vistas** ocupan todo el ancho del área principal. El alineamiento con el topbar es automático porque ambos comparten `padding: 0 32px` lateral.

#### Paso 3: zoom in-place + hover popover en la vista Mes

**Diseño solicitado:**

- Hover sobre un día con tareas → popover con la lista de títulos, delay 250 ms.
- Click sobre un día con tareas → ese día se expande **in-place** ocupando el área de la grilla del mes.
- Detalle del zoom: autor (avatar + nombre), grupo, prioridad, descripción, estado.
- Botón "← Volver al mes" + Esc.
- Posicionamiento defensivo del tooltip: si el día está en el borde derecho del viewport, abre hacia la izquierda; si está en la última fila, abre hacia arriba.

**Decisiones técnicas:**

- **Zoom in-place** (no modal flotante) — se siente más sólido y aprovecha mejor el espacio. El estado `calendarState.zoomDate` actúa como switch dentro de `_renderMonthView`, que delega a `_renderMonthGrid()` o `_renderDayZoom()`.
- **Tooltip flotante singleton** — un solo elemento `#calendarTooltip` en el DOM, posicionado vía JS según `getBoundingClientRect()` del día. Más eficiente que crear/destruir nodos.
- **Reutilización de la nav del calendario en zoom**: las flechas ← / → del toolbar navegan **entre días vecinos** mientras estás en zoom, en vez de entre meses. Mantiene el mismo control con semántica contextual.

#### Paso 4: ancho consistente en las 4 vistas

Tras el ajuste del calendario, las otras vistas (Hoy, Mi grupo, Resumen semanal) quedaban estrechas en comparación.

**Decisión técnica importante: layout fluido sin breakpoints.**

En vez de inventar media queries, se reutilizó el espíritu de `repeat(auto-fill, minmax(360px, 1fr))` que ya usaba "Mi grupo" desde Fase 1: **dejar que la geometría decida cuándo colapsar**.

```css
.two-cols {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.two-cols__main { flex: 1 1 400px; }  /* base 400px, crece */
.two-cols__side { flex: 0 1 360px; }  /* base 360px, no crece */
```

Cuando los dos paneles caben lado a lado, se acomodan; si no, el wrap los apila. **Sin breakpoints**, sin clases responsive. La misma utilidad sirve para "Hoy" (tareas prioritarias + peers) y "Resumen semanal" (ranking + completadas tarde).

En "Mi grupo", el grid de cards de miembros se subió de `minmax(280px, 1fr)` a `minmax(360px, 1fr)` para que respiren mejor.

**Peer strip** (compañeros activos en la vista Hoy): originalmente era un scroll horizontal. Al meterlo en una columna de 360px se cambió a lista vertical:

```css
.two-cols .peer-strip {
  flex-direction: column;
  overflow-x: visible;
}
.two-cols .peer-card { width: 100%; }
```

---

### 3.7 Fase C — Notificaciones, sonidos y recordatorios

#### C1: Notificación in-app cuando un compañero crea una tarea

Storage expone `onPeerTaskCreated(cb)`. En el handler de subscription, cuando llega un evento `create` y se cumple:

- `wasNew` (no es un upsert por la propia creación, sino un evento auténtico del peer).
- `task.userId !== currentUserId`.

…se invoca el callback registrado. El handler en `app.js` muestra un toast:

> "Camila agregó: Prueba de Suelos · TUPA · 2° año"

El sufijo del grupo solo aparece si la vista está en "Todos mis grupos" o si el contexto puede confundir; siempre incluido para claridad.

#### C2: Sonido al completar tarea

**Por qué WebAudio en lugar de un MP3:**

- Cero assets binarios en el repo.
- Sonido predecible cross-browser.
- ≈30 líneas de JS.

Implementación: dos osciladores `sine` apilados (880 Hz + 1320 Hz, ofset 50 ms) con envelope exponencial — suena como un "ding" cálido. `AudioContext` se crea una sola vez (lazy) y se reusa.

Toggle en el modal de Perfil, persistido en `localStorage.syncstudy_sound_enabled`. Default: **on**. Al activarlo, se reproduce una previa de cortesía.

Disparado solo en transición `false → true` (no al des-completar).

#### C3: Resumen de pendientes propios al boot

**Cambios:**

- Toast de bienvenida enriquecido: `"Hola, Fabián · 3 para hoy"` o `"… · 2 atrasadas"` (rojo) o `"… · sin pendientes urgentes"`.
- **Badge en el nav-item "Hoy"** del sidebar con el contador (atrasadas + hoy). Rojo si hay atrasadas, amber si solo hoy. Se actualiza en cada `Views.renderAll()`, así que también reacciona a cambios remotos.

Helper `Storage.getMyPendingSummary()` devuelve `{ overdue, today, tomorrow }`.

#### Sub-fix descubierto en C3: tareas atrasadas no se podían completar

**Problema reportado por el usuario:** creó una tarea con fecha vencida y no podía marcarla como hecha; solo podía eliminarla.

**Causa:** la vista "Hoy" filtraba estrictamente por `isToday(dueDate)`, así que la atrasada no aparecía con su checkbox. El modal de tarea no tenía un toggle de "completar", solo Guardar/Eliminar.

**Solución triple:**

1. **Atrasadas en la vista Hoy.** El filter se expandió para incluir tareas con `isOverdue(t)` ordenadas por la más antigua primero (más urgente). Cada item muestra badge rojo **"Vencida"** y el icono de la meta de fecha cambia a `alert-triangle`.
2. **Checkbox en el modal de tarea** — bloque verde "Marcar como completada" al inicio del form. El hint del bloque cambia dinámicamente si la tarea está vencida ("quedará marcada como completada tarde").
3. **`completedAt` explícito en el schema** (ver siguiente sección).

#### Sub-fix relacionado: marca real de "completada tarde"

**Versión 1 (descartada):** se infería de `updated > endOfDay(dueDate)`. Pero `updated` se modifica con CUALQUIER edición (no solo al completar), así que editar el título de una tarea completada a tiempo, días después, la "convertía" en tardía.

**Versión 2 (final):** campo `completedAt` (date, opcional) en el schema. `Storage.updateTask` lo setea/limpia automáticamente solo cuando cambia el flag `completed`:

```js
if (typeof patch.completed === 'boolean'
    && patch.completed !== before.completed) {
  patch.completedAt = patch.completed ? Date.now() : null;
}
```

Helper `isCompletedLate(task)` compara `completedAt > endOfDay(dueDate)`. Tolerancia: si se marcó cualquier hora del día del due, sigue siendo "a tiempo".

#### C3.5: Resumen Semanal enriquecido

Aprovechando `completedAt`:

- **Breakdown en la card principal**: "X completadas · Y a tiempo · Z tarde" con dots verde / amber.
- **Sección "Ranking del grupo · esta semana"**: top 5 miembros ordenados por # a tiempo (luego total). Cada fila con avatar, nombre, "N tareas · X a tiempo (Y%)", barra de progreso verde. Posiciones #1 / #2 / #3 con colores dorado / plata / bronce. Tu fila resaltada en azul accent.
- **Sección "Completadas fuera de plazo · esta semana"**: lista con autor (mini-avatar + nombre), título, pill amber "+N días" indicando el atraso.
- **Filtro temporal corregido**: antes filtraba por `dueDate` cayendo en esta semana; ahora filtra por `completedAt`. Refleja **trabajo hecho esta semana**, no "trabajo que tenía esta semana". Una tarea con due el lunes que se completó el jueves cuenta para la semana del jueves.

#### C4: Recordatorios programados

**Diseño:** scheduler interno con `setInterval(60s)`. En cada tick:

- Mira las tareas propias pendientes cuya `dueDate` cae en los próximos 60 minutos.
- Las que no haya recordado aún (set `_remindedIds`) → notif "X · Vence en N min".

Re-check inmediato al recibir un cambio remoto (por si se acaba de crear una tarea con due cercano).

**Notificaciones del navegador (opcional):**

- Botón en el modal de Perfil: "Activar notificaciones del navegador".
- Pide permiso vía `Notification.requestPermission()`.
- Helper `notifyUser(title, body)` muestra toast in-app SIEMPRE, y si la pestaña está en background **y** el permiso está concedido, también emite una `new Notification(...)` nativa.
- Estado del botón reactivo:
  - Sin decidir → habilitado, "Activar notificaciones del navegador".
  - Granted → deshabilitado, "Notificaciones activas".
  - Denied → deshabilitado, "Bloqueadas (habilita en el navegador)".

**Por qué no se usó Push API + Service Worker** (que permitiría notif aún con la app cerrada): complejo, requiere HTTPS válido y un endpoint de servidor para suscripciones VAPID. Fuera del scope académico. Lo dejamos como mejora futura cuando se monte el Lenovo con Cloudflare Tunnel.

---

## 4. Decisiones técnicas justificadas (resumen)

### 4.1 Por qué API síncrona sobre cliente async

La Fase 1 tenía `Storage.getAllTasks()` síncrono (era localStorage). Las vistas (`views.js`, 416 líneas) hacían:

```js
const tasks = Storage.getAllTasks();
tasks.forEach(t => ...);
```

Convertir todas esas lecturas a `await` habría tocado decenas de funciones de `views.js` y `app.js`. En lugar de eso:

- **Cache en memoria** (`_state`) actualizado por `_refreshAll()` y la subscription realtime.
- **Lecturas síncronas** contra el cache.
- **Escrituras** son async para el caller que quiera (`createTask` es async para confirmar el id real antes de re-renderizar), pero para la mayoría se hace optimistic.

Trade-off aceptado: ~50–200 ms de "estado posiblemente desactualizado" entre que un peer cambia algo y la subscription nos notifica. Para una app de organización académica es irrelevante.

### 4.2 Por qué upsert idempotente en lugar de optimistic + reconcile

El primer intento de `createTask` hacía:

1. Push optimista al cache con `tempId`.
2. POST a PB en background.
3. Cuando llega el real, reemplaza `tempId` por el id real.

Pero la subscription **también** entrega el evento `create` del propio cliente. Si la subscription llega antes que la respuesta del POST, hace push (no encuentra el id real), y después el reemplazo de tempId duplica.

**Patrón final:** `createTask` espera el POST (es `async`), recibe el id real, y hace `findIndex` antes de pushar. Si la subscription ya insertó (idempotente), no duplica. Si la subscription llega después, su upsert encuentra el id y reemplaza con la misma data (no-op). Robusto a la carrera.

### 4.3 Por qué dev shortcut `?user=<slug>` con storage keys distintos

Probar realtime requiere abrir la app como dos usuarios distintos a la vez. En la misma máquina, dos pestañas comparten `localStorage`. Si ambas usan la misma key (`syncstudy_auth`), se pisan los tokens.

**Solución:** cuando la URL incluye `?user=camila`, se usa `syncstudy_auth_camila` como key del `LocalAuthStore`. Cada pestaña vive su propia sesión sin interferir con la otra.

### 4.4 Por qué reglas de visibilidad por grupo en lugar de "todo público"

Al introducir multi-grupo, la regla original `listRule = "@request.auth.id != ''"` permitía a cualquier autenticado ver tareas de cualquier grupo (incluso grupos a los que no pertenece). Eso rompe la promesa social de SyncStudy: "tu grupo ve tus tareas, no extraños".

**Regla nueva:** `listRule = "@request.auth.id != '' && group.members.id ?= @request.auth.id"`. La `?=` es el operador "any" de PocketBase para relations: el actual user debe ser uno de los miembros del grupo de la tarea.

Lo mismo para `comments`: `task.group.members.id ?= @request.auth.id`.

### 4.5 Por qué `auto-fill` y `flex-wrap` en lugar de media queries

Los breakpoints fijos (768 / 1024) son una forma de decidir el layout **antes de ver el contenido**. Las herramientas CSS modernas (`auto-fill` / `auto-fit` / `flex-basis`) deciden cuándo colapsar a partir del **espacio real disponible**.

Beneficio práctico: un evaluador con una ventana de 950 px ve un layout coherente sin tener que detectar manualmente que está "en el rango raro entre dos breakpoints". Y al redimensionar, las cosas se acomodan sin saltos discretos.

### 4.6 Por qué los modales no son full-width

Las vistas se estiraron al ancho disponible. Los modales (de tarea, perfil, grupos) mantienen su `max-width` original. Un formulario de 1500 px de ancho es ilegible: el ojo no sabe a qué label corresponde cada input cuando están separados por mucha distancia horizontal.

### 4.7 Por qué WebAudio en lugar de un MP3

Sin assets binarios en el repo (cero `git lfs`, cero descargas externas en runtime), tono predecible cross-browser, y suficientemente expresivo (dos osciladores apilados con envelope dan un "ding" agradable). El AudioContext se crea lazy y se reusa.

### 4.8 Por qué Cloudflare Tunnel cuando se mueva al Lenovo

Para la Fase 3 (Flutter móvil) el backend tiene que ser accesible desde fuera de la red local **con HTTPS válido** (Android e iOS no permiten WebView/HTTP en producción). Opciones evaluadas:

- Port forwarding en el router → requiere IP pública estática, configurar el router, manejar certificados Let's Encrypt.
- ngrok → URL cambia en cada arranque (versión gratis).
- **Cloudflare Tunnel** → gratis, sin abrir puertos, sub-dominio estable, HTTPS automático.

Ganador claro. Se decidirá cuál sub-dominio usar cuando se ejecute la migración.

---

## 5. Cómo correr todo localmente

### Backend

```bash
cd /home/mts/Escritorio/SyncStudy/pocketbase
./pocketbase serve --http=127.0.0.1:8090
```

- Admin UI: `http://127.0.0.1:8090/_/`
- Admin: `admin@syncstudy.local` / `syncstudy-dev-2026`
- Seed users (todos con password `syncstudy123`): `fabian@syncstudy.local`, `camila@`, `joaquin@`, `valentina@`, `diego@`, `sofia@`.

Para resetear schema/seed (idempotente):

```bash
python3 setup.py
```

### Frontend

```bash
cd /home/mts/Escritorio/SyncStudy/syncstudy
python3 -m http.server 5500
```

Abrir `http://127.0.0.1:5500/`.

Para probar realtime entre dos usuarios distintos: abrir una pestaña con `http://127.0.0.1:5500/?user=camila` (o cualquier otro slug del seed).

### Reset total del backend (sólo si algo se corrompe)

```bash
cd /home/mts/Escritorio/SyncStudy/pocketbase
# Detener el proceso si está corriendo
rm -rf pb_data/
./pocketbase serve --http=127.0.0.1:8090 &
./pocketbase superuser upsert admin@syncstudy.local syncstudy-dev-2026
python3 setup.py
```

---

## 6. Estado al cierre de esta sesión

### Implementado

- ✅ Backend real con PocketBase + reglas de seguridad por grupo.
- ✅ Login real con correo/contraseña + persistencia + logout limpio.
- ✅ Dev shortcut `?user=<slug>` para testing multi-pestaña.
- ✅ Perfil de usuario editable (nombre, inicial, color) con realtime.
- ✅ Multi-grupo (crear, unirse con código, cambiar entre grupos).
- ✅ Vista "Todos mis grupos" (calendario integral del wishlist).
- ✅ Comentarios en tareas (propios y de compañeros) con realtime.
- ✅ Tareas ajenas se abren en modo read-only limpio (solo título + meta + comentarios).
- ✅ Calendario semana con columnas simétricas + `+N más`.
- ✅ Calendario mes con hover popover + zoom in-place + navegación entre días.
- ✅ Ancho consistente en las 4 vistas con layout fluido sin breakpoints.
- ✅ Notificación in-app cuando un peer crea una tarea.
- ✅ Sonido al completar tarea (WebAudio, toggleable).
- ✅ Resumen de pendientes al boot + badge persistente en sidebar.
- ✅ Tareas atrasadas en vista Hoy + checkbox de completar en modal.
- ✅ Marca real "Completada tarde" usando `completedAt`.
- ✅ Resumen Semanal con ranking + lista de tardías.
- ✅ Recordatorios programados (60 min antes del due) + opcional Notification API.

### Pendiente del wishlist original

- ⏳ Migración al Lenovo (Fase D) con Cloudflare Tunnel.
- ⏳ #8 ("Asignación de prioridades") — ya estaba implementado en Fase 1, se podría refinar con etiquetas/urgencia.

### Próximos pasos sugeridos

1. **Migración al Lenovo** — copiar `pocketbase/` al Lenovo, levantar el servicio como systemd unit, configurar Cloudflare Tunnel apuntando a `127.0.0.1:8090`. Cambiar el `PB_URL` en `js/storage.js` por el subdominio elegido.
2. **Frontend en GitHub Pages como fallback** — si el Lenovo cae, el frontend sigue accesible y muestra un error claro en login.
3. **Empezar Fase 3 (Flutter móvil)** — el SDK de PocketBase tiene cliente Dart, mismo modelo de datos, mismas reglas. La app móvil consume el mismo backend.
4. **Testeo con usuarios reales** — la entrega académica pide 5 sesiones de testeo con perfiles cercanos al User Persona (Fabián Riquelme, estudiante TUPA 2º año).

---

## 7. Estructura final de archivos

```
SyncStudy/
├── README.md                       # Documentación general (Fase 1)
├── CHANGELOG-FASE-2.md             # Este documento
├── .gitignore                      # Ignora pocketbase/
│
├── pocketbase/                     # NO se versiona
│   ├── pocketbase                  # Binario v0.38.1 Linux amd64
│   ├── setup.py                    # Schema + seed reproducible
│   ├── pb_data/                    # SQLite, archivos, logs
│   ├── pb.log                      # Log del servidor
│   └── CHANGELOG.md                # Changelog oficial de PB
│
└── syncstudy/                      # Frontend versionado
    ├── index.html                  # Punto de entrada
    ├── .gitignore
    ├── css/
    │   ├── reset.css               # Incluye `[hidden] { display: none !important; }`
    │   ├── variables.css           # Design tokens
    │   ├── layout.css              # Sidebar, topbar, vistas, .two-cols
    │   ├── components.css          # Botones, modales, peer cards, etc.
    │   └── views.css               # Estilos por vista + extensiones (login, perfil, grupos, zoom, recordatorios)
    └── js/
        ├── data.js                 # SEED_DATA (referencia histórica de Fase 1, sin uso en runtime)
        ├── storage.js              # Cache + cliente PocketBase + realtime
        ├── utils.js                # Helpers: dates, DOM, toast, sonido, notif, estado de tarea
        ├── views.js                # Renderizado de Hoy / Calendario / Grupo / Semanal / zoom
        └── app.js                  # Init, login, modales, handlers, scheduler de recordatorios
```

---

## 8. Cómo retomar este proyecto en una sesión futura

1. **Leer este documento entero** (especialmente sección 4: decisiones).
2. Asegurarse que PocketBase está corriendo (`./pocketbase serve …`). Si no, arrancarlo.
3. Asegurarse que el frontend está servido (`python3 -m http.server 5500`).
4. Verificar que la app abre en `http://127.0.0.1:5500/` y se puede loguear como Fabián.
5. Revisar la sección 6 ("Estado al cierre") para saber qué falta.
6. Si el plan es la migración al Lenovo: ver sección 4.8 + sub-fase 6.1 sugerida.

Las memorias persistentes asociadas al proyecto (en el sistema de Claude) tienen un resumen ejecutivo equivalente; este MD es el documento canónico.
