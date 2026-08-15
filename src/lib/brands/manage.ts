import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import { mapBrand, mapClient } from "@/lib/db/mappers";
import type { Brand, Client } from "@/lib/types";

const DUPLICATE_BRAND_MESSAGE =
  "Бренд с таким названием уже существует у этого клиента.";
const BRAND_IN_USE_MESSAGE =
  "Нельзя удалить бренд, к которому привязаны кампании.";

export type BrandWithCampaignCount = Brand & {
  campaignCount: number;
};

export type ClientWithBrands = Client & {
  brands: BrandWithCampaignCount[];
  unassignedCampaignCount: number;
};

export async function listBrands(clientId?: string): Promise<Brand[]> {
  const rows = await prisma.brand.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { name: "asc" },
  });
  return rows.map(mapBrand);
}

export async function listBrandsWithCampaignCounts(
  clientId: string
): Promise<BrandWithCampaignCount[]> {
  const rows = await prisma.brand.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          campaigns: { where: { deletedAt: null } },
        },
      },
    },
  });

  return rows.map((row) => ({
    ...mapBrand(row),
    campaignCount: row._count.campaigns,
  }));
}

export async function getClientWithBrands(
  clientId: string
): Promise<ClientWithBrands | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      brands: {
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              campaigns: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });
  if (!client) return null;

  let unassignedCampaignCount = 0;
  try {
    unassignedCampaignCount = await prisma.campaign.count({
      where: { clientId, deletedAt: null, brandId: null },
    });
  } catch (error) {
    // Stale client without brandId column in DMMF — fall back to all client campaigns.
    console.error("[getClientWithBrands] unassigned count fallback", error);
    unassignedCampaignCount = await prisma.campaign.count({
      where: { clientId, deletedAt: null },
    });
  }

  return {
    ...mapClient(client),
    brands: client.brands.map((row) => ({
      ...mapBrand(row),
      campaignCount: row._count.campaigns,
    })),
    unassignedCampaignCount,
  };
}

export async function getBrand(id: string): Promise<Brand | null> {
  const row = await prisma.brand.findUnique({ where: { id } });
  return row ? mapBrand(row) : null;
}

export async function createBrand(clientId: string, name: string): Promise<Brand> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Название бренда обязательно");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Клиент не найден");

  try {
    const row = await prisma.brand.create({
      data: { clientId, name: trimmed },
    });
    return mapBrand(row);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(DUPLICATE_BRAND_MESSAGE);
    }
    throw e;
  }
}

export async function renameBrand(id: string, name: string): Promise<Brand> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Название бренда обязательно");

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw new Error("Бренд не найден");

  try {
    const row = await prisma.brand.update({
      where: { id },
      data: { name: trimmed },
    });
    return mapBrand(row);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(DUPLICATE_BRAND_MESSAGE);
    }
    throw e;
  }
}

export async function deleteBrand(id: string): Promise<void> {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw new Error("Бренд не найден");

  const inUse = await prisma.campaign.count({
    where: { brandId: id, deletedAt: null },
  });
  if (inUse > 0) {
    throw new Error(BRAND_IN_USE_MESSAGE);
  }

  // Deletes only the brand row. Campaigns stay (FK ON DELETE SET NULL).
  await prisma.brand.delete({ where: { id } });
}
