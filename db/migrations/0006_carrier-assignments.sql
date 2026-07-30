CREATE TABLE "carrier_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"load_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"carrier_name" text NOT NULL,
	"mc_number" text,
	"driver_name" text,
	"driver_phone" text,
	"truck_number" text,
	"trailer_number" text,
	"tracking_url" text,
	"visible_to_shipper" boolean DEFAULT false NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_assignments" ADD CONSTRAINT "carrier_assignments_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_assignments" ADD CONSTRAINT "carrier_assignments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_assignments" ADD CONSTRAINT "carrier_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_assignments_load_idx" ON "carrier_assignments" USING btree ("load_id");--> statement-breakpoint
CREATE INDEX "carrier_assignments_org_idx" ON "carrier_assignments" USING btree ("organization_id");