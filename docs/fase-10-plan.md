# Fase 10 — PWA, Caché e Instalación Offline (Production Readiness)

Este plan define las tareas para convertir la aplicación de jueces en una Progressive Web App totalmente resiliente y lista para su instalación oficial.

## Objetivos

- Permitir abrir y ejecutar la aplicación de jueces en dispositivos móviles sin requerir conexión inicial a internet.
- Lograr la distribución inmediata de la aplicación sin tiendas de aplicaciones.

## Componentes a Implementar

### 1. PWA Manifest & Service Workers

- Configurar archivos `manifest.json` e íconos en `public/`.
- Implementar Service Workers para cachear el 100% de los assets estáticos (CSS, Javascript, fuentes y HTML básico de la shell de la aplicación).

### 2. Arranque Desconectado (Offline Mode First)

- Si el árbitro abre la aplicación sin internet, el Service Worker sirve el contenido cacheado.
- El árbitro puede iniciar de forma inmediata el modo local de bypass (`PIN 9999`) y probar la botonera sin requerir ninguna configuración de red.

### 3. Auditoría de Seguridad y Rendimiento

- Pruebas de Lighthouse, compresión avanzada de assets, y revisión final de las reglas de seguridad.
