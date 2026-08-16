import type { CampaignSummary } from "@/lib/types";

export const CAMPAIGN_TABLE_COLUMN_IDS = [
  "campaign",
  "client",
  "brand",
  "platform",
  "period",
  "days",
  "impressions",
  "reach",
  "clicks",
  "spend",
  "progress",
  "pacing",
  "launch",
  "reporting",
  "status",
] as const;

export type CampaignTableColumnId = (typeof CAMPAIGN_TABLE_COLUMN_IDS)[number];

export type ColumnSortKind = "text" | "number" | "date";

export type SortDirection = "asc" | "desc";

export type CampaignTableSort = {
  column: CampaignTableColumnId;
  direction: SortDirection;
};

export type CampaignTableColumnDef = {
  id: CampaignTableColumnId;
  label: string;
  required?: boolean;
  align?: "left" | "right" | "center";
  sortKind: ColumnSortKind;
  /** Short hint shown near sort indicator */
  sortHintAsc: string;
  sortHintDesc: string;
};

export const CAMPAIGN_TABLE_COLUMNS: CampaignTableColumnDef[] = [
  {
    id: "campaign",
    label: "Campaign",
    required: true,
    sortKind: "text",
    sortHintAsc: "A→Z",
    sortHintDesc: "Z→A",
  },
  {
    id: "client",
    label: "Client",
    sortKind: "text",
    sortHintAsc: "A→Z",
    sortHintDesc: "Z→A",
  },
  {
    id: "brand",
    label: "Brand",
    sortKind: "text",
    sortHintAsc: "A→Z",
    sortHintDesc: "Z→A",
  },
  {
    id: "platform",
    label: "Platform",
    sortKind: "text",
    sortHintAsc: "A→Z",
    sortHintDesc: "Z→A",
  },
  {
    id: "period",
    label: "Period",
    sortKind: "date",
    sortHintAsc: "старые→новые",
    sortHintDesc: "новые→старые",
  },
  {
    id: "days",
    label: "Days",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "impressions",
    label: "Impressions",
    align: "right",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "reach",
    label: "Reach",
    align: "right",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "clicks",
    label: "Clicks",
    align: "right",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "spend",
    label: "Spend",
    align: "right",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "progress",
    label: "Progress",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "pacing",
    label: "Pacing",
    align: "right",
    sortKind: "number",
    sortHintAsc: "возр.",
    sortHintDesc: "убыв.",
  },
  {
    id: "launch",
    label: "Запуск",
    align: "center",
    sortKind: "number",
    sortHintAsc: "нет→есть",
    sortHintDesc: "есть→нет",
  },
  {
    id: "reporting",
    label: "Отчётность",
    align: "center",
    sortKind: "number",
    sortHintAsc: "нет→есть",
    sortHintDesc: "есть→нет",
  },
  {
    id: "status",
    label: "Status",
    sortKind: "text",
    sortHintAsc: "A→Z",
    sortHintDesc: "Z→A",
  },
];

export const DEFAULT_COLUMN_ORDER: CampaignTableColumnId[] = [
  ...CAMPAIGN_TABLE_COLUMN_IDS,
];

export const DEFAULT_VISIBLE_COLUMNS: CampaignTableColumnId[] = [
  ...CAMPAIGN_TABLE_COLUMN_IDS,
];

export const DEFAULT_SORT: CampaignTableSort = {
  column: "campaign",
  direction: "asc",
};

export type CampaignTablePrefs = {
  columnOrder: CampaignTableColumnId[];
  visibleColumns: CampaignTableColumnId[];
  sort: CampaignTableSort;
};

export function getColumnDef(
  id: CampaignTableColumnId
): CampaignTableColumnDef {
  return (
    CAMPAIGN_TABLE_COLUMNS.find((c) => c.id === id) ?? CAMPAIGN_TABLE_COLUMNS[0]
  );
}

function isColumnId(value: string): value is CampaignTableColumnId {
  return (CAMPAIGN_TABLE_COLUMN_IDS as readonly string[]).includes(value);
}

