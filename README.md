# SyncStudy

Calendario colaborativo para la organización académica de estudiantes desde los 15 años en adelante.

---

## Descripción

SyncStudy es una aplicación web que permite a estudiantes de un mismo curso compartir, visualizar y dar seguimiento mutuo a sus tareas y plazos académicos. A diferencia de un calendario tradicional, centrado en el usuario individual, SyncStudy convierte la organización en una experiencia social: cada estudiante ve no solo sus propias tareas, sino también el avance de sus compañeros, transformando la planificación solitaria en una práctica grupal sostenida en el tiempo.

Este repositorio contiene la primera fase del prototipo: una web app funcional con persistencia local, desarrollada como entregable de la asignatura Tecnología y Prototipado.

---

## Contexto académico

| Campo | Detalle |
| :--- | :--- |
| Institución | Universidad Católica de Temuco |
| Carrera | Técnico Universitario en Producción Agropecuaria Sostenible |
| Asignatura | Tecnología y Prototipado |
| Docente | Walter Noack Pérez |
| Evaluación | N°2 — Etapa de Prototipado del Design Thinking |
| Año | 2026 |

### Equipo

- Matías Mcintire — Líder técnico y desarrollo móvil
- Leonardo Aguilera — Desarrollo web y diseño visual
- Alfredo San Juan — Backend, modelo de datos y testeo con usuarios

---

## Fundamentación del prototipo

El prototipo es la materialización de la idea ganadora seleccionada en la matriz de selección de la Evaluación N°2. La solución responde al siguiente Problem Statement, definido en la etapa de definición:

> "Estudiantes desde los 15 años en adelante en Chile, expuestos a entornos académicos exigentes y a una alta densidad de distracciones digitales, presentan dificultades para sostener en el tiempo hábitos consistentes de organización académica y cotidiana, lo que afecta su rendimiento, bienestar emocional y autoeficacia."

El elemento diferencial de SyncStudy frente a cualquier calendario individual es la visibilidad cruzada entre pares: la organización deja de ser un acto solitario y se convierte en una práctica compartida, abordando directamente el aislamiento detectado en la etapa de empatía como una de las causas estructurales del problema.

---

## Alcance de esta fase

Esta versión corresponde a la Fase 1 del prototipo: una web app funcional construida con tecnologías web nativas y persistencia local. Implementa las funcionalidades clasificadas como Must Have en el método MoSCoW aplicado durante la planificación del prototipo.

### Fases posteriores planificadas

| Fase | Alcance | Estado |
| :---: | :--- | :--- |
| 1 | Web app funcional con persistencia local | Implementada |
| 2 | Migración a Firebase con sincronización en tiempo real | Planificada |
| 3 | Aplicación móvil Flutter conectada al mismo backend | Planificada |

### Funcionalidades implementadas

Las funcionalidades Must Have, derivadas del análisis MoSCoW, están todas operativas en esta fase:

| Código | Funcionalidad | Justificación |
| :--- | :--- | :--- |
| F1 | Crear, editar y eliminar tareas con fecha, prioridad y asignatura | Funcionalidad base de cualquier sistema de organización. |
| F2 | Vista calendario semanal y mensual | Permite la distribución temporal de las tareas para anticipar plazos. |
| F3 | Vista "Hoy" simplificada con tres tareas prioritarias | Reduce la fricción cognitiva al mostrar solo lo esencial del día. |
| F5 | Marcar tareas como completadas | Mecanismo de cierre psicológico y alimentación del indicador grupal. |
| F6 | Visibilidad cruzada de tareas entre compañeros del grupo | Núcleo diferencial de la solución; materializa la dimensión social. |
| F7 | Grupo de curso pre-cargado | Reduce a cero la fricción inicial de adopción. |
| F8 | Indicador visual del avance grupal | Hace tangible el componente social y transforma la culpa individual en accountability colectiva. |
| F10 | Recordatorios visuales por proximidad de fecha | Cumple la expectativa básica de un sistema de organización. |

