/** Sentinel for campaigns with brandId IS NULL (filter UI / query params). */
export const BRAND_FILTER_NONE = "__none__";

export const UNASSIGNED_BRAND_LABEL = "Без бренда";
export const ALL_BRANDS_LABEL = "Все бренды";

/**
 * Normalize brand filter from query/UI.
 * - empty / "__all__" → no brand filter (include null brandId)
 * - "__none__" → only brandId IS NULL
 * - otherwise → concrete brand id
 */
export function normalizeBrandFilter(
  brandId: string | null | undefined
): { kind: "all" } | { kind: "none" } | { kind: "brand"; brandId: string } {
  const raw = (brandId ?? "").trim();
  if (!raw || raw === "__all__" || raw === "all") return { kind: "all" };
  if (raw === BRAND_FILTER_NONE || raw === "none") return { kind: "none" };
  return { kind: "brand", brandId: raw };
}

/** Prisma `where` fragment for optional brand filter. Omit when "all". */
export function brandIdPrismaWhere(
  brandId: string | null | undefined
): { brandId: string } | { brandId: null } | Record<string, never> {
  const filter = normalizeBrandFilter(brandId);
  if (filter.kind === "all") return {};
  if (filter.kind === "none") return { brandId: null };
  return { brandId: filter.brandId };
}

export function matchesBrandFilter(
  campaignBrandId: string | null | undefined,
  brandId: string | null | undefined
): boolean {
  const filter = normalizeBrandFilter(brandId);
  if (filter.kind === "all") return true;
  if (filter.kind === "none") return campaignBrandId == null;
  return campaignBrandId === filter.brandId;
}

export function brandDisplayName(
  brand: { name: string } | null | undefined
): string {
  return brand?.name?.trim() ? brand.name : UNASSIGNED_BRAND_LABEL;
}
