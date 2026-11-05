# Duelo en la cripta — migración V0.4B: M0–M3

Propósito: conservar la autorización, decisiones y continuidad de la migración desde el prototipo legado. Fecha del registro: 2026-10-31. Punto de entrada: [plan vivo](../implementation-plan.md). Este registro no sustituye la [especificación implementada del legado](../spec-v1.md) ni presenta reglas futuras como instaladas.

## Brief y autorización

- Cambio: aislar el contenido legado y preparar una migración verificable hacia V0.4B.
- Actual: catálogo P01–P18/E01–E14, ocho copias iniciales, siete encuentros y siete salas; sesión en memoria, sin guardado durable.
- Deseado en M0: mismas reglas, datos, inicio, recorrido y UX, con datos legados separados y configuración activa explícita; pruebas y build reproducidos.
- Tipo: paso interno de una iteración funcional amplia posterior al cierre del prototipo.
- Autorización: el diseñador aprueba la estructura general M0–M8 y ordena ejecutar solo M0, registrar D01–D07 y definir M1 sin implementarlo. Prohíbe commits y push; no se prepara staging ni se invoca el ejecutor de commit.
- Límites: sin catálogo A/R/H/N en ejecución, reglas nuevas, cambios de cifras, mapa, premios, UI, escenas, assets, dependencias ni investigación del scroll diferido.
- Criterios M0: datos legados idénticos; selección activa coherente; referencias de cartas cerradas en el conjunto legado; consumidores compatibles; suite y build pasan; revisión independiente sin bloqueos; diff únicamente autorizado.
- Validación humana: M0 es interno y no cambia presentación/controles; no requiere playtesting ni inspección visual genérica. Si aparece un cambio visible involuntario, deberá corregirse y validarse esa superficie.
- Estado actual: **M0 aceptado formalmente** después de su entrega sin commit. El encargo posterior autoriza cierre documental y commit local seguro de M0 y ejecución de M1 tras verificarlo. No autoriza commit de M1, ejecución M2–M8 ni push. Los límites iniciales del brief se conservan como registro de la autorización original.

## Baseline y fuentes

- Git previo a editar: `HEAD 8fb9c4f023d08f2b60013502e13e591c9c8d8eb1`; rama `main`, nueve commits por delante de `origin/main`. Índice, cambios sin stage y untracked: ninguno. No hay cambios previos del usuario que separar.
- Proyecto: `C:/Users/klaud/Projects/game-factory/projects/juego-cartas/`.
- Instrucciones: `AGENTS.md` raíz; `docs/factory/workflow-v1.md`; habilidad `.agents/skills/game-iteration/SKILL.md`. No se encontraron otros AGENTS aplicables.
- Referencias vigentes inspeccionadas: `docs/spec-v1.md`, `docs/status.md`, `docs/implementation-plan.md`, diseños de interfaz y exploración, y código/pruebas identificados en la auditoría. Mismo HEAD que la auditoría previa; no se repite la auditoría integral.
- Entorno efectivo: Node.js 22.17.1; npm 10.9.2; `juego-cartas@0.1.0`; TypeScript 7.0.2; Vite 8.3.4; React/React DOM 19.3.1; R3F 9.8.2; Three.js 0.186.1. `npm ls --depth=0` confirma las dependencias instaladas, sin errores ni instalaciones nuevas.
- Paquete de diseño externo verificado: `C:/Users/klaud/Downloads/paquete-codex-migracion-v04b-encuentros-v04.zip`, SHA-256 `4cb8ce8a25ef63c00be1ad31f5fc3dc3fa1bd1ae105c50d643db438f51b35995`. Se leyó sin extraer ni modificar su contenido. No es una dependencia de ejecución ni se presupone distribuido con el repositorio.

Entradas de referencia del paquete: especificación mecánica `duelo-cripta-especificacion-transicion-cartas-v1-2.md` (29-10-2026), catálogo oficial `duelo-en-la-cripta-catalogo-oficial-cartas-v1.md` (30-10-2026), anexo oficial de nombres v1, SVG/PNG `duelo-cripta-v04-alternativa-B`, traspaso de identidad/jefes del 30-10-2026, propuesta de encuentros `duelo-cripta-propuesta-encuentros-v04-senora-ratas.md`, documento maestro y LEEME. También existe la propuesta v0.4 suelta en Descargas. Para retomar un hito, verificar acceso a las fuentes; si faltan, no improvisar nombres o números.

Precedencia: instrucciones de Factory para ejecución; decisiones posteriores del diseñador para sus aspectos específicos; v1.2 para mecánica; catálogo v1 para nombres/identidades de cartas; anexo para lugares/jefes; V0.4B y grafo del prompt para topología/premios; encuentros v0.4 para el primer ensayo. Los textos antiguos de esos anexos que todavía dicen «barajas abiertas», nombres provisionales o fatiga heredada no revocan decisiones posteriores. Los alias de v1.2 y los IDs P/E son trazabilidad, no equivalencias.

## Decisiones aprobadas para hitos futuros

El prefijo MIG identifica las D01–D07 de este encargo; no modifica los D01–D12 históricos ni las decisiones D1 del ritual y D2 de escudos de v1.2. **Ninguna decisión de esta sección se implementa durante M0.**

### MIG-D01 — Cupos históricos y recuperación (M1/M7)

Distinguir tipo descubierto, cupos históricamente desbloqueados, copias poseídas con identidad y cupos vacantes por pérdidas. Obtener una primera copia desbloquea un cupo; obtener la segunda por recompensa desbloquea el segundo. Normales/semillas: hasta dos; especiales: uno. Morir/sacrificarse elimina esa identidad, sin reducir cupos. Recuperar paga el coste de vida máxima y crea una identidad nueva sana en reserva, sin aumentar cupos ni reemplazar/curar supervivientes.

No se puede recuperar una segunda copia antes de haberla obtenido. Ejemplo A02: inicio con un cupo y una copia; perder/recuperar sigue permitiendo solo una. Recompensa de 07 añade el segundo cupo y su copia; desde entonces ambas pérdidas pueden recuperarse individualmente. Los cofres son únicos por expedición.

Esto resuelve P6 ordinario: la recuperación no ocupa cupos de recompensas futuras. **Se retira la recomendación anterior de posponer el cofre por ese supuesto conflicto.** No se añaden compensaciones, descartes o políticas de excedentes. No se identificó otro caso funcional sin resolver en las cantidades autorizadas; cualquier caso nuevo debe documentarse con estado y secuencia reproducibles.

### MIG-D02 — Robo enemigo experimental (M2/M4)

Invocadores enemigos con tres cartas iniciales, sin robo adicional antes de su primera principal ni durante su primer turno. Roban una por turno desde su segundo turno. Conservan mazos y orden documentados. No cambia el robo del jugador, vidas ni composiciones. El legado actual sí roba al pasar al primer turno rival; ese comportamiento permanece en M0 y deberá sustituirse en el hito autorizado. La regla nueva es experimental, sujeta al balance posterior.

### MIG-D03 — Recarga y repetición de ratas (M5/M6)

Nueva recarga requiere completar otra vez el circuito. Recarga efectiva en 10 reactiva 07/08/09, cierra el regreso 10→09 y exige salir por 10→04 y regresar a la entrada desde 03. No reactiva cofres ni permite otra recarga permaneciendo en el altar y gastando el orbe. Sin consumir recarga no hay reinicio: puede volver a 09, que sigue derrotada. Orbe lleno: interacción no constituye recarga ni reinicia encuentros. Se registra el cierre condicional aprobado de 10→09; no se modifica ahora el mapa activo ni se añaden conexiones.

### MIG-D04 — Escudos y reparto P2a (M3)

Mantener reparto previo según orden de bloqueadores. Una carga anula todo daño positivo asignado a una criatura en una misma resolución agrupada, aunque proceda de varias fuentes. No redistribuir lo cancelado ni recalcular retroactivamente el reparto. Cero daño no consume; destruir ignora escudos. Ejemplo 2+3+4 a una protegida en una resolución: anula nueve, consume una carga. D2 y P2a quedan ratificados, sin nuevas excepciones a las prioridades aceptadas.

### MIG-D05 — Escaramuza obligatoria 04 y retorno (M6)

Antes de vencer 04, bloquear salidas que permitan eludirla y permitir volver por la puerta de entrada cuando la conexión admita retorno; restantes salidas bloqueadas. Tras victoria, tránsito del grafo aprobado.

**Incompatibilidad pendiente para M6:** entrada desde 10→04 no admite volver por esa misma conexión. La regla general de retorno no determina qué hacer en ese caso. Mantenerlo pendiente, proponer alternativas específicas durante M6 y obtener decisión antes de implementarlo; no invertir la arista, crear acceso ni elegir otra salida ahora. La intención es exigir combate sin encierro innecesario. No bloquea M0/M1.

### MIG-D06 — Orbe inicial (M5)

Jugador inicia poseyendo el orbe, cargado, capacidad máxima uno; no se obtiene después como recompensa. Permanecen pendientes condiciones precisas de activación fuera de combate, mensajes e interacciones sin efecto antes de M5. Origen/posesión y carga inicial ya no son preguntas abiertas.

### MIG-D07 — Dos niveles de IA (M4/M8)

Nivel 1 obligatorio: reconocer jugadas, pagar maná/sacrificios, seleccionar materiales válidos, distinguir reales/fichas, ejecutar habilidades/activaciones/rituales y evitar acciones imposibles o turnos bloqueados. Nivel 2 separado: evaluar sacrificios razonables, preservación de unidades, oportunidad de cartas costosas, recursos, curaciones, escudos y preparación/ejecución de rituales. No se exige optimizador avanzado. Legalidad por sí sola no acredita calidad del encuentro; heurísticas en M4 y comportamiento/playtesting posteriormente. Sin ventajas ilegales, costes gratuitos o restricciones artificiales para compensar carencias.

### Pendientes que se conservan

- P3: terminales inmediatos por A03/N01 en principal; P4: selección/orden de sanación y ausencia de objetivos; P5: avance de principal con activaciones; P8: confirmación final específica H04. No están ratificados por aprobar la estructura del plan.
- Convención A02 predesplegada: ensayo previsto sin fichas en 07/08, pendiente de ratificar para implementación; una A02 invocada sí crea ficha.
- Maná base rival uno: baseline verificado e hipótesis de ensayo, no decisión nueva derivada de MIG-D02; heurísticas concretas pendientes de M4.
- Restauración: baseline de referencia máxima 20 verificado; cerrar referencia/ajuste actual y condiciones de uso del orbe antes de M5. MIG-D03 y MIG-D06 ya resuelven carga inicial y ciclo descritos arriba.
- Suelo 10 **no aprobado**. Suelo legado 1 es referencia provisional de M1; no introducir modificación global.
- M6: interacción/solución del puzle, acceso oculto 18 y excepción de retorno 04 desde 10. Sin nuevas habilidades de exploración o accesos inventados.
- Presentación concreta de El Devoto, arte final y nombres tentativos de escaramuzas pueden esperar a sus superficies; los nombres oficiales de cartas, salas y jefes ya están fijados.

## Clasificación de compatibilidad y consumidores

Consumidores directos de la fachada de contenido: `src/App.tsx`, `src/engine/world.ts`, `src/engine/index.ts`, `src/ui/CollectionViews.tsx` y `src/ui/encounterSummary.ts`; pruebas `run.ts`, `expedition.ts`, `world.ts`, `presentation.ts`, `combatPresentation.tsx` y `cryptVisuals.ts`. Hay consumidores transitivos a través de `engine/index.ts`, como `h1.ts`, `h2.ts` y `h3.ts`. M0 conserva sus imports y contratos.

Además del catálogo extraído, permanecen datos legados identificados en `world.ts` (premios y destinos), `spatial.ts` (siete salas), `cryptVisuals.ts` (temas/grupos), `ExplorationActors.tsx` (modelos por sala), `GameIcons.tsx` (emblemas P/E) y textos de resultado. No se trasladan ahora con un refactor espacial/visual; migrarán en M5–M7 según alcance.

| Clase | Contratos y pruebas concretas | Tratamiento |
|---|---|---|
| Generales | Costes conjuntos y rechazo atómico; fases válidas; daño simultáneo; prioridades/múltiples bloqueos; ausencia de daño sobrante al invocador; heridas/pérdidas por identidad; reserva protegida; liquidación idempotente. Partes de `run.ts`, `combatActions.ts`, `blockAssignments.ts`, `h1.ts`, `h2.ts`. | Conservar; ampliar casos nuevos. |
| Generales de UX/3D | Arrastre/reasignación/retirada, eventos obsoletos, grupos/conexiones y preview único, foco, colisiones, retorno seguro y batching. `blockDrag.ts`, `boardGeometry.ts`, `iterationUx.ts`, `activation.ts`, `cryptRendering.tsx`, `spatial.ts`. | Preservar; validar superficies solo cuando cambien. |
| Específicas del legado | Tablas 18/14/7, iniciales P, premios P, épicas y crecimiento +3; `h1.ts`, `h3.ts`, `world.ts`, `presentation.ts` y datos visuales P/E. | Mantener como regresión del legado; no hacer pasar por contenido V0.4B. |
| Reutilizables adaptando | Fixtures de identidad/colección, expediciones deterministas, accesibilidad de objetos, UI de mano/colección y sumarios; `duelFixtures.ts`, `expedition.ts`, `combatPresentation.tsx`, `world.ts`, `spatial.ts`. | Añadir variantes nuevas por hito; no borrar cobertura anterior. |
| Incompatibles con objetivo futuro | Un tipo=una copia, deduplicar iniciales, recuperación bloqueada por superviviente del tipo, costes por rareza 1/2/3, robo rival primer turno, fatiga acumulable, crecimiento especial, premio máximo por ratas, santuarios antiguos, reinicio por visita y progreso B/R lineal. | Permanecen en M0. Sustituir solo en hitos autorizados y conservar expectativas históricas identificadas como legadas. |

Las categorías se aplican por contrato/caso, no clasifican una suite mixta entera como obsoleta. No se elimina ninguna prueba por anticipado. Que `tests/activation.ts` pase no prueba habilidades R01/N01: cubre activación de UI.

## Hoja de ruta registrada en M0 (autorizaciones de aquel momento)

| Hito | Entrega y dependencias | Estado de autorización |
|---|---|---|
| M0 | Baseline, aislamiento legado, compatibilidad, decisiones y definición M1. | Aceptado y cerrado en `be974b9b424a52db9653ab73c485fb71a6327991`. |
| M1 | Catálogo/cupos/copias, identidades de combate, colección y sandbox; después de M0. | Ejecución autorizada después del cierre M0; entrega sin commit, ver sección de ejecución. |
| M2 | Recursos, fichas, activaciones y fatiga; después de M1; P5 y MIG-D02 donde corresponda. | No ejecutar. |
| M3 | Efectos avanzados, escudos MIG-D04, curación, ritual/objetivos; después de M2 y decisiones P3/P4/P8. | No ejecutar. |
| M4 | Diez encuentros aislados e IA; después de M3; MIG-D02/MIG-D07 y convención predesplegada. | No ejecutar. |
| M5 | Restauración/orbe/ciclo; después de M3 y contrato restante del orbe; MIG-D03/MIG-D06. | No ejecutar. |
| M6 | Grafo/estado/3D/puzle/secreto; después de M5; resolver excepción MIG-D05. | No ejecutar. |
| M7 | Ocho iniciales y 31 premios únicos; después de M1/M5/M6; MIG-D01 resuelve P6 ordinario. | No ejecutar. |
| M8 | Integración M4/M7, pruebas/playtesting y balance separado; sin secretos obligatorios. | No ejecutar. |

