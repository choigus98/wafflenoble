CREATE TABLE "chapter_view_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"reader_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(10) NOT NULL,
	"mime" varchar(20) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "novels" ADD COLUMN "cover_image_id" uuid;--> statement-breakpoint
ALTER TABLE "chapter_view_logs" ADD CONSTRAINT "chapter_view_logs_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_view_logs" ADD CONSTRAINT "chapter_view_logs_reader_id_readers_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."readers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_view_logs_chapter_idx" ON "chapter_view_logs" USING btree ("chapter_id","viewed_at");--> statement-breakpoint
CREATE INDEX "chapter_view_logs_reader_idx" ON "chapter_view_logs" USING btree ("reader_id");--> statement-breakpoint
ALTER TABLE "novels" ADD CONSTRAINT "novels_cover_image_id_images_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;