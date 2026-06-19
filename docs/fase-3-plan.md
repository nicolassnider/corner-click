# Fase 3 — Flujo Completo del Torneo

Completar el ciclo de vida del torneo: edición, eliminación, resultados históricos y robustez de validaciones.

## Resumen de hallazgos del codebase

> **Editar competidores** ya existe en la UI (`CompetitorManager` + `CompetitorForm` con `initialData`) y en el cliente via RTDB. No es necesario construirlo — se elimina del scope.
>
> **Validación TBD en UI** ya existe en `JuryDashboard.tsx` (`isMatchStartable`). Solo falta el server-side.

---

## Cambios propuestos

### 1 — API: PUT + DELETE /tournaments/:id

#### [MODIFY] `apps/api/src/routes/tournaments.ts`

Agregar dos endpoints al final del router:

**`PUT /:id`** — editar torneo (nombre, fecha, ubicación, áreas)
- `authenticateToken + requireAdmin`
- Valida que el torneo exista
- Solo actualiza los campos enviados (partial update con `update()`)
- Retorna el torneo actualizado

**`DELETE /:id`** — eliminar torneo
- `authenticateToken + requireAdmin`
- Elimina el documento en Firestore
- Elimina todos los datos del RTDB en `tournaments/{id}` (matches, competitors)
- Elimina la subcolección `judges` en Firestore (batch delete)

#### [MODIFY] `apps/web-admin/src/components/TournamentList.tsx`

- Agregar botones de **Editar** y **Eliminar** en cada card de torneo
- Al hacer clic en Editar → abrir `TournamentForm` con `initialData` (solo en status `UPCOMING`)
- Al hacer clic en Eliminar → modal de confirmación → llamar a `DELETE /api/tournaments/:id`

#### [MODIFY] `apps/web-admin/src/components/TournamentForm.tsx`

- Aceptar prop `initialData?: Tournament` para modo edición
- Si `initialData` presente → `PUT`, sino → `POST`
- Título dinámico: "Editar Torneo" vs "Nuevo Torneo"

---

### 2 — Validación Server-Side: No iniciar match con TBD

#### [MODIFY] `apps/api/src/routes/matches.ts`

En `POST /:id/status`, cuando `status === 'ACTIVE'`:
- Leer el match desde RTDB buscando `tournaments/*/matches/{matchId}`
- Verificar que `redCompetitorId` y `blueCompetitorId` no sean `''`, `null`, o `'BYE'`
- Si no pasa → `400 Bad Request` con mensaje claro

> La validación client-side en `JuryDashboard` permanece como primera línea de defensa. Esto agrega la segunda capa server-side.

---

### 3 — Finalización de Categoría

#### [MODIFY] `apps/api/src/routes/matches.ts`

En `POST /:id/winner`, después de escribir el ganador:

1. Leer todos los matches del torneo desde RTDB
2. Filtrar por `categoryId` del match actual
3. Verificar si todos los de esa categoría tienen `winnerId`
4. Si sí → escribir en RTDB: `tournaments/{id}/categories/{categoryId}/completedAt = ISO timestamp`

#### [MODIFY] `apps/web-admin/src/components/BracketManager.tsx`

- Suscribir a `tournaments/{id}/categories/{categoryId}/completedAt` via `onValue`
- Cuando existe → mostrar banner "🏆 Categoría completada" encima del bracket

---

### 4 — Historial de Partidos (nueva tab en TournamentDetail)

#### [MODIFY] `apps/web-admin/src/components/TournamentDetail.tsx`

Agregar tab **"Resultados"** (solo visible cuando `tournament.status !== 'UPCOMING'`).

#### [NEW] `apps/web-admin/src/components/ResultsView.tsx`

Vista de resultados finales con la siguiente estructura:

```
[ Selector de Categoría ]

Categoría: Masculino 68kg — Cadetes
├── Ronda 1
│   ├── Juan Pérez (🔴) vs Carlos López (🔵)
│   │   Red corner: 3pts / 1 warning
│   │   Blue corner: 5pts / 0 warnings
│   │   🏆 Ganador: Carlos López
│   └── ...
├── Semifinal ...
└── Final ...
```

**Fuentes de datos:**
- **Bracket + winner**: RTDB `tournaments/{id}/matches` (filtrado por categoryId)
- **Scores por corner**: `GET /api/matches/:id/scores` (Firestore) — endpoint ya existe

**Lógica:**
1. `getMatches(tournamentId, categoryId)` → matches completados ordenados por ronda
2. Para cada match → `GET /api/matches/{matchId}/scores` → scores por corner/juez
3. Calcular score total por corner: suma de todos los jueces de ese corner
4. Mostrar nombres de competidores: lookup en RTDB competitors

---

## Orden de implementación

| # | Tarea | Estimado |
|---|---|---|
| 1 | `PUT + DELETE /tournaments/:id` en la API | 30 min |
| 2 | Editar/eliminar en TournamentList + TournamentForm | 45 min |
| 3 | Validación server-side TBD en match start | 20 min |
| 4 | Finalización de categoría (API + BracketManager) | 30 min |
| 5 | ResultsView + tab Resultados en TournamentDetail | 60 min |

---

## Verification Plan

### Automated
- `GET /api/tournaments/:id` retorna 404 tras DELETE
- `PUT /api/tournaments/:id` con campos parciales retorna el torneo actualizado
- `POST /api/matches/:id/status` con `ACTIVE` y competitor vacío retorna 400

### Manual
- Editar nombre/fecha de un torneo UPCOMING → refleja en la lista
- Eliminar torneo → desaparece de la lista y datos limpiados en RTDB
- Intentar iniciar match TBD via curl directo → 400
- Completar todos los matches de una categoría → banner 🏆 en BracketManager
- Tab Resultados muestra matches por ronda con puntajes reales de los jueces