Contenidos inalterados de ensayo: 19 salas, 21 tipos/39 copias, 23 principales/16 opcionales, diez combates. Señora de las Ratas: 10 PV y `A02, N03, N02 | A02, N03`, sin A04. Escaramuzas: 04 H01+N02+N05; 07 A02×2; 08 A02+N03; 16 N05+N06+N07; 17 H01+N04+R03. Las cifras/mazos son experimentales; ningún resultado de M0 acredita balance nuevo.

## M1 — definición técnica registrada en M0 (antecedente)

La sección siguiente conserva la propuesta entregada en M0; la autorización e implementación posteriores se registran en «M1 — ejecución autorizada». Sus límites M2–M8 se mantienen. Las menciones a falta de autorización de M1 al final de esta propuesta describen aquel momento, no el estado actual.

### Alcance e interfaces

1. Añadir definiciones A/R/H/N con nombres oficiales, estadísticas/costes de v1.2, límite por tipo y recuperación explícita. No reutilizar P/E ni equiparar especial con épica/crecimiento. Metadatos de habilidades no constituyen ejecución de efectos; ésta sigue en M2/M3.
2. Separar cuatro identidades: ID de tipo; `copyId` persistente propio; ID de instancia de carta en mano/mazo (también inequívoco para duplicados enemigos sin copyId); ID de criatura desplegada. Las acciones de mano no buscan por tipo. El discriminante real/ficha será explícito al llegar M2: ausencia de copyId no puede significar ficha porque el rival tampoco tiene copia persistente del jugador.
3. Proponer un registro de cupos históricos por tipo como autoridad; derivar de él la lista de tipos descubiertos para no mantener contadores contradictorios. Invariantes: `0 <= poseídas <= cupos desbloqueados <= límite del tipo`; IDs propios y pertenencia a baraja únicos. Pérdidas y sacrificios no reducen cupos.
4. Separar concesión de copias de recuperación. Concesión inicial o evento único incrementa cupos y crea sus identidades, de manera atómica. Recuperación requiere cupo vacante y pago permitido; no incrementa cupos. La integración física de cofres/eventos sigue en M7, con prueba de la operación de dominio ya en M1.
5. Mantener baraja como referencias a copyIds; salud individual y reserva protegida. Reinvocación crea copia nueva sana en reserva, sin curar/reemplazar la otra ni seleccionarse sola. Costes: semillas A01/R01/H01 0; normales y A04 1; R04/H04 5. Suelo provisional 1; rechazo sin mutación si no se paga.
6. Adaptar `types.ts`, `session.ts`, construcción/selección/invocación por instancia en `rules.ts`, `combatActions.ts`, `App.tsx`, `CombatView.tsx` y `CollectionViews.tsx` solo en lo necesario para identidades/copias. Keys de React y payloads de arrastre deben identificar instancias; selección de sacrificios sigue por criatura. No modificar prioridades, asignación exclusiva por arrastre, preview, foco ni layout aceptados.
7. Mantener compatible el perfil legado durante la transición mediante el mínimo adaptador/configuración explícita necesario; sus cupos equivalentes serían uno por tipo conocido, sin reinterpretar sus datos. La selección M0 identifica datos y NO conmuta reglas/mundo: habilitar cualquier modo nuevo exigirá un punto de entrada completo, coherente y autorizado.

### Preparaciones de sesión nuevas, aisladas

- Preparación de aventura V0.4B para pruebas: `A01×2, A02, R01, H01, N02, N05, N06`, ocho identidades equipadas y ocho cupos de siete tipos. A01 ya tiene dos cupos; A02/R01/H01/N02/N05/N06 solo uno. No cambiar aún el bootstrap jugable legado ni integrar el mapa.
- Sandbox de catálogo: 21 tipos, 39 cupos y 39 copias sanas, con preparación controlada de baraja para pruebas. Ninguna inicialización de aventura llama por defecto a ese sandbox; sin intercambio de sesión, cupos o recompensas entre ambos.
- Mientras falten efectos de M2/M3, el sandbox sirve para validar catálogo/copias/gestión e identidades; no se presenta como catálogo mecánicamente completo ni se publica una aventura nueva con habilidades omitidas.

### Criterios y pruebas de M1

- 21 definiciones y 39 copias exactas; dos normales/semillas, una especial; nombres oficiales y costes 0/1/5. Sin referencias P/E en el conjunto nuevo ni datos nuevos en inicio legado.
- Dos copias de un tipo con salud diferente: barajar, robar y seleccionar inequívocamente por clic/teclado/arrastre; invocar/sacrificar una y liquidar solo esa identidad; la otra mantiene salud y selección. IDs también únicos en duplicados rivales.
- Secuencia D01 A02: un cupo inicial; pérdida/recuperación permite una, rechaza anticipar segunda; concesión simulada del evento 07 desbloquea dos y entrega la otra; perder/recuperar cualquiera nunca aumenta dos. Repetir el mismo evento no concede nada. Dos pérdidas permiten dos recuperaciones pagadas individualmente.
- Recuperar con superviviente herida no la sana; copia nueva sana en reserva. Probar máximo 20/6/5/2/1 y costes 0/1/5, rechazo atómico al bajar de 1, semillas gratis y N05 no semilla aunque invocar cueste cero.
- Concesión, recuperación y edición bloqueadas en combate; selección pendiente/obsoleta y cancelación no afectan la copia equivocada. Participantes capturados y liquidación idempotente con reserva conservada.
- Preparaciones aventura/sandbox no comparten estado mutable. La aventura propuesta solo desbloquea sus ocho cupos, no 39; el juego activo sigue legado hasta integración autorizada.
- Regresión completa pertinente y build. Inspección renderizada dirigida a mano duplicada, colección/reserva, salud/cupos y recuperación; no nuevo rediseño ni reapertura del scroll. Revisión independiente y aceptación humana proporcional si cambia la gestión de copias.

M1 no aplica robo MIG-D02, fatiga 0–1, escudos, efectos, fichas jugables, ritual, restauración, orbe, mapa, IA nueva ni premios físicos. P3/P4/P5/P8 y puzle no bloquean preparar el modelo de cupos/identidades. No hay autorización para iniciar este trabajo al terminar M0.

## Evidencia de ejecución M0

### Antes de editar (coordinador)

- `npm.cmd test`: exit 0, **176/176** más comprobaciones espaciales, incluidas 27 expediciones deterministas y regresiones de reglas/UI/renderizado. No es una nueva partida humana ni un ensayo de V0.4B.
- `npm.cmd run build`: exit 0, 64 módulos; JS 1.244,87 kB, gzip 344,13 kB; CSS 68,63 kB, gzip 14,85 kB.
- Avisos efectivos: `THREE.Clock` deprecado, `require("three")` deprecado y bundle >500 kB. No se amplía alcance para corregirlos.
- Artefactos generados en rutas locales ya ignoradas: `.test-dist/`, `dist/` y `*.tsbuildinfo`; no se añaden al diff ni se limpian indiscriminadamente salidas previas. Git continuó limpio tras baseline.

### Implementación, comprobaciones y revisión

Implementer nativo limitado a fachada de contenido, módulo legado y pruebas mínimas de aislamiento. Coordinador posee este registro y actualizaciones de plan/estado. No se delegan decisiones creativas ni M1.

Archivos del alcance final, todos relativos a `projects/juego-cartas/`:

- `src/engine/content/legacy.ts` (nuevo): declaraciones originales P/E, ocho iniciales, siete encuentros y agregado `LEGACY_CONTENT` identificado como `legacy-v1`.
- `src/engine/content.ts`: selección estática `ACTIVE_CONTENT = LEGACY_CONTENT` y fachada de los seis exports previos, conservando sus referencias. No registro de plugins, selector visible, segundo motor ni regla nueva.
- `tests/contentCompatibility.ts` (nuevo): tres comprobaciones de conjunto activo, cierre de referencias y bootstrap/robo rival legado.
- `tests/run.ts`: registra esos tres casos; no elimina ni cambia los 176 anteriores.
- `docs/implementation-plan.md`, `docs/status.md` y este registro nuevo: continuidad, estado implementado, decisiones futuras y preparación técnica M1. Especificación v1 y documentos históricos intactos.

Comprobaciones posteriores efectivas:

- Implementer: `npm.cmd test` exit 0, **179/179 + spatial**; `npm.cmd run build` exit 0. Son sus comprobaciones, no sustituyen las del coordinador.
- Coordinador: inspeccionó diff de todos los archivos de código/pruebas, incluidos nuevos. Comparó las declaraciones extraídas con `git show HEAD:projects/juego-cartas/src/engine/content.ts`: **49 líneas no vacías de declaraciones idénticas**, excluyendo imports/comentarios y el nuevo agregado. Valores, orden y referencias internas preservados.
- Coordinador volvió a ejecutar `npm.cmd test`: exit 0, **179/179 + spatial**. Incluye bootstrap real legado, siete salas, 27 expediciones deterministas, legalidad, pérdidas, recuperación, UX y renderizado. El caso nuevo verifica que el cuarto robo rival legado sigue ocurriendo; MIG-D02 aún no se aplica.
- Coordinador volvió a ejecutar `npm.cmd run build`: exit 0, **65 módulos**; JS 1.245,10 kB/gzip 344,25 kB; CSS 68,63 kB/gzip 14,85 kB. Un módulo de datos adicional; mismos avisos de Three y bundle conocidos, sin dependencias nuevas.
- `git diff --check`: correcto. Git avisa normalización LF→CRLF, sin diagnóstico de espacios inválidos. No se cambian configuración Git ni finales de línea masivamente.
- Alcance: solo los siete paths anteriores; motor, sesión, IA, mundo, UI, estilos, escenas, mapas, assets, dependencias, herramientas de Factory e históricos sin cambios. Salidas ignoradas permanecen fuera del diff. No hubo inspección de navegador ni playtesting nuevos porque no cambió ninguna superficie visible.

Preflight preventivo del coordinador: `node .codex/tools/commit-format-preflight.cjs` con los siete paths explícitos anteriores, **7/7 satisfactorios e índice intacto**. Verificación de manifiesto completo: 7/7 paths autorizados, índice vacío; 35 destinos Markdown locales válidos en los tres documentos afectados. `.test-dist/tests/run.js`, `dist/index.html` y `tsconfig.tsbuildinfo` confirmados como ignorados por Git.

Revisión independiente final: reviewer nativo en contexto nuevo, posterior a implementación y verificaciones del coordinador. Inspeccionó los siete paths, incluidas altas; cotejó declaraciones contra HEAD, fachada, referencias, alcance, registro de decisiones y definición M1. Reejecutó suite compilada: **179/179 + spatial**, exit 0; verificó diff-check, índice vacío, HEAD sin cambios y hash del paquete externo. No repitió build, inspección visual ni playtesting; usa el build efectivo del coordinador y reconoce que M0 es interno. **Veredicto aprobado, sin hallazgos bloqueantes ni no bloqueantes.** No editó archivos. Ciclos de corrección usados: **0 de 2**.

Entrega: M0 listo para aceptación, sin correcciones requeridas. HEAD final igual al baseline, rama `main` +9 respecto a origin/main; índice vacío, cuatro paths modificados y tres nuevos, exclusivamente los siete listados. Sin staging, commits, push ni ejecutor de commit. La actualización final de este resultado y de plan/estado es documental y no cambia el código revisado; no requiere repetir tests/build. Se repite el preflight explícito para comprobar formato y alcance final. La aceptación del diseñador y cualquier autorización M1 son posteriores a esta entrega; **M1 no se inicia automáticamente**.

### Cierre M0 autorizado después de la entrega

El diseñador acepta formalmente M0 basándose en las comprobaciones y revisión informadas, sin correcciones adicionales. Autoriza un commit local mediante el ejecutor seguro de Factory, con exactamente los siete paths listados; prohíbe incluir otros archivos o artefactos y hacer push. Autoriza iniciar M1 únicamente después de verificar commit, paths, índice y árbol. M1 se entregará sin commit para evaluación humana; M2–M8 continúan sin autorización.

Preflight del cierre: HEAD `8fb9c4f023d08f2b60013502e13e591c9c8d8eb1`, rama main +9, índice vacío, mismos cuatro modificados y tres nuevos de la entrega aceptada, sin diferencias materiales ni trabajo ajeno. Solo se actualizan este resultado y los estados de plan/status para registrar la aceptación y autorización posterior. Código y pruebas aceptados intactos; se conserva evidencia 179/179 + spatial, build y revisión sin hallazgos, sin atribuir una repetición a este paso documental. El ejecutor fuente e instalado tienen SHA-256 `758fa50726a64fd33b07a9485e04d5d358376a0c517e6ed29eefbd11401aefdf`.

Antes de invocar el ejecutor se comprueban el diff completo, los siete paths, preflight sin modificaciones y revisión independiente del cierre documental. El hash real y el estado posterior se registrarán en la continuidad de M1 y en la entrega después de ejecutar y verificar, sin escribir un hash circular en su propio commit.

Revisión independiente del cierre: reviewer nativo en contexto nuevo, **aprobado apto para cierre, sin hallazgos**. Inspeccionó los siete paths, comparó las 49 líneas legadas con HEAD y confirmó alcance/índice, aceptación y autorizaciones. Utiliza los tests/build aceptados y preflight 7/7; no editó ni repitió pruebas. Sin correcciones requeridas. La última comprobación de formato se repite inmediatamente antes del ejecutor; solo se autoriza el commit M0, nunca push ni commit M1.

Resultado real del cierre: ejecutor instalado y fuente con hashes coincidentes, preflight 7/7 satisfactorio, commit **`be974b9b424a52db9653ab73c485fb71a6327991`**, mensaje `juego-cartas: cerrar M0 de migracion V0.4B y aislar legado`. Verificación `diff-tree --no-renames`: exactamente los siete paths M0 listados, cuatro M y tres A, sin artefactos. Después: índice y árbol limpios, `main` +10 sobre `origin/main` (referencia local `f401a0ed719d7b61cc41d95b789389e3df8813eb`), ningún push. M0 cerrado y aceptado; no se altera su commit al registrar esta continuación.

## M1 — ejecución autorizada, entrega sin commit

El encargo posterior autoriza implementar la definición técnica anterior: 21 tipos oficiales, 39 copias, identidades persistentes/de combate inequívocas, MIG-D01, recuperación 0/1/5 con suelo 1 y preparaciones aisladas de inicio/sandbox. Autoriza adaptar únicamente las superficies necesarias de colección, reserva, baraja, mano y selección, con inspección renderizada dirigida. No autoriza M2–M8, commit M1 ni push. Este encargo sustituye únicamente los estados anteriores «M1 no autorizado/no iniciado»; no cambia los contratos o pendientes de otros hitos.

