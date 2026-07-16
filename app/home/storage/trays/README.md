# Modulo de Bandejas (UI)

## Proposito
- Administrar los tipos de bandejas disponibles y su stock por temporada.
- Registrar movimientos operativos (entregas, recepciones, ajustes) manteniendo trazabilidad.
- Disponibilizar una vista de tarjetas para CRUD y una grilla historica de transacciones.
- Sincronizar filtros de busqueda y pestañas mediante la URL para facilitar seguimiento.

## Estructura principal
- `page.tsx`: fuerza rendering dinamico, lee `searchParams` (`search`, `tab`) y construye los tabs "Tipos de bandejas" y "Transacciones".
  - `TraysContent`: consulta `getTrays`, normaliza la respuesta y delega a `ListTrays`.
  - `TrayMovementsContent`: obtiene `getTrayTransactions` y renderiza `TrayMovementsDataGrid`.
- `ui/ListTrays.tsx`: maneja busqueda, boton de alta y pinta `TrayCard` en una grilla responsive.
- `ui/TrayMovementsDataGrid.tsx`: DataGrid con historial de movimientos, soporte para detalle in-place (`DetailTrayTransaction`).

## Tabs y navegacion
- `tab=types`: muestra catalogo de bandejas con acciones CRUD y operativas.
- `tab=movements`: lista transacciones (entregas, recepciones, ajustes) con detalles enriquecidos.
- `buildUrl` preserva el termino de busqueda al cambiar de tab, garantizando enlaces compartibles.

## Catalogo de bandejas (`ListTrays` + `TrayCard`)
- `ListTrays` inicializa `search` desde `useSearchParams`, actualiza el query string con `router.replace` y `router.refresh`.
- Filtra en memoria (`toLowerCase().includes`) para evitar reconsultas excesivas.
- `TrayCard` muestra nombre, peso (3 decimales) y stock actual.
  - Badge verde para bandejas activas, rojo para inactivas.
  - Acciones principales:
    - Entrega (`TrayDeliveryDialog`).
    - Recepcion (`TrayReceptionDialog`).
    - Ajuste/Reconteo (`TrayAdjustmentDialog`).
    - Edicion (`UpdateTrayDialog`).
    - Eliminacion (`DeleteTrayDialog`).
  - Cada dialogo ejecuta `onSuccess` con `window.location.reload()` (en ausencia de invalidacion granular).

## Acciones sobre bandejas
- **Crear (`CreateTrayDialog`)**
  - Formulario `CreateBaseForm` con nombre y peso; stock arranca en 0.
  - Invoca `createTray` con `userId` actual; resetea el formulario y dispara `onSuccess`.
- **Actualizar (`UpdateTrayDialog`)**
  - Permite editar nombre, peso y estado activo; evita modificar stock directamente.
  - Usa `updateTray`; expone feedback via `useAlert`.
- **Eliminar (`DeleteTrayDialog`)**
  - Confirmacion con `DeleteBaseForm`; llama `deleteTray` y maneja errores inesperados.
- **Ajuste/Recepcion/Devolucion (`TrayAdjustmentDialog`, `ReturnTrayDialog`)**
  - Reutiliza un formulario generico (`UpdateBaseForm`) con copy dinamico segun `mode`.
  - Calcula `adjustmentValue` para registrar diferencias via `createTrayAdjustment`.
  - Valida stock negativo en devoluciones y requiere temporada activa (`getActiveSeason`).
- **Entrega (`TrayDeliveryDialog`)**
  - Selecciona contraparte (productor/cliente) mediante autocomplete, valida disponibilidad (`amount <= tray.stock`).
  - Registra salida con `createTrayDelivery`.
- **Recepcion (`TrayReceptionDialog`)**
  - Similar a entrega pero agrega conductor y notas; valida cantidad > 0.
  - Llama `createTrayReception`; estima stock resultante para mostrar en subtitulo.

## Historial de movimientos (`TrayMovementsDataGrid`)
- Columnas: folio, fecha, tipo (`translateTransactionType`), flujo (entrada/salida con color), cantidad, bandeja, contraparte, stock antes/despues y acciones.
- `DetailTrayTransaction` abre dialog con informacion granular (temporada, productor/cliente, metadata y stock antes/despues).
- Formatea numeros con `Intl.NumberFormat` y fechas con `formatAuditDate`.
- Muestra estado vacio cuando no hay transacciones.

## Dependencias clave
- Acciones: `getTrays`, `createTray`, `updateTray`, `deleteTray`, `getTrayTransactions`, `createTrayAdjustment`, `createTrayReception`, `createTrayDelivery`, `getDetailedTrayTransaction`.
- Colaboradores: `getActiveSeason`, `getProducersSimpleListWithLabel`, `getCustomersSimpleListWithLabel`, `getActiveAdminBankAccounts` (indirecto via transacciones) y `useSession` para `userId`.
- Componentes base: `Dialog`, `CreateBaseForm`, `UpdateBaseForm`, `DeleteBaseForm`, `IconButton`, `TextField`, `DataGrid`, `Badge`.
- Utilidades: `useAlert`, `formatAuditDate`, `translateTransactionType`.

## Consideraciones de mantenimiento
- Evaluar reemplazar `window.location.reload()` por invalidaciones especificas (ej. `router.refresh`) para mejorar UX.
- Si se agregan filtros adicionales (estado, rango de peso), ampliar `ListTrays` y `TraysContent` para que consulten al backend.
- Mantener en sincronía los enums de contraparte (`TrayMovementCounterparty`) y labels usados en los formularios.
- Revisar limites de stock en dialogos de entrega/devolucion cuando cambien reglas de negocio.
- Extender `TrayMovementsDataGrid` con filtros/paginacion en caso de crecimiento del historial.
