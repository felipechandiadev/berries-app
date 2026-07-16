-- ============================================
-- CREATE TABLES SCRIPT
-- Creates all tables in the correct order
-- Base tables first, then dependent tables
-- ============================================

-- ==========================
-- 1. PERSONS (Base table - must be first)
-- ==========================
CREATE TABLE `persons` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `dni` VARCHAR(12) UNIQUE,
  `phone` VARCHAR(20) NULL,
  `mail` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `bankAccounts` JSON NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_dni` (`dni`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 2. USERS (References PERSONS)
-- ==========================
CREATE TABLE `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userName` VARCHAR(255) NOT NULL UNIQUE,
  `pass` VARCHAR(255) NOT NULL,
  `mail` VARCHAR(255) NOT NULL UNIQUE,
  `rol` ENUM('ADMIN', 'OPERATOR') DEFAULT 'OPERATOR',
  `personId` VARCHAR(36) NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_userName` (`userName`),
  INDEX `idx_mail` (`mail`),
  INDEX `idx_deletedAt` (`deletedAt`),
  FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 3. VARIETIES (Independent)
-- ==========================
CREATE TABLE `varieties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `priceCLP` INT NOT NULL DEFAULT 0,
  `priceUSD` FLOAT NOT NULL DEFAULT 0,
  `currency` ENUM('CLP', 'USD') DEFAULT 'CLP',
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `varieties` AUTO_INCREMENT = 1001;

-- ==========================
-- 4. FORMATS (Independent)
-- ==========================
CREATE TABLE `formats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `priceCLP` INT NOT NULL DEFAULT 0,
  `priceUSD` FLOAT NOT NULL DEFAULT 0,
  `active` BOOLEAN DEFAULT TRUE,
  `varietyId` INT NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_active` (`active`),
  INDEX `idx_varietyId` (`varietyId`),
  INDEX `idx_deletedAt` (`deletedAt`),
  CONSTRAINT `fk_formats_varietyId` FOREIGN KEY (`varietyId`) REFERENCES `varieties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `formats` AUTO_INCREMENT = 1001;