Baseline M1: `HEAD be974b9b424a52db9653ab73c485fb71a6327991`, `main` +10, índice/unstaged/untracked vacíos tras el commit M0; no hay trabajo ajeno que separar. Evidencia técnica inicial: código idéntico al M0 aceptado, 179/179 + spatial y build registrados arriba; no se atribuye una nueva ejecución a este baseline. Implementer nativo posee código/pruebas M1; coordinador posee documentación, comprobaciones e inspección visual. No se delegan decisiones creativas. Revisión independiente posterior a implementación, con máximo dos ciclos de corrección; contador M1 inicial 0/2.

Brief de ejecución: mantener el legado jugable y sus datos intactos; añadir modelo y catálogo nuevo mediante adaptación simple del motor común, sin segundo motor/plugins. No activar el inicio nuevo. Pruebas deben acreditar cupos históricos, identidad correcta en cada operación, aislamiento y compatibilidad, sin presentar habilidades todavía ausentes como funcionales. Sandbox puede ser fixture y harness temporal; sin interfaz de depuración permanente. La validación humana de la gestión de copias queda pendiente de la entrega al diseñador; ninguna automatización la sustituye.

Plan acotado: (1) catálogo/metadatos y preparaciones aisladas; (2) cupos y recuperación, identidades de cartas/criaturas y liquidación; (3) adaptación mínima de UI y pruebas de duplicados; (4) regresiones/build, inspección renderizada, revisión independiente y entrega sin commit. M1 no implementará robo enemigo experimental, fichas/activaciones/escudos/curación/ritual, fatiga 0–1, IA nueva, orbe/restauración, mapa, cofres o puzle.

Estado al iniciar: implementación M1 en curso; verificaciones posteriores e inspección/revisión pendientes. Las secciones de definición y hoja de ruta anteriores se conservan como planificación y evidencias de autorizaciones previas, no como afirmación del estado presente.

### Inspección renderizada: limitación inicial de herramientas (antecedente)

Se aplican `game-ui-ux` y `computer-use` al alcance acotado de duplicados, sin rediseño. Intento offline de la CLI fijada `@playwright/cli@0.1.22`: `ENOTCACHED`, sin descarga, instalación ni dependencia nueva. El inventario CUA informa que el host de acceso a navegadores no está disponible. Se intenta el fallback nativo de Chrome; tras refrescar ventanas, Computer Use termina el acceso en este turno porque no puede determinar con suficiente confianza la URL actual para aplicar su política. **No se continúa por otro canal para eludir ese bloqueo.**

Se preparó un harness temporal externo con componentes reales y viewports internos previstos de 1440×900/1024×768, sin modificar el producto ni añadir ruta de depuración permanente. Servidor propio `127.0.0.1:5187` detenido tras el bloqueo; sin inspección de píxeles o gestos de las superficies M1. No se generaron capturas de M1 y no se afirma que SSR/pruebas equivalgan a validación visual. **Inspección renderizada y aceptación humana quedan pendientes; esta limitación impide declarar el cierre integral de M1.**

Evidencia temporal externa: `C:/Users/klaud/AppData/Local/Temp/game-factory-m1-9e66e422-a8c5-46cd-a658-95d68f211548/`, con `server.mjs`, `fixture.tsx` y oráculo extraído en memoria de la tabla oficial del ZIP. La comparación independiente del coordinador (`catalog-oracle-result.json`) coteja las 21 definiciones compiladas contra nombres, estadísticas, M/S, clase, límite y coste de recuperación del documento oficial: **21 filas exactas y 39 copias**. Es una comprobación de datos, no inspección visual ni balance.

### M1 implementado: contratos y archivos

- Tipo: `CreatureCard.id` sigue siendo A/R/H/N o P/E. El nuevo catálogo conserva nombre oficial, grupo interno, ATQ/VID, M/S, `maxCopies`, especial/semilla, recuperación y habilidades con implementación `pending-m2`/`pending-m3`. Sin efectos, rarezas o crecimiento heredado añadido.
- Copia persistente: `CreatureCopy.id`/`copyId`, salud, pertenencia a baraja/reserva y destino individuales. Sesiones con `collectionProfile` explícito `legacy`/`v04b`, mismo motor. La adaptación de perfil solo aplica contratos M1; no introduce reglas futuras.
- Carta de combate: `instanceId` único en mano/mazo y conservado al desplegarse; propio enlaza copyId, enemigo no necesita copyId. `Creature.id` identifica la entidad de campo. `entityKind` identifica explícitamente entidades reales, preparando fichas sin generarlas. En M1 solo se construyen reales.
- Cupos: `unlockedCopySlots` es autoridad del contexto V0.4B; descubrimientos se derivan de cupos positivos. `unlockedCardIds` permanece como proyección de compatibilidad. `grantedCopyEventIds` evita duplicar concesiones; no representa cofres espaciales nuevos.
- Concesión `grantCreatureCopies`: valida todo y concede cupos/copias sanas en reserva una vez por evento. Recuperación no modifica cupos, paga coste 0/1/5 y suelo 1, crea identidad nueva sana en reserva y conserva superviviente. Perfil legado mantiene descubrimiento único y costes anteriores.
- UI: catálogos opcionales en componentes de colección con default legado; artículos/controles por copyId, mano por instanceId y payload de arrastre por instancia. Copias muestran identidad/salud y cupos/vacantes; habilidades pendientes están señaladas. No cambian asignaciones, prioridades, conexiones, preview, foco ni CSS.
- Preparaciones `createV04BInitialSession()` y `createV04BCatalogSandbox()`: respectivamente ocho copias equipadas/siete tipos/ocho cupos y 39 copias/21 tipos/39 cupos. Estados independientes. No se invocan desde el bootstrap principal ni se añade interfaz de depuración permanente.

Paths M1, todos relativos a `projects/juego-cartas/`:

| Superficie | Paths y motivo |
|---|---|
| Catálogo/preparación nuevos | `src/engine/content/v04b.ts`, `src/engine/v04bPreparations.ts`: datos oficiales y fixtures aisladas. |
| Modelo y dominio | `src/engine/types.ts`, `session.ts`, `rules.ts`, `index.ts`: perfiles/cupos, concesión/recuperación, instancias y exports. |
| Adaptación IA/App | `src/engine/enemy.ts`, `src/App.tsx`: referenciar instancias de mano, sin estrategia ni robo nuevos. |
| UI mínima | `src/ui/CardViews.tsx`, `CollectionOverlay.tsx`, `CollectionViews.tsx`, `CombatView.tsx`, `combatActions.ts`: duplicados, props y payload. |
| Pruebas | `tests/m1.tsx` nuevo; `tests/run.ts`, `tests/contentCompatibility.ts`: registrar casos y adaptar expectativas de representaciones ahora instanciadas. |
| Documentación | `docs/implementation-plan.md`, `docs/status.md`, este registro: aceptación/commit M0, autorización/implementación/evidencia M1 y pendientes. |

Total: **19 paths**, 16 modificados y tres nuevos (dos módulos y una suite). Declaraciones de datos legados y `ACTIVE_CONTENT` intactos; mundo, mapas, exploración, CSS, assets, dependencias y herramientas Factory sin cambios. Los 179 casos previos se conservan; se adaptaron comparaciones literales de cartas para comprobar sus datos más las nuevas instancias, sin retirar expectativas de gameplay.

### Comprobaciones efectivas M1 y corrección previa a revisión

Implementer nativo completó código/pruebas y checks. Coordinador inspeccionó los diffs y archivos nuevos, incluidos datos y pruebas. Detectó un caso reproducible en la preparación pura de sesiones: un duelo legado podía liquidarse en sesión V0.4B con copyId coincidente y sin intento activo. Implementer añadió rechazo explícito de perfiles diferentes antes de idempotencia/consecuencias y regresión en ambos sentidos sin mutación de entradas. Es corrección técnica M1 anterior al reviewer; no consume un ciclo de corrección de revisión independiente.

- Implementer final: `npm.cmd test` **204/204 + spatial**, exit 0; `npm.cmd run build` correcto; preflight de sus 16 paths código/pruebas satisfactorio, índice intacto.
- Coordinador repitió sobre ese estado: `npm.cmd test` **204/204 + spatial**, exit 0 (**179 previas + 25 M1**). Incluye MIG-D01 A02 completo; concesión atómica/única; matriz 0/1/5 con máximo 20/6/5/2/1; duplicados heridos en mezcla/reparto/robo/campo, clic/teclado/payload de arrastre mediante helpers reales, sacrificio/cancelación/eventos obsoletos, reserva, liquidación idempotente, rechazo de identidades y perfiles cruzados, y markup SSR de colección/mano.
- Coordinador repitió build: exit 0, **67 módulos**; JS 1.254,32 kB/gzip 347,62 kB; CSS 68,63 kB/gzip 14,85 kB. Se mantienen avisos previos de Three y bundle >500 kB; no se modifican dependencias ni optimizaciones fuera de alcance.
- Comparación independiente con catálogo oficial: 21 filas/39 copias, sin discrepancias de los datos cotejados. `git diff --check` correcto. Sin diff en fachada/datos legados, mundo/spatial, estilos ni package/lock. Artefactos de test/build siguen ignorados.

Estado técnico: implementación, checks y **revisión independiente aprobados sin hallazgos**. Inspección renderizada/humana pendientes por el bloqueo documentado; ningún resultado SSR acredita píxeles, gestos nativos o balance. M1 se entrega sin commit y no se inicia M2.

### Revisión independiente y estado de entrega M1

Reviewer nativo en contexto nuevo, después de implementación y comprobaciones del coordinador: inspeccionó los 19 paths, incluidas las tres altas, contra alcance/criterios y matriz oficial del ZIP. Verificó cupos, recuperación, identidades, reserva, sacrificios, liquidación, preparaciones, compatibilidad y cobertura previa. Reejecutó suite compilada **204/204 + spatial**, exit 0; comprobó diff-check, HEAD `be974b9b424a52db9653ab73c485fb71a6327991` e índice vacío. No editó ni repitió build o inspección de navegador; usa el build efectivo del coordinador. **Veredicto técnico aprobado, sin hallazgos bloqueantes ni no bloqueantes. Ciclos de corrección de reviewer usados: 0 de 2.**

Preflight del coordinador sobre los 19 paths explícitos: **19/19 correctos, índice intacto**. Manifiesto completo 19/19 y 35 destinos Markdown locales válidos. El cambio final para registrar este resultado es solo documental; no cambia el código revisado ni justifica repetir tests/build. Se repite comprobación de formato/estado final.

Entrega **sin commit M1**, HEAD igual al cierre M0, rama `main` +10, índice vacío; 16 modificados y tres nuevos del alcance, sin trabajo ajeno. Sin push ni ejecutor adicional después de M0. Servidor temporal de inspección detenido. Funcionalidad técnica lista para evaluación del diseñador, pero **cierre integral pendiente de inspección renderizada y aceptación humana**. No se declara balance ni funcionamiento avanzado de las 21 cartas. Detenerse tras esta entrega; cualquier continuación y M2 requieren autorización expresa.

### Preparación de M2, sin ejecución

M2 puede partir de las identidades/entidades explícitas y metadatos existentes para fichas, recursos y activaciones. Antes de ejecutarlo se requiere la evaluación de M1 y su autorización expresa. P5 sigue pendiente: contrato de avance de principal cuando quedan activaciones voluntarias R01/N01 y opción de pasar sin usarlas. No sustituirlo por una decisión implícita del implementer. La fatiga 0–1 y R01/R02 pertenecen al alcance futuro aprobado; aún no se ejecutan. MIG-D02 deberá introducirse en el hito motor/IA correspondiente y no se aplicó en M1. P3/P4/P8 corresponden a efectos/UX posteriores; la convención A02 predesplegada se ratifica antes de los encuentros. D04/P2a ya está resuelto, sin reabrirlo. La continuación siguiente resuelve la inspección renderizada; la aceptación humana sigue pendiente.

### Continuación M1 — inspección renderizada y recuperación tras límite de uso

Autorización posterior del diseñador: completar únicamente la validación visual pendiente; descargar `@playwright/cli@0.1.22` de npm a caché temporal y utilizar Chrome existente, sin instalaciones globales, navegadores nuevos ni cambios de dependencias/configuración. La reanudación tras el límite de uso conserva esa autorización y prohíbe M2, commit M1 y push. No constituye una nueva iteración ni cambia las reglas. El bloqueo anterior de Computer Use se conserva como antecedente; el procedimiento temporal de CLI está documentado por `game-ui-ux` y fue autorizado expresamente.

Estado recuperado: mismo HEAD `be974b9b424a52db9653ab73c485fb71a6327991`, rama `main` +10, índice vacío y exactamente los 19 paths M1 anteriores (16 M y tres nuevos). Los SHA-256 de los 19 coincidían con `baseline-files.json` de la continuación interrumpida. No se detectó trabajo ajeno ni se reconstruyó M1. Se releyeron AGENTS, workflow, habilidad UI y los tres documentos operativos. La denegación anterior fue un fallo de revisión automática por límite de uso; no ejecutó el comando ni acreditó defecto o inseguridad del proyecto. La reanudación volvió a pasar las solicitudes de ejecución por la revisión del entorno.

Recursos externos reutilizados: `C:/Users/klaud/AppData/Local/Temp/game-factory-m1-render-8e20da46-dd05-49c9-84fc-058176ee825b/`. Contiene CLI/caché npm, daemon, `server.mjs`, `fixture.tsx`, scripts/resultados y PNG. Se comprobó CLI **0.1.22**, Node **22.17.1** y Chrome instalado **156.0.8078.76**. No hubo otra descarga en la reanudación. Se identificaron por ruta/command line el servidor propio PID 43864 en `127.0.0.1:5187` y daemon propio PID 23428; se reutilizaron. El navegador propio se reinició durante el diagnóstico de entrada y se mantuvo el servidor. Las evidencias permanecen fuera del árbol del proyecto y del índice.

Procedimiento: CLI ejecutada desde temporal mediante su entrada Node ya descargada, `PWTEST_DAEMON_SESSION_DIR` y `PLAYWRIGHT_BROWSERS_PATH` apuntando al temporal; sesión `m1-render`, `--browser=chrome --headed`. Operaciones CLI/navegador autorizadas con los permisos requeridos, sin alterar políticas ni descargar binarios de navegador. Servidor Vite temporal importa las dependencias existentes y sirve `/` con App real. Rutas `/__m1-fixture?mode=…` existen solo en memoria del servidor de inspección, no en producto. El catálogo nuevo emplea `CollectionOverlay`, `CombatView`, funciones de sesión y `combatActions` reales. Las variantes tácticas legadas cambian solo inicializadores de App servidos en memoria; sus handlers son los originales. La selección aleatoria se fija exclusivamente en las fixtures para reproducir identidades; el bootstrap jugable continúa mezclando normalmente.

