# Recepciones: Simple y Multi-Pack


## Estructura de Carpetas

```
app/home/receptions/
  simple/         # UI y lógica para recepción simple (puede ser la carpeta actual newRecepcion renombrada)
  multipack/      # UI y lógica para recepción multi-pack
  DataGrid.tsx    # DataGrid común, con columna multipack
  index.tsx       # Router/selector de tipo de recepción
  ...otros archivos compartidos
```

> Nota: La recepción simple corresponde a la implementación actual, no se debe crear una nueva. Se recomienda renombrar la carpeta `newRecepcion` a `simple` para mayor claridad en el contexto de la refactorización.

---

## Tipos de Recepción

### Recepción Simple
- Permite registrar una sola bandeja/pack por recepción.
- El menú de la sidebar: "Nueva Recepción Simple".
- La metadata de la transacción no incluye el flag `multiPack`.

### Recepción Multi-Pack
- Permite registrar múltiples packs en una sola recepción.
- El menú de la sidebar: "Nueva Recepción Multi-Pack".
- La metadata de la transacción incluye:  
  `"multiPack": true`
- En la UI, se pueden agregar/remover varios packs dinámicamente.
- En la metadata de la transacción, se suman todos los valores netos, gross y pesos de las bandejas.
- El precio no se coloca a nivel de recepción, ya que cada pack puede tener un precio distinto.

---

## Cambios en la Metadata de la Transacción de Recepción

- Se agrega el campo booleano `multiPack` en la metadata.
- En recepciones multi-pack:
  - Se suman los valores netos, gross y pesos de todos los packs.
  - El precio no se coloca a nivel de recepción.
  - Se almacena la colección de packs con sus datos individuales.

---




## Cambios en la UI

- Sidebar:
  - Opción "Nueva Recepción Simple" (flujo actual, reutiliza la UI existente). Ruta: `/home/receptions/simple` (o la ruta correspondiente tras el renombrado).
  - Opción "Nueva Recepción Multi-Pack" (nuevo flujo). Ruta: `/home/receptions/multipack`.
  - Actualizar la configuración de la sidebar para reflejar estas rutas y nombres correctamente.
- DataGrid:
  - Nueva columna "Multi-Pack" con íconos de check (✔️) o X (❌).
  - Para recepciones multi-pack, la fila podrá expandirse (row expand) para mostrar los packs asociados en una grilla (4 cards por fila).
- Recepción Multi-Pack:
  - UI especial para agregar múltiples packs.
  - Visualización y edición de cada pack individualmente.
  - Se debe incluir la misma funcionalidad de asignar a pallet y devolución de bandejas para cada pack, igual que en la recepción simple.
  - En la expansión de la fila en el DataGrid, se mostrarán los detalles de cada pack, incluyendo opciones de asignación a pallet y devolución de bandejas.
  - Se recomienda reutilizar el componente `DetailReceptionCard` para mostrar el detalle de cada pack, ya que ya contiene toda la funcionalidad necesaria.
  - El recibo a imprimir (PrintReceptionDialog) debe ser coherente con el sistema multi-pack, mostrando la información de todos los packs involucrados en la recepción.

> Nota: En pasos posteriores se abordará la actualización de PrintReceptionDialog y ReceptionDetail para soportar correctamente la visualización e impresión de recepciones multi-pack.

---

## Cambios en Endpoints y Backend

- No se crea un nuevo tipo de transacción, solo se flexibiliza la existente.
- Los endpoints de recepción deben aceptar y procesar la colección de packs y el flag `multiPack`.
- Validaciones para sumar correctamente los valores de los packs en la recepción multi-pack.

---

## Consideraciones Técnicas

- La lógica de sumatoria y validación debe estar tanto en backend como en frontend.
- El modelo de datos debe permitir almacenar múltiples packs por recepción.
- El sistema de permisos puede requerir un nuevo ability para crear recepciones multi-pack.

---

**Este documento servirá como guía para la implementación de la recepción multi-pack.**
