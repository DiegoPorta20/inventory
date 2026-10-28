CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`parent_id` int,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `equipment_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`brand` varchar(80),
	`description` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `equipment_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_models_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `import_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`import_order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity_ordered` int NOT NULL,
	`quantity_received` int NOT NULL DEFAULT 0,
	`unit_cost_usd` decimal(12,4),
	`notes` varchar(255),
	CONSTRAINT `import_order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_order_items_uq` UNIQUE(`import_order_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `import_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` int NOT NULL,
	`supplier_id` int,
	`status` varchar(20) NOT NULL DEFAULT 'DRAFT',
	`reference` varchar(120),
	`ordered_at` date,
	`expected_at` date,
	`received_at` date,
	`exchange_rate` decimal(8,4),
	`notes` text,
	`created_by` int,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `import_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_orders_number_uq` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `product_equipment` (
	`product_id` int NOT NULL,
	`equipment_id` int NOT NULL,
	CONSTRAINT `product_equipment_product_id_equipment_id_pk` PRIMARY KEY(`product_id`,`equipment_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(60) NOT NULL,
	`is_internal_code` boolean NOT NULL DEFAULT false,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category_id` int,
	`unit` varchar(10) NOT NULL DEFAULT 'PCS',
	`stock` int NOT NULL DEFAULT 0,
	`min_stock` int NOT NULL DEFAULT 0,
	`reorder_quantity` int NOT NULL DEFAULT 0,
	`location` varchar(60),
	`cost_usd` decimal(12,4),
	`price_usd` decimal(12,4),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `stock_count_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stock_count_id` int NOT NULL,
	`product_id` int NOT NULL,
	`system_qty` int NOT NULL,
	`counted_qty` int,
	`note` varchar(255),
	CONSTRAINT `stock_count_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_count_items_uq` UNIQUE(`stock_count_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `stock_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'OPEN',
	`category_id` int,
	`note` varchar(500),
	`created_by` int,
	`completed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`type` varchar(12) NOT NULL,
	`reason` varchar(30) NOT NULL,
	`quantity` int NOT NULL,
	`stock_after` int NOT NULL,
	`unit_price_usd` decimal(12,4),
	`counterparty` varchar(160),
	`reference_type` varchar(20),
	`reference_id` int,
	`note` varchar(500),
	`user_id` int,
	`occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`country` varchar(80),
	`contact_name` varchar(120),
	`email` varchar(190),
	`phone` varchar(40),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(190) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(30) NOT NULL DEFAULT 'ADMIN',
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_order_items` ADD CONSTRAINT `import_order_items_import_order_id_import_orders_id_fk` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_order_items` ADD CONSTRAINT `import_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_orders` ADD CONSTRAINT `import_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_orders` ADD CONSTRAINT `import_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_equipment` ADD CONSTRAINT `product_equipment_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_equipment` ADD CONSTRAINT `product_equipment_equipment_id_equipment_models_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment_models`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_stock_count_id_stock_counts_id_fk` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `import_order_items_product_idx` ON `import_order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `import_orders_status_idx` ON `import_orders` (`status`);--> statement-breakpoint
CREATE INDEX `import_orders_supplier_idx` ON `import_orders` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_stock_idx` ON `products` (`stock`);--> statement-breakpoint
CREATE INDEX `stock_count_items_product_idx` ON `stock_count_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_counts_status_idx` ON `stock_counts` (`status`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_occurred_idx` ON `stock_movements` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_reference_idx` ON `stock_movements` (`reference_type`,`reference_id`);