import "server-only";

import * as XLSX from "xlsx-js-style";
import {
  CALCULATED_LABELS,
  KPI_LABELS,
  type CalculatedMetricType,
  type KpiType,
} from "@/lib/types";
import { sanitizeCampaignFilename } from "@/lib/campaigns/export-shared";
import {
  formatDeviation,
  formatSpendByCurrency,
  type BrandDeviation,
  type BrandMetricTotals,
  type BrandReport,
} from "@/lib/brands/report";
import { formatMoney } from "@/lib/calculations";
import type { CurrencyCode } from "@/lib/types";

function spendText(metrics: BrandMetricTotals): string {
  return formatSpendByCurrency(metrics.spendByCurrency, (value, currency) =>
    formatMoney(value, currency as CurrencyCode)
  ).replace(/\n/g, " | ");
}

function metricValue(
  kpi: KpiType,
  metrics: BrandMetricTotals
): number | string {
  if (kpi === "spend") return spendText(metrics);
  return metrics[kpi];
}

function deviationText(kpi: KpiType, deviation: BrandDeviation): string {
  if (kpi === "spend") {
    return formatDeviation(deviation.spendByCurrency.USD ?? null);
  }
  return formatDeviation(deviation[kpi]);
}

type BorderStyle = { style: "thin" | "medium"; color: { rgb: string } };
type CellStyle = {
  font?: {
    name?: string;
    sz?: number;
    bold?: boolean;
    italic?: boolean;
    color?: { rgb: string };
  };
  fill?: { patternType: "solid"; fgColor: { rgb: string } };
  alignment?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "center";
    wrapText?: boolean;
  };
  border?: {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
  };
  numFmt?: string;
};

type SheetCell = {
  v: string | number | Date;
  t?: "s" | "n" | "d" | "z";
  z?: string;
  s?: CellStyle;
};

const FONT = "Calibri";
const NAVY = "1B365D";
const NAVY_MID = "2C5282";
const WHITE = "FFFFFF";
const SLATE = "334155";
const MUTED = "64748B";
const LINE = "C5CDD6";
const PLAN_BG = "E8EEF6";
const FACT_BG = "F8FAFC";
const DIFF_BG = "F4F0E6";
const SECTION_BG = "EEF2F6";
const GREEN = "157A3A";
const RED = "C0392B";
const ZEBRA = "F4F7FA";

const thin = (rgb = LINE): BorderStyle => ({ style: "thin", color: { rgb } });
const box = {
  top: thin(),
  bottom: thin(),
  left: thin(),
  right: thin(),
};

function encode(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

function put(
  ws: XLSX.WorkSheet,
  r: number,
  c: number,
  value: string | number | Date | null,
  style: CellStyle = {},
  extra?: { numFmt?: string; type?: "s" | "n" | "d" }
) {
  const cell: SheetCell = {
    v: value == null ? "" : value,
    s: style,
  };
  if (value == null || value === "") {
    cell.t = "s";
    cell.v = "";
  } else if (extra?.type) {
    cell.t = extra.type;
  } else if (value instanceof Date) {
    cell.t = "d";
  } else if (typeof value === "number") {
    cell.t = "n";
  } else {
    cell.t = "s";
  }
  const fmt = extra?.numFmt ?? style.numFmt;
  if (fmt) {
    cell.z = fmt;
    cell.s = { ...style, numFmt: fmt };
  }
  ws[encode(r, c)] = cell;
}

function merge(ws: XLSX.WorkSheet, r1: number, c1: number, r2: number, c2: number) {
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

function finalize(
  ws: XLSX.WorkSheet,
  lastRow: number,
  lastCol: number,
  colWidths: number[],
  freeze: { ySplit: number; xSplit?: number }
) {
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastCol },
  });
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  ws["!rows"] = Array.from({ length: lastRow + 1 }, (_, i) => ({
    hpt: i === 0 ? 28 : i === 1 ? 22 : 18,
  }));
  ws["!views"] = [
    {
      state: "frozen",
      ySplit: freeze.ySplit,
      xSplit: freeze.xSplit ?? 0,
      topLeftCell: encode(freeze.ySplit, freeze.xSplit ?? 0),
      activeCell: encode(freeze.ySplit, freeze.xSplit ?? 0),
    },
  ];
}

function titleStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 16, bold: true, color: { rgb: WHITE } },
    fill: { patternType: "solid", fgColor: { rgb: NAVY } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function subtitleStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 13, bold: true, color: { rgb: WHITE } },
    fill: { patternType: "solid", fgColor: { rgb: NAVY_MID } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function labelStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 10, bold: true, color: { rgb: MUTED } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function valueStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 11, bold: true, color: { rgb: SLATE } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function sectionStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 11, bold: true, color: { rgb: NAVY } },
    fill: { patternType: "solid", fgColor: { rgb: SECTION_BG } },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function headerStyle(bg: string): CellStyle {
  return {
    font: { name: FONT, sz: 9, bold: true, color: { rgb: WHITE } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: box,
  };
}

function numberStyle(opts: {
  bg: string;
  fmt: string;
  bold?: boolean;
  color?: string;
  align?: "right" | "left" | "center";
}): CellStyle {
  return {
    font: {
      name: FONT,
      sz: 10,
      bold: opts.bold,
      color: { rgb: opts.color ?? SLATE },
    },
    fill: { patternType: "solid", fgColor: { rgb: opts.bg } },
    alignment: { horizontal: opts.align ?? "right", vertical: "center" },
    border: box,
    numFmt: opts.fmt,
  };
}

function textCellStyle(bg = WHITE, bold = false): CellStyle {
  return {
    font: { name: FONT, sz: 10, bold, color: { rgb: SLATE } },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "left", vertical: "center" },
    border: box,
  };
}

function diffColor(value: number | null): string {
  if (value == null || value === 0) return SLATE;
  return value > 0 ? GREEN : RED;
}

function kpiFmt(kpi: KpiType): string {
  return kpi === "spend" ? '#,##0.00" ₽"' : "#,##0";
}

function calcFmt(key: CalculatedMetricType): string {
  if (key === "ctr" || key === "vtr") return "0.0%";
  if (key === "frequency") return "#,##0.00";
  return '#,##0.00" ₽"';
}

function displayPeriod(start: string, end: string): string {
  const a = start.slice(0, 10).split("-").reverse().join(".");
  const b = end.slice(0, 10).split("-").reverse().join(".");
  return `${a} — ${b}`;
}

function writeMeta(
  ws: XLSX.WorkSheet,
  report: BrandReport,
  lastCol: number,
  sheetSubtitle: string
) {
  put(ws, 0, 0, "BRAND PERFORMANCE REPORT", titleStyle());
  merge(ws, 0, 0, 0, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, 0, c, "", titleStyle());

  put(ws, 1, 0, report.brand.name, subtitleStyle());
  merge(ws, 1, 0, 1, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, 1, c, "", subtitleStyle());

  put(ws, 2, 0, sheetSubtitle, {
    font: { name: FONT, sz: 10, italic: true, color: { rgb: MUTED } },
  });
  merge(ws, 2, 0, 2, lastCol);

  const meta: [string, string][] = [
    ["Client", report.client.name],
    ["Brand", report.brand.name],
    ["Period", displayPeriod(report.period.startDate, report.period.endDate)],
    ["Mode", report.mode === "weekly" ? "Weekly" : "Daily"],
    ["Campaigns", String(report.campaigns.length)],
  ];
  meta.forEach(([label, value], i) => {
    const r = 4 + i;
    put(ws, r, 0, label, labelStyle());
    put(ws, r, 1, value, valueStyle());
    merge(ws, r, 1, r, Math.min(3, lastCol));
  });
}

