# Plan de Mejora: Arquitectura y Tiempo Real

Este plan documenta la estrategia para reducir la latencia en las puntuaciones de los jueces integrando WebSockets y Redis, manteniendo la independencia del backend.

## Decisiones Arquitectónicas (Basadas en Feedback)

> [!NOTE]
>
> - **Backend Independiente:** Se mantendrá la API de Express (Node.js) alojada en Render separada de los clientes web para asegurar un crecimiento y escalabilidad independientes.
> - **Cálculo en Memoria (Redis):** Utilizaremos Redis (asegurando el uso de una capa gratuita, ej. Upstash Redis o el propio Redis en Render) para calcular el consenso de votos en tiempo real.
> - **Persistencia (Firebase):** Firestore se mantiene como la base de datos oficial y fuente de la verdad para el estado de los torneos, pero solo se escribirá en ella el resultado ya consolidado.

## Proposed Changes

### Backend (`apps/api`)

- Instalar y configurar `socket.io` y un cliente de Redis (ej. `ioredis`).
- Crear un entorno temporal en Redis para almacenar los "clics" (votos) de los jueces a altísima velocidad.
- Implementar la lógica que calcula el consenso directamente sobre los datos en Redis.
- Una vez alcanzado un consenso o terminado un combate, volcar los resultados definitivos hacia Firebase Firestore.

### Frontend (`apps/web-judges` & `apps/web-admin`)

- Implementar el cliente `socket.io-client` para la comunicación bidireccional.
- Reemplazar las subscripciones directas a Firestore (`onSnapshot`) por eventos de WebSockets en las áreas de puntuación en vivo.

## Verification Plan

### Automated Tests

- Crear tests unitarios en Vitest para la nueva lógica de consenso de votos apoyada en Redis.
- Simular conexiones concurrentes de Socket.io (4 jueces al mismo tiempo).

### Manual Verification

- Pruebas de estrés usando 4 dispositivos móviles reales puntuando a máxima velocidad.
- Verificar que el marcador de TV reacciona de manera fluida y con latencia menor a 50ms sin incrementar el número de escrituras en Firebase.
