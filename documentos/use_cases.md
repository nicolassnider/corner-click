# Corner Click - Use Cases (por Aplicación)

Este documento define todos los casos de uso principales para evaluar y probar el funcionamiento end-to-end de todo el ecosistema (Monorepo), separados por la aplicación responsable de ejecutarlos.

---

## 1. Aplicación: Web-Admin (Panel de Control)

*Directorio: `apps/web-admin`*

Esta es la consola de mando para el Organizador del Torneo y los Presidentes de Mesa (Jury).

### 1.1 Gestión del Torneo (Organizer)

- **UC-1.1.1: Crear y Configurar Torneo**: El administrador crea un nuevo evento definiendo nombre, fecha, locación y número de áreas (rings).
- **UC-1.1.2: Generación de Categorías ITF**: Generar automáticamente las categorías oficiales de la ITF basadas en edad, peso y grado.
- **UC-1.1.3: Inscripción de Competidores**: Agregar competidores manual o masivamente y asignarlos a sus respectivas categorías.
- **UC-1.1.4: Gestión de Jueces**: Registrar jueces, generarles un PIN de acceso temporal y asignarlos a un área/ring específico.

### 1.2 Llaves y Sorteos (Organizer)

- **UC-1.2.1: Generación de Llaves (Brackets)**: Dado un grupo de competidores en una categoría, el sistema genera automáticamente el árbol de torneo.
- **UC-1.2.2: Sorteos y Pases Directos (Byes)**: Si el número de competidores no es par o potencia de 2, el sistema asigna automáticamente pases directos (`BYE`) de manera equilibrada.

### 1.3 Live Match Control / Jury Dashboard (Jury President)

- **UC-1.3.1: Selección de Combate**: El presidente selecciona el combate a disputar de la lista (filtrada sin categorías vacías). Los nombres reales reemplazan a los IDs.
- **UC-1.3.2: Control de Tiempo (Start/Pause)**: El presidente controla el inicio (`ACTIVE`), pausa (`PAUSED`) y fin (`ENDED`) del combate, bloqueando controles si hay competidores en `TBD` o `BYE`.
- **UC-1.3.3: Sincronización en Tiempo Real**: El cronómetro local del Admin se sincroniza constantemente con Firebase.
- **UC-1.3.4: Manejo de Empates (Golden Point)**: Cuando el combate termina (`ENDED`), si hay empate, el administrador puede iniciar "Extra Time (1m)".
- **UC-1.3.5: Avance Automático de Llaves**: Al declarar un ganador ("Red Wins" / "Blue Wins"), el combate se marca como `COMPLETED` y el ganador avanza a su siguiente posición en el árbol de forma automática.

---

## 2. Aplicación: Web-Judges (App de Jueces de Esquina)

*Directorio: `apps/web-judges`*

Esta aplicación está pensada para ejecutarse en dispositivos móviles de los 4 jueces sentados en las esquinas del área.

### 2.1 Autenticación y Espera (Corner Referee)

- **UC-2.1.1: Login con PIN**: El juez ingresa al sistema utilizando su ID y el PIN temporal.
- **UC-2.1.2: Conexión al Ring**: El dispositivo se asigna a su esquina y se sincroniza con el Jury President de ese Ring vía Firebase.
- **UC-2.1.3: Sala de Espera (Standby)**: Pantalla de espera si el combate actual está en `PENDING` o no hay combate asignado.

### 2.2 Puntuación en Tiempo Real (Corner Referee)

- **UC-2.2.1: Bloqueo de Interfaz por Estado**: La botonera de puntos solo está activa si el web-admin tiene el estado en `ACTIVE`. Se bloquea instantáneamente en `PAUSED` o `ENDED`.
- **UC-2.2.2: Registro de Puntos**: Botones para sumar puntos (+1, +2, +3) según la técnica observada (puño medio/alto, patada media/alta).
- **UC-2.2.3: Advertencias y Descuentos**: Registro de "Warnings". El sistema convierte 3 advertencias en una deducción de 1 punto.
- **UC-2.2.4: Envío Final**: Al finalizar el tiempo, la aplicación detiene el ingreso de datos y envía los puntos totales al backend.

---

## 3. Aplicación: API (Backend)

*Directorio: `apps/api`*

El servidor central Node/Express que maneja la lógica de negocio y permanencia de datos.

### 3.1 Procesamiento de Resultados (System)

- **UC-3.1.1: Recolección Segura de Puntos**: Recibe mediante POST el puntaje de los jueces de esquina cuando el combate termina.
- **UC-3.1.2: Consenso Mayoritario**: Identifica al ganador calculando los votos de las esquinas y resolviendo desempates técnicos.
- **UC-3.1.3: Actualización de Estado (Status Webhook)**: Endpoint para procesar cambios forzados de estado del combate validados.
- **UC-3.1.4: Migración a Histórico**: Una vez que un combate pasa a estado `COMPLETED`, el API puede transferir el registro desde Firebase Realtime Database hacia Firestore para tener un historial permanente y limpiar el nodo de "live_matches".