function buildSummarySheet(report: BrandReport): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const lastCol = 3;
  writeMeta(ws, report, lastCol, "Summary");

  let r = 10;
  put(ws, r, 0, "KPI SUMMARY", sectionStyle());
  merge(ws, r, 0, r, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, r, c, "", sectionStyle());

  r += 1;
  ["Metric", "Plan", "Fact", "Deviation"].forEach((h, c) => {
    put(
      ws,
      r,
      c,
      h,
      headerStyle(
        c === 0 ? NAVY : c === 1 ? "3D5A80" : c === 2 ? "2F6F4E" : "8A6D3B"
      )
    );
  });

  report.activeKpis.forEach((kpi, i) => {
    r += 1;
    const bg = i % 2 === 0 ? WHITE : ZEBRA;
    const fmt = kpiFmt(kpi);
    const plan = metricValue(kpi, report.plan);
    const fact = metricValue(kpi, report.fact);
    const dev = deviationText(kpi, report.deviation);
    const numericDev =
      kpi === "spend" ? null : report.deviation[kpi];

    put(ws, r, 0, KPI_LABELS[kpi], textCellStyle(bg, true));
    if (kpi === "spend") {
      put(ws, r, 1, plan, textCellStyle(PLAN_BG));
      put(ws, r, 2, fact, textCellStyle(FACT_BG, true));
      put(ws, r, 3, dev, textCellStyle(DIFF_BG, true));
    } else {
      put(ws, r, 1, plan as number, numberStyle({ bg: PLAN_BG, fmt }));
      put(ws, r, 2, fact as number, numberStyle({ bg: FACT_BG, fmt, bold: true }));
      if (numericDev == null) {
        put(ws, r, 3, "—", numberStyle({ bg: DIFF_BG, fmt: "@", align: "right" }));
      } else {
        put(
          ws,
          r,
          3,
          numericDev / 100,
          numberStyle({
            bg: DIFF_BG,
            fmt: "+0.0%;-0.0%;0.0%",
            color: diffColor(numericDev),
            bold: true,
          })
        );
      }
    }
  });

  finalize(ws, r + 1, lastCol, [28, 18, 18, 14], { ySplit: 4 });
  return ws;
}

