-- Additive: campaign confirming screenshots (files stored on disk, metadata in DB).

CREATE TYPE "CampaignScreenshotType" AS ENUM ('LAUNCH', 'REPORTING');

CREATE TABLE "campaign_screenshots" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" "CampaignScreenshotType" NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_screenshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_screenshots_campaign_id_type_key" ON "campaign_screenshots"("campaign_id", "type");
CREATE INDEX "campaign_screenshots_campaign_id_idx" ON "campaign_screenshots"("campaign_id");
CREATE INDEX "campaign_screenshots_uploaded_by_idx" ON "campaign_screenshots"("uploaded_by");

ALTER TABLE "campaign_screenshots"
ADD CONSTRAINT "campaign_screenshots_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_screenshots"
ADD CONSTRAINT "campaign_screenshots_uploaded_by_fkey"
FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
