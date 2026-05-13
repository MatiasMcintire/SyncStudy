/* ============================================ */
/* DATOS SIMULADOS INICIALES                     */
/* ============================================ */

/**
 * Estos son los datos pre-cargados que se inyectan
 * la primera vez que la app se abre. Después, los datos
 * vivirán en localStorage y el usuario puede modificarlos.
 *
 * Filosofía: el evaluador debe ver inmediatamente la
 * dimensión social del producto, sin tener que configurarla.
 */

const SEED_DATA = {
  // Usuario principal (Fabián, el User Persona de la bitácora)
  currentUserId: 'fabian',

  // Grupo de curso pre-cargado
  group: {
    id: 'tupa-2-2026',
    name: 'TUPA · 2° año',
    members: ['fabian', 'camila', 'joaquin', 'valentina', 'diego', 'sofia']
  },

  // Usuarios del grupo (incluido Fabián)
  users: [
    {
      id: 'fabian',
      name: 'Fabián Riquelme',
      initial: 'F',
      color: '#2563eb',
      isMe: true
    },
    {
      id: 'camila',
      name: 'Camila Soto',
      initial: 'C',
      color: '#ec4899',
      isMe: false
    },
    {
      id: 'joaquin',
      name: 'Joaquín Pérez',
      initial: 'J',
      color: '#f59e0b',
      isMe: false
    },
    {
      id: 'valentina',
      name: 'Valentina Cruz',
      initial: 'V',
      color: '#10b981',
      isMe: false
    },
    {
      id: 'diego',
      name: 'Diego Morales',
      initial: 'D',
      color: '#8b5cf6',
      isMe: false
    },
    {
      id: 'sofia',
      name: 'Sofía Henríquez',
      initial: 'S',
      color: '#06b6d4',
      isMe: false
    }
  ],

  /**
   * Tareas pre-cargadas.
   * Las fechas son relativas a "hoy" para que siempre se vean actuales.
   * dayOffset = 0 → hoy, 1 → mañana, -1 → ayer, etc.
   */
  tasks: [
    // === FABIÁN (el usuario) ===
    {
      id: 't-fab-1',
      userId: 'fabian',
      title: 'Estudiar para prueba de Suelos',
      description: 'Capítulos 4 y 5 — clasificación y propiedades',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: false
    },
    {
      id: 't-fab-2',
      userId: 'fabian',
      title: 'Entregar informe de cultivos',
      description: 'Análisis de campo del semestre pasado',
      dayOffset: 0,
      subject: 'Cultivos',
      priority: 3,
      completed: false
    },
    {
      id: 't-fab-3',
      userId: 'fabian',
      title: 'Leer artículo de Sustentabilidad',
      description: '20 páginas sobre agroecología',
      dayOffset: 0,
      subject: 'Sustentabilidad',
      priority: 2,
      completed: false
    },
    {
      id: 't-fab-4',
      userId: 'fabian',
      title: 'Ejercicios de Estadística',
      description: 'Capítulo 3 completo',
      dayOffset: 2,
      subject: 'Estadística',
      priority: 2,
      completed: false
    },
    {
      id: 't-fab-5',
      userId: 'fabian',
      title: 'Vocabulario en Inglés',
      description: 'Lista de 30 palabras técnicas',
      dayOffset: -1,
      subject: 'Inglés',
      priority: 1,
      completed: true
    },
    {
      id: 't-fab-6',
      userId: 'fabian',
      title: 'Resumen de clase de Suelos',
      dayOffset: -2,
      subject: 'Suelos',
      priority: 2,
      completed: true
    },

    // === CAMILA ===
    {
      id: 't-cam-1',
      userId: 'camila',
      title: 'Preparar presentación de Cultivos',
      dayOffset: 1,
      subject: 'Cultivos',
      priority: 3,
      completed: false
    },
    {
      id: 't-cam-2',
      userId: 'camila',
      title: 'Estudiar para prueba de Suelos',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: true
    },
    {
      id: 't-cam-3',
      userId: 'camila',
      title: 'Ejercicios de Estadística',
      dayOffset: 2,
      subject: 'Estadística',
      priority: 2,
      completed: true
    },

    // === JOAQUÍN ===
    {
      id: 't-joa-1',
      userId: 'joaquin',
      title: 'Informe de cultivos',
      dayOffset: 0,
      subject: 'Cultivos',
      priority: 3,
      completed: false
    },
    {
      id: 't-joa-2',
      userId: 'joaquin',
      title: 'Leer artículo de Sustentabilidad',
      dayOffset: 0,
      subject: 'Sustentabilidad',
      priority: 2,
      completed: true
    },
    {
      id: 't-joa-3',
      userId: 'joaquin',
      title: 'Estudiar Suelos cap. 4',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: false
    },

    // === VALENTINA ===
    {
      id: 't-val-1',
      userId: 'valentina',
      title: 'Resumen Sustentabilidad',
      dayOffset: 0,
      subject: 'Sustentabilidad',
      priority: 2,
      completed: true
    },
    {
      id: 't-val-2',
      userId: 'valentina',
      title: 'Prueba de Suelos',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: true
    },
    {
      id: 't-val-3',
      userId: 'valentina',
      title: 'Ejercicios Estadística',
      dayOffset: 2,
      subject: 'Estadística',
      priority: 2,
      completed: true
    },
    {
      id: 't-val-4',
      userId: 'valentina',
      title: 'Vocabulario Inglés',
      dayOffset: -1,
      subject: 'Inglés',
      priority: 1,
      completed: true
    },

    // === DIEGO ===
    {
      id: 't-die-1',
      userId: 'diego',
      title: 'Informe de cultivos',
      dayOffset: 0,
      subject: 'Cultivos',
      priority: 3,
      completed: false
    },
    {
      id: 't-die-2',
      userId: 'diego',
      title: 'Estudiar Suelos',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: false
    },

    // === SOFÍA ===
    {
      id: 't-sof-1',
      userId: 'sofia',
      title: 'Lectura de Sustentabilidad',
      dayOffset: 0,
      subject: 'Sustentabilidad',
      priority: 2,
      completed: true
    },
    {
      id: 't-sof-2',
      userId: 'sofia',
      title: 'Prueba de Suelos',
      dayOffset: 1,
      subject: 'Suelos',
      priority: 3,
      completed: false
    },
    {
      id: 't-sof-3',
      userId: 'sofia',
      title: 'Vocabulario en Inglés',
      dayOffset: -1,
      subject: 'Inglés',
      priority: 1,
      completed: true
    }
  ]
};