| Comprobación renderizada/interactiva | Evidencia y resultado en 1440×900 y 1024×768 |
|---|---|
| Legado real: escena, colección y reserva | `probe-legacy.js`/`probe-legacy-output.txt` de la continuación previa: ocho copias, baraja 8→7→8 por retirar/añadir, apertura con I y cierre. PNG `legacy-scene-*` y `legacy-collection-*` abiertos: escena/HUD, cartas y controles legibles. Reutilizados sin repetir la matriz. |
| Preparación inicial V0.4B | `probe-collections-output.txt`: ocho copias/siete tipos, dos A01 con IDs distintos; capturas `v04b-initial-*`. No se activa como aventura principal. |
| Sandbox completo y desplazamiento | 39 artículos con **39 copyIds únicos**, 21 tipos; últimas cartas y lista de baraja accesibles. Scroll interno hasta el fondo: 3777,6 px (1440) y 6084 px (1024); sin overflow horizontal de página. Capturas `v04b-full-top-*`, `full-bottom-*`, `full-deck-bottom-*`; se inspeccionaron píxeles representativos de ambos tamaños. No se investiga ni se declara resuelta la onda de scroll diferida. |
| Dos copias con salud distinta | Fixture `pair`: N02 copy-1 1/2 y copy-2 2/2. Retirar copy-1 deja copy-2 elegida; reincorporar copy-1 y retirar copy-2 conserva copy-1 herida en baraja. Conteo 4→3→4→3, salud e identidades intactas. `v04b-pair-before-*`, `pair-reserve-*`, `pair-second-reserve-*`. |
| Recuperación interactiva | Fixture `vacancy`: N05 copy-30 perdida con cupo conservado, copy-31 superviviente. Botón real crea copy-40 sana en reserva; máximo 20→19, colección 38→39 y baraja permanece 38, sin reemplazar copy-31. `v04b-vacancy-before-*`/`after-*`. Esta prueba visual cubre coste 1; costes 0/5 y suelo 1 mantienen cobertura de dominio de las 204 pruebas, no se atribuyen a este gesto visual. |
| Mano, campo y sacrificio por identidad | `probe-combat-output.txt`: H01 copy-1 herida 1/3 y copy-2 sana 3/3 visibles juntas en mano; arrastre nativo invoca copy-1 y Enter invoca copy-2, con IDs de criatura distintos. Clic en N03 y elección de copy-2 sacrifica solo esa identidad; sobrevive copy-1 con 1/3 y entra N03 copy-3. Capturas `v04b-hand-*`, `field-duplicates-*`, `sacrifice-pending-*`, `sacrifice-result-*`. Componentes/handlers reales en preparación controlada, sin flujo de aventura nueva. |
| Regresión táctica en App legado | `probe-legacy-tactics-output.txt`: invocar por arrastre/clic; defensa y escaramuza con tres relaciones repartidas 2+1, prioridad invertida, reasignación al segundo enemigo y retirada a «Sin asignar», quedando dos relaciones. Controles, grupos y conexiones responden. PNG `legacy-hand-*`, `invocation-*`, `defense-*`, `skirmish-*` representativos abiertos. |

Los tres probes de colección, combate duplicado y táctica completos terminaron con **`errors: []` y `warnings: []`** para sus errores de ejecución/consola y avisos React de claves; sin confusión de identidades observada. El último retorno a `/` confirmó de nuevo colección/baraja 8/8 y foco `exploration-viewport exploration-focused` al cerrar con Esc. `probe-final-ready-output.txt` confirma canvas **1024×768 con WebGL activo**; se abrió la captura de escena. El muestreo inicial de ese probe había leído el canvas transitorio 300×150 antes de que R3F lo dimensionara, por lo que se esperó al tamaño final. Persisten los dos avisos conocidos de Three (`Clock` y fallback de `PCFSoftShadowMap`); una petición inicial de favicon de las fixtures devolvió 404. No se presentan como defectos M1.

Incidencias de la preparación: se corrigieron únicamente rutas/imports virtuales del harness que provocaban doble `createRoot`, y su recarga de fixtures; la repetición final de colección quedó sin avisos React. Un guion de arrastre usó coordenada vertical 45 en una zona de retirada de menor altura: el log informó intercepción de controles. Tras restablecer solo Chrome propio y dirigir el gesto al centro del destino, la matriz táctica completa pasó. Hubo también un intento que dejó de registrar eventos de entrada; no se atribuye causa de producto a ese estado del navegador. Los intentos incompletos no se cuentan como pruebas aprobadas. **No se encontró un defecto reproducible de M1 y no se modificó código, CSS, tests, configuración, instalación ni dependencias del proyecto.**

Alcance y límites: esta evidencia es inspección de píxeles e interacciones de navegador, distinta de SSR y pruebas puras. No prueba una expedición V0.4B completa, habilidades M2–M3, IA nueva ni balance. La liquidación idempotente y heridas/pérdidas persistentes siguen acreditadas por las pruebas de dominio ya aceptadas; aquí se verificó la identidad hasta el campo y el sacrificio. No se repiten suite/build al permanecer sus archivos byte a byte iguales; se conservan los resultados efectivos anteriores 204/204 + spatial y build, y la revisión técnica sin hallazgos. Solo se actualizan estos tres documentos operativos.

Revisión independiente de esta continuación: reviewer nativo en contexto nuevo, **aprobada sin hallazgos pendientes**. Leyó instrucciones/alcance, cotejó UI/tests pertinentes, harness, probes y registros; abrió 17 capturas representativas de ambos tamaños, sin regresión demostrable. Confirmó los 16 SHA-256 de código/pruebas intactos, solo tres docs actualizados, HEAD e índice y preflight read-only **19/19**. No ejecutó navegador, suite ni build; conserva sus resultados previos. Una remisión auxiliar a `RESULTADOS.md`, creado concurrentemente durante la revisión, se volvió a comprobar con el archivo ya disponible y quedó resuelta. No hubo corrección de producto ni ciclo adicional de corrección de reviewer: **0 de 2 usados**.

Finalización: CLI cerró exclusivamente `m1-render`. El primer intento de detener el servidor propio devolvió error interno de PowerShell; se volvió a verificar PID/ruta exacta, se usó el método Terminate de CIM (retorno 0) y se confirmó ausencia del PID 43864 y de listener en 5187. No se detuvieron procesos ajenos. Se conservaron las evidencias y el protocolo `HUMAN-CHECK.md`/`RESULTADOS.md` en temporal. Comprobación de alcance: los 16 paths de producto/tests siguen byte a byte iguales al baseline de esta continuación; solo los tres documentos difieren. HEAD permanece `be974b9b424a52db9653ab73c485fb71a6327991`, main +10, índice vacío y mismos 19 paths (16 M, tres nuevos), sin cambios ajenos ni archivos temporales incorporados. Formato final comprobado con la misma lista explícita; no se invoca ejecutor de commit.

Estado de entrega visual: **M1 listo para aceptación humana**, sin corrección de producto requerida en los estados inspeccionados. El diseñador debe evaluar personalmente la claridad/gestión de duplicados y aceptar el hito; la automatización no concede esa aceptación. `HUMAN-CHECK.md` del temporal ofrece el recorrido reproducible. La inspección renderizada ya no es un bloqueo; el cierre/commit M1 y cualquier avance M2 requieren autorización expresa posterior. Sin staging, commit ni push.

### Cierre M1 — aceptación humana y commit local autorizados

Decisión posterior del diseñador: **M1 expresamente aceptado**, tras completar personalmente las pruebas en el entorno temporal. Confirma catálogo 21/39, identidades/cupos/recuperación, gestión de duplicados heridos/sanos, mano/invocaciones/sacrificios específicos y compatibilidad legado. Acepta las 204/204 + spatial, build, inspección renderizada 1440×900/1024×768 y revisión independiente sin hallazgos; no solicita correcciones. No equivale a aceptar efectos M2–M3, balance o una expedición V0.4B integrada.

Autoriza registrar esa aceptación, cerrar M1 con el ejecutor seguro y exactamente sus 19 paths, verificar hash/archivos/estado y usar el resultado como baseline de M2. Autoriza después implementar M2 solo donde no dependa de P5; no autoriza commit M2, M3–M8 ni push. La propuesta P5 no está ratificada y se debe presentar antes de modificar automatización o su interfaz. No se incluyen evidencias, fixtures ni herramientas temporales en Git.

Preflight del cierre: `HEAD be974b9b424a52db9653ab73c485fb71a6327991`, rama `main`, índice vacío, exactamente 16 M y tres untracked propios de M1, sin trabajo ajeno. Los 16 hashes de producto/tests siguen coincidiendo con la entrega revisada; en este tramo solo se editan los tres registros operativos para la aceptación. Las verificaciones técnicas/visuales y revisiones aceptadas siguen vigentes; no se repiten suite/build/navegador ni se modifica producto. El ejecutor instalado y fuente coinciden en SHA-256 `758fa50726a64fd33b07a9485e04d5d358376a0c517e6ed29eefbd11401aefdf`. Se revisan diff/manifiesto y formato de los 19 paths, con revisión independiente documental antes del ejecutor; su resultado y el hash efectivo se registran al verificarlos. No hay staging directo ni inicio M2 anticipado.

Revisión independiente de cierre: reviewer nativo en contexto nuevo, **aprobado para commit local M1, sin hallazgos**. Verificó manifiesto exacto, 16 hashes intactos, tres cambios documentales, aceptación humana, restricciones, HEAD/main +10/índice, diff-check y preflight 19/19 y hashes del ejecutor. No editó ni repitió suite/build/navegador. Se repite la comprobación final inmediata antes del ejecutor con los mismos 19 paths explícitos. La revisión no ratifica P5 ni autoriza commit M2 o push. El hash se obtiene después del commit que incorpora este registro, sin insertarlo circularmente en su propio contenido.

Resultado efectivo: preflight final 19/19; ejecutor seguro produjo **`3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`**, mensaje `juego-cartas: cerrar M1 de catalogo y copias independientes V0.4B`. `diff-tree --no-renames` confirmó exactamente 16 M y tres A del manifiesto M1; índice y árbol posteriores limpios, `main` +11 sobre referencia local origin/main. No hubo push. M1 cerrado y aceptado, sin enmienda a su commit.

## M2 — ejecución autorizada y condicionamiento P5

Baseline anterior a cualquier edición M2: `HEAD 3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`, `main` +11, índice/unstaged/untracked vacíos. No hay cambios ajenos. Evidencia de partida: resultados aceptados M1, sin repetirlos durante el cierre documental. Instrucciones/fuentes: AGENTS, workflow, `game-iteration`, especificación legado y decisiones posteriores; v1.2 del ZIP externo leído en memoria (secciones de recursos, fichas y ofensiva) con catálogo oficial M1 como autoridad de nombres. No se extraen ni modifican especificaciones aprobadas.

Brief: cambio funcional amplio ya autorizado por el diseñador; mantener prototipo legado activo y añadir solo recursos/fichas/activaciones básicas del perfil V0.4B. Dominio independiente: fatiga 0–1; renovable `max(0,1+R02 vivas−fatiga)` sin maná inmediato al invocar R02; R01 voluntaria principal, sacrificio atómico y +2 temporal con expiración al salir de principal; fichas 1/1 A02/A04 después del pago, entidades explícitas sin colección/cupos/recuperación ni persistencia; sacrificios generales permiten fichas, futuros requisitos reales las rechazan; A04 suma otras atacantes declaradas, incluidas fichas, solo en esa ofensiva y sin cambiar base/persistencia. Sin topes arbitrarios ni cambios del robo o estrategia rival.

Plan acotado: implementer nativo posee motor/sesión, metadatos y presentación mínima independiente, pruebas dirigidas y regresiones; coordinador registra, inspecciona diff, ejecuta checks, valida superficies afectadas y obtiene revisión independiente nueva. No tocar avance automático ni interfaz de activación R01 hasta ratificar P5. No se implementan escudos, curación, A03/N01/H04, IA/robo experimental, orbe, mapa, premios, puzle ni scroll diferido. H04 puede recibir el filtro de materiales reales como contrato de coste preparado, pero no el efecto ritual. Sin dependencias nuevas, commit M2 o push. Ciclos de corrección M2 iniciales: 0/2.

### P5 — propuesta de la entrega parcial (ratificada posteriormente)

Se remitió al diseñador para ratificación mediante pregunta pendiente, antes de editar automatización o su interfaz:

1. Solo en V0.4B, mantener principal si existe invocación o activación voluntaria legal, o selección pendiente. El legado conserva su criterio actual.
2. Conservar «Ir al ataque» para pasar sin activar; no pasar durante selección pendiente.
3. Junto a cada R01 propia viva, botón «Activar Runa inestable» con indicación de sacrificar esa copia y +2 temporales hasta salir de principal; sin confirmación añadida.
4. Durante selección de sacrificios, completar/cancelar antes de activar R01.
5. Recalcular acciones tras invocar, activar o cancelar; si no queda ninguna y no hay selección, pasar automáticamente al ataque y eliminar sobrante temporal.
6. Caso límite explícito: activar última R01 con mano vacía es legal; sin otra acción se avanza y expira su maná. Dos R01 pueden activarse sucesivamente mientras existan. N01 se incorporará más adelante al mismo criterio solo con objetivo válido; no implementarla ahora.

La propuesta cubre los puntos donde `continueToPlayerDecision` llama al criterio actual `advanceMainPhaseIfNoLegalSummons` (avance, cancelación, invocación, cierre de selección y transiciones de turnos). Sin respuesta no hay aprobación; continuar únicamente dominio independiente y entregar esa limitación. El dominio puede probar activación explícita sin exponer una UI provisional. Validación humana de flujo/controles M2 deberá realizarse después de implementarlos y antes de un cierre futuro; no repetir aceptación M1.

### M2 — dominio independiente implementado

Implementer nativo completó la parte independiente de P5. Motor común con perfil V0.4B; no se cambia el bootstrap legado. `Invoker.mana` sigue siendo el total utilizable, con `temporaryMana` incluido como porción temporal. Se paga temporal primero: conserva renovable no gastado y no cambia costes/acciones aprobados. `baseMana(invoker, profile='legacy')` mantiene compatibilidad y usa en V0.4B nivel fijo 1 más R02 propias reales/vivas menos fatiga; R02 no concede al entrar ni retira retroactivamente recursos renovados. Fatiga en sesión V0.4B solo 0/1, derrotas repetidas capadas, victoria ordinaria la conserva; bandera explícita de restauración puede limpiarla sin añadir orbe o premios nuevos.

`activateR01(state, creatureId)` requiere principal del dueño activo, criatura real R01 propia viva y contexto V0.4B; elimina solo esa identidad y añade +2 total/temporal en una transacción pura. No se invoca desde muerte ni sacrificio de otra carta; permite preparar el motor de ambos lados sin IA nueva. `startCombat` elimina el temporal sobrante y `endTurn` renueva sin acumular; el **criterio** de avance automático permanece sin cambios, pendiente P5.

Invocar A02/A04 legalmente crea después del pago una `Ficha de rata` 1/1 con `entityKind: token`, `Creature.id` e `instanceId` distintos y sin `copyId`. No se crea al cargar un campo inicial. Validación rechaza tokens en mano/mazo/colección y tokens con identidad persistente; no confunde enemigos reales sin copyId. Fichas atacan, bloquean y pagan sacrificios generales, sin límites nuevos. `sacrificeCandidates` prepara la restricción real de H04, **sin implementar su ritual**; pruebas de pago genérico 3S usan fixture de coste, sin alterar catálogo. Al terminar combate natural se eliminan fichas de ambos campos; liquidación nunca crea copias/cupos/pérdidas por ellas.

