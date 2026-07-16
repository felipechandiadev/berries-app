# Modulo de Liquidaciones (UI)

## Proposito
- Centralizar la gestion de liquidaciones de productores dentro de Gestion Economica.
- Unificar los flujos de consulta, creacion, edicion, impresion y eliminacion.
- Asegurar consistencia con anticipos y recepciones pendientes, evidenciando el balance final.
- Mantener los parametros de navegacion en la URL para compartir vistas reproducibles.

## Estructura principal
- `page.tsx`: interpreta `searchParams` (`producerId`, `page`, `limit`, `tab`, `id`), calcula valores seguros y determina que tab renderizar.
  - Obtiene datos en paralelo: productores (`getProducersSimpleListWithLabel`), recepciones/anticipos pendientes y liquidaciones (`listSettlements`).
  - Cuando `tab === 'edit'`, llama `getSettlementForEdit` y fija `effectiveProducerId` para precargar datos coherentes.
  - Usa `buildUrl` para generar los enlaces principales (`Liquidaciones`, `Nueva Liquidación`).
- `ui/SettlementsGrid.tsx`: despliega la tabla base cuando el tab activo es `list`.
- `ui/NewSettlementContent.tsx`: orquesta recepciones, anticipos y resumen para los modos `create` y `edit`.

## Tabs y navegacion
- `tab=list`: muestra DataGrid con liquidaciones existentes y filtros persistidos (`producerId`, paginado, limite).
- `tab=new`: carga `NewSettlementContent` en modo generacion, permitiendo elegir productor y seleccionar registros vinculados.
- `tab=edit`: reusa `NewSettlementContent` con `initialData`, bloquea el cambio de productor y preselecciona recepciones/anticipos ya asociados.
- `EditSettlementButton`: ajusta la URL (`tab=edit&id=<id>`) manteniendo contexto actual; el servidor rehidrata la vista con datos coherentes.

## Grid de liquidaciones (`SettlementsGrid`)
- Columnas clave: folio (`transactionId`), fecha (`formatAuditDate`), productor, temporada, conteos de recepciones/anticipos y monto total (`formatCLP`).
- `status`: badge verde (`COMPLETED`) o amarillo (`DRAFT`).
- Acciones por fila:
  - Editar (solo borradores) -> `tab=edit`.
  - Imprimir -> `PrintSettlementButton` (detalle completo en `DialogToPrint`).
  - Eliminar -> `DeleteSettlementButton` con confirmacion y mensajes via `AlertContext`.

## Creacion / Edicion (`NewSettlementContent`)
- Estado inicial
  - En modo `create` selecciona todos los folios pendientes retornados por defecto.
  - En modo `edit` inicializa sets segun `initialData.linkedReceptionIds` y `linkedAdvanceIds`.
  - Carga la temporada activa (`getActiveSeason`) y obtiene `currentUserId` de `useSession`.
- Validaciones previas al guardar
  - Debe existir productor seleccionado y temporada activa.
  - Requiere usuario autenticado, al menos una recepcion y balance >= 0.
- Guardado
  - Construye payload con IDs seleccionados, metadata de pago, totales y notas.
  - `createSettlement` para nuevas, `updateSettlement` para ediciones.
  - Limpia estado local y redirige a `?tab=list` tras exito.
- Toggle switches
  - `handleReceptionToggle` / `handleAdvanceToggle` modifican sets inmutables.
  - `useMemo` recalcula totales (`receptionsTotal`, `advancesTotal`, balance) para la tarjeta resumen.

## Secciones clave
- **PendingReceptionsSection**
  - Encabezado + `PendingReceptionsFilters` (AutoComplete con productores).
  - Muestra mensajes vacios cuando falta productor o no hay recepciones.
  - Tabla (`PendingReceptionsTable`) con switches, Kilos netos y total CLP, pie con total seleccionado.
- **PendingAdvancesSection**
  - Mensajes vacios analogos; tabla (`PendingAdvancesTable`) listando folio, fecha, metodo de pago y monto disponible.
- **SettlementSummary**
  - Panel con conteos y montos totales; destaca saldo final (positivo = a pagar, negativo = en contra).
- **SettlementPaymentSection**
  - Gestiona `PaymentData` (metodo, cuentas, referencias).
  - Carga cuentas de administracion (`getActiveAdminBankAccounts`) y cuentas de productor (`getProducerBankAccounts`).
  - Filtra campos segun metodo (`TRANSFER` exige cuentas y referencia opcional, `CHECK` exige numero de cheque).
  - Propaga cambios via `onPaymentChange` a `NewSettlementContent`.
- **Notas y control de borrador**
  - Textarea para comentarios globales.
  - Switch `Guardar como borrador` (`isDraft`) que persiste en metadata.
  - Boton principal muestra `DotProgress` durante envio y se deshabilita con balance negativo.

## Acciones adicionales
- **PrintSettlementButton**
  - Solicita `getSettlementDetail` y muestra dialogo XL optimizado para impresion carta.
  - Secciones: productor, resumen, tablas detalladas de recepciones/anticipos y datos de pago.
- **DeleteSettlementButton**
  - Confirma eliminacion, invoca `deleteSettlement` y libera recepciones/anticipos asociados.
  - Maneja errores inesperados y muestra feedback con `AlertContext`.

## Dependencias clave
- Acciones de dominio: `listSettlements`, `listPendingReceptions`, `listPendingAdvances`, `getSettlementForEdit`, `createSettlement`, `updateSettlement`, `deleteSettlement`, `getSettlementDetail`.
- Colaboradores transversales: `getProducersSimpleListWithLabel`, `getActiveSeason`, `getActiveAdminBankAccounts`, `getProducerBankAccounts`.
- Componentes base: `DataGrid`, `DialogToPrint`, `DeleteBaseForm`, `Switch`, `AutoComplete`, `Select`, `TextField`, `Button`, `Badge`, `DotProgress`.
- Contextos/Hooks: `useAlert`, `AlertContext`, `useSession`, `useRouter`.

## Consideraciones de mantenimiento
- Agregar filtros adicionales implica tocar `SettlementsPage` (tipados + parse) y `buildUrl` para conservar la navegacion.
- Cambios en estructura de `SettlementDetail` requieren sincronizar `PrintSettlementButton` y posiblemente el resumen.
- Revisar validaciones cuando evolucionen reglas de negocio (ej. permitir balance negativo) y ajustar `handleSubmit`.
- Si se habilita paginacion real en recepciones/anticipos pendientes, adaptar secciones para soportar `page/limit` independientes.
- Mantener consistentes los labels de `paymentMethod` con los enums del dominio (`AdvancePaymentMethod`).
