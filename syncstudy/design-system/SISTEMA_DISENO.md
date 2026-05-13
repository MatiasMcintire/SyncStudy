# SyncStudy — Sistema de Diseño

Documentación visual y técnica del sistema de diseño del proyecto. Esta guía es la fuente de verdad para cualquier decisión visual: si web y app no coinciden con este documento, el documento manda.

---

## Filosofía de diseño

SyncStudy es una herramienta para estudiantes que ya están sobrecargados de estímulos. Por eso, el sistema de diseño obedece a tres principios:

1. **Calma sobre estridencia.** Ningún elemento visual debe competir con el contenido. El usuario es Fabián, no el producto.
2. **Espacio en blanco como recurso.** Donde otros productos meten información, nosotros dejamos respirar.
3. **Lo social hecho visible.** La presencia de los compañeros se transmite con color y movimiento sutiles, no con notificaciones invasivas.

Referencias estéticas: Notion, Linear, Things 3, Cron.

---

## Paleta de colores

### Colores neutros

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--color-bg` | `#FFFFFF` | Fondo principal de contenido |
| `--color-bg-soft` | `#F7F7F8` | Fondo de la barra lateral y áreas secundarias |
| `--color-surface` | `#FAFAFA` | Tarjetas elevadas, áreas internas |
| `--color-border` | `#E5E7EB` | Bordes y separadores sutiles |
| `--color-border-strong` | `#D1D5DB` | Bordes con presencia (hover, foco) |

### Texto

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--color-text` | `#1D1D1F` | Texto principal, títulos |
| `--color-text-soft` | `#4B5563` | Texto secundario, descripciones |
| `--color-text-muted` | `#9CA3AF` | Etiquetas, metadatos, texto auxiliar |

### Acento

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--color-accent` | `#2563EB` | Color principal del producto |
| `--color-accent-hover` | `#1D4ED8` | Estado hover del color principal |
| `--color-accent-soft` | `#EFF6FF` | Fondos de elementos activos |
| `--color-accent-text` | `#1E40AF` | Texto sobre fondos suaves del acento |

### Estados

| Token | Hex | Uso |
| :--- | :--- | :--- |
| `--color-success` | `#10B981` | Tareas completadas, progreso positivo |
| `--color-success-soft` | `#ECFDF5` | Fondos suaves de éxito |
| `--color-warning` | `#F59E0B` | Advertencias, plazos próximos |
| `--color-warning-soft` | `#FFFBEB` | Fondos suaves de advertencia |
| `--color-danger` | `#EF4444` | Errores, eliminaciones |
| `--color-danger-soft` | `#FEF2F2` | Fondos suaves de error |

### Prioridades de tareas

| Prioridad | Color | Hex | Fondo suave |
| :--- | :--- | :--- | :--- |
| Alta | Rojo | `#EF4444` | `#FEE2E2` |
| Media | Naranjo | `#F59E0B` | `#FEF3C7` |
| Baja | Verde | `#10B981` | `#D1FAE5` |

### Colores de avatar (por compañero)

Cada miembro del grupo tiene asignado un color identificador. Estos colores se usan solo en avatares y elementos asociados directamente a esa persona.

| Usuario | Color | Hex |
| :--- | :--- | :--- |
| Fabián (usuario actual) | Azul | `#2563EB` |
| Camila | Rosa | `#EC4899` |
| Joaquín | Naranjo | `#F59E0B` |
| Valentina | Verde | `#10B981` |
| Diego | Violeta | `#8B5CF6` |
| Sofía | Cian | `#06B6D4` |

---

## Tipografía

### Familia tipográfica

**Inter** (Google Fonts), con fallback a la familia del sistema operativo.

```
font-family: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', sans-serif;
```

### Escala tipográfica

| Token | Tamaño | Uso típico |
| :--- | :---: | :--- |
| `--font-size-xs` | 11px | Etiquetas, metadatos, captions |
| `--font-size-sm` | 13px | Texto secundario, botones |
| `--font-size-base` | 14px | Texto base de la aplicación |
| `--font-size-md` | 15px | Texto destacado |
| `--font-size-lg` | 17px | Subtítulos de sección |
| `--font-size-xl` | 20px | Títulos principales |
| `--font-size-2xl` | 24px | Encabezados de vista |
| `--font-size-3xl` | 32px | Saludos, números destacados |

### Pesos

- Regular (400) — texto corrido
- Medium (500) — botones, etiquetas, énfasis sutil
- Semibold (600) — títulos, números, nombres
- Bold (700) — solo para números destacados (estadísticas)

