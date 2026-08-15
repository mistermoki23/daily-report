import "server-only";

import type { CurrencyCode } from "@/lib/types";

/**
 * Rates keyed by currency code: units of that currency per 1 USD.
 * Example: uzs: 11900 means 1 USD = 11900 UZS → USD = amount / 11900.
 */
export type UsdRateTable = Partial<Record<string, number>> & { USD: 1 };

export type FxConversionResult = {
  sourceCurrency: CurrencyCode | string;
  sourceAmount: number;
  exchangeRate: number;
  amountUsd: number;
};

type CacheEntry = {
  rates: UsdRateTable;
  fetchedAt: number;
  date: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: CacheEntry | null = null;

const PRIMARY_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json";
const FALLBACK_URL =
  "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json";

async function fetchUsdJson(url: string): Promise<{
  date?: string;
  usd?: Record<string, number>;
}> {
  const res = await fetch(url, {
    // Next.js: avoid caching stale FX overnight across deployments
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`FX API ${url} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as { date?: string; usd?: Record<string, number> };
}

/**
 * Load live USD cross-rates (no hardcoded FX). Cached in-process for 1h.
 */
export async function getUsdRates(): Promise<UsdRateTable> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  let payload: { date?: string; usd?: Record<string, number> };
  try {
    payload = await fetchUsdJson(PRIMARY_URL);
  } catch (primaryError) {
    console.error("[FX] primary rate source failed, trying fallback", primaryError);
    payload = await fetchUsdJson(FALLBACK_URL);
  }

  const raw = payload.usd;
  if (!raw || typeof raw !== "object") {
    throw new Error("FX API returned no USD rates");
  }

  const rates: UsdRateTable = { USD: 1 };
  for (const [code, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[code.toUpperCase()] = value;
    }
  }
  rates.USD = 1;

  cache = {
    rates,
    fetchedAt: Date.now(),
    date: payload.date ?? new Date().toISOString().slice(0, 10),
  };
  return rates;
}

export function getCachedFxDate(): string | null {
  return cache?.date ?? null;
}

/**
 * Convert an amount in `from` currency to USD using live rates.
 * rate = units of `from` per 1 USD → amountUsd = amount / rate.
 */
export function convertAmountToUsd(
  amount: number,
  from: CurrencyCode | string,
  rates: UsdRateTable
): FxConversionResult {
  const sourceCurrency = String(from || "USD").toUpperCase();
  if (!Number.isFinite(amount) || amount === 0) {
    return {
      sourceCurrency,
      sourceAmount: amount || 0,
      exchangeRate: 1,
      amountUsd: 0,
    };
  }
  if (sourceCurrency === "USD") {
    return {
      sourceCurrency: "USD",
      sourceAmount: amount,
      exchangeRate: 1,
      amountUsd: amount,
    };
  }

  const rate = rates[sourceCurrency];
  if (rate == null || !(rate > 0)) {
    throw new Error(
      `Нет актуального курса ${sourceCurrency}/USD. Невозможно конвертировать Spend.`
    );
  }

  return {
    sourceCurrency,
    sourceAmount: amount,
    exchangeRate: rate,
    amountUsd: amount / rate,
  };
}

export function convertToUsd(
  amount: number,
  from: CurrencyCode | string,
  rates: UsdRateTable,
  context?: { platform?: string }
): number {
  const result = convertAmountToUsd(amount, from, rates);
  console.log("[FX CONVERSION]", {
    platform: context?.platform ?? null,
    sourceCurrency: result.sourceCurrency,
    sourceAmount: result.sourceAmount,
    exchangeRate: result.exchangeRate,
    amountUSD: result.amountUsd,
  });
  return result.amountUsd;
}
