import "server-only";

import * as XLSX from "xlsx-js-style";
import { parseDate } from "@/lib/calculations";
import { CALCULATED_LABELS, getCurrency, type CalculatedMetricType, type CurrencyCode, type KpiType } from "@/lib/types";
import { EXPORT_KPI_LABELS, type CampaignExportModel } from "@/lib/campaigns/export-model";

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
const TOTAL_BG = "D9E2EC";
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

function moneyFmt(currency: CurrencyCode): string {
  switch (currency) {
    case "USD":
      return '"$"#,##0.00';
    case "EUR":
      return '"€"#,##0.00';
    case "GBP":
      return '"£"#,##0.00';
    case "RUB":
      return '#,##0.00" ₽"';
    case "KZT":
      return '#,##0.00" ₸"';
    case "UZS":
      return '#,##0.00" сум"';
    default:
      return '"$"#,##0.00';
  }
}

function kpiNumFmt(kpi: KpiType, currency: CurrencyCode): string {
  return kpi === "spend" ? moneyFmt(currency) : "#,##0";
}

function calcNumFmt(key: CalculatedMetricType, currency: CurrencyCode): string {
  if (key === "ctr" || key === "vtr") return "0.0%";
  if (key === "frequency") return "#,##0.00";
  return moneyFmt(currency);
}

function toExcelDate(iso: string): Date {
  return parseDate(iso);
}

function displayPeriod(start: string, end: string): string {
  const a = start.slice(0, 10).split("-").reverse().join(".");
  const b = end.slice(0, 10).split("-").reverse().join(".");
  return `${a} — ${b}`;
}

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
  ws["!margins"] = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
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

function diffColor(value: number | null, lowerIsBetter = false): string {
  if (value == null || value === 0) return SLATE;
  const better = lowerIsBetter ? value < 0 : value > 0;
  return better ? GREEN : RED;
}

function writeMetaBlock(
  ws: XLSX.WorkSheet,
  model: CampaignExportModel,
  lastCol: number,
  sheetSubtitle: string
) {
  const currency = getCurrency(model.currency);
  put(ws, 0, 0, "MEDIA PERFORMANCE REPORT", titleStyle());
  merge(ws, 0, 0, 0, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, 0, c, "", titleStyle());

  put(ws, 1, 0, model.campaignName, subtitleStyle());
  merge(ws, 1, 0, 1, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, 1, c, "", subtitleStyle());

  put(ws, 2, 0, sheetSubtitle, {
    font: { name: FONT, sz: 10, italic: true, color: { rgb: MUTED } },
  });
  merge(ws, 2, 0, 2, lastCol);

  const meta: [string, string][] = [
    ["Campaign", model.campaignName],
    ["Client", model.clientName],
    ["Platform", model.platformName],
    ["Currency", `${currency.code} — ${currency.symbol}`],
    ["Campaign period", displayPeriod(model.campaignStart, model.campaignEnd)],
    ["Selected export period", displayPeriod(model.exportStart, model.exportEnd)],
  ];
  meta.forEach(([label, value], i) => {
    const r = 4 + i;
    put(ws, r, 0, label, labelStyle());
    put(ws, r, 1, value, valueStyle());
    merge(ws, r, 1, r, Math.min(3, lastCol));
  });
}

