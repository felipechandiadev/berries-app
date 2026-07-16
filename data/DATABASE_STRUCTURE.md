# Estructura de Base de Datos - ElectNextStart

## Resumen General

ElectNextStart es una aplicación de gestión agrícola que maneja el ciclo completo de producción de frutas, desde la recepción de productos de productores hasta el almacenamiento, empaquetado y distribución. La base de datos está diseñada para manejar operaciones complejas de inventario, transacciones financieras y trazabilidad.

**Tecnología:** MySQL con TypeORM
**Arquitectura:** Relacional con entidades normalizadas
**Características principales:** Soft deletes, auditoría automática, transacciones complejas

## Entidades Principales

### 1. Usuarios y Autenticación

#### User (users)
- **ID:** UUID
- **Campos principales:**
  - `userName`: Nombre de usuario único
  - `pass`: Contraseña hasheada
  - `mail`: Correo electrónico
  - `rol`: ADMIN | OPERATOR
- **Relaciones:**
  - `person`: Una persona asociada (eager loading)
- **Características:** Soft delete, auditoría automática

#### Person (persons)
- **ID:** UUID
- **Campos principales:**
  - `name`: Nombre completo
  - `dni`: Documento de identidad
  - `phone`: Teléfono (opcional)
  - `mail`: Correo electrónico (opcional)
  - `bankAccounts`: Array JSON de cuentas bancarias
- **Características:** Soft delete, timestamps automáticos

### 2. Estructura Organizacional

#### Producer (producers)
- **ID:** UUID
- **Campos principales:**
  - `name`: Nombre del productor
  - `dni`: Documento de identidad
  - `phone`: Teléfono (opcional)
  - `mail`: Correo electrónico (opcional)
- **Relaciones:**
  - `person`: Datos personales detallados
- **Propósito:** Gestionar proveedores de materia prima

#### Customer (customers)
- **ID:** UUID
- **Relaciones:**
  - `person`: Datos del cliente
- **Propósito:** Gestionar compradores de productos

### 3. Gestión de Productos

#### Variety (varieties)
- **ID:** Auto-incremental (INT)
- **Campos principales:**
  - `name`: Nombre único de la variedad
  - `priceCLP`: Precio en pesos chilenos
  - `priceUSD`: Precio en dólares
  - `currency`: CLP | USD (default: CLP)
- **Propósito:** Catálogo de variedades de frutas con precios

#### Format (formats)
- **ID:** Auto-incremental (INT)
- **Campos principales:**
  - `name`: Nombre único del formato
  - `description`: Descripción (opcional)
  - `active`: Estado activo/inactivo
- **Propósito:** Definir formatos de empaquetado (cajas, bins, etc.)

### 4. Gestión de Inventario

#### Storage (storages)
- **ID:** UUID
- **Campos principales:**
  - `name`: Nombre del almacén
  - `capacityPallets`: Capacidad máxima en pallets
  - `location`: Ubicación física
  - `active`: Estado activo/inactivo
- **Propósito:** Gestionar diferentes tipos de almacenamiento

#### Tray (trays)
- **ID:** UUID
- **Campos principales:**
  - `name`: Nombre único de la bandeja
  - `weight`: Peso unitario (decimal 10,3)
  - `stock`: Cantidad disponible
  - `active`: Estado activo/inactivo
- **Propósito:** Gestionar bandejas reutilizables

#### Pallet (pallets)
- **ID:** Auto-incremental (INT unsigned)
- **Campos principales:**
  - `storageId`: Almacén donde se encuentra
  - `trayId`: Tipo de bandeja
  - `traysQuantity`: Cantidad actual de bandejas
  - `capacity`: Capacidad máxima
  - `weight`: Peso total actual
  - `dispatchWeight`: Peso preparado para despacho
  - `status`: AVAILABLE | CLOSED | FULL | DISPATCHED
  - `metadata`: JSON con asignaciones de bandejas
- **Relaciones:**
  - `storage`: Almacén de ubicación
  - `tray`: Tipo de bandeja
- **Propósito:** Gestionar pallets con asignaciones de bandejas

### 5. Transacciones y Operaciones

#### Transaction (transactions)
- **ID:** Auto-incremental BIGINT
- **Campos principales:**
  - `type`: Tipo de transacción (ver enum TransactionType)
  - `direction`: IN | OUT
  - `amount`: Cantidad/monto (decimal 12,2)
  - `unit`: TRAY | PALLET | KG | CLP | USD
  - `metadata`: JSON con datos específicos por tipo
- **Relaciones:**
  - `season`: Temporada asociada
  - `producer`: Productor involucrado
  - `client`: Cliente involucrado
  - `user`: Usuario que realizó la transacción
- **Propósito:** Registro centralizado de todas las operaciones

##### Tipos de Transacción (TransactionType):
- `TRAY_ADJUSTMENT`: Ajustes de inventario de bandejas
- `TRAY_IN_FROM_PRODUCER`: Entrada de bandejas del productor
- `TRAY_OUT_TO_PRODUCER`: Salida de bandejas al productor
- `TRAY_OUT_TO_CLIENT`: Salida de bandejas al cliente
- `TRAY_IN_FROM_CLIENT`: Entrada de bandejas del cliente
- `RECEPTION`: Recepción de materia prima
- `PALLET_TRAY_ASSIGNMENT`: Asignación de bandejas a pallet
- `PALLET_TRAY_RELEASE`: Liberación de bandejas del pallet
- `ADVANCE`: Anticipos a productores

