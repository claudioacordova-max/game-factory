# Comerciante Medieval — decisiones vigentes

Propósito: lectura obligatoria y suficiente sobre **reglas aprobadas, invariantes y pendientes**. Consolida, sin reinterpretar, las decisiones registradas hasta el cierre ITER-10 (`737fea910ae0461eabf2520d365cbb49035b1cd5`). Revisión: 2026-11-07. **No es una aprobación nueva**: si discrepa de una fuente, prevalece la fuente y se reporta antes de implementar.

## 1. Autoridad y fuentes

- Especificación principal: [spec-v1.md](spec-v1.md) (consolida la [v0.2](history/spec-v0.2.md) y modificaciones posteriores). Su sección «Autoridad y fuentes» fija la procedencia por hito/iteración.
- Precedencia (spec-v1): las decisiones posteriores expresas prevalecen dentro de su alcance; la lectura de motor, escena, App y `ui/presentation.ts` corrobora implementación pero no convierte conducta no autorizada en requisito.
- Procedencia completa (briefs, aprobaciones, checks, revisiones): [plan histórico](history/implementation-plan-v0.1.md) y [plan archivado 2026-10-28](history/implementation-plan-2026-10-28.md).
- Los materiales de UI/UX de ITER-09 (`docs/comerciante-medieval-uiux-propuesta.md`, `docs/comerciante-medieval-uiux/`) **no están disponibles** y no son evidencia accesible.

## 2. Invariantes que todo cambio debe preservar

- Motor económico determinista en TypeScript, ejecutable sin UI; React/R3F solo presenta estado y solicita acciones. Moneda en décimas y carga en medias unidades (spec §3, §10).
- Inventarios separados (doméstico no vendible al jugador, stock comercial, reserva productiva, herramientas) y fondo familiar compartido; sin existencias/dinero negativos ni duplicaciones (spec §2).
- Operaciones atómicas: validar y revalidar cantidad, destinatario, fondos, stock, carga, necesidad y límite diario; rechazo sin cambios (spec §6).
- Anti-recompra (ITER-03): una familia no compra al jugador bienes producidos por cualquiera de sus negocios; se aplica en oferta, cotización y transacción (spec §6).
- Límites diarios: progreso (ropa adicional, muebles, joyas) admite una unidad total por familia y día; el orden diario autorizado es determinista y no se ejecuta dos veces el mismo día (spec §6, §7).
- Cambiar presentación no autoriza cambiar la economía (plan archivado, «Decisiones aplicables para continuar»).
- D9: 1.000 monedas para ascenso 2→3 y mantenimiento de 3; 2.000 solo meta de prosperidad; sin tramo 4 ni histéresis monetaria no aprobada (spec §5).
- Parámetros económicos (recetas, tarifas, durabilidades, escenario inicial) son baseline experimental [E]: sin rebalanceo ni ajuste para forzar prosperidad sin evidencia y autorización (spec §3, §10).
- Comercio por unidad con Comprar/Vender (sin navegación Hogar/Negocio, sin cantidad editable ni confirmación); inventario con I/Esc; carga dentro del inventario; saldo familiar junto al NPC. Sustituyen los flujos antiguos de cantidad/confirmación y distribución del HUD (spec §6, §9).
- Comercio operativo hasta radio 1,85 incluido del NPC activo; se cierra al superarlo (spec §9).
- Puerto exclusivo del circuito de caravana (no escena ni destino); la caravana solo comercia en visitas, con oferta y dinero abstractos ilimitados (spec §1, §2, §6, §7).
- Viaje solo entre los dos pueblos, un día global, sin precio ni trayecto 3D; caminar, consultar y comerciar no consumen días (spec §1, §7).
- Persistencia solo durante la sesión; recargar reinicia (spec §1).
- Panel de inspección separado de la partida normal, cerrado por defecto; los experimentos y sus parámetros declarados no alteran la partida abierta (spec §10).
- Exclusiones [F] de spec §11 (combate, misiones, precios dinámicos, regateo, guardado durable, etc.) no se interpretan como requisitos implícitos.

## 3. Decisiones aprobadas

### Implementadas y aceptadas

- **H1** (`9371c67`): proyecto desde plantilla e infraestructura.
- **H2** (`4a74e0d`): modelo, escenario y necesidades; D9 aplicada.
- **H3** (`7c9d0f0`): economía autónoma y simulaciones.
- **H4** (`11bfaaf`): jugador, comercio y tiempo.
- **H5** (`b4488c2`): pueblos y NPC 3D (aceptación humana).
- **H6** (`fd7bf3f`): bucle comercial integrado (aceptación humana).
- **H7** (`51e90c6`): inspección y escenarios (aceptación humana).
- **ITER-01** (`1d9848e`): cierre del menú por distancia.
- **ITER-02** (`58a6fb1`): interacción contextual y overlays.
- **ITER-03** (`1416078`): Comprar/Vender, clic por unidad, prohibición de recompra familiar.
- **ITER-04** (`c168b44`): identidad de pueblos, NPC y negocios.
- **ITER-05** (`77b7180`): ambientes y protagonista orientable.
- **ITER-06** (`f88572a`): salidas de viaje y caravana visible.
- **ITER-09** (`bbd8b30f901c4ba97e7934677861f03f196ea81e`): UX Atlas del camino, clic directo, revisión final aceptada.
- **ITER-10** (`737fea910ae0461eabf2520d365cbb49035b1cd5`): inventario/carga, saldo familiar, iconografía y atajo I (aceptación manual del diseñador, 2026-10-24).
- **ITER-07/08:** rediseños sustituidos por la línea posterior, sin aprobación ni cierre formal propio; la aprobación de ITER-09/10 no se retrotrae a ellas.

### Aprobadas para hitos futuros (no implementadas)

- Ninguna.

## 4. Pendientes abiertos

- **Discrepancia `needs.progression` (spec §10, «Límites de corroboración»):** `evaluateNeeds` (`src/engine/needs.ts`) llena `needs.progression` con metas del tramo 2 también en tramo 3, y el panel experimental lo muestra; `tierThreeGoals`/`prosperityGoalsMet`, `autonomous.ts` y `player.ts` usan las metas superiores. Registrada, **no corregir sin autorización**; sus colores no acreditan prosperidad. No reproducida en navegador.
- Límites conocidos, no tareas autorizadas: aviso de bundle >500 kB y cobertura parcial del DOM por las pruebas.

## 5. Hoja de ruta

Ningún hito ni iteración autorizados. Toda intervención futura requiere brief, alcance y autorización propios (workflow, «Post-closure iterations»).