function buildSummarySheet(model: CampaignExportModel): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const lastCol = 4;
  writeMetaBlock(ws, model, lastCol, "Summary");

  let r = 11;
  put(ws, r, 0, "KPI SUMMARY", sectionStyle());
  merge(ws, r, 0, r, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, r, c, "", sectionStyle());

  r += 1;
  const kpiHeaders = ["Metric", "Plan", "Fact", "Difference", "Pacing"];
  kpiHeaders.forEach((h, c) => {
    put(ws, r, c, h, headerStyle(c === 0 ? NAVY : c === 1 ? "3D5A80" : c === 2 ? "2F6F4E" : c === 3 ? "8A6D3B" : NAVY_MID));
  });

  model.kpiRows.forEach((row, i) => {
    r += 1;
    const bg = i % 2 === 0 ? WHITE : ZEBRA;
    const fmt = kpiNumFmt(row.kpi, model.currency);
    put(ws, r, 0, row.label, textCellStyle(bg, true));
    put(ws, r, 1, row.plan, numberStyle({ bg: PLAN_BG, fmt }));
    if (row.fact == null) {
      put(ws, r, 2, "—", numberStyle({ bg: FACT_BG, fmt: "@", align: "right" }));
      put(ws, r, 3, "—", numberStyle({ bg: DIFF_BG, fmt: "@", align: "right" }));
    } else {
      put(ws, r, 2, row.fact, numberStyle({ bg: FACT_BG, fmt, bold: true }));
      put(
        ws,
        r,
        3,
        row.difference ?? 0,
        numberStyle({
          bg: DIFF_BG,
          fmt,
          color: diffColor(row.difference),
          bold: true,
        })
      );
    }
    if (row.pacing == null) {
      put(ws, r, 4, "—", numberStyle({ bg, fmt: "@", align: "right" }));
    } else {
      put(
        ws,
        r,
        4,
        row.pacing / 100,
        numberStyle({ bg, fmt: "0.0%", bold: true })
      );
    }
  });

  r += 2;
  put(ws, r, 0, "CALCULATED METRICS", sectionStyle());
  merge(ws, r, 0, r, 3);
  for (let c = 1; c <= 3; c++) put(ws, r, c, "", sectionStyle());

  r += 1;
  ["Metric", "Plan", "Fact", "Difference"].forEach((h, c) => {
    put(ws, r, c, h, headerStyle(c === 0 ? NAVY : c === 1 ? "3D5A80" : c === 2 ? "2F6F4E" : "8A6D3B"));
  });

  model.calculated.forEach((row, i) => {
    r += 1;
    const bg = i % 2 === 0 ? WHITE : ZEBRA;
    const fmt = calcNumFmt(row.key, model.currency);
    const isPct = row.key === "ctr" || row.key === "vtr";
    put(ws, r, 0, CALCULATED_LABELS[row.key], textCellStyle(bg, true));
    const writeCalc = (col: number, value: number | null, fill: string, color?: string) => {
      if (value == null) {
        put(ws, r, col, "—", numberStyle({ bg: fill, fmt: "@", align: "right" }));
        return;
      }
      put(
        ws,
        r,
        col,
        isPct ? value / 100 : value,
        numberStyle({ bg: fill, fmt, bold: col !== 1, color })
      );
    };
    writeCalc(1, row.plan, PLAN_BG);
    writeCalc(2, row.fact, FACT_BG);
    writeCalc(3, row.difference, DIFF_BG, diffColor(row.difference, row.lowerIsBetter));
  });

  r += 2;
  put(ws, r, 0, "Plan / Fact / Difference use the same calculation engine as Campaign Details.", {
    font: { name: FONT, sz: 8, italic: true, color: { rgb: MUTED } },
  });
  merge(ws, r, 0, r, lastCol);

  finalize(ws, r, lastCol, [28, 18, 18, 16, 12], { ySplit: 4 });
  return ws;
}

function dailyHeader(kpi: KpiType, kind: "Plan" | "Fact" | "Difference"): string {
  return `${EXPORT_KPI_LABELS[kpi]} ${kind}`;
}

function buildDailySheet(model: CampaignExportModel): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const kpis = model.selectedKpis;
  const lastCol = kpis.length * 3;
  writeMetaBlock(ws, model, Math.max(lastCol, 4), "Daily Data");

  const headerRow = 11;
  put(ws, headerRow, 0, "Date", headerStyle(NAVY));
  kpis.forEach((kpi, i) => {
    const base = 1 + i * 3;
    put(ws, headerRow, base, dailyHeader(kpi, "Plan"), headerStyle("3D5A80"));
    put(ws, headerRow, base + 1, dailyHeader(kpi, "Fact"), headerStyle("2F6F4E"));
    put(ws, headerRow, base + 2, dailyHeader(kpi, "Difference"), headerStyle("8A6D3B"));
  });

  model.dailyRows.forEach((row, i) => {
    const r = headerRow + 1 + i;
    const bg = i % 2 === 0 ? WHITE : ZEBRA;
    put(ws, r, 0, toExcelDate(row.date), {
      ...textCellStyle(bg),
      alignment: { horizontal: "center", vertical: "center" },
      numFmt: "dd.mm.yyyy",
    }, { type: "d", numFmt: "dd.mm.yyyy" });

    kpis.forEach((kpi, ki) => {
      const cell = row.values[kpi];
      const fmt = kpiNumFmt(kpi, model.currency);
      const base = 1 + ki * 3;
      put(ws, r, base, cell.plan, numberStyle({ bg: PLAN_BG, fmt }));
      if (cell.fact == null) {
        put(ws, r, base + 1, "", numberStyle({ bg: FACT_BG, fmt }));
        put(ws, r, base + 2, "", numberStyle({ bg: DIFF_BG, fmt }));
      } else {
        put(ws, r, base + 1, cell.fact, numberStyle({ bg: FACT_BG, fmt, bold: true }));
        put(
          ws,
          r,
          base + 2,
          cell.difference ?? 0,
          numberStyle({
            bg: DIFF_BG,
            fmt,
            color: diffColor(cell.difference),
            bold: true,
          })
        );
      }
    });
  });

  const totalRow = headerRow + 1 + model.dailyRows.length;
  put(ws, totalRow, 0, "TOTAL", textCellStyle(TOTAL_BG, true));
  kpis.forEach((kpi, ki) => {
    const cell = model.dailyTotal[kpi];
    const fmt = kpiNumFmt(kpi, model.currency);
    const base = 1 + ki * 3;
    put(ws, totalRow, base, cell.plan, numberStyle({ bg: TOTAL_BG, fmt, bold: true }));
    if (cell.fact == null) {
      put(ws, totalRow, base + 1, "—", numberStyle({ bg: TOTAL_BG, fmt: "@", bold: true }));
      put(ws, totalRow, base + 2, "—", numberStyle({ bg: TOTAL_BG, fmt: "@", bold: true }));
    } else {
      put(ws, totalRow, base + 1, cell.fact, numberStyle({ bg: TOTAL_BG, fmt, bold: true }));
      put(
        ws,
        totalRow,
        base + 2,
        cell.difference ?? 0,
        numberStyle({
          bg: TOTAL_BG,
          fmt,
          bold: true,
          color: diffColor(cell.difference),
        })
      );
    }
  });

  const dataStart = headerRow;
  const dataEnd = totalRow;
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: dataStart, c: 0 },
      e: { r: dataEnd, c: lastCol },
    }),
  };

  const widths = [14, ...kpis.flatMap(() => [16, 16, 16])];
  finalize(ws, totalRow, lastCol, widths, { ySplit: headerRow + 1, xSplit: 1 });
  return ws;
}

