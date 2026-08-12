-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('on_track', 'attention', 'critical', 'completed');

-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('impressions', 'reach', 'clicks', 'spend', 'conversions', 'video_views');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('RUB', 'USD', 'EUR', 'UZS', 'KZT', 'GBP');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'RUB',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'attention',
    "primary_kpi" "KpiType" NOT NULL DEFAULT 'impressions',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_plans" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "impressions" DECIMAL(18,4),
    "reach" DECIMAL(18,4),
    "clicks" DECIMAL(18,4),
    "spend" DECIMAL(18,4),
    "video_views" DECIMAL(18,4),
    "conversions" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_data" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "impressions" DECIMAL(18,4),
    "reach_cumulative" DECIMAL(18,4),
    "clicks" DECIMAL(18,4),
    "spend" DECIMAL(18,4),
    "video_views" DECIMAL(18,4),
    "conversions" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_name_key" ON "clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");

-- CreateIndex
CREATE INDEX "campaigns_client_id_idx" ON "campaigns"("client_id");

-- CreateIndex
CREATE INDEX "campaigns_platform_id_idx" ON "campaigns"("platform_id");

-- CreateIndex
CREATE INDEX "campaigns_start_date_end_date_idx" ON "campaigns"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_plans_campaign_id_key" ON "campaign_plans"("campaign_id");

-- CreateIndex
CREATE INDEX "daily_data_campaign_id_date_idx" ON "daily_data"("campaign_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_data_campaign_id_date_key" ON "daily_data"("campaign_id", "date");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_plans" ADD CONSTRAINT "campaign_plans_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_data" ADD CONSTRAINT "daily_data_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

