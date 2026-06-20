# Plan de Pruebas Pre-Fase 5 (Línea de Base)

Antes de iniciar las modificaciones de red local y WebSockets en la **Fase 5**, es fundamental verificar que el flujo de combate actual sincronizado en la nube (Firebase) funcione correctamente para establecer una línea de base.

---

## 🧪 Casos de Prueba Requeridos

### Prueba 1: Autenticación de Jueces y Espera

1. **Paso 1:** Ingresar a la app de jueces (`/`).
2. **Paso 2:** Intentar loguearse con el PIN temporal de un juez creado en el Admin (Online) y verificar que inicia sesión.
3. **Paso 3:** Verificar que se presenta la pantalla `"Esperando asignación desde la Mesa Central..."` sin errores visuales de Firestore.
4. **Paso 4 (Modo local):** Cerrar sesión, ingresar PIN `9999` y comprobar que la botonera táctil del ScorePad inicia en modo **OFFLINE** local en memoria de inmediato.

### Prueba 2: Sincronización en Tiempo Real del Combate (Jury a TV)

1. **Paso 1:** Iniciar un combate activo desde el panel del Jury (`/live`).
2. **Paso 2:** En una ventana paralela, abrir la pantalla de TV de esa área (`/area/[id]/tv`).
3. **Paso 3:** Verificar que:
   - El cronómetro digital de la TV avanza sincronizado segundo a segundo.
   - El estado en la TV figura como `"EN COMBATE"` (verde parpadeando).
   - Los marcadores de puntuación se muestran como `0` con el texto `"MARCADOR CERRADO"`.

### Prueba 3: Regla de Marcador Cerrado y Revelado de Votos

1. **Paso 1:** Registrar puntos e infracciones desde los pads de jueces conectados.
2. **Paso 2:** Comprobar que en la pantalla de TV los marcadores **siguen en 0** ("Marcador Cerrado") para evitar sesgos en el estadio.
3. **Paso 3:** Detener el combate desde el panel de control del Jury presionando `"Terminar Combate"`.
4. **Paso 4:** Verificar que en la pantalla de TV:
   - El estado cambia a `"FINALIZADO"` (rojo).
   - Los marcadores de puntuación del Red y Blue Corner **se desbloquean instantáneamente**, mostrando la suma real de votos de los jueces (ej. 3 a 1) en colores neón brillantes.

### Prueba 4: Auto-Resolución de Punto de Oro (Consenso)

1. **Paso 1:** Simular un empate en el Jury Dashboard.
2. **Paso 2:** Iniciar el modo `"Golden Point"`.
3. **Paso 3:** Comprobar que en la pantalla de TV el temporizador brilla en ámbar y el estado cambia a `"PUNTO DE ORO"`.
4. **Paso 4:** Desde 3 dispositivos de jueces, pulsar punto a favor del mismo competidor (ej: Rojo).
5. **Paso 5:** Verificar que el sistema detecta la mayoría por consenso y finaliza el combate de forma autónoma declarando al ganador en el Jury y el bracket.