#### TransactionRelation (transaction_relations)
- **ID:** Auto-incremental (INT unsigned)
- **Campos principales:**
  - `parentTransactionId`: Transacción padre
  - `childTransactionId`: Transacción hija (opcional)
  - `childReceptionPackId`: Paquete de recepción relacionado
  - `relationType`: Tipo de relación
  - `context`: Contexto adicional
- **Propósito:** Mantener relaciones entre transacciones para trazabilidad

#### ReceptionPack (reception_packs)
- **ID:** Auto-incremental (INT unsigned)
- **Campos principales:**
  - `receptionTransactionId`: Transacción de recepción asociada
  - `varietyId`: Variedad recibida
  - `formatId`: Formato de empaquetado
  - `traysQuantity`: Cantidad de bandejas
  - `unitTrayWeight`: Peso unitario por bandeja
  - `grossWeight`: Peso bruto total
  - `netWeight`: Peso neto final
  - `pricePerKg`: Precio por kilogramo
  - `totalToPay`: Total a pagar
  - `palletAssignments`: JSON con asignaciones a pallets
- **Propósito:** Detallar paquetes individuales dentro de una recepción

### 6. Gestión Financiera

#### AdminBankAccount (admin_bank_accounts)
- **ID:** UUID
- **Campos principales:**
  - `accountType`: Tipo de cuenta bancaria
  - `bank`: Banco
  - `accountNumber`: Número de cuenta
  - `alias`: Alias opcional
  - `isActive`: Estado activo/inactivo
- **Propósito:** Gestionar cuentas bancarias de la administración

#### Advance Metadata
Parte de la metadata de transacciones tipo ADVANCE:
- `paymentMethod`: CASH | TRANSFER | CHECK
- `paymentDetails`:
  - `producerAccountId`: Cuenta del productor (para transferencias)
  - `bankAccountId`: Cuenta administrativa (para transferencias/cheques)
  - `transactionId`: ID de transacción bancaria
  - `checkNumber`: Número de serie del cheque

### 7. Temporadas

#### Season (seasons)
- **ID:** UUID
- **Campos principales:**
  - `name`: Nombre único de la temporada
  - `startDate`: Fecha de inicio
  - `endDate`: Fecha de término
  - `description`: Descripción opcional
  - `active`: Temporada activa/inactiva
- **Propósito:** Gestionar ciclos productivos por temporada

### 8. Auditoría

#### Audit (audits)
- **ID:** UUID
- **Campos principales:**
  - `entityName`: Nombre de la entidad auditada
  - `entityId`: ID de la entidad
  - `userId`: Usuario que realizó la acción
  - `action`: CREATE | UPDATE | DELETE | UPDATE_PASSWORD | LOGIN_SUCCESS | LOGIN_FAILED | LOGOUT
  - `changes`: Cambios realizados (JSON)
  - `oldValues`: Valores anteriores (JSON)
  - `newValues`: Valores nuevos (JSON)
  - `description`: Descripción de la acción
  - `createdAt`: Timestamp preciso
- **Propósito:** Mantener registro completo de todas las operaciones

## Relaciones Principales

```
User (1) ──── (1) Person
Person (1) ──── (*) Producer
Person (1) ──── (*) Customer
Season (1) ──── (*) Transaction
Producer (1) ──── (*) Transaction
Customer (1) ──── (*) Transaction
User (1) ──── (*) Transaction

Transaction (1) ──── (*) TransactionRelation
Transaction (1) ──── (*) ReceptionPack

Storage (1) ──── (*) Pallet
Tray (1) ──── (*) Pallet

Variety (1) ──── (*) ReceptionPack
Format (1) ──── (*) ReceptionPack
Tray (1) ──── (*) ReceptionPack
```

## Características Técnicas

### Soft Deletes
Todas las entidades principales implementan soft delete mediante `deletedAt?: Date`, permitiendo recuperación de datos eliminados.

### Timestamps Automáticos
- `createdAt`: Fecha de creación (automática)
- `updatedAt`: Fecha de última modificación (automática)

### Enums y Constantes
- **UserRole:** ADMIN, OPERATOR
- **TransactionType:** 9 tipos diferentes
- **TransactionDirection:** IN, OUT
- **TransactionUnit:** TRAY, PALLET, KG, CLP, USD
- **PalletStatus:** AVAILABLE, CLOSED, FULL, DISPATCHED
- **Currency:** CLP, USD
- **AuditActionType:** 7 tipos de acciones

### Metadata JSON
Varias entidades usan campos JSON para almacenar datos estructurados:
- `Transaction.metadata`: Datos específicos por tipo de transacción
- `Pallet.metadata`: Asignaciones de bandejas
- `ReceptionPack.palletAssignments`: Asignaciones a pallets
- `Person.bankAccounts`: Cuentas bancarias personales

### Índices y Constraints
- Claves primarias UUID para entidades principales
- Índices únicos en nombres de variedades, formatos, bandejas
- Constraints de integridad referencial
- Índices en campos de búsqueda frecuentes

## Migraciones

El sistema incluye 19 migraciones que documentan la evolución de la base de datos desde la versión inicial hasta la actual, cubriendo:
- Creación de tablas iniciales
- Adición de campos faltantes
- Refactorización de esquemas
- Actualización de constraints
- Implementación de relaciones complejas

## Servicios y Utilidades

### AuditService
- Registro automático de operaciones
- Trazabilidad completa de cambios
- Logging de autenticación

### Database Connection
- Singleton pattern para Next.js
- Configuración flexible por entorno
- Reintentos automáticos de conexión
- Pool de conexiones optimizado

Esta estructura soporta operaciones complejas de agricultura, desde la recepción de materia prima hasta la distribución final, manteniendo trazabilidad completa y control financiero detallado.