-- ============================================
-- DROP ALL TABLES SCRIPT
-- Eliminates all tables in the correct order
-- (dependents first, then independents)
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- Transaction-related tables (most dependent)
DROP TABLE IF EXISTS `transaction_relations`;
DROP TABLE IF EXISTS `reception_packs`;
DROP TABLE IF EXISTS `transactions`;

-- Pallet and related
DROP TABLE IF EXISTS `pallets`;

-- Producer and Customer (depend on Person)
DROP TABLE IF EXISTS `producers`;
DROP TABLE IF EXISTS `productive_units`;
DROP TABLE IF EXISTS `customers`;

-- Audit (depends on User)
DROP TABLE IF EXISTS `audits`;

-- Permissions (depends on User)
DROP TABLE IF EXISTS `permissions`;

-- Admin Bank Accounts (independent)
DROP TABLE IF EXISTS `admin_bank_accounts`;

-- Core tables with self-managed data
DROP TABLE IF EXISTS `trays`;
DROP TABLE IF EXISTS `storages`;
DROP TABLE IF EXISTS `formats`;
DROP TABLE IF EXISTS `varieties`;
DROP TABLE IF EXISTS `seasons`;

-- Person and User (base tables)
DROP TABLE IF EXISTS `persons`;
DROP TABLE IF EXISTS `users`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify no tables remain
SHOW TABLES;