A04 captura `attackBonus` al declarar atacantes según número de otras aliadas declaradas, incluidas fichas. `effectiveAttack` se utiliza en daños/presentación; se limpia al resolver simultáneamente, sin modificar ATQ impreso, salud, defensa ni mejoras persistentes. Metadatos `domain-m2` describen lo disponible en motor; R01 conserva aviso de interfaz pendiente P5. A04 ofensiva pasa al alcance M2 por la autorización actual; N01 queda marcado pendiente M3 conforme a su exclusión expresa del encargo. Ningún nombre, estadística, coste o límite del catálogo cambia.

Paths M2 relativos a `projects/juego-cartas/` (**13: 12 M, uno nuevo**):

| Superficie | Archivos y motivo |
|---|---|
| Motor/modelo | `src/engine/rules.ts`, `session.ts`, `types.ts`: recursos/fatiga, activación pura, tokens/identidades, coste y bono temporal. |
| Datos descriptivos | `src/engine/content/v04b.ts`: estado de habilidades y hito, sin cifras nuevas. |
| Presentación mínima | `src/ui/CardViews.tsx`, `CombatView.tsx`: ficha temporal, ATQ efectivo, porción temporal y fórmula por perfil; `CollectionViews.tsx`: solo nota global honesta del sandbox. |
| Pruebas | `tests/m2.tsx` nuevo; `tests/run.ts`: registrar suite; `tests/m1.tsx`: adaptar explícitamente expectativas de A02 y metadatos ahora operativos, manteniendo cobertura de identidad y datos oficiales. |
| Continuidad | `docs/implementation-plan.md`, `docs/status.md`, este registro: cierre M1 y estado parcial M2. |

`App.tsx`, `combatActions.ts`, `enemy.ts`, criterio `advanceMainPhaseIfNoLegalSummons`, datos/fachada legados, mundo/spatial, prioridades, relaciones/conexiones, CSS, assets, dependencias/configuración y herramientas Factory intactos. Las expectativas generales/legadas siguen; no se eliminan casos históricos para pasar tests. Sin segundo motor, nuevo selector ni ruta permanente de depuración.

### Verificaciones M2 y corrección previa a revisión

Primera entrega implementer y repetición efectiva del coordinador: **234/234 + spatial** y build correctos. Coordinador encontró después un fallo de entrada reproducible: `createDuel({collectionProfile:'v04b',playerDeck:[],opponentDeck:[],playerFatigue:0.5})` producía fatiga/maná 0.5. Implementer añadió rechazo de fracciones/no finitos antes de construir V0.4B, manteniendo el clamp de enteros a 0/1 y el legado; regresión 0.5/NaN/Infinity sin mutación. Corrección anterior a primera revisión, no consume ciclo de reviewer.

Verificaciones finales realmente repetidas, tanto por implementer como por coordinador, tras esa corrección:

- `npm.cmd test`: exit 0, **235/235 + spatial** (204 previas adaptadas donde corresponden los efectos autorizados, **31 nuevas M2**). Cubre matriz R02 0/1/2 × fatiga 0/1, no ingreso inmediato ni reversión de maná renovado, activación R01 única/atómica/propia, gasto/expiración, bajas/sacrificios sin activación involuntaria, identidad/pérdida de copia R01, tokens de ambos lados, ataque/bloqueo/sacrificios 1/2/3, cancelación/rechazos sin pago, limpieza/persistencia/reserva y A04 con 0/1/3 otras atacantes, simultaneidad, defensa y combate posterior.
- `npm.cmd run build`: exit 0, **67 módulos**, JS **1.257,41 kB/gzip 348,47 kB**, CSS sin cambios **68,63 kB/gzip 14,85 kB**. Persisten avisos conocidos de Three y bundle >500 kB; no se incorporan dependencias ni optimizaciones ajenas. Los avisos stderr aparecen también envueltos por PowerShell al redirigirlos; el código de salida efectivo de npm es 0.
- Implementer: diff-check y preflight de sus diez paths correctos; corrección final preflight 2/2. Coordinador inspeccionó diff y suite, antes de preflight de los 13 paths y revisión independiente. Sin commit M2.

### Presentación M2 — inspección renderizada dirigida

Procedimiento `game-ui-ux`, CLI temporal **0.1.22 ya disponible** y Chrome instalado, sin otra descarga. Recursos externos nuevos: `C:/Users/klaud/AppData/Local/Temp/game-factory-m2-render-2c841cd7-977b-4ad4-889b-fa5aa5370810/`. Contiene `server.mjs`, `fixture.tsx`, `probe.js`/`probe-output.txt`, logs efectivos `coordinator-tests-final.txt`/`coordinator-build-final.txt` y PNG. Servidor propio `127.0.0.1:5188`, sesión distinta `m2-render`, sin tocar procesos del diseñador ni las evidencias M1. Importa Vite/componentes/dependencias existentes; rutas de fixture solo en memoria, ninguna escritura de instalación/configuración.

Probe y diez PNG abiertos por el coordinador: **1440×900 y 1024×768**, cinco estados cada uno:

- `m2-tokens-*`: A02/A04 y dos fichas 1/1 con cuatro IDs de campo distintos; «Ficha temporal» diferenciada de copy-1/copy-2. Controles y estadísticas legibles, sin solapamiento observado.
- `m2-mana-*`: dos R02 con identidad propia, fatiga 1 y R01 activada por API de dominio; total 2, porción temporal 2 explícita y renovación futura 2. La fixture no llama al controlador ni decide P5.
- `m2-bonus-*`: A04 ATQ impreso 1, bonus 3 por tres otras atacantes, ATQ efectivo visible 4, sin cambiar salud 2.
- `m2-collection-*`: 39 copias y nota de motor M2/pendientes M3/P5, sin cambios de gestión o layout.
- `m2-legacy-*`: raíz App real, escena y HUD; canvas WebGL activo 1440×900/1024×768. I abre colección de ocho; Esc la cierra. Legado sigue activo.

Resultado del probe completo: `errors: []`, `warnings: []` para errores de ejecución/consola y avisos React capturados. Persisten avisos conocidos de Three fuera de ese filtro y favicon 404 inicial. Son **estados preparados con dominio y componentes reales, handlers tácticos inertes en la fixture V0.4B**, no prueba interactiva de R01/P5, ni nueva IA, expedición, balance o playtesting humano M2. No se investigó la onda de scroll. No hubo correcciones visuales. La corrección posterior de fatiga inválida no cambia ninguno de estos estados válidos o componentes, por lo que no se repitió esa matriz.

Estado previo a revisión: dominio independiente y presentación mínima comprobados; revisión independiente M2 pendiente. P5 sin respuesta/ratificación, automatización/controlador y UI de activación intactos. No se considera M2 completo ni listo para cierre humano integral; siguiente paso depende de ratificar P5 e implementar/verificar esa parte. Sin commit M2 ni M3–M8/push.

### Revisión independiente y entrega parcial M2

Reviewer nativo en contexto independiente, posterior a implementación/corrección y checks finales: **aprobado para este dominio y presentación mínima, sin hallazgos reproducibles**. Inspeccionó código/diff/tests/contratos y adaptaciones M1; reejecutó suite compilada **235/235 + spatial**, exit 0, y contrastó build del coordinador sin regenerarlo. Abrió seis capturas representativas de ambos tamaños, cotejó probe y handlers inertes de la fixture, sin solapamientos observados. Confirmó manifiesto 13 paths, HEAD M1, índice vacío, diff-check y preflight **13/13**, ausencia de cambios en App/controlador/criterio/IA/robo/CSS/datos legados. No editó ni ejecutó navegador. La revisión no concede aceptación humana de M2 ni autoriza P5, commit o siguientes hitos. Ciclos de corrección de reviewer usados: **0/2**.

Coordinador cerró únicamente CLI `m2-render` y servidor temporal propio identificado por ruta completa (PID 28892); confirmó ausencia de proceso y listener5188. Las evidencias permanecen en temporal con `RESULTADOS.md` y protocolo de reproducción, fuera de Git. Nada de M1 se reabre ni se altera su commit. La última actualización de documentación no cambia el código revisado; se repite preflight13/13 y manifiesto/índice, sin repetir suite/build o visual innecesariamente. Artefactos `.test-dist`, `dist` y `tsconfig.tsbuildinfo` confirmados ignorados.

Estado final de esta entrega: `HEAD 3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`, `main` +11, índice vacío, **12 M y un nuevo** (suite M2) de los 13 paths listados, sin cambios ajenos. Solo se creó el commit M1 autorizado; **no hay commit M2 ni push**. M2 parcial técnicamente revisado; **detenido en la dependencia funcional P5 pendiente de ratificación expresa**. Para completarlo: ratificar/revisar el contrato de arriba, implementar controlador y UI R01 en un paso acotado, verificar eventos obsoletos/pendientes/paso voluntario/expiración, inspeccionar interacciones y solicitar evaluación humana de M2. No se inicia M3 ni se interpreta el silencio como aprobación.

### Continuación M2 — P5 ratificado y finalización autorizada

El diseñador **ratifica expresamente los siete puntos P5** de la entrega y autoriza completar M2. Esta decisión sustituye la condición pendiente de los párrafos anteriores, conservados como historial. Autoriza permanencia en principal por activación legal, paso voluntario sin activar, acción explícita R01 que comunica sacrificio/+2 temporal sin confirmación, bloqueo durante selección pendiente, recálculo tras cada acción/cancelación, activación con mano vacía y de dos R01 sucesivas, y compatibilidad legada/preparación de criterio futuro N01 sin implementarla. No permite vetar acciones legales por criterio estratégico ni activar automáticamente R01.

Baseline de continuación: mismo `HEAD 3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`, `main` +11, índice vacío, los mismos 13 paths M2 (12 M, uno nuevo), sin cambios ajenos. Los diez SHA-256 de producto/tests coinciden con la entrega revisada; se preserva íntegra su implementación. Se releyeron AGENTS, workflow, habilidad UI y los registros vigentes; no se rehace M2. Copia de estado y hashes de los 13 en `C:/Users/klaud/AppData/Local/Temp/game-factory-m2-p5-14ba3e27-e00b-40b6-ab8d-72a832daabd6/` antes de editar.

Plan autorizado de continuación: implementer nativo amplía criterio de acciones legales y transacción de activación con revisión de eventos, conecta handler real de App y botón R01 por identidad en CombatView, con ajustes de presentación/textos estrictamente necesarios y pruebas de integración. Coordinador conserva documentos, inspecciona diff/alcance, ejecuta pruebas/build y navegador con controles reales, después solicita revisión independiente nueva. Se reutilizan las evidencias de dominio/estados que no cambien; la inspección inerte anterior no acredita esta integración. Mantener el contador M2 de reviewer 0/2; no crear una iteración o motor adicional. M3, commit M2 y push siguen prohibidos; evaluación humana posterior requerida para aceptar M2.

### P5 implementado — controles y transacciones reales

`r01ActivationAvailability` identifica activaciones legales por contexto/propiedad/tipo/vida; `hasLegalActivation` y `hasLegalMainPhaseAction` constituyen el criterio común preparado para futuras activaciones sin implementar N01. El export histórico `advanceMainPhaseIfNoLegalSummons` conserva su nombre y la compatibilidad: en V0.4B ya no sale de principal si queda R01 legal, aunque la mano esté vacía. No evalúa conveniencia estratégica ni activa por sí mismo. Una selección pendiente sigue frenando el avance.

`applyCombatAction` añade `activate-r01` por ID de criatura y revisión capturada: exige principal propia y ausencia de selección, llama al dominio R01, registra solo el copyId sacrificado y recalcula acciones mediante el flujo real existente. Errores, eventos obsoletos y repetidos no pagan ni cambian estado. App conecta `activateRune` a esa transacción y publica su resultado por el mismo mecanismo aceptado; el mensaje distingue maná disponible de sobrante que expiró al pasar automáticamente.

CombatView incorpora `onActivateR01` y un `R01ActivationButton` separado de la baldosa, evitando botones anidados y conflicto con la selección de sacrificios. Identifica copyId, comunica «Activar Runa inestable» y «Sacrifica [copia] · +2 maná temporal», con explicación de pérdida/expiración, sin confirmación adicional. Usa la protección existente de clic múltiple y teclado repetido. Solo aparece para R01 legal en principal propia y queda deshabilitado durante selección. «Ir al ataque» permanece disponible sin activar cuando no hay selección; se conserva el bloqueo/acción de cancelar mientras la hay. CSS añadido solo al nuevo control; no se rediseñan filas, prioridades, drag o conexiones. Se retiran los avisos obsoletos de P5 pendiente del catálogo.

Manifiesto total M2 actualizado: **16 paths (15 M y uno nuevo)**. Son los 13 de la entrega parcial más `src/App.tsx`, `src/ui/combatActions.ts` y `src/ui/combat.css`. El dominio previo y sus pruebas se preservan, ampliados por el criterio P5. No cambian IA/robo, mapa, recompensas, catálogo numérico, assets, dependencias o configuración. H04/N01/A03, escudos y sanación M3 permanecen pendientes como estaba previsto.

### Verificaciones finales de integración M2

Implementer y coordinador ejecutaron por separado, sobre la integración terminada:

- `npm.cmd test`: exit 0, **243/243 + spatial**, las 235 de la parte anterior más ocho P5. Incluyen permanencia sin cartas, paso voluntario, mano vacía/expiración, dos R01, maná que habilita invocación, pendientes/cancelación sin pago, clic múltiple/Enter repetido/revisión obsoleta, controles reales por copia y ausencia de activación en legado/N01 pendiente.
- `npm.cmd run build`: exit 0, **67 módulos**, JS **1.259,60 kB/gzip 349,00 kB**, CSS **69,19 kB/gzip 14,95 kB**. Solo se incrementa la presentación necesaria. Se conservan los avisos conocidos de Three y bundle >500 kB; no se amplía alcance para optimizarlos.
- Implementer: preflight13/13 de sus paths y diff-check correctos. Coordinador inspeccionó código, pruebas y diff; preflight con los 16 paths antes de revisión independiente.

Inspección nueva con CLI temporal 0.1.22 ya disponible y Chrome instalado, **sin descargas**: servidor propio `127.0.0.1:5189`, sesión `m2-p5`, recursos en `C:/Users/klaud/AppData/Local/Temp/game-factory-m2-p5-14ba3e27-e00b-40b6-ab8d-72a832daabd6/`. `server.mjs` sirve App real en memoria cambiando solo sus dos inicializadores de sesión/duelo y una asignación diagnóstica de estado para observación. `entry.tsx` conserva StrictMode; los componentes, handlers, efectos de avance y transacciones son los del producto. No sustituye callbacks por funciones inertes ni modifica archivos fuente. La mano/colocación se fija solo al preparar cada caso; no se altera el robo real. No es la aventura V0.4B integrada y no se prueban premios o cierre de encuentros nuevos.