/** Normalize prefs from storage; Campaign always visible and present in order. */
export function normalizeCampaignTablePrefs(
  raw: Partial<CampaignTablePrefs> | null | undefined
): CampaignTablePrefs {
  const orderFromRaw = Array.isArray(raw?.columnOrder)
    ? raw!.columnOrder.filter(isColumnId)
    : [];
  const seen = new Set<CampaignTableColumnId>();
  const columnOrder: CampaignTableColumnId[] = [];
  for (const id of orderFromRaw) {
    if (seen.has(id)) continue;
    seen.add(id);
    columnOrder.push(id);
  }
  for (const id of DEFAULT_COLUMN_ORDER) {
    if (seen.has(id)) continue;
    seen.add(id);
    columnOrder.push(id);
  }
  // Keep required campaign first among required — still allow user reorder of others,
  // but campaign must remain in the list (can be moved? User said Campaign is mandatory
  // column for display, not necessarily pinned first. Allow reorder but always visible.)
  if (!columnOrder.includes("campaign")) {
    columnOrder.unshift("campaign");
  }

  const visibleRaw = Array.isArray(raw?.visibleColumns)
    ? raw!.visibleColumns.filter(isColumnId)
    : [...DEFAULT_VISIBLE_COLUMNS];
  const visibleSet = new Set(visibleRaw);
  visibleSet.add("campaign");
  const visibleColumns = columnOrder.filter((id) => visibleSet.has(id));
  if (!visibleColumns.includes("campaign")) {
    visibleColumns.unshift("campaign");
  }

  const sortColumn =
    raw?.sort?.column && isColumnId(raw.sort.column)
      ? raw.sort.column
      : DEFAULT_SORT.column;
  const sortDirection =
    raw?.sort?.direction === "desc" || raw?.sort?.direction === "asc"
      ? raw.sort.direction
      : DEFAULT_SORT.direction;

  return {
    columnOrder,
    visibleColumns,
    sort: { column: sortColumn, direction: sortDirection },
  };
}

function brandName(row: CampaignSummary): string {
  return row.campaign.brand?.name?.trim() || "Без бренда";
}

function daysFactValue(row: CampaignSummary): number {
  const [fact] = row.daysLabel.split("/");
  const n = Number(fact);
  return Number.isFinite(n) ? n : 0;
}

function sortValue(
  row: CampaignSummary,
  column: CampaignTableColumnId
): string | number | null {
  switch (column) {
    case "campaign":
      return row.campaign.name.toLocaleLowerCase("ru");
    case "client":
      return row.campaign.client.name.toLocaleLowerCase("ru");
    case "brand":
      return brandName(row).toLocaleLowerCase("ru");
    case "platform":
      return row.campaign.platform.name.toLocaleLowerCase("ru");
    case "period":
      return row.campaign.start_date.slice(0, 10);
    case "days":
      return daysFactValue(row);
    case "impressions":
      return row.factByKpi.impressions ?? null;
    case "reach":
      return row.factByKpi.reach ?? null;
    case "clicks":
      return row.factByKpi.clicks ?? null;
    case "spend":
      return row.factByKpi.spend ?? null;
    case "progress":
      return row.metrics?.progress ?? null;
    case "pacing":
      return row.metrics?.pacing ?? null;
    case "launch":
      return row.screenshotStatus?.launch ? 1 : 0;
    case "reporting":
      return row.screenshotStatus?.reporting ? 1 : 0;
    case "status":
      return row.status;
    default:
      return null;
  }
}

function compareNullable(
  a: string | number | null,
  b: string | number | null,
  direction: SortDirection
): number {
  const emptyA = a == null || a === "";
  const emptyB = b == null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), "ru", {
      numeric: true,
      sensitivity: "base",
    });
  }
  return direction === "asc" ? cmp : -cmp;
}

/**
 * Sort the full campaign list (call before any client-side pagination).
 */
export function sortCampaignSummaries(
  campaigns: CampaignSummary[],
  sort: CampaignTableSort
): CampaignSummary[] {
  const sorted = [...campaigns];
  sorted.sort((a, b) => {
    const cmp = compareNullable(
      sortValue(a, sort.column),
      sortValue(b, sort.column),
      sort.direction
    );
    if (cmp !== 0) return cmp;
    return a.campaign.name.localeCompare(b.campaign.name, "ru");
  });
  return sorted;
}

export function toggleSortDirection(
  current: CampaignTableSort,
  column: CampaignTableColumnId
): CampaignTableSort {
  if (current.column !== column) {
    return { column, direction: "asc" };
  }
  return {
    column,
    direction: current.direction === "asc" ? "desc" : "asc",
  };
}

export function prefsStorageKey(userId: string): string {
  return `campaign-monitor:table-prefs:v1:${userId}`;
}
