-- Plan edit audit log + PLAN_UPDATED activity

ALTER TYPE "ActivityAction" ADD VALUE 'PLAN_UPDATED';

CREATE TABLE "plan_change_logs" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_email" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" DECIMAL(18,4),
    "new_value" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plan_change_logs_campaign_id_created_at_idx" ON "plan_change_logs"("campaign_id", "created_at");
CREATE INDEX "plan_change_logs_user_id_created_at_idx" ON "plan_change_logs"("user_id", "created_at");
CREATE INDEX "plan_change_logs_created_at_idx" ON "plan_change_logs"("created_at");

ALTER TABLE "plan_change_logs" ADD CONSTRAINT "plan_change_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_change_logs" ADD CONSTRAINT "plan_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