### Características

- Interlineado base: 1.5
- Espaciado entre letras de títulos: -0.01em (ligeramente apretado)
- Renderizado: antialiasing activado

---

## Espaciado

Sistema de espaciado en múltiplos de 4px para mantener consistencia visual.

| Token | Valor | Uso típico |
| :--- | :---: | :--- |
| `--space-1` | 4px | Separación mínima entre elementos hermanos |
| `--space-2` | 8px | Padding interno de elementos pequeños |
| `--space-3` | 12px | Gap entre elementos relacionados |
| `--space-4` | 16px | Padding estándar de tarjetas |
| `--space-5` | 20px | Padding generoso |
| `--space-6` | 24px | Separación entre secciones cercanas |
| `--space-8` | 32px | Padding de vistas, gap entre secciones |
| `--space-10` | 40px | Separación entre bloques principales |
| `--space-12` | 48px | Espaciado de hero |
| `--space-16` | 64px | Espaciado máximo |

---

## Radios de borde

| Token | Valor | Uso |
| :--- | :---: | :--- |
| `--radius-sm` | 6px | Pills pequeñas, badges |
| `--radius-md` | 8px | Botones, inputs, items de tarea |
| `--radius-lg` | 12px | Tarjetas, paneles |
| `--radius-xl` | 16px | Modales, contenedores grandes |
| `--radius-full` | 999px | Avatares circulares, pills redondeadas |

---

## Sombras

Las sombras son sutiles. La elevación se sugiere, no se grita.

| Token | Uso |
| :--- | :--- |
| `--shadow-xs` | Tarjetas en reposo, separación mínima del fondo |
| `--shadow-sm` | Hover de elementos interactivos |
| `--shadow-md` | Dropdowns, tooltips |
| `--shadow-lg` | Tarjetas elevadas, paneles laterales |
| `--shadow-xl` | Modales |

---

## Componentes base

### Botones

#### Botón primario

```
Color de fondo:    --color-accent  (#2563EB)
Color de texto:    blanco
Padding:           8px × 16px
Radio:             8px (--radius-md)
Peso de fuente:    500 (medium)
Tamaño de fuente:  13px (--font-size-sm)
Transición:        120ms en todos los cambios
Estado hover:      fondo cambia a --color-accent-hover
```

Uso: acciones principales (Nueva tarea, Guardar, Confirmar).

#### Botón secundario

```
Color de fondo:    --color-bg-soft
Color de texto:    --color-text
Borde:             1px sólido --color-border
Mismas dimensiones que el primario
```

Uso: acciones de soporte (Cancelar, Volver).

#### Botón fantasma

```
Color de fondo:    transparente
Color de texto:    --color-danger
Estado hover:      fondo --color-danger-soft
```

Uso: acciones destructivas suaves (Eliminar).

#### Botón de icono

```
Dimensiones:       32px × 32px
Forma:             cuadrada con --radius-md
Contenido:         solo icono Lucide
Estado hover:      fondo --color-bg-soft
```

Uso: navegación del calendario, cerrar modales, menú móvil.

---

### Tarjetas

#### Tarjeta de tarea (Task Item)

```
Fondo:             blanco
Borde:             1px sólido --color-border
Radio:             --radius-md (8px)
Padding:           16px
Display:           flex con gap de 12px
Elementos:         [checkbox redondo] [contenido]
Estado hover:      borde --color-border-strong + sombra --shadow-sm
Estado completed:  opacidad 55%, fondo --color-bg-soft, título tachado
```

#### Tarjeta de miembro (Member Card)

```
Fondo:             blanco
Borde:             1px sólido --color-border (--color-accent si is-me)
Radio:             --radius-lg (12px)
Padding:           20px
Estructura:        avatar + nombre + mini-tareas + barra de progreso
```

#### Tarjeta de progreso (Progress Card)

```
Fondo:             --color-bg-soft
Borde:             1px sólido --color-border
Radio:             --radius-lg
Padding:           20px
Contenido:         header con icono + barra + estadística + caption
```

---

### Checkbox redondo de tarea

Diseño no tradicional, optimizado para sensación de cierre:

```
Dimensiones:       22px × 22px
Forma:             círculo perfecto
Reposo:            borde 2px --color-border-strong, fondo blanco
Hover:             borde --color-accent
Activado:          fondo --color-success, check blanco dibujado con bordes
```

---

### Pills de prioridad

Pequeñas etiquetas redondeadas que indican prioridad:

