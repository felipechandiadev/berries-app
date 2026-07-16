# Plan de pruebas: Recepción

## Rutas cubiertas
- `/home/receptions/simple` (Nueva Recepción Simple)
- `/home/receptions/multipack` (Nueva Recepción Multi-Pack)
- `/home/receptions/receptions` (Listado de Recepciones)

## Casos sugeridos
1. **Nueva recepción simple**: completar el formulario con datos válidos (cliente, producto, kilos, cambios en CLP/USD) y verificar que se crea la recepción con resumen correcto.
2. **Nueva recepción multi-pack**: simular la carga de pallets/multipacks, subir imágenes o documentos si aplica y confirmar que los totales (CLP/USD) quedan registrados.
3. **Listado de recepciones**: validar filtros por estado/usuario, seleccionar una fila y abrir el detalle para confirmar la información (kilos, cambio, montos).
4. **Recuperación de sesión**: navegar entre las tres páginas y verificar que la misma sesión se mantiene y las operaciones no requieren nuevo login.
5. **Errores de formulario**: intentar enviar un formulario incompleto y comprobar que se muestran los mensajes de validación correspondientes.
