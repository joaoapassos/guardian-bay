CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_canonical" CHECK ("users"."email" = lower("users"."email") AND "users"."email" COLLATE "C" ~ '^[!-~]+$' AND "users"."email" ~ '^[^@]+@[^@]+$'),
	CONSTRAINT "users_password_hash_format" CHECK ("users"."password_hash" ~ '^\$argon2id\$v=19\$m=[1-9][0-9]*,p=[1-9][0-9]*,t=[1-9][0-9]*\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$')
);
