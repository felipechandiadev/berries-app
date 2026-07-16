# Modulo de Variedades (UI)

## Proposito
- Administrar las variedades de productos disponibles para ventas y liquidaciones.
- Ofrecer una vista tipo cards con datos clave (nombre, precio base) y acciones rapidas.
- Alinear la busqueda con la URL para compartir filtros reproducibles.
- Integrar el flujo completo CRUD utilizando los formularios base de la aplicacion.

## Estructura principal
- `page.tsx`: fuerza rendering dinamico, espera `searchParams` y renderiza `VarietiesContent` dentro de `Suspense` con `DotProgress` como fallback.
- `VarietiesContent`: invoca `getVarieties` aplicando el filtro `name`, normaliza la respuesta y la entrega a `ListVarieties`.
- `ui/ListVarieties.tsx`: agrupa buscador, boton de alta y rederiza la grilla responsive de `VarietyCard`.

## Busqueda y sincronizacion
- El estado `search` se inicializa desde `useSearchParams`.
- Cada cambio actualiza el query string (`router.replace`) y dispara `router.refresh` para recargar resultados desde el servidor.
- Muestra `defaultEmptyMessage` cuando no hay variedades coincidentes.

## Tarjetas (`VarietyCard`)
- Presenta nombre (truncate/word-break) y precio formateado en CLP (simbolo `$`, `toLocaleString`).
- Acciones a la derecha: editar (`UpdateVarietyDialog`) y eliminar (`DeleteVarietyDialog`).
- utiliza modales controlados via estado local (`openUpdateDialog`, `openDeleteDialog`).

## Acciones disponibles
- **Crear variedad (`CreateVarietyDialog`)**
  - Dialogo con `CreateBaseForm` organizado en un unico grupo.
  - Campos requeridos: nombre y precio CLP (tipo `currency`, min 0).
  - Usa `createVariety` y `useAlert` para feedback; resetea el formulario al cerrar.
  - Soporta `currency` y `priceUSD`, aunque solo `priceCLP` se expone actualmente.
- **Editar (`UpdateVarietyDialog`)**
  - Precarga los datos de la card seleccionada.
  - Invoca `updateVariety` y muestra errores mediante `useAlert` + `UpdateBaseForm`.
  - Restablece estado inicial al cancelar/cerrar.
- **Eliminar (`DeleteVarietyDialog`)**
  - Confirma eliminacion con `DeleteBaseForm` y construye un mensaje contextual.
  - Ejecuta `deleteVariety` y maneja errores inesperados.

## Dependencias clave
- Acciones de dominio: `getVarieties`, `createVariety`, `updateVariety`, `deleteVariety`.
- Componentes base: `Dialog`, `CreateBaseForm`, `UpdateBaseForm`, `DeleteBaseForm`, `IconButton`, `TextField`, `DotProgress`.
- Hooks utilitarios: `useAlert`, `useSession`, `useRouter`, `useSearchParams`.
- Enums del dominio: `Currency` para tipar precios y etiquetas.

## Consideraciones de mantenimiento
- Si se amplian atributos (ej. precio en USD o descripcion), actualizar `VarietyCard`, formularios y `getVarieties` segun corresponda.
- Mantener sincronizados los campos de formulario con las reglas de negocio (validaciones de duplicados, rangos de precio, etc.).
- Evaluar paginacion o agrupar por producto si la cantidad de variedades crece significativamente.
- Tras cambios masivos, considerar invalidar cache o refrescar el modulo para reflejar datos actualizados.
