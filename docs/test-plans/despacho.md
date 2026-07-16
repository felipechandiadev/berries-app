# Plan de pruebas: Despacho

## Rutas cubiertas
- `/home/dispatch/customers`
- `/home/dispatch/dispatchs`

## Casos sugeridos
1. **Clientes**: crear un cliente nuevo, verificar que aparece en filtros y que la información (contactos, direcciones) se muestra correctamente.
2. **Despachos**: crear un despacho con pallets asociados a recepciones existentes y confirmar su estado (pendiente, despachado).
3. **Integración con inventario**: validar que al despachar pallets se actualizan correctamente los contadores de inventario y que el registro queda disponible en la sección de auditoría.
