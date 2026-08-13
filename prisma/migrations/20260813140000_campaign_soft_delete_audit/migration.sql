-- Soft delete for campaigns + general campaign change audit log

ALTER TABLE "campaigns" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "campaigns_deleted_at_idx" ON "campaigns"("deleted_at");

CREATE TYPE "CampaignChangeAction" AS ENUM ('EDIT', 'DELETE', 'RESTORE');

CREATE TABLE "campaign_change_logs" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" "CampaignChangeAction" NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_change_logs_campaign_id_created_at_idx" ON "campaign_change_logs"("campaign_id", "created_at");
CREATE INDEX "campaign_change_logs_user_id_created_at_idx" ON "campaign_change_logs"("user_id", "created_at");
CREATE INDEX "campaign_change_logs_action_created_at_idx" ON "campaign_change_logs"("action", "created_at");
CREATE INDEX "campaign_change_logs_created_at_idx" ON "campaign_change_logs"("created_at");

ALTER TABLE "campaign_change_logs" ADD CONSTRAINT "campaign_change_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_change_logs" ADD CONSTRAINT "campaign_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