```
Padding:           2px × 8px
Radio:             --radius-full
Tamaño de fuente:  --font-size-xs (11px)
Peso:              500 (medium)
Espaciado letras:  0.01em
```

Variantes:
- Alta: fondo `--color-priority-high-soft`, texto `--color-priority-high`
- Media: fondo `--color-priority-med-soft`, texto `--color-priority-med`
- Baja: fondo `--color-priority-low-soft`, texto `--color-priority-low`

---

### Barra de progreso

```
Altura:            6px o 8px (según contexto)
Fondo del riel:    --color-bg-soft
Color de relleno:  --color-success
Radio:             --radius-full
Transición:        300ms en cambios de ancho
```

---

### Avatar

```
Dimensiones:       36px (sidebar), 32px (peer card), 44px (member card)
Forma:             círculo
Fondo:             color asignado al usuario
Texto:             inicial del nombre, blanco, 600 (semibold)
```

---

### Modal

```
Backdrop:          rgba(0, 0, 0, 0.4) + blur 2px
Panel:             ancho máximo 480px, alto máximo 90vh
Fondo del panel:   blanco
Radio:             --radius-lg (12px)
Sombra:            --shadow-xl
Animación entrada: slide-up 200ms desde 20px abajo + fade-in
```

Estructura:

1. Header (24px padding) con título y botón de cerrar
2. Body (24px padding) con el formulario
3. Footer con botones alineados a la derecha

---

### Toast (notificación inferior)

```
Posición:          fixed bottom, centrado horizontal
Fondo:             --color-text (gris oscuro casi negro)
Color de texto:    blanco
Padding:           12px × 20px
Radio:             --radius-md
Display:           flex con icono + mensaje
Animación:         slide-up desde fuera de pantalla, 200ms
Duración visible:  2500ms
```

---

### Sidebar (barra lateral de navegación)

```
Ancho:             240px (desktop), 80% del viewport (móvil, colapsable)
Fondo:             --color-bg-soft
Borde derecho:     1px sólido --color-border
Padding:           24px 16px
```

Estructura vertical:

1. Brand (logo + nombre del producto)
2. Navegación principal (items)
3. Usuario actual (avatar + nombre + grupo)

#### Item de navegación

```
Padding:           8px 12px
Display:           flex con gap de 12px
Icono:             18px
Texto:             13px medium
Estado reposo:     color --color-text-soft
Estado hover:      fondo rgba(0,0,0,0.04), color --color-text
Estado activo:     fondo blanco, sombra --shadow-xs
```

---

### Topbar (barra superior)

```
Altura:            64px
Borde inferior:    1px sólido --color-border
Padding lateral:   32px (desktop), 16px (móvil)
Posición:          sticky top
Z-index:           10
```

Estructura: [botón menú móvil] [título] [acciones a la derecha]

---

## Iconografía

**Librería:** Lucide Icons (CDN)

### Tamaños

- Iconos de navegación: 18px
- Iconos en botones: 16px
- Iconos en metadatos: 12px
- Iconos en avatares de marca: 20px

### Estilo

Solo iconos de **línea** (outline). Nunca rellenos. Coherentes con la estética minimalista del producto.

### Iconos utilizados en el MVP

| Contexto | Icono Lucide |
| :--- | :--- |
| Logo del producto | `calendar-sync` |
| Vista Hoy | `sun` |
| Vista Calendario | `calendar` |
| Vista Grupo | `users` |
| Vista Resumen | `bar-chart-3` |
| Crear tarea | `plus` |
| Marcar completada | `check` |
| Eliminar | `trash-2` |
| Menú móvil | `menu` |
| Cerrar | `x` |
| Navegación | `chevron-left`, `chevron-right` |
| Asignatura | `book-open` |
| Fecha | `calendar` |
| Notificación de éxito | `check-circle-2` |
| Bienvenida | `sparkles` |

---

## Transiciones y animaciones

### Velocidades

| Token | Duración | Uso |
| :--- | :---: | :--- |
| `--transition-fast` | 120ms | Hover, focus, micro-interacciones |
| `--transition-base` | 200ms | Aparición de vistas, modales, toasts |
| `--transition-slow` | 300ms | Barras de progreso, transiciones grandes |

### Curva de animación

Todas las transiciones usan `cubic-bezier(0.4, 0, 0.2, 1)`, una curva estándar de Material Design que suaviza la entrada y salida sin sentir mecánica.

### Animaciones definidas

#### fadeIn

```
0%:   opacity 0, translateY 4px
100%: opacity 1, translateY 0
Duración: --transition-base
```

Uso: aparición de vistas al cambiar.

