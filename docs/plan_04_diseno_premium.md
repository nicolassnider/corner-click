# Plan de Mejora: Diseño Premium y Rendimiento Gráfico

Este plan busca optimizar los efectos visuales complejos (glassmorphism, brillos de neón) para que corran fluidos en cualquier dispositivo, especialmente en la vista de espectador (TV).

## Decisiones Arquitectónicas (Basadas en Feedback)

> [!NOTE]
>
> - **Dispositivo Objetivo (Samsung Smart TVs):** Ya que apuntamos a medianos y grandes televisores Samsung (cuyo sistema operativo Tizen usa navegadores basados en Chromium web engines de recursos más limitados que una PC), es indispensable que cualquier efecto visual grande (sombras tipo neón o blur) utilice aceleración por GPU.

## Proposed Changes

### Optimización CSS (`packages/shared-styles` y `apps/web-judges`)

- Auditar y reemplazar transiciones de propiedades costosas para la CPU como `width`, `height`, o `margin` por propiedades de matriz: `transform: scale()`, `transform: translate()`.
- Añadir explícitamente `will-change: transform, opacity` a las animaciones de los marcadores, sobre todo en los destellos de neón rojo/azul de los jueces y el parpadeo del modo "Cerrado/Abierto".
- Forzar la creación de capas gráficas (Compositing) en elementos clave del DOM mediante el hack `transform: translateZ(0)` para asegurar los 60 FPS estables en televisores Samsung.

### Accesibilidad (Alto Contraste)

- Revisar las paletas de colores del modo TV para cumplir con las normativas WCAG.
- Asegurar de que la información textual tenga un contraste mínimo de 4.5:1 respecto al fondo, incluso con efectos glassmorphism de fondo.

## Verification Plan

### Manual Verification

- Utilizar las herramientas de desarrollador de Chrome simulando un entorno de bajos recursos gráficos (CPU Throttling) y usar la Pestaña **Rendering** ("Paint flashing" y "Layer borders") para asegurar que las animaciones no causen "repaints" (repintados) masivos en cada fotograma.
- Probar el "Spectator View" en el navegador web integrado de una Smart TV Samsung de gama media para validar la fluidez del marcador y los brillos de neón.
