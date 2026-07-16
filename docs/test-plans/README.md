# Documentación de Pruebas por Sección de UI

Este árbol dentro de `docs/test-plans/` agrupa planes de prueba end-to-end (Playwright) siguiendo la estructura del `SideBar` principal de la app. Cada archivo describe qué flujos debe validar un test para esa sección específica.

## Secciones disponibles

| Carpeta / Archivo | Ruta(s) asociadas | Descripción general |
|-------------------|------------------|---------------------|
| `dashboard.md` | `/home` | Metricas iniciales y accesos rápidos del panel principal.
| `recepcion.md` | `/home/receptions/simple`, `/home/receptions/multipack`, `/home/receptions/receptions` | Flujo completo de creación y listado de recepciones.
| `gestion-productiva.md` | `/home/productiveManagement/*` | Gestión de productores, temporadas y unidades productivas.
| `gestion-economica.md` | `/home/economicManagement/*` | Anticipos, liquidaciones y cuentas bancarias.
| `despacho.md` | `/home/dispatch/*` | Clientes y despacho de pallets.
| `productos.md` | `/home/products/*` | Variedades y formatos de producto.
| `almacenamiento.md` | `/home/storage/*` | Almacenes, pallets y bandejas.
| `reportes.md` | `/home/reports` | Sección de reportes financieros y de inventario.
| `usuarios.md` | `/home/users` | CRUD de usuarios y permisos.
| `auditoria.md` | `/home/audit` | Listado y filtros de auditoría.

A continuación se describen en detalle los casos sugeridos por archivo.
