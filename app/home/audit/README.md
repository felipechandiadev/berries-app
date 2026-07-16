# Modulo de Auditoria (UI)

## Proposito
- Proporcionar una vista centralizada de todos los registros de auditoria del sistema.
- Permitir consulta, filtrado y exportacion de logs de cambios (CREATE, UPDATE, DELETE) en entidades clave.
- Facilitar la trazabilidad de acciones de usuarios con detalles de valores anteriores/nuevos.
- Soportar paginacion, ordenamiento y busqueda para manejar grandes volumenes de datos.

## Estructura principal
- `page.tsx`: fuerza rendering dinamico, normaliza `searchParams` (page, limit, search, action, entityName, sortField, sort, filters) y delega a `AuditContent`.
- `AuditContent`: invoca `getAuditGridData` con filtros normalizados y renderiza `AuditDataGrid` bajo `Suspense`.
- `ui/AuditDataGrid.tsx`: DataGrid con columnas para entidad, accion, descripcion, usuario, fecha y acciones; incluye exportacion a Excel.
- `ui/AuditMoreButton.tsx`: dialogo modal con detalles completos de un registro de auditoria (valores anteriores/nuevos, cambios).

## Filtros y paginacion
- `page.tsx` parsea y valida parametros de URL: pagina, limite, busqueda, accion (CREATE/UPDATE/DELETE), entidad, campo de ordenamiento y orden.
- Filtros se pasan a `getAuditGridData` para consulta backend; DataGrid maneja paginacion y ordenamiento via URL.
- Busqueda global por descripcion o entidad; filtros especificos por accion y entidad.

## DataGrid y columnas
- Columnas: entidad, accion, descripcion, usuario, fecha (formateada con `formatAuditDate`).
- Acciones: `AuditMoreButton` para ver detalles completos.
- Altura fija (85vh), soporte para exportacion Excel via `onExportExcel`.

## Exportacion a Excel
- `handleExportExcel` recopila filtros actuales, llama `getAuditExportData` y genera workbook con dos hojas.
- Hoja "Auditorias": datos formateados (ID, entidad, accion, descripcion, usuario, fecha, valores anteriores/nuevos).
- Hoja "Resumen": metricas (total registros, conteo por accion, fecha de exportacion).
- Estilos aplicados a encabezados, anchos de columna, filtros automaticos; descarga con nombre timestamp.

## Detalles de auditoria (`AuditMoreButton`)
- Dialogo modal con secciones: informacion general (accion, fecha, entidad, ID, usuario), descripcion, valores anteriores (rojo), valores nuevos (verde), cambios detectados (azul).
- Formatea valores como JSON pretty-printed; usa `formatAuditDateLocaleES` para fecha.

## Dependencias clave
- Acciones de dominio: `getAuditGridData`, `getAuditExportData`.
- Componentes base: `DataGrid`, `Dialog`, `IconButton`.
- Utilidades: `formatAuditDate`, `formatAuditDateWithSeconds`, `formatAuditDateLocaleES`.
- Librerias externas: `xlsx` para generacion de Excel.

## Consideraciones de mantenimiento
- Extender filtros requiere actualizar tipado `AuditGridFilters` y normalizacion en `page.tsx`.
- Si se agregan nuevas entidades auditadas, verificar que `entityName` se maneje correctamente.
- Revisar limites de exportacion si el volumen de datos crece; considerar paginacion en export.
- Mantener consistencia en formateo de fechas y JSON para legibilidad.
- Evaluar cache o optimizaciones si consultas de auditoria impactan performance.