-- ==========================
-- 5. STORAGES (Independent)
-- ==========================
CREATE TABLE `storages` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `capacityPallets` INT NULL,
  `location` VARCHAR(255) NULL,
  `active` BOOLEAN DEFAULT TRUE,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_active` (`active`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seasons` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `description` VARCHAR(500) NULL,
  `active` BOOLEAN DEFAULT TRUE,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_active` (`active`),
  INDEX `idx_startDate` (`startDate`),
  INDEX `idx_endDate` (`endDate`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 7. PRODUCTIVE UNITS (Independent)
-- ==========================
CREATE TABLE `productive_units` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(500) NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_productive_units_name` (`name`),
  INDEX `idx_productive_units_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 8. PRODUCERS (Independent - has all person fields directly)
-- ==========================
CREATE TABLE `producers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `dni` VARCHAR(12) UNIQUE,
  `phone` VARCHAR(20) NULL,
  `mail` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `personId` VARCHAR(36) NOT NULL,
  `productiveUnitId` VARCHAR(36) NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`personId`) REFERENCES `persons`(`id`),
  FOREIGN KEY (`productiveUnitId`) REFERENCES `productive_units`(`id`) ON DELETE SET NULL,
  INDEX `idx_dni` (`dni`),
  INDEX `idx_personId` (`personId`),
  INDEX `idx_productiveUnitId` (`productiveUnitId`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 9. CUSTOMERS (Depends on Person)
-- ==========================
CREATE TABLE `customers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `personId` VARCHAR(36) NOT NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`personId`) REFERENCES `persons`(`id`),
  INDEX `idx_personId` (`personId`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 10. AUDITS (Depends on User)
-- ==========================
CREATE TABLE `audits` (
  `id` VARCHAR(36) PRIMARY KEY,
  `entityName` VARCHAR(255) NOT NULL,
  `entityId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(36) NULL,
  `action` ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT') NOT NULL,
  `changes` JSON NULL,
  `oldValues` JSON NULL,
  `newValues` JSON NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  INDEX `idx_entityName` (`entityName`),
  INDEX `idx_entityId` (`entityId`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_action` (`action`),
  INDEX `idx_createdAt` (`createdAt`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 11. TRANSACTIONS (Depends on Season, Producer, Customer, User)
-- ==========================
CREATE TABLE `transactions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('TRAY_ADJUSTMENT', 'TRAY_IN_FROM_PRODUCER', 'TRAY_OUT_TO_PRODUCER', 'TRAY_OUT_TO_CLIENT', 'TRAY_IN_FROM_CLIENT', 'TRAY_RECEPTION_FROM_PRODUCER', 'TRAY_RECEPTION_FROM_CLIENT', 'TRAY_DELIVERY_TO_PRODUCER', 'TRAY_DELIVERY_TO_CLIENT', 'RECEPTION', 'PALLET_TRAY_ASSIGNMENT', 'PALLET_TRAY_RELEASE', 'PALLET_TRAY_TRANSFER', 'ADVANCE', 'SETTLEMENT', 'DISPATCH') NOT NULL,
  `direction` ENUM('IN', 'OUT') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `unit` ENUM('TRAY', 'PALLET', 'KG', 'CLP', 'USD') NOT NULL,
  `seasonId` VARCHAR(36) NOT NULL,
  `producerId` VARCHAR(36) NULL,
  `clientId` VARCHAR(36) NULL,
  `userId` VARCHAR(36) NOT NULL,
  `formatId` INT NULL,
  `metadata` JSON NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`),
  FOREIGN KEY (`producerId`) REFERENCES `producers`(`id`),
  FOREIGN KEY (`clientId`) REFERENCES `customers`(`id`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  FOREIGN KEY (`formatId`) REFERENCES `formats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_type` (`type`),
  INDEX `idx_direction` (`direction`),
  INDEX `idx_seasonId` (`seasonId`),
  INDEX `idx_producerId` (`producerId`),
  INDEX `idx_clientId` (`clientId`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_formatId` (`formatId`),
  INDEX `idx_createdAt` (`createdAt`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `transactions` AUTO_INCREMENT = 1001;

-- ==========================
-- 12. TRAYS (Depends on Transaction, Storage, Variety, Format)
-- ==========================
CREATE TABLE `trays` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `weight` DECIMAL(10, 3) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `active` BOOLEAN DEFAULT TRUE,
  `receptionId` BIGINT NULL,
  `storageId` VARCHAR(255) NULL,
  `varietyId` INT NULL,
  `formatId` INT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  INDEX `idx_name` (`name`),
  INDEX `idx_receptionId` (`receptionId`),
  INDEX `idx_storageId` (`storageId`),
  INDEX `idx_varietyId` (`varietyId`),
  INDEX `idx_formatId` (`formatId`),
  INDEX `idx_active` (`active`),
  INDEX `idx_deletedAt` (`deletedAt`),
  CONSTRAINT `fk_trays_reception` FOREIGN KEY (`receptionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_trays_storage` FOREIGN KEY (`storageId`) REFERENCES `storages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_trays_variety` FOREIGN KEY (`varietyId`) REFERENCES `varieties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_trays_format` FOREIGN KEY (`formatId`) REFERENCES `formats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 13. PALLETS (Depends on Storage, Tray)
-- ==========================
CREATE TABLE `pallets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `storageId` VARCHAR(255) NULL,
  `trayId` VARCHAR(36) NULL,
  `transactionId` BIGINT NULL,
  `varietyId` INT NULL,
  `formatId` INT NULL,
  `traysQuantity` INT NOT NULL DEFAULT 0,
  `capacity` INT NOT NULL,
  `weight` DECIMAL(10, 3) NOT NULL DEFAULT 0,
  `dispatchWeight` DECIMAL(10, 3) NOT NULL DEFAULT 0,
  `metadata` JSON NULL,
  `status` ENUM('AVAILABLE', 'CLOSED', 'FULL', 'DISPATCHED') DEFAULT 'AVAILABLE',
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_trays_quantity` CHECK (`traysQuantity` >= 0),
  CONSTRAINT `chk_capacity` CHECK (`capacity` > 0),
  CONSTRAINT `chk_trays_vs_capacity` CHECK (`traysQuantity` <= `capacity`),
  CONSTRAINT `chk_weight_initial` CHECK (`weight` >= 0),
  CONSTRAINT `chk_weight_dispatch` CHECK (`dispatchWeight` >= 0),
  CONSTRAINT `chk_dispatch_vs_weight` CHECK (`dispatchWeight` <= `weight`),
  FOREIGN KEY (`storageId`) REFERENCES `storages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`trayId`) REFERENCES `trays`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`varietyId`) REFERENCES `varieties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`formatId`) REFERENCES `formats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  PRIMARY KEY (`id`),
  INDEX `idx_storageId` (`storageId`),
  INDEX `idx_trayId` (`trayId`),
  INDEX `idx_transactionId` (`transactionId`),
  INDEX `idx_varietyId` (`varietyId`),
  INDEX `idx_formatId` (`formatId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `pallets` AUTO_INCREMENT = 1001;

-- ==========================
-- 14. TRANSACTION RELATIONS (Depends on Transaction)
-- ==========================
CREATE TABLE `transaction_relations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parentTransactionId` BIGINT NOT NULL,
  `childTransactionId` BIGINT NULL,
  `childReceptionPackId` INT UNSIGNED NULL,
  `relationType` ENUM('RECEPTION_PACK', 'TRAY_RECEPTION', 'TRAY_DEVOLUTION', 'PALLET_ASSIGNMENT', 'TRAY_ADJUSTMENT', 'PALLET_RELEASE', 'ADVANCE_TO_SETTLEMENT', 'RECEPTION_TO_SETTLEMENT') NOT NULL,
  `context` VARCHAR(255) NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_parentTransaction` (`parentTransactionId`),
  INDEX `idx_childTransaction` (`childTransactionId`),
  INDEX `idx_childReceptionPack` (`childReceptionPackId`),
  INDEX `idx_relationType` (`relationType`),
  INDEX `idx_deletedAt` (`deletedAt`),
  CONSTRAINT `fk_transaction_relations_parent` FOREIGN KEY (`parentTransactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transaction_relations_child` FOREIGN KEY (`childTransactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `transaction_relations` AUTO_INCREMENT = 1001;

-- ==========================
-- 15. RECEPTION PACKS (Depends on Transaction, Variety, Format, Tray)
-- ==========================
CREATE TABLE `reception_packs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receptionTransactionId` BIGINT NOT NULL,
  `varietyId` INT NOT NULL,
  `varietyName` VARCHAR(255) NOT NULL,
  `formatId` INT NOT NULL,
  `formatName` VARCHAR(255) NOT NULL,
  `trayId` VARCHAR(36) NULL,
  `trayLabel` VARCHAR(255) NULL,
  `traysQuantity` INT NOT NULL DEFAULT 0,
  `unitTrayWeight` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `traysTotalWeight` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `grossWeight` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `netWeightBeforeImpurities` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `impurityPercent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `netWeight` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `pricePerKg` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `currency` ENUM('CLP', 'USD') NOT NULL DEFAULT 'CLP',
  `totalToPay` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `palletAssignments` JSON NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_receptionTransaction` (`receptionTransactionId`),
  INDEX `idx_varietyId` (`varietyId`),
  INDEX `idx_formatId` (`formatId`),
  INDEX `idx_trayId` (`trayId`),
  INDEX `idx_deletedAt` (`deletedAt`),
  CONSTRAINT `fk_reception_packs_reception` FOREIGN KEY (`receptionTransactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reception_packs_variety` FOREIGN KEY (`varietyId`) REFERENCES `varieties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reception_packs_format` FOREIGN KEY (`formatId`) REFERENCES `formats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reception_packs_tray` FOREIGN KEY (`trayId`) REFERENCES `trays`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `reception_packs` AUTO_INCREMENT = 1001;

ALTER TABLE `transaction_relations`
  ADD CONSTRAINT `fk_transaction_relations_reception_pack` FOREIGN KEY (`childReceptionPackId`)
    REFERENCES `reception_packs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================
-- 16. PERMISSIONS (References USERS)
-- ==========================
CREATE TABLE `permissions` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `userId` VARCHAR(36) NULL,
  `ability` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_ability` (`ability`),
  INDEX `idx_deletedAt` (`deletedAt`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================
-- 17. ADMIN BANK ACCOUNTS (Independent)
-- ==========================
CREATE TABLE `admin_bank_accounts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `accountType` VARCHAR(50) NOT NULL,
  `bank` VARCHAR(255) NOT NULL,
  `accountNumber` VARCHAR(50) NOT NULL,
  `alias` VARCHAR(255) NULL,
  `personId` VARCHAR(36) NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  INDEX `idx_accountNumber` (`accountNumber`),
  INDEX `idx_isActive` (`isActive`),
  INDEX `idx_personId` (`personId`),
  INDEX `idx_deletedAt` (`deletedAt`),
  FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SHOW TABLES;
