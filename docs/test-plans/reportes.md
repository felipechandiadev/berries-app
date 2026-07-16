# Plan de pruebas: Reportes

## Ruta cubierta
- `/home/reports`

## Casos sugeridos
1. **Reportes predefinidos**: ejecutar cada reporte disponible (productividad, clientes, inventario, tendencias, financieros) y verificar que no arroja errores de filtro.
2. **Exportaciones**: descargar un reporte en Excel o PDF y validar que el archivo genera las métricas esperadas (ej: suma de USD/CLP).
3. **Carga desde filtros**: aplicar filtros por productor, temporada o estado y confirmar que los valores en pantalla coinciden con las bases de datos (comparar con consultas directas si es necesario).
