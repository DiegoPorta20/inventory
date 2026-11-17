-- Existing single-company data becomes company 1, the id config_inventory must assign to it.
ALTER TABLE `users` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `equipment_models` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `cost_centers` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `import_orders` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `company_id` int NULL;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD `company_id` int NULL;--> statement-breakpoint
UPDATE `users` SET `company_id` = 1;--> statement-breakpoint
UPDATE `categories` SET `company_id` = 1;--> statement-breakpoint
UPDATE `suppliers` SET `company_id` = 1;--> statement-breakpoint
UPDATE `equipment_models` SET `company_id` = 1;--> statement-breakpoint
UPDATE `cost_centers` SET `company_id` = 1;--> statement-breakpoint
UPDATE `settings` SET `company_id` = 1;--> statement-breakpoint
UPDATE `products` SET `company_id` = 1;--> statement-breakpoint
UPDATE `import_orders` SET `company_id` = 1;--> statement-breakpoint
UPDATE `stock_movements` SET `company_id` = 1;--> statement-breakpoint
UPDATE `stock_counts` SET `company_id` = 1;--> statement-breakpoint
ALTER TABLE `users` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment_models` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cost_centers` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `import_orders` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_counts` MODIFY `company_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` DROP INDEX `categories_slug_uq`;--> statement-breakpoint
ALTER TABLE `cost_centers` DROP INDEX `cost_centers_name_uq`;--> statement-breakpoint
ALTER TABLE `equipment_models` DROP INDEX `equipment_models_name_uq`;--> statement-breakpoint
ALTER TABLE `import_orders` DROP INDEX `import_orders_number_uq`;--> statement-breakpoint
ALTER TABLE `products` DROP INDEX `products_code_uq`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP INDEX `suppliers_name_uq`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_email_uq`;--> statement-breakpoint
DROP INDEX `stock_counts_status_idx` ON `stock_counts`;--> statement-breakpoint
DROP INDEX `stock_movements_occurred_idx` ON `stock_movements`;--> statement-breakpoint
ALTER TABLE `settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `settings` ADD PRIMARY KEY(`company_id`,`key`);--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_company_slug_uq` UNIQUE(`company_id`,`slug`);--> statement-breakpoint
ALTER TABLE `cost_centers` ADD CONSTRAINT `cost_centers_company_name_uq` UNIQUE(`company_id`,`name`);--> statement-breakpoint
ALTER TABLE `equipment_models` ADD CONSTRAINT `equipment_models_company_name_uq` UNIQUE(`company_id`,`name`);--> statement-breakpoint
ALTER TABLE `import_orders` ADD CONSTRAINT `import_orders_company_number_uq` UNIQUE(`company_id`,`number`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_company_code_uq` UNIQUE(`company_id`,`code`);--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_company_name_uq` UNIQUE(`company_id`,`name`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_company_email_uq` UNIQUE(`company_id`,`email`);--> statement-breakpoint
CREATE INDEX `stock_counts_status_idx` ON `stock_counts` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `stock_movements_occurred_idx` ON `stock_movements` (`company_id`,`occurred_at`);
