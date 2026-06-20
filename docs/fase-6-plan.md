# Fase 6 — Alertas Sonoras y Señales de Audio (Acoustic Feedback)

Este plan define la incorporación de indicaciones acústicas automatizadas para agilizar el flujo de los combates.

## Objetivos

* Avisar de forma sonora el inicio, pausa y culminación del tiempo reglamentario de combate.
* Ayudar al árbitro central y al público a percibir los cambios de estado sin necesidad de mirar la pantalla.

## Componentes a Implementar

### 1. Sistema de Audio en TV Scoreboard (`apps/web-admin`)

* Integrar el motor `AudioContext` de HTML5 o una librería de reproducción ligera en el proyector de TV (`PublicScoreboard.tsx`).
* Reproducir una campana / gong al iniciar el tiempo de combate.
* Reproducir una chicharra de alto impacto cuando el temporizador llega a `00:00`.

### 2. Audio en Mesa de Control (Jury)

* Sonidos cortos de advertencia en el panel de control del Jury al presionar pausa, declarar ganadores o activar el Punto de Oro.

### 3. Haptic / Acoustic Feedback en Jueces

* Opcional: Sonido muy corto y sutil (click / beep) al presionar los pulsadores de puntuación en el pad de jueces, dando confirmación física de registro de punto.
