# Game Factory — estado vigente

Propósito: capacidades implementadas, evidencia y limitaciones. Ámbito: Factory. Revisión: 2026-11-07 (ficha de continuidad); resto del documento 2026-10-28. Corte base de la reorganización: `54955677ec9430695b233c99a8fb4067b103a86d`. Reorganización documental aceptada y cierre autorizado por el usuario el 2026-10-28; el impedimento técnico quedó resuelto en `a773dff6f5314bb1c28eda7fef401e4a256fbbd2`. Este registro integra la entrega de cierre documental, cuyo identificador real se informa después de comprobar Git.

## Ficha de continuidad de Factory

Lectura obligatoria al iniciar cualquier sesión (Codex o Claude Code), junto con la ficha del juego activo. Revisión: 2026-11-07. Toda propuesta o pendiente de Factory que no se ejecute en su sesión se registra aquí antes de cerrarla ([workflow v1.2](workflow-v1.md#token-efficiency-v12)).

| Campo | Valor |
|---|---|
| Último cambio | `juego-cartas` V0.4B M4 cerrado, 2026-11-08 (primer hito completo con agentes de Claude Code). Anterior: adopción v1.2 en `comerciante-medieval` (`ae4f3b1`) |
| Juegos | `juego-cartas`: M4 cerrado 2026-11-08, M5 no autorizado ([ficha](../../projects/juego-cartas/docs/status.md)). `comerciante-medieval`: ITER-10 cerrado, sin hito autorizado ([ficha](../../projects/comerciante-medieval/docs/status.md)) |
| Limitaciones vigentes | Agentes de Claude Code requieren sesión nueva; `deny` de `.claude/settings.json` cubre Bash, no PowerShell; ejecutor instalado en `%USERPROFILE%\.codex\bin\`; CLI Playwright 0.1.22 instalada fuera del repo en `%USERPROFILE%\.game-factory\tools\` (no en `%LOCALAPPDATA%`, que Claude Desktop virtualiza) |

Pendientes de Factory (ninguno autorizado para ejecución):

| Pendiente | Estado | Qué falta |
|---|---|---|
| Ajustes menores del harness visual | Hallazgos no bloqueantes de la revisión, 2026-11-07 | `patches.mjs` exige `export default` (un export con nombre se ignora sin aviso): validar o documentar; la skill dice que el escenario debe estar fuera del repo pero solo se comprueban fixture y salida. Los errores de consola se cuentan pero no cambian el código de salida |

## Capacidades existentes

| Capacidad | Estado y evidencia |
|---|---|
| Proyectos independientes | [Plantilla](../../template/README.md) y [generador](../../scripts/create-project.mjs) presentes; dos juegos implementados. El generador copia la base, adapta metadatos y rechaza destinos existentes; no crea toda la documentación del juego. |
| Hitos e iteraciones | [Workflow](workflow-v1.md), [AGENTS.md](../../AGENTS.md) y registros de ambos juegos documentan implementación, checks, revisión y aceptación. Los planes vivos enlazan el historial anterior. |
| Roles especializados | Perfiles [implementer](../../.codex/agents/implementer.toml) y [reviewer](../../.codex/agents/reviewer.toml) presentes; coordinación en la sesión principal. |
| Briefs y presentación | Skills [game-iteration](../../.agents/skills/game-iteration/SKILL.md) y [game-ui-ux](../../.agents/skills/game-ui-ux/SKILL.md) presentes y utilizadas según los registros. |
| Inspección visual | Harness compartido Codex/Claude [`scripts/visual-inspect.mjs`](../../scripts/visual-inspect.mjs): Vite del juego + Playwright CLI `0.1.22` headless (no ocupa pantalla ni navegador del diseñador), fixtures/parches en memoria fuera del repo, 1440×900/1024×768 por defecto, resumen compacto. Uso en la skill [game-ui-ux](../../.agents/skills/game-ui-ux/SKILL.md). Los registros distinguen inspecciones ejecutadas, limitaciones y aprobación humana. |
| Protección de commits | [Ejecutor controlado](../../.codex/tools/local-commit-executor.cjs) y [preflight](../../.codex/tools/commit-format-preflight.cjs) admiten archivos existentes y bajas regulares verificadas contra HEAD e índice, con rutas explícitas para ambos extremos de un traslado. Las pruebas y revisión de la ampliación constan abajo. Autorización, revisión y playtesting siguen siendo controles del workflow. |
| Continuidad documental | Referencias de Factory en esta carpeta y de cada juego en `projects/<juego>/docs/`; planes vivos separados de antecedentes históricos. Sin nueva arquitectura de ejecución. |

## Evidencia de desarrollo

- [RPG: continuidad y cierres](../../projects/juego-cartas/docs/implementation-plan.md): expedición/recuperación, controles, A1–A6 y transformación/estabilización 3D; último cierre `54955677ec9430695b233c99a8fb4067b103a86d`.
- [Comerciante Medieval: continuidad](../../projects/comerciante-medieval/docs/implementation-plan.md): siete hitos e iteraciones posteriores; último cierre `737fea910ae0461eabf2520d365cbb49035b1cd5`. ITER-07/08 fueron sustituidas sin cierre formal acreditado; no se les atribuye la aprobación de ITER-09/10.
- B1, preflight preventivo: cierre `eb6a165be40197937096435204df76c45763bbfe`. El [registro anterior completo](history/status-2026-10-27.md) conserva autorización, checks y límites. La suite de 14 casos se reejecutó satisfactoriamente durante la migración documental principal del 2026-10-28, según el registro siguiente; no se vuelve a ejecutar durante la limpieza final.

Estos commits se verificaron en el historial. Tests, builds, revisiones y playtesting consignados pertenecen a aquellas entregas; no se presentan como validación actual completa de los juegos.

## Limitaciones

- Los subagentes comparten archivos y permisos; la independencia del reviewer es contextual y procedimental. Los perfiles pueden requerir una sesión nueva.
- La receta Playwright requiere paquete en caché y Chrome. El RPG registra `ENOTCACHED` y restricciones de Computer Use; una inspección no completada no se convierte en evidencia ejecutada.
- Las revisiones y aprobaciones se conservan principalmente resumidas en planes, sin todos los informes originales separados. Algunas capturas y diagnósticos están fuera del repositorio.
- La configuración global y las reglas permanecen iguales. La copia instalada del ejecutor se actualizó mediante la corrección técnica autorizada descrita abajo, en la misma ruta y con hash coincidente con la fuente revisada. Esa coincidencia se vuelve a comprobar conforme al procedimiento de commit.
- La reutilización está demostrada en dos proyectos, sin afirmar cobertura universal ni equilibrio definitivo de sus juegos.

## Reorganización documental del 2026-10-28

El usuario autorizó agrupar por proyecto, consolidar requisitos y estado, preservar antecedentes y actualizar referencias manteniendo la arquitectura. Los documentos sintetizan decisiones registradas: no son nuevas aprobaciones de gameplay ni una validación integral adicional. El 2026-10-28 el usuario aceptó expresamente la migración y su limpieza final y autorizó un único commit de cierre con el procedimiento seguro existente, sin push.

Comprobaciones reejecutadas por el coordinador el 2026-10-28: suite del preflight 14/14, suite del RPG 167/167 más comprobaciones espaciales y suite de Comerciante Medieval 51 casos, todas satisfactorias. Se verificaron también sintaxis del generador y contratos del README/metadatos de plantilla mediante lectura y sustituciones en memoria, sin crear un proyecto. No se hizo build ni playtesting nuevo: esta intervención mantiene código, configuración, dependencias y herramientas originales.

Verificación de la migración principal: 208 enlaces Markdown locales y sus fragmentos sin destinos ausentes dentro del alcance, preflight satisfactorio sobre 38 rutas existentes explícitas y siete recursos trasladados idénticos por SHA-256. Los cinco archivos preexistentes excluidos se conservaron idénticos en aquella fase; el traspaso quedó entonces fuera del mantenimiento de enlaces por instrucción expresa. La revisión independiente posterior a la implementación fue aprobada sin hallazgos de migración.

Limpieza final autorizada y aceptada: se eliminaron el antiguo piloto `experiments/` con su salida generada, los directorios vacíos residuales de `docs/design/` y el traspaso del RPG, tras contrastar que sus decisiones y antecedentes relevantes ya estaban conservados. Se precisó la evidencia de pruebas sin repetir suites, builds, inspecciones visuales o playtesting. La organización de los juegos permanece igual.

Impedimento inicial de cierre comprobado el 2026-10-28: la versión anterior del ejecutor exigía archivos existentes para todas las rutas y rechazaba las 21 bajas versionadas de origen necesarias para registrar los traslados; también rechazaba un índice preparado previamente. Fuente y copia instalada coincidían. Se dejó el índice vacío y no se eludió la herramienta. El diagnóstico posterior y la ampliación mínima fueron aprobados expresamente por el usuario; su ejecución se registra a continuación.

## Ampliación del ejecutor para bajas versionadas — 2026-10-28

Autorización: el usuario aprobó implementar el diagnóstico, verificarlo, actualizar la copia instalada y cerrar por separado la corrección técnica y la migración documental, sin push. No requiere playtesting humano por tratarse de controles internos de Git; no cambia gameplay ni arquitectura.

Alcance técnico: [ejecutor](../../.codex/tools/local-commit-executor.cjs), [preflight](../../.codex/tools/commit-format-preflight.cjs), [pruebas del preflight](../../.codex/tools/commit-format-preflight.test.cjs) y [pruebas del ejecutor](../../.codex/tools/local-commit-executor.test.cjs). Se mantienen argumentos, raíz autorizada, índices previos rechazados, hooks, staging literal, comprobaciones y ausencia de push/amend. Aceptación técnica: altas/modificaciones/bajas/traslados explícitos, bajas verificadas contra HEAD e índice incluyendo padres ausentes, rechazo de rutas ambiguas o ajenas y comprobación de rutas/tipos antes del commit.

Baseline: `54955677ec9430695b233c99a8fb4067b103a86d`, índice vacío. Los 59 cambios de ruta documentales aceptados (38 archivos existentes y 21 bajas) son preexistentes y se conservan separados del commit técnico. La documentación de esta corrección se incorpora al cierre documental posterior; el commit técnico incluye solo sus herramientas y pruebas. Implementación realizada por el rol nativo `implementer`. El coordinador repitió las 38/38 pruebas (19 preflight y 19 ejecutor), las cuatro comprobaciones de sintaxis y el preflight real sobre las 63 rutas autorizadas: todo satisfactorio, índice intacto. Incluye integración con Git real en repositorios temporales, sin operar el índice o HEAD de Game Factory. No se requieren builds ni playtesting de videojuegos por esta corrección interna.

Fuente probada y pin de pruebas: SHA-256 `758fa50726a64fd33b07a9485e04d5d358376a0c517e6ed29eefbd11401aefdf`. Revisión independiente nativa `reviewer`: aprobada sin hallazgos, con 38/38 pruebas reejecutadas; cero ciclos correctivos. El coordinador actualizó la copia instalada en su misma ruta autorizada después de la revisión y comprobó igualdad exacta de SHA-256 con la fuente. No se cambiaron reglas, permisos ni configuración global.

Commit técnico local comprobado: `a773dff6f5314bb1c28eda7fef401e4a256fbbd2`, mensaje `factory: support verified tracked deletions in safe commits`. Incluye exactamente las cuatro herramientas/pruebas autorizadas; el índice quedó vacío y las 59 rutas documentales permanecieron separadas. La aceptación de la reorganización y su limpieza está satisfecha; su cierre documental único utiliza el ejecutor ya corregido, sin push. El hash de ese cierre se obtiene después de ejecutarlo y no se inserta circularmente en este documento.

Los [contextos originales](history/00-contexto-comun.md) y las [instrucciones de asesoría anteriores](history/01-chat-configuracion-factory.md) quedan archivados. Para comprender el sistema, comenzar por [overview.md](overview.md); para ejecutar trabajo, seguir el workflow.

## Adaptación a Claude Code y eficiencia de tokens — 2026-11-07

- **Fase A (autorizada):** `CLAUDE.md` importa `AGENTS.md`; agentes `.claude/agents/` `implementer` (sonnet), `reviewer` (sonnet, sin herramientas de edición: lectura técnica forzada) y `runner` (haiku, comandos mecánicos); wrappers de skills en `.claude/skills/`; permisos equivalentes a `.codex/rules` en `.claude/settings.json`. `.codex/` intacto; ambas herramientas conviven.
- **Fase B (autorizada):** sección *Token efficiency (v1.2)* en el [workflow](workflow-v1.md#token-efficiency-v12): lectura por capas (ficha de continuidad → `decisions.md` → spec → código), invariantes obligatorias en cada brief, registros compactos, archivo al cerrar tras consolidar decisiones, revisión proporcional y ruteo de modelos. [Plantillas](templates/) reutilizables para nuevos juegos.
- Aplicado en `juego-cartas`: [decisions.md](../../projects/juego-cartas/docs/decisions.md), ficha en `status.md`, plan vivo compacto; registros M0–M3 y plan anterior archivados íntegros en `history/`. Aplicado en `comerciante-medieval` el 2026-11-07 (autorizado por el diseñador): [decisions.md](../../projects/comerciante-medieval/docs/decisions.md), ficha en `status.md`, plan vivo compacto; plan anterior archivado en `history/implementation-plan-2026-10-28.md` con enlaces reajustados. Sin cambios de código, pruebas ni spec. Revisión independiente: un hallazgo bloqueante (invariante «cambiar presentación no autoriza cambiar la economía» omitida) corregido en un ciclo; revisión acotada aprobada.
- Limitaciones: los agentes de Claude Code requieren sesión nueva para cargarse; las reglas `deny` de `.claude/settings.json` cubren Bash, no PowerShell; el ejecutor instalado sigue en `%USERPROFILE%\.codex\bin\`.

## Harness reutilizable de inspección visual — 2026-11-07

- Autorización: el diseñador aprobó la alternativa B (script Node compartido, Playwright headless) frente a seguir con harness temporales, el navegador integrado de Claude, Playwright MCP o Computer Use, priorizando tokens, velocidad, no ocupar su equipo y una sola herramienta para Codex y Claude Code. Decisiones: CLI fijada en ruta estable fuera del repo, herramienta en `scripts/`, fixtures por hito fuera del repo.
- Baseline `4c664374b44ff2ace3df98fb4274d1ebba688ad3`, estado limpio. Rutas: `scripts/visual-inspect.mjs`, `scripts/visual-inspect.test.mjs`, `.codex/rules/visual-inspect.rules`, `.claude/settings.json`, `.agents/skills/game-ui-ux/SKILL.md`, este documento.
- Entorno: CLI 0.1.22 copiada sin descargas desde la caché temporal de M1 a `%USERPROFILE%\.game-factory\tools\playwright-cli-0.1.22`; `NO_UPDATE_NOTIFIER=1` evita su consulta de actualizaciones.
- Checks: `node --test scripts/*.test.mjs` 7/7. Reproducción real de la inspección inicial M3 de `juego-cartas` con fixture en temporal: pass, 16 PNG, 0 errores, 17 s; capturas 1440×900 y 1024×768 abiertas y correctas. Sin cambios en juegos ni dependencias.
- Revisión independiente `reviewer`: aprobada, sin hallazgos bloqueantes; hallazgos menores en la tabla de pendientes. Cero ciclos correctivos. No requiere playtesting humano.