`probe.js` y resultados finales `probe-output.txt`/`probe-summary.json`: **16 resultados resumidos (ocho casos × 1440×900/1024×768)**, además de comprobaciones intermedias y avance sin acciones. Todos satisfactorios, `errors: []`, `warnings: []` para errores/avisos capturados. Gestos y resultados reales:

| Caso en App | Verificación efectiva en ambos tamaños |
|---|---|
| Activación y nueva invocación | Con fatiga 1, intento de R03 sin maná rechazado sin mutar; principal conserva R01. Clic en su botón sacrifica copy-1, da 2 temporales y mantiene principal. Arrastre de R03 paga esos dos y entra copy-2; autoavanza con 0 temporal. |
| Paso voluntario | «Ir al ataque» conserva R01 viva y no registra sacrificio ni concede maná. |
| Dos R01 | Dos controles por copyId visibles. Enter inicial/repetido activa solo copy-1; copy-2 queda disponible y mantiene principal. Segundo clic deja cuatro temporales e invocación legal R04; al pagar, temporal 0. No se prueba Escudo de R04. |
| Mano vacía | Última R01 activable; tras activarla autoavanza y expira el temporal, con mensaje correspondiente. Con dos R01 y mano vacía, la primera mantiene principal y la segunda produce el avance/expiración final. |
| Selección y cancelación | Al elegir N04, R01 queda deshabilitada y no existe paso al ataque. Esc cancela conservando criaturas/maná. Activación posterior y pago combinado N04/N05 dejan solo copy-3 en campo, maná renovable 1 y temporal 0. |
| Sacrificio general R01 | Elegirla como material de N04 no concede +2; se pierde esa copia y se paga el coste normal. |
| Ausencia de acciones y legado | Sin acciones legales, se avanza automáticamente. App con preparación legada no muestra activación y conserva invocaciones P01 por clic/P02 por Enter, identidades y recursos. |

Se generaron **22 PNG**, con capturas representativas de ambos tamaños abiertas: `p5-ready-*`, `p5-two-ready-*`, `p5-first-of-two-*`, `p5-funded-*`, `p5-pending-*`, `p5-cancelled-*`, `p5-empty-expired-*`, `p5-summoned-*`, `p5-legacy-combat-*`. Controles/identidades/coste legibles y accionables; el tablero mantiene su desplazamiento interno cuando es necesario. Las capturas finales esperan 400 ms a las transiciones existentes; las inmediatas anteriores podían mostrar posiciones intermedias solapadas, que no persisten al estabilizarse. No se cambió animación o geometría del producto para ese caso.

Incidencias exclusivas del harness: import virtual relativa inicialmente no resuelta y vida inicial de rival de fixture discordante con su máximo mostrado; corregidas solo en temporal antes de repetir la matriz/capturas finales. No se encontraron defectos reproducibles nuevos del producto en esta continuación y no hubo correcciones de gameplay o balance. La escena/WebGL y estados de dominio anteriores se conservan como evidencia cuando no cambiaron; no se repitió inspección genérica de mapas ni scroll diferido. Pruebas de callbacks/SSR, gestos reales y píxeles se distinguen; nada acredita balance, IA estratégica o playtesting humano M2.

Estado anterior a la revisión final: **alcance M2 implementado y comprobado, P5 ya resuelto**. Revisión independiente nueva pendiente; aceptación humana M2 todavía pendiente. No hay otro bloqueo funcional identificado para M2; no se hace commit ni se inicia M3.

### Resultado final M2 — listo para aceptación humana, sin commit

Reviewer nativo en contexto nuevo tras implementación/checks: **aprobado técnicamente sin hallazgos reproducibles ni bloqueantes**. Inspeccionó los 16 paths, contratos y cobertura; reejecutó suite compilada **243/243 + spatial**, exit 0, y contrastó build del coordinador sin regenerarlo. Cotejó App/StrictMode/handlers reales del harness y abrió siete capturas de ambos tamaños, sin solapamiento persistente que impida operar. Verificó preflight16/16, diff-check, índice vacío y HEAD M1; no editó ni ejecutó navegador/instalaciones/commits. Ratificación P5 y límites documentales coherentes; sin ampliación a M3 u otros sistemas. Ciclos de corrección de reviewer en todo M2: **0/2**.

Finalización de recursos: se cerró solo `m2-p5` y se identificó/detuvo el servidor propio PID49976 por su ruta completa, Terminate retornó 0 y listener5189 ausente. No se tocaron procesos del diseñador. `HUMAN-CHECK.md` del temporal permite reiniciar el servidor y probar resource/two/empty/empty-two/pending/none/legacy con controles reales; no requiere instalación. `RESULTADOS.md`, `tests.txt`, `build.txt`, `probe-summary.json`, guiones y capturas permanecen fuera de Git. Se preservan las evidencias previas M1/M2 de estados y sus límites.

Entrega final: `HEAD 3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`, main +11 sobre referencia local origin/main; índice vacío, **15 archivos modificados y uno nuevo (`tests/m2.tsx`)**, exclusivamente los 16 del manifiesto actualizado. Sin cambios ajenos, commit M2, push o ejecutor de cierre. La última actualización es documental: se repite formato/estado final sin repetir tests/build ya vigentes. **M2 completo técnicamente, pendiente únicamente de evaluación/aceptación humana del hito**, sin balance ni aventura V0.4B integrada acreditados. No hay decisión P5 pendiente. No continuar automáticamente ni cerrar/commitear M2 o iniciar M3 antes de instrucciones expresas del diseñador.

### Cierre M2 — aceptación humana y autorización expresa

El diseñador **acepta formalmente M2 dentro del alcance implementado y verificado**, tras completar personalmente los nueve escenarios del protocolo: activación R01, invocación con maná temporal, paso sin activar, dos R01 consecutivas, mano vacía, cancelación pendiente, R01 como sacrificio sin habilidad, avance sin acciones y compatibilidad del combate legado. La evaluación humana estuvo centrada en P5; los demás comportamientos M2 se aceptan con sus comprobaciones técnicas registradas, sin afirmar pruebas humanas adicionales. No hay correcciones solicitadas ni validación de balance/expedición integrada.

Se conservan como evidencia vigente 243/243 + spatial, build correcto, inspección App/handlers reales en 1440×900/1024×768, revisión independiente sin hallazgos y preflight16/16. Corrección de producto realizada durante M2: rechazo de fatiga fraccionaria/no finita V0.4B con regresión, anterior a la primera revisión. Las incidencias de import/vida preparada/transición de captura pertenecían solo a fixtures temporales y se corrigieron allí; no se reabren M0/M1 ni gameplay aceptado. Cero ciclos de corrección de reviewer usados en M2.

Autoriza exactamente registrar aceptación, commit local seguro M2, verificarlo y establecer su hash real como baseline para **planificar** M3. No autoriza código M3, nuevos sistemas, balance, M4+ ni push; tampoco commit adicional de la preparación M3. D2/P2a y D1 siguen aprobados; P3/P4/P8 continúan pendientes de ratificación antes de su implementación.

Baseline verificado de cierre: `HEAD 3ec644a5bd2705e2c6ed6353f6e568b9e6b4bcf4`, rama main +11, índice vacío, exactamente los 16 paths registrados, 15 M y uno nuevo, sin ajenos ni herramientas/evidencias temporales. Diff/estado/código inspeccionados contra la entrega y sus registros; los cambios de producto conservan las cifras de diff aceptadas y fechas anteriores a las comprobaciones vigentes. Se capturaron hashes y estado inicial de los 16 en `C:/Users/klaud/AppData/Local/Temp/game-factory-m2-close-6e4a58d6-cdf8-4ae5-8113-93cc068cc68b/` para verificar que este cierre solo cambie documentación. No se modifica producción/pruebas ni se repiten verificaciones extensivas vigentes.

Manifiesto exacto del commit M2, relativo a `projects/juego-cartas/`:

- `docs/implementation-plan.md`, `docs/iterations/2026-10-31-migracion-v04b.md`, `docs/status.md`.
- `src/App.tsx`, `src/engine/content/v04b.ts`, `src/engine/rules.ts`, `src/engine/session.ts`, `src/engine/types.ts`.
- `src/ui/CardViews.tsx`, `src/ui/CollectionViews.tsx`, `src/ui/CombatView.tsx`, `src/ui/combat.css`, `src/ui/combatActions.ts`.
- `tests/m1.tsx`, `tests/run.ts`, `tests/m2.tsx` (alta).

El ejecutor instalado y su fuente conservan SHA-256 coincidente `758fa50726a64fd33b07a9485e04d5d358376a0c517e6ed29eefbd11401aefdf`. Se ejecutan preflight16/16 y revisión documental independiente antes del ejecutor, más comprobación final inmediata de paths/índice/diff. El hash efectivo y el estado posterior se registran después de crear/verificar el commit; no se inventa un hash anticipado ni se incluye circularmente en su propio contenido.

Revisión independiente de cierre: reviewer nativo en contexto nuevo, **aprobado para commit local seguro M2, sin hallazgos**. Contrastó instrucciones, tres registros, código/pruebas, aceptación humana delimitada y logs vigentes; confirmó los 13 hashes de producto/tests intactos desde el inicio del cierre, manifiesto16/16, HEAD/main+11/índice y ejecutores con hashes coincidentes. Diff-check y preflight16/16 satisfactorios. No editó ni repitió tests/build/navegador ni preparó staging. M3 sigue sin ejecución autorizada. Se repite la misma lista en comprobación inmediata read-only antes de invocar el ejecutor.

Resultado efectivo: preflight inmediato16/16; ejecutor seguro creó **`a449504be7c857c2d34f38e1a981c1f5695bcedc`**, mensaje `juego-cartas: cerrar M2 de recursos fichas y activaciones P5`. `diff-tree --no-renames` verificó exactamente las 16 rutas del manifiesto, 15 M y un A (`tests/m2.tsx`), sin temporales. Índice y árbol posteriores vacíos/limpios; `main` +12 sobre la referencia local origin/main. Sin push, enmienda o commit adicional. M2 aceptado y cerrado; el registro posterior no reabre su alcance.

## Preparación técnica M3 — propuesta no aprobada para ejecución

### Baseline, fuentes y límites

**Baseline M3 real: `a449504be7c857c2d34f38e1a981c1f5695bcedc`**, verificado después del cierre M2 con índice y árbol limpios. La preparación posterior cambia solo este registro, plan y status; quedará sin commit adicional por instrucción expresa. No se editan producción, pruebas, especificaciones aprobadas, escenas o assets ni se ejecutan efectos M3. El diseñador revisará P3/P4/P8 antes de autorizar ejecución. La aceptación M2 no valida balance o expedición V0.4B integrada.

Se contrastó el código actual y v1.2 del ZIP externo ya identificado, leído en memoria, secciones4.5–4.9 y pendientes7.2. Nombres/estadísticas siguen el catálogo oficial v1 incorporado, no sus alias históricos. Prevalecen decisiones posteriores: **D2 y P2a/MIG-D04 resueltos** (reparto original, cancelación agrupada sin redistribución), **D1 resuelto** (ritual solo en combate y retorno H04 viva 0/1 sana), **P5 resuelto e implementado**. No se someten de nuevo a aprobación.

### Estado verificado y superficies reutilizables

| Superficie existente | Contrato observado y uso propuesto M3 |
|---|---|
| `src/engine/types.ts`, `session.ts` | Tipo, copyId, instanceId y Creature.id separados; kind real/token; cupos, reserva, heridas, pagos/recuperación y liquidación por duelo idempotente. Reutilizar sin reasignar IDs ni alterar MIG-D01/economía. |
| `rules.ts`: `summonCreature`, `sacrificeCandidates`, `createDuel` | Pago conjunto atómico, materiales exactos/vivos/propios, H04 ya filtra reales; instancias y entradas A02/A04. Agregar efectos M3 después de validar elecciones y pagar, sin implementar otro motor. |
| `rules.ts`: `distributeDamage`, `resolveCombat` | Reparto letal según salud actual y orden; Map de daño agrupado antes de aplicar simultáneamente. Insertar escudos después de acumular asignaciones, conservando ese reparto. Actualmente no hay cargas ni protección ejecutadas. |
| `rules.ts`: `effectiveAttack`, `attackBonus` | A04 tiene bono ofensivo que se borra en cada resolución. No reutilizar ese campo para H04, cuyo bono debe durar todo el combate. |
| `rules.ts`: `endTurn`, `hasLegalActivation`, `hasLegalMainPhaseAction` | Renovación/robo, transición a main y criterio P5 con R01. Añadir entrada única a principal/curaciones obligatorias y legalidad N01 por objetivo, sin cambiar robo MIG-D02/IA M4. |
| `ui/combatActions.ts` | `CombatControls.pending` solo representa invocación/sacrificios; expectedRevision rechaza renders obsoletos; cancelación no paga; `continueToPlayerDecision` no avanza si hay elección. Extender a decisiones específicas de objetivo, curación y ritual; no codificar IDs de criatura en selectedCardId de mano. |
| `App.tsx` | Despacho/publicación, revisión y cierre una vez, presentación táctica breve ya aceptada. Conectar nuevos handlers y limpieza terminal respetando foco y temporización; no añadir una fase de ataque ficticia para terminales de entrada. |
| `ui/CombatView.tsx`, `CardViews.tsx`, `combat.css` | Selección por criatura/instancia, manos con duplicados, acciones voluntarias separadas de las baldosas, estadísticas efectivas y controles contextuales. Añadir solo objetivos, carga de escudo, vida ritual efectiva y confirmación H04; conservar drag/prioridades/conexiones. |
| `ui/CollectionOverlay.tsx`, `GameOverlay`, `CollectionViews.tsx` | Modal/foco y gestión por copia existentes. Reutilizar patrón para confirmación específica H04; no transformar sacrificios normales ni tocar scroll diferido. Actualizar metadatos pendientes solo cuando cada efecto se implemente/verifique. |
| Pruebas `m1.tsx`, `m2.tsx`, `combatActions.ts`, `combatPresentation.tsx`, `blockAssignments.ts`, `iterationUx.ts` y `run.ts` | Baseline243+spatial; conservar cobertura general/legada. Probable suite nueva `tests/m3.tsx` tras autorización, sin crearla ahora. Adaptar expectativas de efectos antes pendientes de forma explícita, sin borrar casos para pasar. |

Comportamiento avanzado actual: A03/H02/H03/N01 no producen daño, cura, robo o destrucción; sus textos son metadatos pendientes. R03/R04 reciben daño ordinario sin cargas. H04 solo tiene coste3S/filtro real, entra base0/1 y no calcula X. `resolveCombat` es el único lugar actual que calcula victoria; `continueToPlayerDecision` ya respeta `finished`. H03 se puede invocar hoy sin heridos porque no existe selección/efecto, lo cual no ratifica por sí mismo la política final P4.

### Decisiones funcionales pendientes — propuestas para el diseñador

