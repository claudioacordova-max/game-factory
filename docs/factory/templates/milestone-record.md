# <Juego> — <hito o iteración>

Formato compacto (workflow v1.2): viñetas, sin narración. Capturas, logs y salidas de comandos quedan fuera del repositorio; aquí solo su ruta y el resultado.

## Brief

- Autorización: <cita o resumen fiel del diseñador, fecha>.
- Alcance: <qué se hace>. Fuera de alcance: <qué no>.
- Criterios de aceptación: <verificables>.
- **Mecánicas e invariantes que deben preservarse:** <reglas existentes que el cambio toca o roza, con referencia a decisions.md/spec>.
- Decisiones creativas: <ninguna | pendientes, bloquean X>.
- Revisión: completa (obligatoria en todo hito). Acotada solo para ciclos correctivos o arreglos menores de presentación (workflow v1.2). Playtesting humano: <requerido | no requerido, motivo>.
- Modelos: implementer <sonnet|opus>, reviewer <sonnet>.

## Baseline

- `HEAD <hash>`, estado: <limpio | cambios preexistentes listados>.

## Resultado

- Rutas cambiadas: <lista>.
- Checks: tests <n/n>, build <ok>, preflight <n/n>. Evidencia externa: `<ruta temporal>`.
- Revisión: <veredicto>; hallazgos: <ninguno | lista con severidad>; ciclos correctivos <n/2>.
- Inspección visual: <qué se observó y tamaños | no aplica | limitación>.
- Playtesting: <pendiente | aceptado fecha | no requerido>.
- Decisiones nuevas llevadas a decisions.md: <IDs | ninguna>.
- Cierre: `<hash>` | bloqueo: <motivo>.
