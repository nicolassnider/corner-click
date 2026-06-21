# Fase 8 — Llaves con Repesca y Round Robin (Alternative Brackets)

Este plan detalla los cambios necesarios para soportar esquemas competitivos complejos en el árbol del torneo.

## Objetivos

- Habilitar sistemas de brackets alternativos requeridos por la ITF para categorías con pocos competidores o torneos de alta competencia.

## Componentes a Implementar

### 1. Sistema de Doble Eliminación (Repesca)

- Diseñar el algoritmo de emparejamientos que asigne a los perdedores de la llave principal a una llave secundaria de repesca.
- Actualizar el visualizador de brackets para renderizar de forma clara el árbol de ganadores y el de perdedores.

### 2. Formato Round Robin (Todos contra todos)

- Soporte para pools de 3 o 4 competidores.
- Tabla de cálculo automático de puntos de grupo: combate ganado (2 pts), empate (1 pt), perdido (0 pts).
- Criterios de desempate técnicos automáticos (diferencia de puntos netos, menor número de warnings).
