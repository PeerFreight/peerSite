CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"quote_request_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
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
	"date_flexibility" text NOT NULL,
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
	"target_rate_usd" numeric(12, 2),
	"frequency" text DEFAULT 'one_time' NOT NULL,
	"notes" text,
	"needs_info_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_request_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"all_in_rate_usd" numeric(12, 2) NOT NULL,
	"service_description" text NOT NULL,
	"exclusions" text,
	"valid_until" timestamp with time zone,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_org_idx" ON "events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "events_rfq_idx" ON "events" USING btree ("quote_request_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_requests_org_idx" ON "quote_requests" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_requests_status_idx" ON "quote_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "quotes_org_idx" ON "quotes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "quotes_rfq_idx" ON "quotes" USING btree ("quote_request_id");