import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Campaign Monitor…");

  await prisma.dailyData.deleteMany();
  await prisma.campaignPlan.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("demo1234", 10);

  await prisma.user.create({
    data: {
      name: process.env.DEMO_USER_NAME ?? "Анна Иванова",
      email: process.env.DEMO_USER_EMAIL ?? "anna@agency.com",
      role: process.env.DEMO_USER_ROLE ?? "employee",
      passwordHash,
    },
  });

  const client = await prisma.client.create({
    data: { name: "Abbott" },
  });

  const platform = await prisma.platform.create({
    data: { name: "BYYD" },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: "Brufen",
      clientId: client.id,
      platformId: platform.id,
      currency: "USD",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2026-09-30T00:00:00.000Z"),
      primaryKpi: "impressions",
      status: "attention",
      plan: {
        create: {
          impressions: 1_000_000,
          reach: 200_000,
          clicks: 10_000,
          spend: 1_000,
          videoViews: 800_000,
          conversions: null,
        },
      },
      dailyData: {
        create: {
          date: new Date("2026-09-01T00:00:00.000Z"),
          impressions: 30_000,
          reachCumulative: 4_000,
          clicks: 300,
          spend: 10,
          videoViews: 27_000,
          conversions: null,
        },
      },
    },
  });

  console.log("Seed complete:");
  console.log(`  Client:   ${client.name} (${client.id})`);
  console.log(`  Platform: ${platform.name} (${platform.id})`);
  console.log(`  Campaign: ${campaign.name} (${campaign.id})`);
  console.log("  Daily:    2026-09-01");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
