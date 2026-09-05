CREATE TABLE `app_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'wud' NOT NULL,
	`version` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `container_images` (
	`container_id` text PRIMARY KEY NOT NULL,
	`image_id` text NOT NULL,
	`registry_name` text NOT NULL,
	`registry_url` text NOT NULL,
	`name` text NOT NULL,
	`tag_value` text NOT NULL,
	`tag_semver` integer DEFAULT false NOT NULL,
	`digest_watch` integer DEFAULT false NOT NULL,
	`digest_value` text,
	`digest_repo` text,
	`architecture` text NOT NULL,
	`os` text NOT NULL,
	`variant` text,
	`created` text,
	FOREIGN KEY (`container_id`) REFERENCES `containers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `container_results_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`container_id` text NOT NULL,
	`tag` text,
	`digest` text,
	`created` text,
	`link` text,
	`update_available` integer DEFAULT false NOT NULL,
	`update_kind` text,
	`local_value` text,
	`remote_value` text,
	`semver_diff` text,
	`error_message` text,
	`checked_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`container_id`) REFERENCES `containers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_results_history_container` ON `container_results_history` (`container_id`);--> statement-breakpoint
CREATE INDEX `idx_results_history_checked_at` ON `container_results_history` (`checked_at`);--> statement-breakpoint
CREATE TABLE `containers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`display_icon` text DEFAULT 'mdi:docker' NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`watcher` text NOT NULL,
	`include_tags` text,
	`exclude_tags` text,
	`transform_tags` text,
	`link_template` text,
	`link` text,
	`trigger_include` text,
	`trigger_exclude` text,
	`labels` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sid` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `wud_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
