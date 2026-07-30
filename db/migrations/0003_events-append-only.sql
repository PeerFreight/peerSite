-- The events table is the portal's evidence trail: append-only by policy
-- (02-broker-platform/shipper-portal.md). Reject UPDATE and DELETE at the
-- database so no app bug can rewrite history.
CREATE OR REPLACE FUNCTION events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER events_no_update_delete
  BEFORE UPDATE OR DELETE ON "events"
  FOR EACH ROW EXECUTE FUNCTION events_append_only();
