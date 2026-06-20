# Fase 9 — Modalidad de Combate por Equipos (Team Sparring)

Este plan define las especificaciones para los enfrentamientos por equipos bajo la modalidad reglamentaria ITF.

## Objetivos
* Adaptar el sistema para registrar, puntuar y mostrar combates grupales de 5 contra 5 competidores.

## Componentes a Implementar

### 1. Panel de Jury Adaptado para Equipos
* Interfaz para seleccionar los competidores activos de cada equipo en el tapiz.
* Registro acumulativo del puntaje del equipo (suma de resultados individuales o marcador general corrido).

### 2. Tablero de TV para Equipos
* Diseño horizontal con las banderas/logos de los dos equipos.
* Indicador visual del enfrentamiento individual activo en ese instante (ej: Competidor 3 vs Competidor 2) con el marcador personal de ese micro-combate.

### 3. Base de Datos
* Estructuras en Firestore para almacenar alineaciones de equipos y resultados de combates grupales.
