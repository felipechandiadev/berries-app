# Plan de pruebas: Gestión Económica

## Rutas cubiertas
- `/home/economicManagement/advances`
- `/home/economicManagement/settlements`
- `/home/economicManagement/bankAccounts`

## Casos sugeridos
1. **Anticipos**: crear un anticipo, aplicarlo a una liquidación y validar que el balance de la liquidación lo referencia correctamente.
2. **Liquidaciones**: crear y editar una liquidación nueva, incluyendo la selección de recepciones y anticipos, además de probar la nueva edición masiva del tipo de cambio (con el dialog implementado recientemente).
3. **Cuentas bancarias**: añadir una cuenta bancaria administrativa, verificar que aparece en la lista y que es seleccionable desde los formularios.
4. **Mensajes de error financiero**: intentar guardar una liquidación con balance negativo y confirmar que no se permite.
