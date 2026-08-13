#!/usr/bin/env tsx
/**
 * Promote an existing user to ADMIN.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com npx tsx scripts/promote-admin.ts
 *   npx tsx scripts/promote-admin.ts --email=you@example.com
 *
 * Never exposes ADMIN via public /register.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseEmail(): string {
  const arg = process.argv.find((a) => a.startsWith("--email="));
  const fromArg = arg?.slice("--email=".length).trim();
  const fromEnv = process.env.ADMIN_EMAIL?.trim();
  const email = (fromArg || fromEnv || "").toLowerCase();
  if (!email || !email.includes("@")) {
    console.error(
      "Provide ADMIN_EMAIL env or --email=user@example.com for an existing account."
    );
    process.exit(1);
  }
  return email;
}

async function main() {
  const email = parseEmail();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  if (user.role === "ADMIN") {
    console.log(`Already ADMIN: ${email}`);
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  console.log(`Promoted to ADMIN: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
