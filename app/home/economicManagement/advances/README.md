# Modulo de Anticipos (UI)

## Proposito
- Exponer la gestion completa de anticipos dentro de Gestion Economica.
- Ofrecer una vista tabular con filtros integrados y acciones rapidas sobre cada anticipo.
- Integrar la creacion, consulta, impresion y eliminacion en un flujo consistente.
- Servir como punto de entrada para cualquier evolucion del flujo de anticipos.

## Estructura principal
- `page.tsx`: obtiene filtros desde la URL, asegura paginacion (`page` y `limit`) y delega el renderizado a `AdvancesContent` bajo `Suspense` con `DotProgress` como indicador de carga.
- `AdvancesContent`: ejecuta `listAdvances` con los filtros vigentes, normaliza la respuesta y entrega los datos a `AdvancesGrid`.
- `ui/AdvancesGrid.tsx`: instancia `DataGrid` con altura fija (85vh), encabezado "Anticipos" y acciones contextuales.

## Grid y columnas
- `transactionId`: folio en monoespaciado para lectura rapida.
- `createdAt`: fecha formateada con `formatAuditDate`.
- `producerName` y `seasonName`: columnas truncadas para mantener el layout.
- `paymentMethod`: etiqueta legible segun `AdvancePaymentMethod` (Efectivo, Transferencia, Cheque).
- `amount`: monto formateado en CLP mediante `Intl.NumberFormat` en es-CL.
- `status`: `Badge` verde para `APPLIED` (Liquidado) y amarillo para pendientes.
- `actions`: agrupacion de botones (`DetailButton`, `PrintButton`, `DeleteAdvanceButton`).

## Acciones disponibles
- **Crear anticipo (`CreateAdvanceButton`)**
  - Carga inicial paralela de productores, temporada activa y cuentas bancarias de administracion.
  - Ajusta dinamicamente los campos segun el metodo de pago (cuentas requeridas para transferencias, numero de cheque, etc.).
  - Valida sesion (`useSession`), monto, dependencias y muestra mensajes mediante `AlertContext`.
  - Invoca `createAdvance` y refresca el grid via `onSuccess` tras limpiar el formulario.
- **Ver detalle (`DetailButton`)**
  - Consulta `getAdvanceDetail` on-demand y presenta la ficha completa dentro de `DialogToPrint` tamaño XL.
  - Distribuye la informacion en tarjetas: monto, fecha, productor, metodo de pago, cuentas, notas y aplicaciones.
  - Aplica estilos especificos para una impresion de hoja carta con fuentes ajustadas.
- **Imprimir recibo (`PrintButton`)**
  - Reutiliza `getAdvanceDetail` para renderizar un comprobante termico dentro de `DialogToPrint`.
  - Configura ancho de 70mm, usa tipografia compacta y agrupa secciones (datos principales, notas, aplicaciones).
  - Ejecuta `onBeforePrint` para cerrar el dialogo despues del envio a la impresora.
- **Eliminar (`DeleteAdvanceButton`)**
  - Solicita confirmacion mediante `Dialog` + `DeleteBaseForm`, bloqueando cierre mientras hay envio.
  - Verifica sesion y usuario activo antes de llamar a `deleteAdvance`.
  - Emite alertas de exito o error y ejecuta `onSuccess` para refrescar la tabla.

## Interaccion con filtros
- `page.tsx` acepta parametros `search`, `seasonId`, `producerId`, `paymentMethod`, `status`, `from` y `to`.
- Los parametros se normalizan (trim) antes de asignarlos al objeto `ListAdvancesFilters`.
- Los accesos sin `page` o `limit` redirigen a la misma ruta anexando valores por defecto (`1` y `25`).
- `listAdvances` retorna todas las filas que cumplen los filtros; el conteo se calcula localmente (`rows.length`).

## Dependencias clave
- `DataGrid`: componente base con soporte para filtro, ordenamiento y formulario de creacion embebido.
- `AlertContext`: canal centralizado para feedback de usuario.
- `next-auth` (`useSession`): determina usuario actual para operaciones sensibles.
- Acciones de dominio (`listAdvances`, `createAdvance`, `deleteAdvance`, `getAdvanceDetail`, `getProducerBankAccounts`, `getActiveSeason`, `getActiveAdminBankAccounts`).
- `DialogToPrint`: dialogo reutilizable con capacidades de impresion controlada.

## Consideraciones de mantenimiento
- Mantener sincronizadas las etiquetas (`paymentLabels`) con los valores de `AdvancePaymentMethod`.
- Revisar nuevas politicas de validacion de anticipos para reflejarlas en `CreateAdvanceButton`.
- Extender los filtros de URL requiere actualizar el tipado `PageSearchParams` y el mapeo a `ListAdvancesFilters`.
- Para estados adicionales, ajustar el manejo de `Badge` y estilos en `AdvancesGrid`.
- Validar cualquier cambio en `AdvanceDetail` para asegurar consistencia con `DetailButton` y `PrintButton`.
