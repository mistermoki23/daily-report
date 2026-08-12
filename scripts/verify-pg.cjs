/**
 * Verify PostgreSQL seed + basic CRUD via Prisma Client (no Next.js).
 *
 * Prerequisites:
 *   node scripts/pg-embedded.cjs start   # or docker compose up -d
 *   DATABASE_URL=... npx prisma migrate deploy
 *   DATABASE_URL=... npx prisma db seed
 *
 * Run:
 *   DATABASE_URL="postgresql://campaign:campaign@127.0.0.1:5433/campaign_monitor?schema=public" node scripts/verify-pg.cjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function n(v) {
  return v == null ? null : Number(v);
}

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { plan: true, dailyData: true, client: true, platform: true },
  });
  console.log(
    "campaigns:",
    campaigns.map((c) => c.name)
  );
  const brufen = campaigns.find((c) => c.name === "Brufen");
  if (!brufen) throw new Error("Brufen not seeded");

  const days = [...brufen.dailyData].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const imp = days.reduce((s, d) => s + (n(d.impressions) || 0), 0);
  const clicks = days.reduce((s, d) => s + (n(d.clicks) || 0), 0);
  const spend = days.reduce((s, d) => s + (n(d.spend) || 0), 0);
  const vv = days.reduce((s, d) => s + (n(d.videoViews) || 0), 0);
  const reach = n(days[days.length - 1]?.reachCumulative);

  const cpm = (spend / imp) * 1000;
  const ctr = (clicks / imp) * 100;
  const cpc = spend / clicks;
  const vtr = (vv / imp) * 100;
  const frequency = imp / reach;

  console.log("FACT", { imp, reach, clicks, spend, vv });
  console.log("CALC", { cpm, ctr, cpc, vtr, frequency });

  if (imp !== 30000) throw new Error("expected impressions 30000");
  if (reach !== 4000) throw new Error("expected reach 4000");
  if (Math.abs(cpm - 0.333333) > 0.001) throw new Error("bad CPM");
  if (Math.abs(ctr - 1) > 0.001) throw new Error("bad CTR");
  if (Math.abs(frequency - 7.5) > 0.001) throw new Error("bad Frequency");

  const created = await prisma.dailyData.create({
    data: {
      campaignId: brufen.id,
      date: new Date("2026-09-02T00:00:00.000Z"),
      impressions: 1000,
      reachCumulative: 4500,
      clicks: 10,
      spend: 1,
      videoViews: 900,
      conversions: null,
    },
  });
  console.log("created daily", created.id);

  await prisma.dailyData.update({
    where: { id: created.id },
    data: { impressions: 2000 },
  });
  console.log("updated daily impressions -> 2000");

  await prisma.dailyData.delete({ where: { id: created.id } });
  console.log("deleted daily");

  const count = await prisma.dailyData.count({ where: { campaignId: brufen.id } });
  if (count !== 1) throw new Error("expected 1 daily row after cleanup");

  console.log("OK postgres verification passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
