CREATE TABLE "posts" (
	"id" text PRIMARY KEY,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"attachment" jsonb,
	"author_name" text DEFAULT 'ZeptaLabs Officials' NOT NULL,
	"author_avatar" text DEFAULT 'logo.png' NOT NULL,
	"created_at" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"liked_by" jsonb DEFAULT '[]' NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" jsonb DEFAULT '[]' NOT NULL,
	"inserted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"account_key" text PRIMARY KEY,
	"display_key" text NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT 'logo.png' NOT NULL,
	"notifications_enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
