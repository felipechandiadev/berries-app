# Modulo de Cuentas Bancarias (UI)

## Proposito
- Administrar las cuentas bancarias de la administracion desde donde se originan los pagos.
- Entregar una vista tipo grid de tarjetas con estado, datos clave y acciones rapidas.
- Integrar alta, edicion y eliminacion con validaciones y feedback centralizado.
- Mantener el filtro de busqueda sincronizado con la URL para facilitar enlaces y recargas.

## Estructura principal
- `page.tsx`: fuerza rendering dinamico, espera `searchParams` y delega en `BankAccountsContent` bajo `Suspense` con `DotProgress`.
- `BankAccountsContent`: invoca `getAdminBankAccounts` aplicando el filtro `search`, normaliza la respuesta y la entrega a `ListBankAccounts`.
- `ui/ListBankAccounts.tsx`: renderiza cabecera con buscador + boton de alta y el grid responsive de tarjetas.

## Busqueda y sincronizacion
- El estado `search` se inicializa desde `useSearchParams` y se actualiza al escribir.
- Cada cambio en la busqueda llama a `router.replace` para persistir el query string y `router.refresh` para reconsultar.
- El modulo muestra `defaultEmptyMessage` cuando no hay resultados.

## Tarjetas de cuenta (`BankAccountCard`)
- Presenta banco, tipo de cuenta, numero formateado en bloques de cuatro y alias opcional.
- Muestra un `Badge` verde (`Activa`) o rojo (`Inactiva`) segun `isActive`.
- Acciones disponibles: editar (`UpdateBankAccountDialog`) y eliminar (`DeleteBankAccountDialog`).

## Acciones disponibles
- **Crear cuenta (`CreateBankAccountDialog`)**
  - Dialogo con `CreateBaseForm` segmentado en un grupo de campos.
  - Campos parametrizados a partir de `AccountTypeName` y `BankName`.
  - Opcional alias, switch para marcar `isActive`.
  - Usa `createAdminBankAccount` y muestra feedback mediante `useAlert`.
  - Restablece formulario y cierra al completar con exito.
- **Editar (`UpdateBankAccountDialog`)**
  - Precarga datos de la cuenta seleccionada y actualiza el estado al abrir.
  - Permite ajustar banco, tipo, numero, alias y estado activo.
  - Llama `updateAdminBankAccount` y propaga errores en `UpdateBaseForm`.
- **Eliminar (`DeleteBankAccountDialog`)**
  - Solicita confirmacion con `DeleteBaseForm` y muestra nombre/alias de la cuenta.
  - Ejecuta `deleteAdminBankAccount` y controla errores inesperados.
  - Bloquea cierre mientras el envio esta en curso.

## Dependencias clave
- Acciones de dominio: `getAdminBankAccounts`, `createAdminBankAccount`, `updateAdminBankAccount`, `deleteAdminBankAccount`.
- Componentes base: `Dialog`, `CreateBaseForm`, `UpdateBaseForm`, `DeleteBaseForm`, `IconButton`, `TextField`, `Badge`.
- Hooks de infraestructura: `useAlert` para feedback y `useSession` para obtener usuario actual.

## Consideraciones de mantenimiento
- Extender filtros requiere actualizar `page.tsx` y el manejador de busqueda en `ListBankAccounts`.
- Cambios en `AccountTypeName` o `BankName` deben reflejarse en las opciones de los dialogos.
  - Revisar pluralizacion o etiquetas si se localizan los enums.
- Validar que `BankAccountCard` cubra nuevos atributos (ej. datos de contacto) antes de agregarlos.
- Si se requiere paginacion, migrar a `DataGrid` u otro contenedor que soporte paginado y totales.
