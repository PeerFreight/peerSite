ALTER TABLE "loads" ADD COLUMN "delayed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "delay_reason" text;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "revised_delivery_date" date;