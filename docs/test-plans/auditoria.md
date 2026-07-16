# Plan de pruebas: Auditoría

## Ruta cubierta
- `/home/audit`

## Casos sugeridos
1. **Listado de auditorías**: verificar que las acciones (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, etc.) aparecen luego de ejecutar los scripts de login/logout.
2. **Filtros de usuario/fecha**: aplicar filtros por nombre de usuario y rango de fechas, confirmando que la tabla solo muestra las coincidencias.
3. **Integridad de datos**: hacer login/logout con `test_admin`, limpiar auditorías y luego ejecutar nuevamente para asegurar que el auditoría log registra eventos nuevos.