function buildPeriodSheet(report: BrandReport): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const kpis = report.activeKpis;
  const calcKeys: CalculatedMetricType[] = ["ctr", "cpm", "cpc"];
  // Period, Label, then for each KPI: Plan / Fact / Dev, then CTR/CPM/CPC Plan+Fact
  const lastCol = 1 + kpis.length * 3 + calcKeys.length * 2;
  const sheetName = report.mode === "weekly" ? "Weekly" : "Daily";
  writeMeta(ws, report, Math.max(lastCol, 4), sheetName);

  const headerRow = 10;
  put(ws, headerRow, 0, "Period", headerStyle(NAVY));
  put(ws, headerRow, 1, "Label", headerStyle(NAVY));

  kpis.forEach((kpi, i) => {
    const base = 2 + i * 3;
    put(ws, headerRow, base, `${KPI_LABELS[kpi]} Plan`, headerStyle("3D5A80"));
    put(ws, headerRow, base + 1, `${KPI_LABELS[kpi]} Fact`, headerStyle("2F6F4E"));
    put(ws, headerRow, base + 2, `${KPI_LABELS[kpi]} Dev`, headerStyle("8A6D3B"));
  });

  calcKeys.forEach((key, i) => {
    const base = 2 + kpis.length * 3 + i * 2;
    put(ws, headerRow, base, `${CALCULATED_LABELS[key]} Plan`, headerStyle(NAVY_MID));
    put(
      ws,
      headerRow,
      base + 1,
      `${CALCULATED_LABELS[key]} Fact`,
      headerStyle(NAVY_MID)
    );
  });

  report.rows.forEach((row, i) => {
    const r = headerRow + 1 + i;
    const bg =
      row.kind === "week_total" ? SECTION_BG : i % 2 === 0 ? WHITE : ZEBRA;
    const periodLabel =
      row.kind === "week_total" || row.kind === "platform"
        ? `Week ${row.weekIndex ?? ""} (${row.start} — ${row.end})`
        : `${row.start} — ${row.end}`;
    const nameLabel =
      row.kind === "platform" ? `  ${row.label}` : row.label;
    put(ws, r, 0, periodLabel, textCellStyle(bg));
    put(ws, r, 1, nameLabel, textCellStyle(bg, row.kind !== "platform"));

    kpis.forEach((kpi, ki) => {
      const fmt = kpiFmt(kpi);
      const base = 2 + ki * 3;
      const planVal = metricValue(kpi, row.plan);
      const factVal = metricValue(kpi, row.fact);
      const dev = deviationText(kpi, row.deviation);
      const numericDev = kpi === "spend" ? null : row.deviation[kpi];

      if (kpi === "spend") {
        put(ws, r, base, planVal, textCellStyle(PLAN_BG));
        put(ws, r, base + 1, factVal, textCellStyle(FACT_BG, true));
        put(ws, r, base + 2, dev, textCellStyle(DIFF_BG, true));
      } else {
        put(ws, r, base, planVal as number, numberStyle({ bg: PLAN_BG, fmt }));
        put(
          ws,
          r,
          base + 1,
          factVal as number,
          numberStyle({ bg: FACT_BG, fmt, bold: true })
        );
        if (numericDev == null) {
          put(
            ws,
            r,
            base + 2,
            "—",
            numberStyle({ bg: DIFF_BG, fmt: "@", align: "right" })
          );
        } else {
          put(
            ws,
            r,
            base + 2,
            numericDev / 100,
            numberStyle({
              bg: DIFF_BG,
              fmt: "+0.0%;-0.0%;0.0%",
              color: diffColor(numericDev),
              bold: true,
            })
          );
        }
      }
    });

    calcKeys.forEach((key, ci) => {
      const base = 2 + kpis.length * 3 + ci * 2;
      const planVal = row.calculatedPlan[key];
      const factVal = row.calculatedFact[key];
      const fmt = calcFmt(key);
      const isPct = key === "ctr" || key === "vtr";
      if (planVal == null) {
        put(ws, r, base, "—", numberStyle({ bg, fmt: "@", align: "right" }));
      } else {
        put(
          ws,
          r,
          base,
          isPct ? planVal / 100 : planVal,
          numberStyle({ bg, fmt })
        );
      }
      if (factVal == null) {
        put(ws, r, base + 1, "—", numberStyle({ bg, fmt: "@", align: "right" }));
      } else {
        put(
          ws,
          r,
          base + 1,
          isPct ? factVal / 100 : factVal,
          numberStyle({ bg, fmt, bold: true })
        );
      }
    });
  });

  const lastRow = headerRow + Math.max(report.rows.length, 1);
  if (report.rows.length === 0) {
    put(ws, headerRow + 1, 0, "No data for selected period", textCellStyle(WHITE));
  }

  const widths = [
    28,
    18,
    ...kpis.flatMap(() => [12, 12, 10]),
    ...calcKeys.flatMap(() => [10, 10]),
  ];
  finalize(ws, lastRow, lastCol, widths, { ySplit: headerRow + 1, xSplit: 1 });
  return ws;
}

export function brandExportFilename(report: BrandReport): string {
  const start = report.period.startDate.slice(0, 10);
  const end = report.period.endDate.slice(0, 10);
  const name = sanitizeCampaignFilename(report.brand.name);
  return `Brand_${name}_${start}_${end}.xlsx`;
}

export function buildBrandWorkbook(report: BrandReport): Buffer {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Brand report — ${report.brand.name}`,
    Subject: "Campaign Monitor brand export",
    Author: "Campaign Monitor",
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(report), "Summary");
  XLSX.utils.book_append_sheet(
    wb,
    buildPeriodSheet(report),
    report.mode === "weekly" ? "Weekly" : "Daily"
  );

  const out = XLSX.write(wb, {
    bookType: "xlsx",
    type: "buffer",
    cellStyles: true,
  });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