function buildCalculatedSheet(model: CampaignExportModel): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const lastCol = 3;
  writeMetaBlock(ws, model, lastCol, "Calculated Metrics");

  const headerRow = 11;
  put(ws, headerRow, 0, "CALCULATED METRICS", sectionStyle());
  merge(ws, headerRow, 0, headerRow, lastCol);
  for (let c = 1; c <= lastCol; c++) put(ws, headerRow, c, "", sectionStyle());

  const tableHeader = headerRow + 1;
  ["Metric", "Plan", "Fact", "Difference"].forEach((h, c) => {
    put(ws, tableHeader, c, h, headerStyle(c === 0 ? NAVY : c === 1 ? "3D5A80" : c === 2 ? "2F6F4E" : "8A6D3B"));
  });

  model.calculated.forEach((row, i) => {
    const r = tableHeader + 1 + i;
    const bg = i % 2 === 0 ? WHITE : ZEBRA;
    const fmt = calcNumFmt(row.key, model.currency);
    const isPct = row.key === "ctr" || row.key === "vtr";
    put(ws, r, 0, CALCULATED_LABELS[row.key], textCellStyle(bg, true));
    const writeCalc = (col: number, value: number | null, fill: string, color?: string) => {
      if (value == null) {
        put(ws, r, col, "—", numberStyle({ bg: fill, fmt: "@", align: "right" }));
        return;
      }
      put(
        ws,
        r,
        col,
        isPct ? value / 100 : value,
        numberStyle({ bg: fill, fmt, bold: col !== 1, color })
      );
    };
    writeCalc(1, row.plan, PLAN_BG);
    writeCalc(2, row.fact, FACT_BG);
    writeCalc(3, row.difference, DIFF_BG, diffColor(row.difference, row.lowerIsBetter));
  });

  const lastRow = tableHeader + Math.max(model.calculated.length, 1);
  if (model.calculated.length === 0) {
    put(ws, tableHeader + 1, 0, "No calculated metrics for the selected KPIs", textCellStyle(WHITE));
    merge(ws, tableHeader + 1, 0, tableHeader + 1, lastCol);
  }

  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: tableHeader, c: 0 },
      e: { r: lastRow, c: lastCol },
    }),
  };

  finalize(ws, lastRow + 1, lastCol, [22, 16, 16, 16], { ySplit: tableHeader + 1 });
  return ws;
}

export function buildCampaignWorkbook(model: CampaignExportModel): Buffer {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Media report — ${model.campaignName}`,
    Subject: "Campaign Monitor export",
    Author: "Campaign Monitor",
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(model), "Summary");
  XLSX.utils.book_append_sheet(wb, buildDailySheet(model), "Daily Data");
  XLSX.utils.book_append_sheet(wb, buildCalculatedSheet(model), "Calculated Metrics");

  const out = XLSX.write(wb, {
    bookType: "xlsx",
    type: "buffer",
    cellStyles: true,
  });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
