CREATE TABLE `relay_spaces` (
	`username` varchar(25) NOT NULL,
	`id` varchar(36) NOT NULL,
	`kind` enum('channel') NOT NULL,
	`title` varchar(60) NOT NULL,
	`description` varchar(180) NOT NULL DEFAULT '',
	`owner_username` varchar(25) NOT NULL,
	`registered_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relay_spaces_username` PRIMARY KEY(`username`)
);
