CREATE TABLE "chapter_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"reader_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_comments" ADD CONSTRAINT "chapter_comments_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_comments" ADD CONSTRAINT "chapter_comments_reader_id_readers_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."readers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_comments_chapter_idx" ON "chapter_comments" USING btree ("chapter_id","created_at");--> statement-breakpoint
CREATE INDEX "chapter_comments_reader_idx" ON "chapter_comments" USING btree ("reader_id","created_at");