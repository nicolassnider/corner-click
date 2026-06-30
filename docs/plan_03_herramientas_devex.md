# Plan de Mejora: Herramientas de Desarrollo y Calidad (DevEx)

Este plan aborda la integración de nuevas herramientas modernas para mejorar la calidad del código y crear un catálogo aislado de componentes UI.

## Decisiones Arquitectónicas (Basadas en Feedback)

> [!NOTE]
>
> - **Linter / Formatter:** Adoptaremos **Biome** como reemplazo a ESLint y Prettier por su extrema velocidad y simplicidad en monorepos.
> - **Catálogo de Componentes UI:** Utilizaremos **Histoire**, aprovechando que es más ligero y está optimizado nativamente para Vite (encajando perfectamente con Astro y React).

## Proposed Changes

### Calidad de Código (Linter)

- Instalar **Biome** (`@biomejs/biome`) en la raíz del monorepo.
- Configurar el archivo `biome.json` en la raíz definiendo las reglas de formato y linting.
- Reemplazar las ejecuciones de `prettier` en el `package.json` por `biome format --write` y `biome lint`.
- Correr un comando de autoguardado/autofix global sobre todos los archivos del repositorio para adaptarlos al estándar de Biome.

### Catálogo de UI (`apps/styleguide`)

- Limpiar configuraciones previas (si existían) en `apps/styleguide`.
- Inicializar **Histoire** (`histoire`).
- Migrar componentes clave (botones de jueces, tarjetas de marcadores, tablas de posiciones) a historias (`.story.tsx`).
- Integrar la importación del paquete `packages/shared-styles` para que los componentes se vean idénticos al entorno real.

## Verification Plan

### Automated Tests

- Ejecutar el script global de linting con Biome y verificar que el comando termine exitosamente (exit code 0).

### Manual Verification

- Iniciar el servidor local de Histoire (`npm run story:dev`) y navegar por los diferentes componentes documentados visualmente.
