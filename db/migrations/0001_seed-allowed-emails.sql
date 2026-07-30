-- Founders are always-allowed signups; shipper invites get seeded from /admin
-- (or manually) as rows in allowed_emails.
INSERT INTO "allowed_emails" ("email", "note") VALUES
  ('aaron@peer-freight.com', 'founder'),
  ('felix@peer-freight.com', 'founder')
ON CONFLICT ("email") DO NOTHING;
