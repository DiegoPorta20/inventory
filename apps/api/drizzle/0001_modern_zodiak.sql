CREATE TABLE `cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `cost_centers_id` PRIMARY KEY(`id`),
	CONSTRAINT `cost_centers_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(60) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `specification` varchar(500);--> statement-breakpoint
ALTER TABLE `products` ADD `cost_center_id` int;--> statement-breakpoint
ALTER TABLE `products` ADD `wholesale_price_usd` decimal(12,4);--> statement-breakpoint
ALTER TABLE `products` ADD `wholesale_min_qty` int;--> statement-breakpoint
ALTER TABLE `products` ADD `is_consignment` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_cost_center_id_cost_centers_id_fk` FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `products_cost_center_idx` ON `products` (`cost_center_id`);