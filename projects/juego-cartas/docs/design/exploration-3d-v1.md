# Duelo en la cripta — exploración 3D v1

Propósito: referencia vigente de la representación de salas y personajes. Revisión: 2026-10-28; cierre de transformación y estabilización `54955677ec9430695b233c99a8fb4067b103a86d`. Estado: implementación y arte aprobados en su registro; esta síntesis no añade requisitos ni certifica rendimiento nuevo.

## Composición aprobada

La exploración utiliza geometría programática compartida, cámara elevada con primer plano abierto y escala acorde a las colisiones existentes. Piedra gris azulada, bronce envejecido, luz funeraria turquesa; el ala invadida incorpora tierra, ocre y oliva. La composición conserva los caminos, objetos, puertas y controles del motor, sin obstáculos artísticos que bloqueen superficies transitables.

| Sala | Identidad implementada |
|---|---|
| Sector 1: umbral | Portal, pilares y arquitectura funeraria de entrada. |
| Sector 2: catacumbas | Nichos mortuorios apilados y sarcófagos. |
| Sector 3: cámara final | Columnas y monumento ceremonial. |
| R1 | Primeras madrigueras y motivos de tierra en la cripta. |
| R2 | Grandes aberturas y entramado de madera. |
| R3 | Nidos y acumulaciones de la colonia. |
| R4 | Madriguera coronada de la Señora de las ratas. |

Protagonista con abrigo negro largo y sombrero ancho. Centinela, Custodia y Guardián tienen siluetas propias; grupos roedores y Señora se distinguen dentro de la dirección low-poly. Solo los sectores principales tienen santuario; R4 contiene el cofre de recompensa. El combate y la colección siguen siendo interfaces 2D.

La [referencia conceptual](../history/design/exploration-3d-v1/reference.png) y su [prompt íntegro](../history/design/exploration-3d-v1/reference-prompt.md) permanecen juntos como procedencia. La imagen no se utiliza como textura ni prescribe nombres, reglas, posiciones o geometría definitiva.

## Estabilización conservada

La arquitectura estática compatible se agrupa por geometría/material/flags manteniendo transformaciones y sombras. Piezas con transformaciones incompatibles, como cizallamiento, permanecen como mallas individuales para preservar normales. El efecto de inicialización del mosaico depende del material y vuelve a aplicar matrices cuando cambia la paleta; corrige el bloque de baldosas al regresar a salas.

La escena usa `dpr=1` con antialiasing, sin apagar sombras ni rediseñar iluminación para optimizar. Se conserva el arte aprobado, controles, colisiones, objetos, reglas y estado de sesión. Estos son hechos de implementación contrastados con [ExplorationScene.tsx](../../src/scene/ExplorationScene.tsx), [CryptGeometry.tsx](../../src/scene/CryptGeometry.tsx) y [staticCryptBatch.ts](../../src/scene/staticCryptBatch.ts), no nuevos compromisos de arquitectura para otros juegos.

## Validación y límites

El [plan histórico](../history/implementation-plan-v0.1.md#cierre-final--transformación-visual-y-estabilización-aprobadas--2026-10-27) conserva diagnóstico, mediciones, cambios, 167/167 pruebas más spatial, build, revisión independiente final y aceptación humana. El diseñador recorrió las siete salas y aprobó arte/funcionamiento; después de optimizar no volvió a observar el bloque y percibió movimiento estable y mejora clara.

Las medidas de FPS/draw calls fueron muestras de desarrollo en el entorno registrado y preceden al último fallback de normales. No son garantía para otros equipos ni medición del build final. La aceptación final de rendimiento es cualitativa humana. Algunas evidencias/harness se archivaron fuera del repositorio, y la migración no reproduce esos ensayos. La futura representación 3D de invocaciones queda fuera del trabajo cerrado.
