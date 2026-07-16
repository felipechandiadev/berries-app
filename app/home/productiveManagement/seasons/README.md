# Modulo de Temporadas (UI)

## Proposito
- Gestionar las temporadas de produccion, permitiendo crear, editar y eliminar periodos de tiempo.
- Mostrar una vista de tarjetas con informacion clave (fechas, estado) y acciones rapidas.
- Sincronizar la busqueda con la URL para facilitar enlaces y recargas.
- Mantener un catalogo centralizado de temporadas que afecta otros modulos (anticipos, recepciones, liquidaciones).

## Estructura principal
- `page.tsx`: fuerza rendering dinamico, obtiene todas las temporadas via `getSeasons` y delega a `ListSeasons`.
- `ui/ListSeasons.tsx`: maneja busqueda, filtra en memoria y renderiza `SeasonCard` en grilla responsive.
- `ui/SeasonCard.tsx`: tarjeta individual con datos de temporada y botones para editar/eliminar.

## Busqueda y sincronizacion
- `ListSeasons` inicializa `search` desde `useSearchParams`, actualiza query string con `router.replace` y `router.refresh`.
- Filtra por nombre y descripcion (case-insensitive) en memoria para evitar reconsultas.
- Muestra `defaultEmptyMessage` cuando no hay resultados.

## Tarjetas (`SeasonCard`)
- Muestra nombre, fechas formateadas (dia/mes/anio), descripcion opcional.
- Badge verde para activa, gris para inactiva.
- Botones para editar y eliminar, que abren dialogos controlados por estado en `ListSeasons`.

## Acciones disponibles
- **Crear temporada (`CreateSeasonDialog`)**
  - Formulario `CreateBaseForm` con nombre, fechas (inicio/termino), descripcion y switch para activo.
  - Valida fechas y llama `createSeason` con `userId`; resetea formulario y refresca pagina tras exito.
- **Editar (`UpdateSeasonDialog`)**
  - Precarga datos de la temporada seleccionada en `UpdateBaseForm`.
  - Permite modificar todos los campos; invoca `updateSeason` y refresca la pagina.
- **Eliminar (`DeleteSeasonDialog`)**
  - Confirmacion con `DeleteBaseForm`; marca como eliminada (soft delete) via `deleteSeason`.
  - Muestra mensaje explicativo sobre restauracion futura.

## Dependencias clave
- Acciones de dominio: `getSeasons`, `createSeason`, `updateSeason`, `deleteSeason`.
- Componentes base: `Dialog`, `CreateBaseForm`, `UpdateBaseForm`, `DeleteBaseForm`, `IconButton`, `TextField`, `Badge`.
- Hooks utilitarios: `useAlert`, `useSession`, `useRouter`, `useSearchParams`.

## Consideraciones de mantenimiento
- Si se agregan filtros adicionales (estado activo, rango de fechas), migrar filtrado al backend y actualizar `page.tsx`.
- Revisar validaciones de fechas (inicio < termino) en formularios si cambian reglas de negocio.
- Evaluar paginacion si el numero de temporadas crece significativamente.
- Mantener consistencia con otros modulos que dependen de temporada activa (ej. `getActiveSeason`).