**P3 — terminales en fase principal.** Actual: no existen esos efectos y solo se finaliza dentro de `resolveCombat`. Alternativas: (a) terminar al completar el efecto terminal; (b) registrar el resultado y esperar al paso de ataque. **Recomendación: (a)**, antes de cualquier avance/mantenimiento/robo rival. Respeta la condición de victoria y evita pedir ataques contra un invocador vencido o un grupo vacío. Tras pago+efecto válidos se conservan sacrificios y la A03 recién invocada; el cierre/liquidación sucede exactamente una vez y descarta elecciones restantes. N01 puede ganar eliminando la última enemiga aunque también deje vacío el campo propio: debe sobrevivir el invocador, no exige criaturas propias. A03 contra escudo sin daño efectivo no gana por ello. Cancelar o rechazar objetivo no paga ni comprueba una victoria ficticia. La prioridad existente ante muerte del jugador se conserva; no se inventan empates. **Bloquea** cierre y UX de A03/N01; P3 debe ratificarse, no se considera aprobado.

**P4 — objetivos y orden de sanación.** Actual: no hay cola de efectos ni objetivos de cura; el controlador solo tiene selección de materiales y el comienzo de main renueva/roba sin H02. Alternativas acotadas: (a) manual para todo objetivo, con orden de H02 también elegido; (b) orden estable y elección manual solo cuando cambia el resultado; (c) elección automática por heurística. **Recomendación: (b), con este contrato concreto pendiente de aprobación:**

1. Cada H02 propia que ya esté viva al comenzar main aporta un efecto, una sola vez. Orden estable del campo al entrar en main; mostrar fuente/copyId y progreso de la secuencia. No añadir un menú de orden: ambas aplicaciones son del mismo tipo y se conserva control de destinos. Una H02 recién invocada espera al próximo comienzo propio.
2. Objetivos: otra criatura aliada viva y herida respecto a su máximo efectivo, nunca la fuente; no excluir fichas por carecer de copyId ni inventar salud adicional. Recalcular después de cada sanación. **Con varios objetivos, selección manual uno a uno; con uno, resolver automáticamente; con ninguno, omitir el efecto sin pedir selección imposible.** Alternativa si se prefiere control explícito uniforme: clic también con un único destino, a ratificar en lugar de la automatización propuesta.
3. Proponer sanar el máximo efectivo permitido (hasta2 en H02/hasta1 en H03, sin exceder la salud máxima), sin selector de cantidad ni omisión voluntaria cuando hay destino válido. Esto concreta la interpretación de «hasta» y **requiere P4**, no se impone por código. Si el diseñador quiere poder pasar sin sanar, debe indicarlo en esa ratificación.
4. Permitir invocar H03 sin heridos: entra sin cura ni robo. Con varias opciones se elige antes de pagar/commit, con cancelación sin consumo; con una se resuelve automáticamente después de invocar legalmente. La propia H03 nunca es destino. No añadir confirmación tras escoger el objetivo.
5. H03 roba exactamente una solo después de sanar realmente al menos1; con mazo vacío no roba ni penaliza. No crea instancias nuevas ni vuelve a barajar: mueve la carta existente con sus IDs. Curar a salud máxima no produce robo.
6. Las curaciones de inicio ya disparadas no permiten repetir renovación/robo cancelando/reabriendo la vista. Mientras se elige se bloquean otras acciones/paso; resolver destinos únicos o ausentes no agrega pasos. Esc puede cancelar una invocación H03 aún no pagada; no revierte el inicio de turno ni omite una cura obligatoria por accidente. Los eventos obsoletos se rechazan, sin curar otro objetivo en sustitución silenciosa.

Consecuencias: reduce clics sin delegar elecciones entre destinos a una heurística y hace reproducibles los duplicados; pierde la elección del orden de fuentes y, con destino único, su clic explícito. Esas compensaciones son parte de P4 para aprobar. **Bloquea** cola H02, selección H03, automatización de main y las pruebas/UX definitivas de sanación; no bloquea definir los contratos de escudo ya aprobados, pero este encargo no autoriza implementarlos.

**P8 — confirmación H04.** Actual: `applyCombatAction` ejecuta cualquier invocación al seleccionar el último material; no tiene etapa de confirmación ni preview X. Alternativas: (a) mantener ejecución inmediata con vista previa; (b) confirmar explícitamente solo H04; (c) confirmar todos los sacrificios. **Recomendación: (b)**, excepción justificada por tres pérdidas irreversibles. Al elegir la tercera real, mostrar nombres/copyIds, salud actual de cada material, sumaX, resultado X/(1+X) y pérdida irreversible. Permitir editar selección o cancelar con Esc/cierre, sin pagar maná ni retirar carta/materiales. Confirmar revalida IDs, vida actual y revisión; si el estado cambió, no confirmar con una previsión desactualizada. Una transacción paga exactamente tres y crea H04. Mantener autoejecución de costes normales al último material. **Bloquea** el flujo UI/pago final del ritual; D1 y su matemática no se reabren. Requiere ratificación P8.

### Diseño técnico propuesto y secuencia dentro de M3

Es **un único hito M3**. Los pasos siguientes son orden de trabajo verificable, no nuevos hitos/commits ni aprobaciones intermedias obligatorias. Nada se ejecuta hasta autorización explícita y resolución de los contratos materiales afectados.

| Orden/dependencia | Trabajo propuesto y superficies | Criterio de aceptación verificable |
|---|---|---|
| 1. Contratos y decisiones | Ratificar P3/P4/P8 y añadir casos dirigidos antes de sustituir pendientes. Extender `Creature` con cargas de escudo y bono ritual de combate separado; helpers de ATQ/VID efectivos; `pending` como unión pequeña de elección de invocación/objetivo/curación/confirmación. Cola concreta para curas de inicio, sin pila de respuestas, plugins o DSL general de efectos. | Definiciones y copias persistentes no adquieren campos temporales; cada pendiente conserva su fuente/instancia y expectedRevision, y bloquea las otras acciones pertinentes. |
| 2. Daño/escudos y finalización común | En `rules.ts`, extraer funciones puras pequeñas para aplicar daño agrupado, destruir, sanar y comprobar terminales. Mantener `distributeDamage` y mapas/orientación/orden existentes. Aplicar una carga por destino después de agrupar todo el daño positivo. Inicializar cargas impresas en las representaciones de cada combate/despliegue, nunca al inicio de cada turno ni en la colección. | Daño2+3+4 en una resolución consume una carga, anula9; cero no consume; R04 necesita dos resoluciones positivas; no se redistribuye. Nuevo combate repone cargas sin sanar a la copia herida. Terminales comparten la regla existente de vida/grupo y limpian fichas sin doble cierre. |
| 3. A03 y N01 (P3) | A03: daño automático2 al invocador en duelo, o elección enemiga válida para1 en escaramuza; selección antes del commit, efecto después del pago. N01: habilitar activación solo con enemiga viva, modo de objetivo cancelable y sacrificio+destrucción atómicos al confirmar destino. Reutilizar transacción/revisión P5, ampliar legalidad sin activar por sí sola. | A03 respeta escudos de criatura en escaramuza. N01 destruye reales o fichas, no invocador/mano, y no consume carga como daño. Cancelar/objetivo obsoleto no consume fuente/materiales/maná. Victoria principal sin turno/robo extra si P3 se ratifica. |
| 4. H02/H03 (P4) | Entrada única a main tras mantenimiento, colas por fuente/turno capturadas una vez, resolver curas antes de invocaciones/avance P5. H03 necesita objetivo de entrada y delta de salud antes del robo. `combatActions`, App y CombatView representan la elección y resuelven paso a paso según P4. | Dos H02 no duplican efectos por render/StrictMode/advance; no se autocuran; se actualizan candidatos entre aplicaciones; H03 sana y roba condicionado en ese orden. Sin atasco con cero objetivos o mazo vacío. El robo puede habilitar una invocación y evita avanzar prematuramente. |
| 5. H04 (P8/D1) | Calcular X de salud actual de tres reales al pagar; campos temporales distintos de `attackBonus` A04. Vida inicial/máxima efectiva1+X y ATQX durante todo el combate. Preview/confirmación/cancelación específica H04. Excepción estrecha en `finishSessionDuel` para superviviente H04: salud1, base0/1, sin bono ritual. | 3+3+4→10/11; el bono no desaparece tras la primera resolución. Superviviente herida termina0/1 sana; muerta/sacrificada se pierde. Materiales siempre perdidos, reserva y duplicados ajenos intactos, cupos conservados y recuperación5 sin cambios. |
| 6. Integración y entrega | Metadatos/indicadores honestos cuando cada habilidad sea real; suite anterior+M3, build y pruebas de UI/flujo/objetivos. Inspección dirigida con handlers reales en ambos tamaños; revisión independiente y como máximo dos ciclos de corrección de defectos. Entrega para playtesting humano antes de cierre futuro. | No cambia legado, datos numéricos, barajado, costes/cupos, fatiga o reglas M2, prioridades/relaciones ni fases aceptadas. No se declara balance/IA M4/expedición integrada por pasar tests. |

No es necesario un motor general de efectos: mantener funciones específicas en `rules.ts`/`session.ts`; si el tamaño lo aconseja, agrupar helpers en un único módulo de efectos puro, conservando imports/contratos y sin infraestructura de plugins. La agrupación es una decisión técnica de legibilidad, no nueva mecánica.

### Dependencias y riesgos concretos

- **Bono ritual ≠ bono de ataque:** `afterDamage` borra `attackBonus` A04 en cada resolución. Reutilizarlo para H04 rompería D1; mantener el ritual hasta liquidar y un helper de máximo efectivo para que H02/H03 puedan sanar H04 herida sin usar el máximo impreso1.
- **Escudo ≠ redistribución:** no hacer al repartidor consciente del escudo ni consumir carga al añadir cada fuente al Map. A03 de entrada y un combate posterior son resoluciones distintas. La sanación no restaura cargas.
- **Mantenimiento ≠ render:** H02 no se dispara desde un efecto React que pueda repetirse. Crear/registrar la cola en el cambio de turno/entrada a main y consumir por identidad; preservar el orden actual renovar/robar y no implementar MIG-D02 adelantadamente.
- **Terminales y pagos:** ganador solo después de commit completo; centralizar limpieza/finished, no cobrar ni liquidar durante selección. `continueToPlayerDecision` y App deben detenerse antes de automatización enemiga al reconocer finished; mantener idempotencia de sesión/App y rechazos de revisión.
- **UI pendiente:** el booleano/selectedCardId actual identifica solo invocaciones. No reutilizarlo de forma ambigua para objetivos de N01 o curas; derivar del tipo de pendiente el bloqueo de paso, activaciones y atajos. Conservar foco/cancelación y no introducir selección de vínculos tácticos por clic fuera de estos modos de efecto.
- **Mundo legado:** `world.ts/settleExpeditionEncounter`, `exploration.ts/settleAdventureEncounter` y el resultado de App reciben catálogo/encuentros legados. No activar V0.4B ni sus recompensas para probar M3. Validar terminal/liquidación mediante motor/controlador/componentes reales y sesión aislada; usar App real para la regresión legada y los controles compatibles. Documentar cualquier harness temporal que adapte inicialización o salida del ensayo; no confundirlo con cierre de expedición nueva integrada. La integración espacial/recompensas permanece en hitos posteriores.
- **IA M4:** las operaciones y candidatos legales sirven para ambos bandos; probar habilidades rivales con comandos de dominio controlados. No introducir heurísticas de objetivo/ritual o ventajas gratuitas para hacer funcionar mazos futuros. `runEnemyTurn` sigue siendo una secuencia simple; su integración con elecciones avanzadas y MIG-D02 pertenece a M4, sin fingirla resuelta por listar IDs.

### Pruebas y validación propuestas

| Área | Casos mínimos para aceptar M3 tras aprobación |
|---|---|
| Escudos | R03/R04; agrupación de varias fuentes y de represalias; cero daño; dos resoluciones distintas; sobre-daño y varios bloqueadores ordenados sin redistribución; criaturas protegidas siguen haciendo daño; N01 no consume escudo; nuevo combate reinicia cargas sin sanar heridas; cura no recarga. |
| A03 y P3 | Duelo2/escaramuza1; objetivo vivo correcto; defensa con escudo; cancelación/rechazo atómico; invocador con2PV y última enemiga; ausencia de ataque/turno/robo adicional; una sola liquidación y copia A03 conservada si vive. |
| N01 y P5 | Activación propia/main, objetivo enemigo real o ficha, nunca invocador/mano/propia; fuente viva; destruir ignora cargas; cancelación sin sacrificio; eventos repetidos/obsoletos; última enemiga termina inmediatamente si se aprueba; sin destinos no mantiene principal por una activación imposible. |
| H02 y P4 | Dos fuentes con IDs distintos, orden ratificado, exclusión de sí misma, topes de salud, candidatos recalculados, caso único/ninguno según aprobación, una aplicación por fuente y turno, H02 recién invocada espera, mantenimiento/advance/StrictMode no repiten cola ni robo. |
| H03 y P4 | Dos H03 independientes; elección ratificada; 2/3→3/3 y robo1, sana0→robo0; mazo vacío sin penalización; sin heridos se invoca sin efecto si se aprueba; destino obsoleto/cancelación sin coste, instancia/copyId del robo conservados, máximo efectivo ritual. |
| H04 y P8 | Reales distintas exactas3, fichas rechazadas, heridas actuales vs máximos/escudos, X=10→10/11, selección/edición/cancelación/confirmación sin pago parcial, snapshot obsoleto rechazado, bono persiste varias resoluciones, supervivencia0/1salud1 vs muerte/sacrificio/pérdida; los tres materiales no reviven. Recuperación5 y cupos sin tocar duplicados o reserva. |
| Regresiones | Mantener243+spatial y sus contratos, adaptando solo expectativas de efectos que dejen de ser pendientes; R01 voluntaria, R02 renovación, tokens, A04 ofensiva, fatiga0/1, copias/recuperación, legado P/E, duelos/escaramuzas, prioridades/agrupaciones/drag, liquidación idempotente. Datos21/39, ocho iniciales y sandbox separados intactos. |
| Interacción/visual | 1440×900/1024×768 con objetivos y confirmación reales por copyId/Creature.id, clic/teclado/Esc, controles bloqueados/habilitados, cobro y salud antes/después, escudos visibles, foco y scroll interno accesible; sin investigar la onda diferida. Abrir PNG y comprobar píxeles, sin atribuir inspección a SSR. |

Aceptación humana propuesta: A03/N01 terminal en main; dos H02 con destinos distintos y sin destinos; H03 que cura/roba y que no puede curar; H04 con materiales heridos, cancelación y confirmación; comprobar su vuelta a0/1 y los materiales perdidos; escudos en bloqueos ordenados y conservación de interacción táctica. Recorridos de mapa, rival estratégico y balance integral no son criterios de M3.

### Ratificaciones estrictamente necesarias antes de ejecutar

1. **P3:** aprobar finalización inmediata tras completar efecto terminal válido, sin fase/robo/turno extra y con liquidación única.
2. **P4:** aprobar o ajustar orden estable H02, elección manual con varios destinos/automática con uno/omisión con ninguno, máximo efectivo sin selector ni omisión voluntaria, H03 sin heridos permitida y robo posterior condicionado. Si se prefiere clic con un único destino u orden elegido, resolverlo aquí, nunca por el implementer.
3. **P8:** aprobar confirmación específica H04 con las tres identidades, salud/X/resultante, edición/cancelación sin coste y revalidación final; mantener ejecución normal de los demás sacrificios.

