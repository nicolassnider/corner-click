# Fase 4 — Experiencia en Vivo, Resiliencia y Control de Arbitraje

Esta fase se enfoca en optimizar el uso de Corner Click en eventos presenciales bajo condiciones reales de red, proporcionar visibilidad pública a los espectadores/entrenadores y automatizar reglas complejas de la ITF.

## Cambios Realizados y Especificación

### 1 — Pantalla Pública / TV View (Vista de Espectador)

Crear una interfaz de solo lectura diseñada para proyectores o pantallas grandes en cada área de competencia.

#### [NEW] `apps/web-admin/src/components/PublicScoreboard.tsx` y Ruta `/area/[areaId]/tv`

- Vista de pantalla completa con alta legibilidad a distancia.
- Muestra:
  - Cronómetro gigante sincronizado con el combate activo.
  - Nombre de los competidores (Rojo y Azul).
  - Puntuación consolidada en tiempo real.
  - Warnings (Advertencias) acumulados linealmente por cada competidor.
  - Estado actual (PENDING, ACTIVE, PAUSED, ENDED, GOLDEN_POINT).
- Suscripción en tiempo real a Firebase Realtime Database (`live_matches_by_area/{areaId}`).

---

### 2 — Resiliencia Offline en Jueces de Esquina

Asegurar que la pérdida de red temporal en los teléfonos de los jueces no interrumpa el combate ni pierda datos.

#### [MODIFY] `apps/web-judges/src/components/ScorePad.tsx`

- El pad acumula warnings linealmente en lugar de reiniciarse cada 3, enviando la información precisa a la API.
- Sincroniza en tiempo real los puntajes en Firebase Realtime Database para permitir cálculos instantáneos de net scores y consensos.

#### [MODIFY] `apps/web-admin/src/components/JuryDashboard.tsx`

- Muestra el estado de conexión individual y la sincronización en tiempo real de los jueces de esquina (Corner Referees).

---

### 3 — Rediseño Premium UX/UI & Sistema de Toasts (Jury)

- **Tema Deportivo Oscuro:** Fondo general `bg-slate-950` con glassmorphism y efectos de iluminación neón en el cronómetro gigante (`text-emerald-400`).
- **Comparativa de Votos:** Al finalizar el combate, se presenta un desglose detallado por juez junto a una barra de progreso que compara la distribución porcentual de votos (Rojo vs Empate vs Azul) de forma instantánea.
- **Toasts UI System:** Eliminación de bloqueos por `alert()` del navegador reemplazados por notificaciones fluidas flotantes (éxito, error, advertencias e información).

---

### 4 — Automatización de Reglas Avanzadas de ITF & Seguridad

- **Conversión de Warnings:** Lógica de cálculo dinámico del Net Score:
  `NetScore = RawScore - Math.floor(Warnings / 3) - Deductions`.
- **Golden Point (Punto de Oro):** Si un combate termina empatado, se puede iniciar el modo Golden Point. El sistema vigila en tiempo real los clics de los jueces y declara la victoria del competidor que alcance el primer punto consensuado por mayoría automáticamente.
- **Validación de PIN de Juez:** El formulario en la web de jueces se cambió a un input de texto seguro con validación numérica y deshabilitado automático del botón para pines de menos de 4 dígitos.

---

## Plan de Verificación

### Pruebas Manuales

1.  **Combate en Tiempo Real:** Iniciar un combate desde el panel administrador y verificar la fluidez del cronómetro y del acumulado.
2.  **Pantalla de TV:** Abrir el enlace directo `Spectator View (TV)` y comprobar la latencia mínima de actualización (< 100ms) mediante Firebase RTDB.
3.  **Golden Point:** Simular empate, iniciar Golden Point, registrar puntaje consensuado en las esquinas y verificar que se complete el match de forma autónoma.
