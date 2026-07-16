# Plan de pruebas: Usuarios

## Ruta cubierta
- `/home/users`

## Casos sugeridos
1. **Creación y edición**: crear un usuario con rol `OPERATOR`, asignarle permisos específicos y validar que los cambios se reflejan en Playwright/herramientas de la UI.
2. **Roles y permisos**: alternar a un rol `ADMIN` y confirmar que se habilitan todos los sectiones del sidebar correspondientes.
3. **Desactivación**: eliminar o desactivar un usuario existente y verificar que ya no aparece en listados ni puede iniciar sesión.
