-- Admin roles, report access ACL, activity log.
-- Existing "employee" (and other non-admin) roles become USER.

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ActivityAction" AS ENUM (
  'LOGIN',
  'LOGOUT',
  'REPORT_OPENED',
  'REPORT_STARTED',
  'REPORT_UPDATED',
  'REPORT_COMPLETED'
);

ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE
    WHEN lower("role") IN ('admin') THEN 'ADMIN'::"UserRole"
    ELSE 'USER'::"UserRole"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";

CREATE TABLE "report_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_activity" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "report_id" UUID,
    "action" "ActivityAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_access_user_id_report_id_key" ON "report_access"("user_id", "report_id");
CREATE INDEX "report_access_user_id_idx" ON "report_access"("user_id");
CREATE INDEX "report_access_report_id_idx" ON "report_access"("report_id");
CREATE INDEX "report_activity_user_id_created_at_idx" ON "report_activity"("user_id", "created_at");
CREATE INDEX "report_activity_report_id_created_at_idx" ON "report_activity"("report_id", "created_at");
CREATE INDEX "report_activity_action_created_at_idx" ON "report_activity"("action", "created_at");

ALTER TABLE "report_access" ADD CONSTRAINT "report_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_access" ADD CONSTRAINT "report_access_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_activity" ADD CONSTRAINT "report_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_activity" ADD CONSTRAINT "report_activity_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: campaign owners get access to their reports
INSERT INTO "report_access" ("id", "user_id", "report_id", "created_at")
SELECT gen_random_uuid(), "user_id", "id", CURRENT_TIMESTAMP
FROM "campaigns"
ON CONFLICT DO NOTHING;
