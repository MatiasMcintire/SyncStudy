# SyncStudy — MVP Web

> *"Estudia en sincronía con tu grupo."*
>
> Calendario colaborativo para la organización académica de estudiantes desde los 15 años en adelante.

---

## Sobre este MVP

Esta es la **Fase 1** del prototipo: una **web app funcional** que implementa los 8 Must Have del MoSCoW usando HTML, CSS y JavaScript vanilla con persistencia local (`localStorage`).

En siguientes fases:
- **Fase 2:** Migración a Firebase para sincronización real.
- **Fase 3:** App móvil Flutter conectada al mismo backend.

---

##  Funcionalidades implementadas (Must Have)

- **F1.** Crear, editar y eliminar tareas con fecha y prioridad.
- **F2.** Vista calendario semanal y mensual.
- **F3.** Vista "Hoy" simplificada con 3 tareas prioritarias.
- **F5.** Marcar tareas como completadas.
- **F6.** Visibilidad cruzada de tareas de compañeros.
- **F7.** Grupo de curso pre-cargado (TUPA · 2° año con 5 compañeros).
- **F8.** Indicador visual de avance del grupo (barra y porcentajes).
- **F10.** Recordatorios visuales por fecha.

Extras incluidos:
- **Simulación de actividad del grupo en vivo:** cada ~25 segundos, un compañero completa una tarea automáticamente. Esto genera la sensación de "uso real" durante la demo.
- **Resumen semanal visual:** una vista extra (Should Have del MoSCoW) que refuerza logros.

---

##  Cómo usarlo localmente

### Opción 1: Abrir directamente en el navegador
1. Descomprimir el zip.
2. Hacer doble clic en `index.html`.
3. Listo. Funciona sin servidor.

### Opción 2: Servidor local (recomendado)
Si tu navegador bloquea algo por CORS, levanta un servidor simple:

```bash
# Con Python 3
cd syncstudy
python3 -m http.server 8000

# Luego abre http://localhost:8000 en tu navegador
```

```bash
# Con Node.js (si tienes 'serve' instalado)
npx serve
```

```bash
# Con la extensión "Live Server" de VS Code
# Click derecho sobre index.html → "Open with Live Server"
```

---

## Cómo desplegarlo en GitHub Pages (link público)

Para que el profesor pueda abrirlo con un link:

### 1. Crear repositorio en GitHub

```bash
cd syncstudy
git init
git add .
git commit -m "MVP funcional de SyncStudy"
```

Crea un repositorio nuevo en GitHub (por ejemplo: `syncstudy`), y luego:

```bash
git remote add origin https://github.com/TU-USUARIO/syncstudy.git
git branch -M main
git push -u origin main
```

### 2. Activar GitHub Pages

1. Ve a tu repositorio en GitHub.
2. Click en **Settings** (configuración) → **Pages** (en el menú lateral).
3. En **Source**, selecciona **Branch: main** y carpeta **/ (root)**.
4. Click en **Save**.
5. Espera 1–2 minutos. GitHub te dará un link como:
   ```
   https://TU-USUARIO.github.io/syncstudy/
   ```

### 3. Compartir el link

Ese link es el que muestras al profesor el día de la presentación. Solo lo abre y ya funciona.

---

##  Estructura del proyecto

```
syncstudy/
├── index.html              ← punto de entrada
├── README.md               ← este archivo
│
├── css/
│   ├── reset.css           ← normalización base
│   ├── variables.css       ← sistema de diseño (colores, espaciado)
│   ├── layout.css          ← sidebar, topbar, grilla principal
│   ├── components.css      ← botones, modal, toast, tareas, peers
│   └── views.css           ← estilos específicos de cada vista
│
└── js/
    ├── data.js             ← datos iniciales (Fabián + 5 compañeros + tareas)
    ├── storage.js          ← capa de persistencia (localStorage)
    ├── utils.js            ← helpers de fechas, DOM, toast
    ├── views.js            ← renderizado de cada vista
    └── app.js              ← inicialización y orquestación
```

### Filosofía técnica

- **Sin frameworks ni dependencias pesadas.** Solo HTML, CSS y JS vanilla.
- **Capa de Storage aislada.** Toda la persistencia pasa por `Storage`. Cuando migremos a Firebase, solo cambiamos ese archivo.
- **Render simple > performance.** El estado se reconstruye desde Storage en cada cambio. Suficiente para un MVP, más fácil de mantener.
- **Datos seed pre-cargados.** El evaluador ve la dimensión social desde el primer momento, sin tener que configurar nada.

---

##  Datos pre-cargados

### Usuario principal
- **Fabián Riquelme** (el User Persona definido en la bitácora).

### Grupo de curso: TUPA · 2° año
- Camila Soto
- Joaquín Pérez
- Valentina Cruz
- Diego Morales
- Sofía Henríquez

### Tareas
- ~20 tareas distribuidas entre los 6 estudiantes, con distintos estados (pendientes, completadas, próximas a vencer) y fechas relativas a "hoy" para que siempre se vean actuales.

---

##  Cómo demostrarlo

1. **Abrir la app.** Mostrar la pantalla "Hoy" → "Estas son las 3 tareas prioritarias de Fabián."
2. **Mostrar el indicador del grupo.** "Su grupo está al X% del día."
3. **Marcar una tarea.** Mostrar cómo el indicador del grupo se actualiza.
4. **Cambiar a vista "Mi grupo".** "Acá vemos qué está haciendo cada compañero."
5. **Esperar ~25 segundos.** Un compañero completará una tarea automáticamente, generando un toast en vivo.
6. **Ir al calendario.** Mostrar semanal y mensual.
7. **Crear una tarea nueva.** Mostrar cómo aparece inmediatamente en todas las vistas.

---

##  Resetear datos

Si quieres reiniciar los datos a su estado inicial (útil entre demos):

1. Abrir la consola del navegador (F12).
2. Ejecutar: `Storage.reset(); Views.renderAll();`
3. Listo.

O, más simple:
1. Abrir DevTools → Application → Local Storage.
2. Eliminar la clave `syncstudy.v1`.
3. Recargar la página.

---

##  Próximos pasos

- [ ] Fase 2: integrar Firebase Auth + Firestore.
- [ ] Fase 3: app móvil Flutter conectada al mismo backend.
- [ ] Implementar Should Have prioritarios (notificaciones cruzadas, categorías).
- [ ] Testeo con 5 usuarios coherentes con el User Persona Fabián.
- [ ] PWA (manifiesto + service worker) para "instalación" en celular.

---

##  Equipo

- **Matías Mcintire** — Líder técnico / App móvil
- **Leonardo Aguilera** — Frontend web / Diseño visual
- **Alfredo San Juan** — Backend / Datos / Testeo

**Asignatura:** Tecnología y Prototipado · **Docente:** Walter Noack Pérez
**Universidad Católica de Temuco** · 2026
