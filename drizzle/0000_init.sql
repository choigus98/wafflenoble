CREATE TYPE "public"."chapter_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."serial_status" AS ENUM('ongoing', 'completed', 'hiatus');--> statement-breakpoint
CREATE TABLE "chapter_likes" (
	"chapter_id" integer NOT NULL,
	"reader_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_likes_chapter_id_reader_id_pk" PRIMARY KEY("chapter_id","reader_id")
);
--> statement-breakpoint
CREATE TABLE "chapter_views" (
	"chapter_id" integer NOT NULL,
	"reader_id" uuid NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_views_chapter_id_reader_id_pk" PRIMARY KEY("chapter_id","reader_id")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"novel_id" integer NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(100) DEFAULT '' NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"char_count" integer DEFAULT 0 NOT NULL,
	"status" "chapter_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(10) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "novels" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"serial_status" serial_status DEFAULT 'ongoing' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"last_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" varchar(12) NOT NULL,
	"nickname_key" varchar(12) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "readers_nickname_key_unique" UNIQUE("nickname_key")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"guild_password_hash" text,
	"guild_password_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_reader_id_readers_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."readers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_views" ADD CONSTRAINT "chapter_views_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_views" ADD CONSTRAINT "chapter_views_reader_id_readers_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."readers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_likes_reader_idx" ON "chapter_likes" USING btree ("reader_id");--> statement-breakpoint
CREATE INDEX "chapter_views_reader_idx" ON "chapter_views" USING btree ("reader_id","last_viewed_at");--> statement-breakpoint
CREATE INDEX "chapters_novel_position_idx" ON "chapters" USING btree ("novel_id","position");--> statement-breakpoint
CREATE INDEX "login_attempts_lookup_idx" ON "login_attempts" USING btree ("scope","ip_hash","created_at");