# Fase 5 — Resiliencia Extrema y Red Local (WebSocket Fallback)

Este plan detalla los requerimientos para asegurar la continuidad del torneo ante caídas de internet del estadio, operando de manera local mediante WebSockets.

## Objetivos

- Proveer un canal de comunicación directo alternativo cuando Firebase no esté accesible.
- Mantener la sincronización de puntajes entre los jueces, la mesa del Jury y la pantalla de TV.

## Componentes a Implementar

### 1. Servidor de API (`apps/api`)

- Instalar e inicializar `socket.io` o WebSocket nativo.
- Crear salas por Área (`areaId`) para agrupar las conexiones de los jueces y el proyector de esa área.
- Almacenar el estado temporal de los combates activos en memoria o SQLite local.

### 2. Sincronizador de Nube diferido

- Cuando retorne la conexión a internet, subir de forma secuencial (batch) los combates guardados localmente a la base de datos central de Firebase.

### 3. Clientes (`web-judges` y `web-admin`)

- Vigilar el estado de conexión de Firebase (`onDisconnect` / `.info/connected`).
- Si se pierde la conexión, re-conectar automáticamente usando WebSockets locales apuntando a la IP local configurada en la LAN.
