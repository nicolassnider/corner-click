# Plan de Mejora: Rendimiento y UX

Este plan se enfoca en hacer que la aplicación de puntuación para jueces sea instantánea y a prueba de fallos de red (offline).

## Decisiones Arquitectónicas (Basadas en Feedback)

> [!IMPORTANT]
> **Instalación "Add to Homescreen" (A2HS):** Dado que los usuarios instalarán activamente la app, nuestra estrategia PWA debe enfocarse en proporcionar una experiencia "Standalone" sin bordes del navegador y manejar correctamente las actualizaciones en segundo plano del Service Worker.

## Proposed Changes

### Frontend (`apps/web-judges`)

#### Componentes de React

- Modificar el componente del Pad de Puntuación.
- Cambiar los manejadores de eventos de `onClick` a `onPointerDown` o `onTouchStart` para eliminar el delay nativo de móviles.
- Prevenir el comportamiento por defecto (`e.preventDefault()`) para evitar zoom o scroll accidental al tocar rápidamente.

### PWA (`packages/pwa-config`)

- Configurar el Service Worker (ej. `vite-plugin-pwa`) con estrategia de cacheo adecuada.
- Implementar Background Sync para que, si un juez puntúa sin internet, la solicitud se encole y se reenvíe cuando la red regrese.
- Agregar un sistema de notificaciones/prompts dentro de la app recomendando explícitamente "Add to Homescreen" (Instalar aplicación) al inicio.

## Verification Plan

### Manual Verification

- Instalar la PWA en la pantalla de inicio de un móvil (iOS y Android).
- Abrir la app (debe verse a pantalla completa sin barra de direcciones).
- Desconectar el WiFi / Datos móviles.
- Registrar 10 puntuaciones.
- Reconectar y validar que las puntuaciones se envían automáticamente al backend (Background Sync).
