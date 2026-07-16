# Plan de pruebas: Dashboard

## Objetivo
Validar que el tablero principal (`/home`) muestra los KPIs clave y que los accesos directos redirigen correctamente.

## Casos sugeridos
1. **Carga inicial**: el test debe iniciar sesión como `test_admin`, abrir `/home` y verificar que los widgets principales (`saldo total`, `recepciones recientes`, `gráficos`) se renderizan.
2. **Acceso rápido a secciones**: validar que los botones o cards que conducen a `Recepciones`, `Liquidaciones` y `Reportes` redirigen a cada ruta y mantienen la sesión.
3. **Persistencia de sesión**: refrescar la página y asegurarse de que el usuario sigue autenticado sin recargar el login.
4. **Notificaciones**: si existen alertas o banners, capturar su texto y validar su presencia según el rol.