Después se necesita **autorización expresa de ejecutar M3**. No se pregunta de nuevo por D1/D2/P2a/P5, nombres, cifras, suelo1 o decisiones de M4/M5/mapa que no bloquean esta preparación. No se crea ningún commit adicional ni se ejecuta parte alguna de este plan ahora.

## Continuación M3 autorizada — 2026-11-04

El diseñador recibió la auditoría de código/Git/documentación, los resultados nuevos de 243/243 pruebas y build satisfactorio, y las propuestas concretas P3/P4/P8 con solicitud de ejecutar M3 para entrega humana. Responde: «vamos a continuar con la implementaciones pendientes del juego de cartas si los test estan pasado demos esta parte por aprovada y contienies a la siguiente iteracion». Se registra aprobación de esas propuestas y ejecución del siguiente hito M3, sin reabrir M2 ni decisiones ya cerradas. Las prohibiciones de ejecución M3 anteriores son antecedentes sustituidos por esta autorización.

- Cambio funcional amplio, dentro de la migración aprobada: implementar los efectos aún pendientes; conservar el perfil legado y la arquitectura existente.
- P3 ratificada: terminal inmediato tras efecto válido A03/N01, sin turno o robo adicional y con liquidación única.
- P4 ratificada: H02 en orden estable al comenzar principal; destinos aliados vivos/heridos distintos de la fuente, fichas incluidas; elección manual con varios, automática con uno y omisión con ninguno; máxima cura efectiva sin selector ni omisión voluntaria. H03 se permite sin heridos, sin cura ni robo; robo1 solo tras sanar realmente. La elección H03 previa al pago es cancelable; las curas de comienzo no permiten omitir ni repetir mantenimiento.
- P8 ratificada: confirmación final solo H04, mostrando tres identidades/saludes, X y resultado X/(1+X), editable/cancelable sin coste y revalidada al confirmar. Sacrificios normales conservan ejecución al último material.
- Alcance, secuencia y criterios: las tablas de preparación M3 anteriores, D1 y D2/P2a/MIG-D04, junto con esta ratificación. No se modifica la especificación aprobada ni se activan encuentros/IA M4, restauración/orbe, mapa, recompensas, balance o investigación de scroll diferido. Sin dependencias nuevas.
- Baseline previo a editar: `HEAD a449504be7c857c2d34f38e1a981c1f5695bcedc`, `main` +12 respecto de la referencia local `origin/main`, índice vacío, ningún untracked. Tres cambios documentales **preexistentes**, que se preservan: `docs/implementation-plan.md` (SHA-256 `98f98419363a001b8a92af86a93e3bf7ed0804177430d10ec13b054b06ad9e99`), `docs/status.md` (`f131eebf458959a932124db2e784187405ef13255775847c98f18e09ab58b833`) y este registro (`06d5d0edc056fd3d13e158da1c1536c0caeb22d5875881b72812662345afd880`), rutas relativas al juego. Sin cambios previos de producto/tests. Se continúa en el checkout compartido del workflow del repositorio, conservando índice y HEAD.
- Fuentes externas: ZIP de diseño accesible y SHA-256 revalidado `4cb8ce8a25ef63c00be1ad31f5fc3dc3fa1bd1ae105c50d643db438f51b35995`; v1.2 leída en memoria, nombres oficiales ya incorporados. Sin extracción ni alteración del paquete.
- Evidencia de la auditoría previa en esta sesión: Juego de cartas 243/243 + comprobaciones espaciales, build correcto (aviso bundle >500 kB); no equivale a verificar código M3 todavía inexistente.
- Ejecución: un implementer nativo para código y tests del hito, posteriormente reviewer nativo independiente. Coordinador mantiene estos registros. Pruebas de comportamiento primero, regresión completa y build al finalizar; inspección con componentes/handlers reales a 1440×900 y 1024×768. Como máximo dos ciclos correctivos de revisión.
- Playtesting humano **requerido** para los nuevos objetivos/curas/confirmación y terminales; todavía no realizado. M3 no se cierra ni se commitea hasta la aceptación aplicable; no se ejecuta M4–M8 ni push. Aprobación de pruebas M2 no sustituye playtesting futuro M3.

Estado inicial M3: implementación delegable; verificaciones, revisión e inspección pendientes.

### Protocolo humano previsto M3 (pendiente)

Preparaciones de combate aisladas con App/controles reales; no confundirlas con la aventura V0.4B integrada, sus recompensas o su IA. El coordinador documentará el arranque reproducible y las preparaciones efectivamente inspeccionadas al entregar.

1. A03 contra invocador con vida2: invocar y comprobar victoria inmediata, sin declarar ataques ni ejecutar turno/robo extra. En escaramuza, elegir objetivo y comprobar que cancelar no consume la carta/maná; un escudo impide el daño1 y consume una carga.
2. N01: activar, cancelar sin perder la copia, volver a activar y elegir una enemiga con escudo. Debe destruirla igualmente; si era la última enemiga de la escaramuza, termina de inmediato y solo se pierde la N01 activada.
3. Dos H02 al comenzar principal: comprobar orden estable de fuentes, elección manual con varios destinos, avance automático cuando queda uno y ausencia de selección cuando no queda ninguno. Cada fuente se aplica una vez; no se autocura ni permite pasar/omitir o repetir el mantenimiento.
4. H03: con varios destinos heridos, elegir o cancelar antes de pagar; comprobar cura1 y robo1 solo después de curar de verdad. Con único destino, resolución automática; sin heridos, invocación sin cura/robo; con mazo vacío, sin penalización.
5. H04: seleccionar tres copias reales con salud3/3/4 y comprobar previsión10/11, identidades y pérdida irreversible visibles. Editar o cancelar sin coste; repetir y confirmar una sola vez. Una ficha no es material elegible; los sacrificios normales mantienen su ejecución inmediata.
6. Escudos: comprobar cargas visibles, anulación del daño agrupado positivo y prioridades de bloqueos conservadas. No se redistribuye daño anulado; daño0 no consume; curar no repone cargas.
7. H04: comprobar que el bono permanece después de varias resoluciones y que, al sobrevivir al final, conserva su copia base0/1 con salud1; sus materiales siguen perdidos. Muerta o sacrificada no vuelve. Conservar duplicados ajenos/reserva y la interacción táctica previa.

Resultado humano: **no realizado todavía**; las pruebas automáticas y capturas no lo sustituyen.

### Implementación y verificaciones M3

Implementer nativo finalizado. Quince paths de producto/tests, todos relativos al juego: `src/App.tsx`, `src/engine/types.ts`, `src/engine/rules.ts`, `src/engine/session.ts`, `src/engine/enemy.ts`, `src/engine/content/v04b.ts`, `src/ui/CardViews.tsx`, `src/ui/CollectionViews.tsx`, `src/ui/CombatView.tsx`, `src/ui/combatActions.ts`, `src/ui/combat.css`, `tests/m1.tsx`, `tests/m2.tsx`, nuevo `tests/m3.tsx` y `tests/run.ts`. El coordinador añade únicamente los tres registros operativos ya identificados, preservando su planificación preexistente. Dieciocho paths totales; no hay cambios en escenas, mundo, especificaciones aprobadas, dependencias o selección activa.

- Daño agrupado/escudos después del reparto previo; cargas solo en combate y máximo efectivo ritual separado del bono ofensivo. A03 y N01 comparten comprobación terminal con combate; guardas mínimas en `enemy.ts` evitan continuar tras A03 letal, sin introducir elecciones/heurísticas M4 ni cambiar robo rival.
- H02 captura fuentes una vez al entrar en principal, drena destinos únicos/ausentes y conserva la decisión obligatoria si hay varias opciones. H03 valida destino antes de pagar y roba la carta existente solo tras cura efectiva. H04 conserva snapshot de materiales/saludes/revisión y transacción única; su superviviente se normaliza al liquidar la sesión, con pérdidas de materiales conservadas.
- App usa los mismos comandos puros/revisión para objetivos, activación N01 y edición/confirmación ritual. La vista muestra destinos válidos, fuente/progreso de sanación, escudos y vida máxima efectiva; el diálogo nativo contiene foco y permite Esc sin pago. Los textos de habilidad describen mecánicas, conservando metadatos de implementación solo internos.
- TDD informado por implementer: 17 fallos funcionales esperados antes de efectos, cuatro fallos de UI y tres de metadatos antes de sus cambios. Añade 36 casos M3; conserva la cobertura previa adaptando solo expectativas de efectos ya implementados.
- Coordinador ejecutó `npm.cmd test`: **279/279 + spatial, exit0**. `npm.cmd run build`: **exit0**, repetido después del ajuste final de especificidad del diálogo, 67 módulos, CSS71,03kB/gzip15,35 y JS1.271,59kB/gzip352,21. Persiste aviso de bundle >500kB; las advertencias Three.js de Clock/CJS/sombras no son errores nuevos de M3.
- `git diff --check` y preflight read-only con los 18 paths explícitos: satisfactorios, índice intacto. Baseline/HEAD sin cambios; no se invoca el ejecutor de commit. Los hashes de los 15 archivos de código/tests se guardan con el paquete de revisión temporal.

### Inspección renderizada M3 del coordinador

Evidencia fuera del repositorio: `C:/Users/klaud/AppData/Local/Temp/game-factory-m3-9c6eacf4-84da-4a44-bb5c-11b67e618ac9/`. Incluye `server.mjs`, `setup.ts`, `entry.tsx`, `probe-interactions.js`, `probe-final-output.txt`, `coordinator-tests.txt`, `coordinator-build-final.txt`, `review-package.md`, hashes y 38PNG. CLI0.1.22 previamente descargada, Chrome existente, sin instalación o dependencias nuevas; el arranque precisó permisos del entorno para la sesión temporal.

El servidor temporal5193 importa App real con StrictMode y conserva callbacks, transacciones, efectos React, teclado, arrastres y componentes del producto. Solo prepara inicializadores controlados, lectura diagnóstica, título/vida de rival de prueba y adaptación de la liquidación/resumen V0.4B a `finishSessionDuel`, porque la expedición nueva aún no está integrada. `/` sirve el inicio normal intacto. No hay rutas de prueba ni diagnóstico añadidos al producto. Esta adaptación **no acredita** mundo, premios, balance, IA ni aventura V0.4B integrada.

La primera ejecución completó las aserciones de ambos tamaños pero falló su comprobación final de consola por `favicon.ico`404 de la página temporal, comprobado en el log. Se añadió icono vacío exclusivamente a esa página y se repitió el recorrido completo con CSS final. **Resultado final: 18/18 recorridos resumidos (nueve por tamaño), errores de página0, errores de consola/avisos React de claves0.** No se confunde ese contador con ausencia de advertencias deprecadas de Three.js, excluidas de esa categoría.

Casos interactivos reales en1440×900 y1024×768: H04 con salud3+3+4→10/11, edición, Esc, Enter repetido sin doble pago, bono después de otra resolución y liquidación única con copia salud1/materiales perdidos; H03 cancelar y elegir por clic/teclado con cura y robo; dos H02 en orden, Esc sin omitir y sin repetir robo; A03 seleccionar/cancelar/consumir escudo y terminal de invocador en turno1; N01 cancelar/destruir Escudo2/terminal de grupo vacío conservando vivo al invocador; arrastre nativo y resolución de ataque con escudo, sin restaurarlo al siguiente turno; invocaciones legadas por clic/Enter y exploración normal con canvas WebGL activo1440×900 y1024×768.

Capturas abiertas y examinadas en píxeles: `ritual-confirm-1440x900.png`, `ritual-confirm-1024x768.png`, `h02-second-1024x768.png`, `h03-choose-1024x768.png`, `ritual-summoned-1024x768.png`, `n01-target-1024x768.png`, `shield-combat-1024x768.png` y `legacy-exploration-1024x768.png`; también se abrieron estados de objetivos/sanación1440 del primer ensayo. Se leen fuentes/copias/estadísticas, los destinos legales se distinguen y las acciones inspeccionadas resultan operables. El diálogo muestra todas las pérdidas y botones; se observa espacio vertical sobrante que se comunica al reviewer para clasificarlo. No se inspeccionan todas las salas/combates ni se reabre el scroll diferido.

Revisión independiente nativa: en curso, posterior a implementación/checks/preflight. Playtesting humano: pendiente; ninguna aceptación o cierre M3 atribuida a los resultados técnicos.

### Revisión M3 y corrección de presentación — ciclo1/2

Reviewer nativo independiente: **especificación y calidad aprobadas para entrega técnica**, ningún defecto funcional bloqueante ni ampliación de alcance. Contrastó reglas/controlador/interfaz/pruebas, abrió cuatroPNG finales y comprobó independientemente materiales heridos1+1+2→H04 4/5. Quince hashes de producto/tests coincidentes con el paquete, índice vacío y diff-check limpio. Único hallazgo P3 (prioridad baja, no confundir con decisión funcional P3): diálogo H04 demasiado alto, con espacio vacío inferior. No impedía leer o actuar.

El coordinador confirmó causa y efecto en navegador: `inset:0` heredado más `height:auto` estira el diálogo. A1024×768 medía728px de alto y224,8px debajo de controles; hipótesis `height:fit-content` en memoria dio528px/24,8px, sin tocar fuentes. Implementer corregió **un único valor CSS** de `src/ui/combat.css`; los otros14 archivos de producto/tests permanecen iguales. Sin cambios de flujo, fuentes, estadísticas o pruebas.

Verificación posterior: build del coordinador `exit0` (`coordinator-build-corrected.txt`, mismo tamaño redondeado y aviso de bundle). No se repite la suite279/279 por una propiedad CSS que no cambia sus fuentes. Preflight18/18 y diff-check satisfactorios. `probe-modal-final.js`/`modal-final-output.txt`: ambos tamaños, diálogo centrado de530,4/528px,24,8px bajo controles, sin scroll/corte; Tab no entra al fondo inerte, Esc no cobra, confirmar ejecuta una vez. DosPNG nuevos `ritual-confirm-corrected-1440x900.png` y `ritual-confirm-corrected-1024x768.png` abiertos y examinados; proporción corregida. Una aserción inicial demasiado estricta de foco se ajustó tras diagnosticar que Chrome admite pasar a su propia interfaz (`document.hasFocus=false`), nunca al fondo del juego; `focus-diagnosis.txt` conserva la evidencia, sin corrección de producto por ese comportamiento nativo.

Revisión independiente acotada del ajuste: **aprobada, sin hallazgos pendientes**. Reviewer verificó el único valor CSS cambiado frente a los15 hashes originales, los otros14 intactos, ambas capturas corregidas y coherencia del registro/evidencia; mantiene aprobación técnica del hito. Consumo del límite de corrección:1/2. **Playtesting humano completado y aceptado por el diseñador el 2026-11-04**, quien confirma que todo funciona correctamente. El diseñador también autoriza incluir en el commit local los cambios de planificación preexistentes contenidos en estos tres registros. Estado: **M3 aceptado, listo para commit local seguro; M4–M8 no autorizados en esta continuación**. Sin push.
