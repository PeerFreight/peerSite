CREATE TABLE "location_pings" (
	"id" text PRIMARY KEY NOT NULL,
	"tracking_session_id" text NOT NULL,
	"load_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"city" text,
	"state" text,
	"eta_at" timestamp with time zone,
	"provider_status" text,
	"provider_event_id" text,
	"source" text DEFAULT 'webhook' NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"load_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_order_id" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"driver_phone" text NOT NULL,
	"interval_minutes" integer DEFAULT 30 NOT NULL,
	"webhook_secret" text NOT NULL,
	"public_token" text NOT NULL,
	"public_token_revoked_at" timestamp with time zone,
	"public_expires_at" timestamp with time zone,
	"origin_lat" double precision,
	"origin_lng" double precision,
	"dest_lat" double precision,
	"dest_lng" double precision,
	"last_ping_at" timestamp with time zone,
	"started_by_user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_tracking_session_id_tracking_sessions_id_fk" FOREIGN KEY ("tracking_session_id") REFERENCES "public"."tracking_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_started_by_user_id_user_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_pings_session_idx" ON "location_pings" USING btree ("tracking_session_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "location_pings_provider_event_idx" ON "location_pings" USING btree ("tracking_session_id","provider_event_id") WHERE "location_pings"."provider_event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_sessions_public_token_idx" ON "tracking_sessions" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "tracking_sessions_load_idx" ON "tracking_sessions" USING btree ("load_id","started_at");--> statement-breakpoint
CREATE INDEX "tracking_sessions_org_idx" ON "tracking_sessions" USING btree ("organization_id");