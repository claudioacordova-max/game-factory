# Duelo en la cripta — migración V0.4B: M0 y preparación de M1

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

## Hoja de ruta aprobada en estructura, no en ejecución futura

| Hito | Entrega y dependencias | Estado de autorización |
|---|---|---|
| M0 | Baseline, aislamiento legado, compatibilidad, decisiones y definición M1. | Ejecutar en este encargo; sin commit. |
| M1 | Catálogo/cupos/copias, identidades de combate, colección y sandbox; después de M0. | Solo preparación técnica. |
| M2 | Recursos, fichas, activaciones y fatiga; después de M1; P5 y MIG-D02 donde corresponda. | No ejecutar. |
| M3 | Efectos avanzados, escudos MIG-D04, curación, ritual/objetivos; después de M2 y decisiones P3/P4/P8. | No ejecutar. |
| M4 | Diez encuentros aislados e IA; después de M3; MIG-D02/MIG-D07 y convención predesplegada. | No ejecutar. |
| M5 | Restauración/orbe/ciclo; después de M3 y contrato restante del orbe; MIG-D03/MIG-D06. | No ejecutar. |
| M6 | Grafo/estado/3D/puzle/secreto; después de M5; resolver excepción MIG-D05. | No ejecutar. |
| M7 | Ocho iniciales y 31 premios únicos; después de M1/M5/M6; MIG-D01 resuelve P6 ordinario. | No ejecutar. |
| M8 | Integración M4/M7, pruebas/playtesting y balance separado; sin secretos obligatorios. | No ejecutar. |

Contenidos inalterados de ensayo: 19 salas, 21 tipos/39 copias, 23 principales/16 opcionales, diez combates. Señora de las Ratas: 10 PV y `A02, N03, N02 | A02, N03`, sin A04. Escaramuzas: 04 H01+N02+N05; 07 A02×2; 08 A02+N03; 16 N05+N06+N07; 17 H01+N04+R03. Las cifras/mazos son experimentales; ningún resultado de M0 acredita balance nuevo.

## M1 — definición técnica propuesta, NO implementada

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
