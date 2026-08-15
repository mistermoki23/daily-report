-- Additive brands support. Existing rows are preserved.
-- campaigns.brand_id is nullable so legacy campaigns stay valid with NULL.

CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brands_client_id_name_key" ON "brands"("client_id", "name");
CREATE INDEX "brands_client_id_idx" ON "brands"("client_id");

ALTER TABLE "brands"
ADD CONSTRAINT "brands_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaigns"
ADD COLUMN "brand_id" UUID;

CREATE INDEX "campaigns_brand_id_idx" ON "campaigns"("brand_id");

ALTER TABLE "campaigns"
ADD CONSTRAINT "campaigns_brand_id_fkey"
FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