#### slideUp

```
0%:   opacity 0, translateY 20px
100%: opacity 1, translateY 0
Duración: --transition-base
```

Uso: aparición del modal.

---

## Layout y grid

### Estructura principal

```
┌────────────────────────────────────────────┐
│ SIDEBAR  │  TOPBAR                          │
│ 240px    ├──────────────────────────────────┤
│          │                                  │
│          │  MAIN CONTENT                    │
│          │  max-width: 960px                │
│          │  padding: 32px                   │
│          │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Breakpoints responsive

| Breakpoint | Comportamiento |
| :--- | :--- |
| ≥ 769px (desktop) | Sidebar fijo a la izquierda, contenido a la derecha |
| ≤ 768px (móvil) | Sidebar colapsado con overlay, toggle desde topbar |
| ≤ 480px (móvil pequeño) | Grids de una sola columna, paddings reducidos |

---

## Patrones de interacción

### Marcar tarea como completada

1. Usuario hace clic en el checkbox redondo.
2. Transición de 120ms: borde se reemplaza por relleno verde, aparece check blanco.
3. La fila completa baja su opacidad al 55% y el título se tacha.
4. Toast aparece: "Tarea completada".
5. Indicador del grupo se actualiza con transición de 300ms.

### Crear tarea nueva

1. Usuario hace clic en "Nueva tarea" (topbar) o en una tarjeta del calendario.
2. Modal aparece con animación slide-up.
3. Foco automático en el campo "Título".
4. Al guardar, modal se cierra, toast confirma, todas las vistas se re-renderizan.

### Cambiar de vista

1. Usuario hace clic en un item del sidebar.
2. El item activo se actualiza (fondo blanco + sombra).
3. La vista anterior desaparece, la nueva aparece con fadeIn.
4. El título de la topbar se actualiza.

### Compañero completa tarea (simulación en vivo)

1. Cada ~25 segundos, un compañero del grupo completa una tarea.
2. Toast aparece desde abajo: "Camila completó: Estudiar para prueba de Suelos".
3. Si el usuario está en la vista Grupo, su tarjeta de progreso se actualiza.
4. El indicador grupal de la vista Hoy también se actualiza.

---

## Adaptación a Flutter

Para mantener la coherencia entre web y app móvil, este sistema de diseño se traduce a Flutter manteniendo todos los tokens. La equivalencia principal:

### Colores

Definir un archivo `lib/theme/colors.dart` que exporte todos los colores como constantes:

```
class AppColors {
  static const bg = Color(0xFFFFFFFF);
  static const bgSoft = Color(0xFFF7F7F8);
  static const text = Color(0xFF1D1D1F);
  static const accent = Color(0xFF2563EB);
  // ... resto de tokens
}
```

### Tipografía

Definir un archivo `lib/theme/typography.dart` con `TextStyle` para cada tamaño y peso del sistema.

### Espaciado

Definir constantes en `lib/theme/spacing.dart`:

```
class AppSpacing {
  static const x1 = 4.0;
  static const x2 = 8.0;
  static const x3 = 12.0;
  // ...
}
```

### Componentes

Crear widgets reutilizables en `lib/widgets/` que repliquen los componentes web: `TaskItem`, `MemberCard`, `PeerCard`, `ProgressCard`, etc.

---

## Checklist de coherencia entre plataformas

Para garantizar que la web y la app móvil se vean del "mismo producto", validar cada uno de estos puntos antes de la entrega final:

- [ ] Paleta de colores idéntica en ambas plataformas
- [ ] Tipografía Inter aplicada en ambas (en Flutter usar `google_fonts`)
- [ ] Mismos tamaños de fuente en cada nivel jerárquico
- [ ] Mismas dimensiones de avatares
- [ ] Mismos colores asignados a cada compañero del grupo
- [ ] Mismos textos en botones, etiquetas y mensajes
- [ ] Misma estructura de pantallas (Hoy, Calendario, Grupo, Resumen)
- [ ] Mismas animaciones de feedback (toasts, transiciones)
- [ ] Misma jerarquía visual (qué es lo más importante en cada pantalla)
- [ ] Mismas decisiones de UX (ej: top 3 tareas en Hoy, no más)

Si algún punto no coincide, prevalece este documento de sistema de diseño.

---

## Versionado del sistema

| Versión | Fecha | Cambios |
| :---: | :--- | :--- |
| 1.0 | Mayo 2026 | Versión inicial. Base del MVP Fase 1. |

Cualquier cambio futuro al sistema de diseño se documenta en esta tabla con su justificación.
