# Migración de Base de Datos - Homologación con Test

Este documento explica cómo migrar la base de datos original (producción/desarrollo) para que tenga la misma estructura que la base de datos de test.

## Cambios Realizados

### Estructurales
- ✅ Renombrar tablas: `user` → `users`, `person` → `persons`
- ✅ Mover campo `phone` de `users` a `persons`
- ✅ Agregar soft delete (`deletedAt`) a ambas tablas
- ✅ Crear tabla `audits` para registro de auditoría
- ✅ Agregar relación OneToOne entre `users` y `persons`
- ✅ Agregar campo `mail` a tabla `persons` (nullable)

### Funcionales
- ✅ Soporte para auditoría de cambios de contraseña (`UPDATE_PASSWORD`)
- ✅ Separación de datos de cuenta (User) y personales (Person)
- ✅ Soft delete para mantener integridad de datos

## Cómo Ejecutar la Migración

### 1. Backup Manual (Recomendado)
Antes de ejecutar la migración, crea un backup completo de tu base de datos:

```bash
mysqldump -u [usuario] -p [base_datos] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Ejecutar Migración
```bash
npm run migrate:production
```

Este comando:
- ✅ Crea backups automáticos de las tablas existentes
- ✅ Ejecuta la migración SQL
- ✅ Verifica la integridad de los datos
- ✅ Actualiza contraseñas de usuarios de prueba
- ✅ Muestra un resumen de la migración

### 3. Verificar Migración
Después de la migración, ejecuta los tests para verificar que todo funciona:

```bash
npm run test:e2e
```

## Rollback (Si algo sale mal)

Si necesitas hacer rollback, las tablas backup se crean automáticamente con nombres como:
- `user_backup_2025-12-06T10-30-00-000Z`
- `person_backup_2025-12-06T10-30-00-000Z`

Para restaurar:
```sql
-- Restaurar tablas
DROP TABLE users;
DROP TABLE persons;
ALTER TABLE user_backup_[timestamp] RENAME TO users;
ALTER TABLE person_backup_[timestamp] RENAME TO persons;
```

## Verificación Post-Migración

Después de la migración, verifica:

1. **Estructura de tablas:**
   ```sql
   DESCRIBE users;
   DESCRIBE persons;
   DESCRIBE audits;
   ```

2. **Datos migrados:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM persons WHERE phone IS NOT NULL;
   ```

3. **Relaciones:**
   ```sql
   SELECT u.userName, p.name, p.phone
   FROM users u
   LEFT JOIN persons p ON u.personId = p.id;
   ```

4. **Funcionalidad:**
   - ✅ Login funciona
   - ✅ Cambio de contraseña funciona
   - ✅ Auditoría registra eventos

## Usuarios de Prueba

Después de la migración, los usuarios de prueba tendrán estas credenciales:

- **test_admin**: `test123456`
- **test_user**: `test123456`

## Notas Importantes

- 🔒 **Backup obligatorio**: Siempre crea backup antes de migrar
- 🧪 **Test first**: Ejecuta en un entorno de test antes de producción
- 📊 **Verificación**: Revisa los datos después de la migración
- 🔄 **Rollback plan**: Ten un plan de rollback listo

## Migraciones Recientes

### 2025-12-06: Agregar campo `mail` a tabla `persons`
- **Archivo**: `add-mail-to-persons.sql` / `add-mail-to-persons.ts`
- **Descripción**: Agrega campo `mail` (varchar(255), nullable) a la tabla `persons`
- **Comando**: `npx ts-node data/migrations/add-mail-to-persons.ts`
- **Estado**: ✅ Ejecutada exitosamente

### 2025-12-06: Nuevas entidades (producers, customers)
- **Archivo**: `add-productive-units-producers-customers.ts`
- **Descripción**: Crea las tablas `producers` y `customers` con sus relaciones FK hacia `persons`
- **Comando**: `npx ts-node data/migrations/add-productive-units-producers-customers.ts`
- **Estado**: ✅ Ejecutada exitosamente

## Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs de la consola
2. Verifica la configuración de base de datos en las variables de entorno (`.env`).
3. Asegúrate de que la base de datos sea accesible
4. Contacta al equipo de desarrollo si es necesario