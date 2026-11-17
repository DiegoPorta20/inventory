ALTER TABLE `products` RENAME COLUMN `cost_usd` TO `cost_pen`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `price_usd` TO `price_pen`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `wholesale_price_usd` TO `wholesale_price_pen`;--> statement-breakpoint
ALTER TABLE `import_order_items` RENAME COLUMN `unit_cost_usd` TO `unit_cost_pen`;--> statement-breakpoint
ALTER TABLE `stock_movements` RENAME COLUMN `unit_price_usd` TO `unit_price_pen`;--> statement-breakpoint
ALTER TABLE `import_orders` DROP COLUMN `exchange_rate`;--> statement-breakpoint
DELETE FROM `settings` WHERE `key` = 'pricing.exchangeRate';
