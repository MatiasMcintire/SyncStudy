# SyncStudy — Paquete de Diseño

Este paquete contiene la documentación visual y los wireframes que guían la construcción del producto en sus dos plataformas: web y aplicación móvil.

---

## Contenido

```
design-system/
├── SISTEMA_DISENO.md            Documentación completa del sistema visual
├── README.md                    Este archivo
└── wireframes/
    ├── 01-hoy-desktop.svg       Pantalla Hoy en versión escritorio
    ├── 02-calendario-desktop.svg Calendario semanal en escritorio
    ├── 03-grupo-desktop.svg     Vista Mi grupo en escritorio
    ├── 04-modal-tarea-desktop.svg Modal de creación/edición de tarea
    ├── 05-hoy-mobile.svg        Pantalla Hoy en versión móvil
    ├── 06-calendario-mobile.svg Calendario mensual en móvil
    └── 07-grupo-mobile.svg      Vista Mi grupo en móvil
```

---

## Para qué sirve este paquete

Este paquete es el **lenguaje visual común** del equipo. Antes de que cada integrante construya su parte (Leonardo la web, Matías la app móvil), todos deben acordar cómo se ve y se siente el producto.

Sin esta capa de definición previa, cada plataforma terminaría con interpretaciones distintas del mismo concepto. Con ella, web y aplicación móvil se sienten parte del mismo producto.

### Para cada integrante

| Integrante | Cómo usar este paquete |
| :--- | :--- |
| Leonardo | Replicar el sistema de diseño en CSS y validar visualmente cada pantalla contra los wireframes desktop. |
| Matías | Convertir los wireframes mobile en widgets Flutter, manteniendo los colores y espaciados definidos. |
| Alfredo | Verificar que los datos pre-cargados respeten los nombres, colores y roles asignados a cada compañero. |

---

## Cómo abrir los wireframes

Los archivos están en formato SVG, lo que ofrece varias ventajas:

- Se abren directamente en cualquier navegador moderno haciendo doble clic.
- Pueden importarse a Figma con la opción "Place image" o arrastrando el archivo al lienzo.
- Son editables: cualquier editor de texto permite modificar dimensiones, colores y posiciones.
- Escalan sin pérdida de calidad para presentaciones e impresiones.

### Importación a Figma

1. Abrir un archivo nuevo en Figma.
2. Arrastrar todos los SVG al lienzo.
3. Cada wireframe se convierte en un frame editable.
4. Sobre ellos se pueden hacer iteraciones, pintar componentes encima o exportar a imagen.

### Visualización rápida

Para visualizar todos los wireframes secuencialmente, abrir cualquiera de ellos en el navegador y luego abrir los demás en pestañas nuevas. La numeración del archivo permite seguir el orden lógico de las pantallas.

---

## Decisiones de diseño documentadas

### Por qué desktop primero y luego móvil

Aunque la mayoría de los estudiantes usará la app móvil, el desktop es donde se ha desarrollado el MVP funcional. Los wireframes desktop reflejan el estado actual del prototipo y los móvil proyectan la versión Flutter siguiente.

### Por qué bottom navigation en móvil y sidebar en desktop

En desktop hay espacio horizontal sobrante: una barra lateral fija aprovecha ese espacio sin restar área de contenido. En móvil, el contenido es el rey: la navegación se desplaza al borde inferior, donde el pulgar la alcanza naturalmente.

### Por qué solo cuatro vistas

El sistema deliberadamente mantiene un número bajo de vistas principales (Hoy, Calendario, Grupo, Resumen). Más opciones significaría más fricción cognitiva, contradiciendo uno de los insights clave de la bitácora: "una estructura tan ligera que no se sienta como una obligación más".

### Por qué los compañeros tienen colores asignados

La identificación visual rápida es clave en una vista colaborativa. Cada compañero tiene un color único, lo que permite reconocerlo a primera vista en cualquier pantalla, sin necesidad de leer su nombre.

---

## Próximos pasos

Una vez aprobado este paquete por el equipo:

1. Leonardo verifica que el MVP web ya implementado coincide con los wireframes desktop. Ajusta lo necesario.
2. Matías comienza a construir las pantallas Flutter usando los wireframes móvil como referencia.
3. Alfredo valida que el modelo de datos del backend respeta los nombres y atributos definidos.
4. El equipo revisa este paquete cada vez que surja una duda de diseño durante el desarrollo.

Si durante el desarrollo se detecta una mejora visual significativa, esta debe documentarse en el sistema de diseño antes de implementarse en ambas plataformas. La regla es: primero el documento, después el código.
