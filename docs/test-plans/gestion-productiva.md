# Plan de pruebas: Gestión Productiva

## Rutas cubiertas
- `/home/productiveManagement/producers`
- `/home/productiveManagement/productiveUnits`
- `/home/productiveManagement/seasons`

## Casos sugeridos
1. **Productores**: crear un productor nuevo con datos mínimos, verificar creación y edición (incluyendo cuentas bancarias) y borrar para dejar la base limpia.
2. **Unidades productivas**: agregar una unidad vinculada a un productor existente, validar el listado y la vinculación en el detalle.
3. **Temporadas**: crear una temporada activa, cambiar su estado a archivada y validar que los filtros muestran solo las actuales si se aplica un filtro de estado.
4. **Validaciones de permisos**: entrar como `test_user` y confirmar que solo se muestran los botones que corresponden a su rol (por ejemplo, no verá actions reservadas a admins).
