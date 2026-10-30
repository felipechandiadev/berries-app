# Plan de mejoras: proceso de liquidaciones

Referencia: Berries-Angeles (`/Users/felipe/dev/Berries-Angeles`). Problema de origen: JOSE IBAÑEZ VILLAGRA tiene 60 recepciones activas, 52 en $0 (sin precio), y la lista de pendientes (paginada de 25, orden DESC) esconde en la página 3 las 8 que sí tienen monto.

## Reglas de trabajo
- Rama nueva: `git checkout -b feature/liquidaciones-v2`.
- Probar siempre contra una copia local de la base del VPS (`mysqldump` -> MySQL local `berries-app`), nunca escribiendo en el VPS.
- Un commit por paso. Cada paso debe dejar la app funcionando.
- No hay `node_modules`: ejecutar `npm install` y `npx tsc --noEmit` antes de empezar y después de cada fase.

## Paso 0. Preparación
1. `npm install`; correr `npx tsc --noEmit` y anotar los errores previos (línea base).
2. `mysqldump` del VPS (solo lectura) y cargarlo en la base local; apuntar `.env` a `localhost`.
3. Crear la rama.
4. Hecho cuando: la app levanta en local con los datos de José Ibáñez visibles.

## Fase 1. Flujo de liquidación seguro (sin cambios de esquema)
Archivos: `app/actions/settlements.ts`, `app/actions/advances.ts`, `data/entities/TransactionRelation.ts`, UI en `app/home/economicManagement/settlements/`.

1.1 Crear `lib/receptionSettlement.ts` (copiar de Angeles: tipos `NONE | BORRADOR | COMPLETA`, labels).
1.2 Decidir y fijar la convención de relaciones (adoptar la de Angeles: `RECEPTION_TO_SETTLEMENT` con parent = recepción, child = liquidación; `ADVANCE_TO_SETTLEMENT` con parent = anticipo, child = liquidación). Buscar todos los usos: `grep -rn "RECEPTION_TO_SETTLEMENT\|ADVANCE_TO_SETTLEMENT" app lib data`. En el VPS no existen liquidaciones, no hay datos que migrar.
1.3 Escribir `saveSettlement` (basado en Angeles):
   - una sola `db.transaction`;
   - recalcular totales en el servidor (`receptionClpAmount`), ignorar los totales del cliente;
   - `advanceApplications[{transactionId, amount}]` con validación de saldo y guardar `context.amount`;
   - rechazar recepciones ya vinculadas a otra liquidación;
   - `status: BORRADOR | COMPLETA`; una COMPLETA no se edita;
   - forma de pago obligatoria solo al confirmar.
1.4 Dejar `createSettlement`/`updateSettlement` como wrappers deprecados de `saveSettlement`, luego borrarlos.
1.5 Adaptar `listPendingReceptions`, `listPendingAdvances`, `getSettlementDetail`, `getSettlementForEdit`, `deleteSettlement` a la nueva convención. En detalle, mostrar el monto aplicado de cada anticipo (no `advance.amount`).
1.6 Pruebas manuales: crear borrador, editar, confirmar, intentar editar COMPLETA, intentar usar la misma recepción en dos liquidaciones, anticipo parcial.
Hecho cuando: ninguna de las pruebas deja datos inconsistentes y los totales del PDF coinciden con el monto guardado.

## Fase 2. Visibilidad de recepciones sin precio
2.1 `listPendingReceptions`: devolver además `unpricedCount` y `unpricedKg` (recepciones con total 0) y ordenar con valor primero o permitir filtro "con precio / sin precio".
2.2 Paso de selección: mostrar aviso "N recepciones sin precio (X kg)". Quitar la selección automática de toda la página; agregar "Seleccionar todas las del productor" que consulte todas (no solo la página).
2.3 `saveSettlement`: con estado COMPLETA, rechazar si alguna recepción tiene total 0 (mensaje con los folios); en BORRADOR solo advertir.
2.4 Agregar `updatePackPrice` y `UpdatePackPriceDialog` (copiar de Angeles) en el detalle de recepción para corregir precios.
Hecho cuando: con José Ibáñez se ven primero sus 8 recepciones con valor y el aviso de 52 sin precio.

## Fase 3. Precios por variedad y calidad (decisión previa requerida)
Pregunta abierta: ¿el precio se define por variedad+calidad (como Angeles), por productor, o al liquidar? Esta fase asume variedad+calidad.
3.1 Traer `qualityPrices` a `data/entities/Variety.ts`, `data/entities/VarietyPriceHistory.ts`, `data/ensureVarietyPriceHistoryTable.ts`, `data/ensureVarietyQualityPrices.ts`; registrar en `data/db.ts` y en el arranque.
3.2 Pantalla `VarietyPricesDialog` en el módulo de variedades, con historial.
3.3 Recepción: al crear cada pack, tomar el precio vigente de la variedad/calidad y calcular `totalToPay`, `totals.totalCLPToPay` y `amount`.
3.4 Script de recalculo (`scripts/recalculate-unpriced-receptions.ts`): solo recepciones sin liquidación y con `pricePerKg = 0`; modo `--dry-run` que lista cambios; ejecutar primero en la copia local.
Hecho cuando: una recepción nueva queda con precio automáticamente y el dry-run de las 52 de José muestra montos razonables.

## Fase 4. Estado y bloqueos en recepciones
4.1 `mapReceptionSettlementStatus` (copiar de Angeles) y mostrar el estado en la lista y detalle de recepciones.
4.2 Bloquear editar y eliminar recepciones vinculadas a una liquidación (mensaje: "No se puede modificar ni eliminar una recepción asociada a una liquidación"), incluido `updatePackPrice`.
4.3 Opcional: `paymentStatus = PAID_ON_RECEPTION` para excluir recepciones pagadas al recibir.

## Fase 5. Interfaz (opcional)
5.1 Asistente de 3 pasos con `settlementWizardSession.ts` (guardado en sessionStorage).
5.2 Tabla de liquidaciones con filtros/orden/búsqueda compartidos.

## Fase 6. Seguridad del módulo (en paralelo)
6.1 Verificar sesión y permiso (`SETTLEMENTS_MENU`) al inicio de cada acción de `settlements.ts` y `advances.ts`; obtener `userId` desde la sesión, no desde el cliente.
6.2 Quitar `console.log` de contraseñas/hashes en `authOptions.ts`.
6.3 Rotar la contraseña de Aiven y quitarla del README.

## Orden recomendado
Paso 0 -> Fase 1 -> Fase 2 -> (decidir precio) -> Fase 3 -> Fase 4 -> Fase 6 -> Fase 5.
