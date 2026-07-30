CREATE SEQUENCE "public"."load_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "loads" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"organization_id" text NOT NULL,
	"quote_request_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"booked_by_user_id" text NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"all_in_rate_usd" numeric(12, 2) NOT NULL,
	"origin_address" text,
	"origin_city" text NOT NULL,
	"origin_state" text NOT NULL,
	"origin_zip" text NOT NULL,
	"origin_hours" text,
	"origin_scheduling" text NOT NULL,
	"dest_address" text,
	"dest_city" text NOT NULL,
	"dest_state" text NOT NULL,
	"dest_zip" text NOT NULL,
	"dest_hours" text,
	"dest_scheduling" text NOT NULL,
	"pickup_date" date NOT NULL,
	"pickup_window" text,
	"delivery_date" date NOT NULL,
	"delivery_window" text,
	"commodity" text NOT NULL,
	"weight_lbs" integer NOT NULL,
	"pieces" text NOT NULL,
	"dims" text,
	"declared_value_usd" numeric(12, 2),
	"equipment" text NOT NULL,
	"temperature_f" text,
	"equipment_notes" text,
	"hazmat" boolean DEFAULT false NOT NULL,
	"hazmat_details" text,
	"accessorials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "load_id" text;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_booked_by_user_id_user_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loads_reference_idx" ON "loads" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "loads_org_idx" ON "loads" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "loads_status_idx" ON "loads" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_load_idx" ON "events" USING btree ("load_id","created_at");