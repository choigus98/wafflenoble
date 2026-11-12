CREATE TABLE "chapter_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"title" varchar(100) DEFAULT '' NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"author_note" text DEFAULT '' NOT NULL,
	"char_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_revisions" ADD CONSTRAINT "chapter_revisions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_revisions_chapter_idx" ON "chapter_revisions" USING btree ("chapter_id","created_at");