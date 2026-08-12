-- Link campaigns to owning users

-- Backfill owner if table has campaigns but no users yet
INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "created_at", "updated_at")
SELECT
  '00000000-0000-4000-8000-000000000001',
  'Demo User',
  'demo@campaign-monitor.local',
  '$2b$12$f/ecpHwyZl1aebWp1XJ9.OtewaqeBvEPUEA4ljjdCs9FoE9rYwNMS',
  'employee',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users" LIMIT 1);

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "user_id" UUID;

UPDATE "campaigns" AS c
SET "user_id" = (SELECT u."id" FROM "users" u ORDER BY u."created_at" ASC LIMIT 1)
WHERE c."user_id" IS NULL;

ALTER TABLE "campaigns" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "campaigns_user_id_idx" ON "campaigns"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_user_id_fkey'
  ) THEN
    ALTER TABLE "campaigns"
      ADD CONSTRAINT "campaigns_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