Adicionalmente se incluye una vista de resumen semanal, clasificada como Should Have en el MoSCoW, que refuerza positivamente al usuario al final de cada semana.

---

## Arquitectura técnica

### Stack

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| Estructura | HTML5 semántico | Compatibilidad universal, sin compilación. |
| Estilo | CSS3 con variables nativas | Sistema de diseño mantenible sin frameworks. |
| Lógica | JavaScript ES6 en adelante, sin frameworks | Sin dependencias, cero riesgos de incompatibilidad. |
| Iconografía | Lucide Icons servido vía CDN | Iconos de línea coherentes con la estética del producto. |
| Tipografía | Inter desde Google Fonts | Tipografía moderna y legible, ampliamente adoptada en productos digitales. |
| Persistencia | localStorage del navegador | Suficiente para validación del concepto en esta fase. |

### Principios de diseño técnico

El proyecto sigue cuatro principios que guían cada decisión técnica:

1. Capa de persistencia aislada. Todo acceso a localStorage pasa por el módulo `Storage`. Esto permite migrar a Firebase en la Fase 2 modificando un solo archivo.
2. Renderizado simple sobre rendimiento. El estado se reconstruye desde el storage en cada cambio. Es una decisión deliberada que prioriza la mantenibilidad sobre la optimización prematura.
3. Datos seed pre-cargados. El evaluador percibe la dimensión social del producto desde el primer acceso, sin requerir configuración manual.
4. Sin frameworks ni dependencias en runtime. El proyecto se ejecuta directamente desde un navegador moderno.

---

## Estructura del repositorio

```
syncstudy/
├── index.html               Punto de entrada de la aplicación
├── README.md                Este documento
├── .gitignore               Exclusiones de control de versiones
│
├── css/
│   ├── reset.css            Normalización de estilos base
│   ├── variables.css        Sistema de diseño (paleta, espaciado, tipografía)
│   ├── layout.css           Estructura general (sidebar, topbar, grilla)
│   ├── components.css       Componentes reutilizables
│   └── views.css            Estilos específicos por vista
│
└── js/
    ├── data.js              Datos iniciales (usuarios, grupo, tareas)
    ├── storage.js           Capa de persistencia
    ├── utils.js             Utilidades (fechas, DOM, notificaciones)
    ├── views.js             Renderizado de vistas
    └── app.js               Inicialización, navegación y orquestación
```

### Modelo de datos

El estado de la aplicación se compone de tres entidades principales:

```
users:    { id, name, initial, color, isMe }
group:    { id, name, members[] }
tasks:    { id, userId, title, description, dueDate,
            subject, priority, completed, createdAt }
```

Esta estructura es deliberadamente análoga al esquema que se utilizará en Firestore durante la Fase 2, facilitando la migración futura.

---

## Ejecución local

### Opción 1: Apertura directa

Abrir el archivo `index.html` directamente en un navegador moderno (Chrome, Firefox, Safari o Edge en sus versiones recientes). No se requiere instalación de dependencias.

### Opción 2: Servidor local

Se recomienda servir el proyecto mediante un servidor local para evitar restricciones de seguridad del navegador relacionadas con el protocolo `file://`.

Usando Python 3:

```
cd syncstudy
python3 -m http.server 8000
```

Luego, abrir `http://localhost:8000` en el navegador.

Usando Node.js:

```
cd syncstudy
npx serve
```

Usando Visual Studio Code: instalar la extensión Live Server y abrir `index.html` con la opción "Open with Live Server".

---

## Despliegue en GitHub Pages

Para generar un enlace público accesible desde cualquier dispositivo:

### 1. Inicialización del repositorio

```
cd syncstudy
git init
git add .
git commit -m "Versión inicial del prototipo SyncStudy"
```

### 2. Conexión con GitHub

Crear un repositorio nuevo en GitHub y enlazar el repositorio local:

```
git remote add origin https://github.com/USUARIO/syncstudy.git
git branch -M main
git push -u origin main
```

### 3. Activación de GitHub Pages

En la interfaz web de GitHub, dentro del repositorio creado, acceder a la sección Settings, seleccionar Pages en el menú lateral, y configurar el origen como rama `main` y carpeta raíz `/`. Tras unos minutos, GitHub publicará el sitio en una URL del formato:

```
https://USUARIO.github.io/syncstudy/
```

Esta URL constituye el enlace de demostración para presentaciones, validación con usuarios y entregas académicas.

---

## Datos pre-cargados

La aplicación inicializa con un conjunto de datos coherente con el User Persona Fabián Riquelme, definido en la bitácora del proyecto.

### Usuario principal

Fabián Riquelme, estudiante de la carrera Técnico Universitario en Producción Agropecuaria Sostenible, segundo año. Encarna el patrón del estudiante intermitente identificado como User Persona en la etapa de empatía.

### Grupo de curso

TUPA · 2° año, compuesto por seis estudiantes incluido Fabián. Los compañeros simulados son: Camila Soto, Joaquín Pérez, Valentina Cruz, Diego Morales y Sofía Henríquez.

### Tareas iniciales

Aproximadamente veinte tareas distribuidas entre los seis estudiantes, con distintos estados (pendientes, completadas, próximas a vencer) y fechas relativas a la fecha actual del sistema, de modo que el conjunto siempre se mantenga vigente.

---

## Comportamiento dinámico del grupo

Para reforzar la dimensión social durante las sesiones de demostración y validación, la aplicación incluye un mecanismo de simulación de actividad: cada veinticinco segundos, un compañero del grupo completa una tarea pendiente de forma automática, generando una notificación visual.

Este comportamiento no afecta las tareas del usuario actual y puede observarse durante el uso normal de la aplicación. Su propósito es transmitir la sensación de un grupo activo y permitir que el evaluador experimente la naturaleza colaborativa del producto sin requerir múltiples usuarios reales conectados simultáneamente.

---

## Reinicio del estado de la aplicación

Durante el desarrollo o la preparación de demostraciones, puede requerirse restablecer la aplicación a su estado inicial. Existen dos métodos.

### Método 1: Consola del navegador

Abrir las herramientas de desarrollo del navegador (tecla F12) y ejecutar en la consola:

```
Storage.reset();
Views.renderAll();
```

### Método 2: Borrado manual del almacenamiento

En las herramientas de desarrollo, acceder a la pestaña Application (Chrome y Edge) o Storage (Firefox), localizar la sección Local Storage, eliminar la clave `syncstudy.v1` y recargar la página.

---

## Compatibilidad

La aplicación ha sido diseñada y probada en las versiones recientes de los siguientes navegadores:

- Google Chrome 120 o superior
- Mozilla Firefox 121 o superior
- Microsoft Edge 120 o superior
- Apple Safari 17 o superior

El diseño es responsivo y se adapta a resoluciones desde 360 píxeles de ancho hasta pantallas de alta resolución de escritorio.

---

## Próximos pasos

El presente prototipo constituye la primera de tres fases planificadas para el ciclo completo de prototipado. Las tareas pendientes son:

1. Implementación de las funcionalidades clasificadas como Should Have en el MoSCoW.
2. Integración con Firebase Authentication y Firestore para sincronización en tiempo real entre dispositivos.
3. Desarrollo de la aplicación móvil en Flutter para Android e iOS, conectada al mismo backend.
4. Ejecución de sesiones de testeo con cinco usuarios coherentes con el perfil de User Persona definido en la bitácora.
5. Documentación de hallazgos del testeo y ajustes iterativos al prototipo.

---

## Licencia

Este proyecto se desarrolla con fines exclusivamente académicos como parte de la evaluación del curso Tecnología y Prototipado en la Universidad Católica de Temuco. Su distribución y uso fuera de este contexto requiere autorización previa del equipo desarrollador.
