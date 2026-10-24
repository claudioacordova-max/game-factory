# Game Factory v1.1 — estado de capacidades

**Revisión documental:** 24 de octubre de 2026. **Referencia de revisión:** `737fea910ae0461eabf2520d365cbb49035b1cd5` (base previa a esta consolidación). Esta nota resume evidencia del repositorio; no afirma que las comprobaciones históricas se hayan repetido en esta revisión.

## Capacidades y evidencia

| Capacidad | Estado | Evidencia y alcance |
|---|---|---|
| Flujo técnico por hitos | Documentado y usado según los registros | [`AGENTS.md`](../../AGENTS.md), [`workflow-v1.md`](workflow-v1.md), perfiles en [`.codex/agents/`](../../.codex/agents/); planes de hitos del RPG y Comerciante Medieval. Los registros describen implementación, revisión, correcciones y cierres. No se conservan informes independientes de cada revisión. |
| Iteraciones post-cierre v1.1 | Documentado y usado según el plan del Comerciante Medieval | El workflow define briefs, autorización, ejecución, validación y registro. ITER-01–06 constan cerradas. ITER-07/08 corresponden a una línea de rediseño sustituida en el trabajo posterior, pero no tienen cierre formal documentado. ITER-09/10 constan con aprobación humana explícita y cierre. Véase la nota de reconciliación en el [plan técnico](../comerciante-medieval-implementation-plan-v0.1.md). |
| Perfiles implementer/reviewer | Configuración presente; aislamiento técnico parcial | Están versionados los perfiles. El workflow advierte que ambos comparten workspace y sandbox, y que la instrucción de solo lectura del reviewer no es una barrera técnica. Los informes de iteración registran revisiones, sin conservar sus reportes originales. |
| Inspección visual | Instrucción configurada; uso histórico registrado | La skill y la regla fijan Playwright CLI `0.1.22` en modo offline. Los registros ITER-07/08/09 describen inspecciones automatizadas; ITER-09/10 también registran aprobación visual/manual del diseñador. Las capturas indicadas se guardaron en `%TEMP%`, fuera del repositorio. |
| Protección de Git | Política documentada; ejecución histórica no revalidada aquí | `AGENTS.md` y el workflow exigen estado inicial, staging de rutas explícitas, revisión del diff y no hacer push. La regla local no concede autorización genérica para `git add`. Los registros de commits no demuestran por sí solos cada paso de staging. |
| Reutilización entre proyectos | Parcialmente demostrada | Hay plantilla y generador, además de los proyectos RPG de cartas y Comerciante Medieval. La evidencia de uso continuado de v1.1 se concentra en Comerciante Medieval; no prueba cobertura de todos los tipos de proyecto. |

## Límites conocidos

- Los perfiles de agentes pueden requerir una sesión nueva para cargarse. La revisión es independiente por contexto, pero no tiene aislamiento de escritura impuesto técnicamente.
- La inspección visual depende de un CLI `@playwright/cli@0.1.22` ya presente en la caché npm y de Chrome instalado. La receta usa `--offline` y un servidor local; no descarga el paquete. Si falta en caché, la adquisición con red requiere autorización previa.
- Capturas y otros artefactos citados en registros pueden estar fuera del repositorio y no ser reproducibles desde el estado versionado.
- Las aprobaciones humanas consignadas en planes son registros históricos; no equivalen a una nueva comprobación independiente.

## Próximos desarrollos

Esta consolidación registra el estado y corrige documentación y permisos. No propone reconstruir la arquitectura ni añadir herramientas. Cualquier ampliación de capacidades requiere una decisión y autorización posteriores.
