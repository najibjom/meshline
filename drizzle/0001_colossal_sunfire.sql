CREATE TABLE `relay_devices` (
	`username` varchar(25) NOT NULL,
	`public_key` varchar(120) NOT NULL,
	`registered_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relay_devices_username` PRIMARY KEY(`username`)
);
--> statement-breakpoint
CREATE TABLE `relay_envelopes` (
	`id` varchar(36) NOT NULL,
	`recipient_username` varchar(25) NOT NULL,
	`sender_username` varchar(25) NOT NULL,
	`sender_public_key` varchar(120) NOT NULL,
	`nonce` varchar(80) NOT NULL,
	`ciphertext` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`acknowledged_at` timestamp,
	CONSTRAINT `relay_envelopes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `relay_envelopes_inbox_idx` ON `relay_envelopes` (`recipient_username`,`acknowledged_at`,`expires_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `relay_envelopes_sender_idx` ON `relay_envelopes` (`sender_username`,`created_at`);