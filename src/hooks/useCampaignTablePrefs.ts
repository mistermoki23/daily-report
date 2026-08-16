"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeCampaignTablePrefs,
  prefsStorageKey,
  type CampaignTablePrefs,
  type CampaignTableColumnId,
  type CampaignTableSort,
  DEFAULT_SORT,
} from "@/lib/campaigns/table-columns";

function readPrefs(userId: string): CampaignTablePrefs {
  if (typeof window === "undefined") {
    return normalizeCampaignTablePrefs(null);
  }
  try {
    const raw = window.localStorage.getItem(prefsStorageKey(userId));
    if (!raw) return normalizeCampaignTablePrefs(null);
    return normalizeCampaignTablePrefs(JSON.parse(raw) as Partial<CampaignTablePrefs>);
  } catch {
    return normalizeCampaignTablePrefs(null);
  }
}

function writePrefs(userId: string, prefs: CampaignTablePrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      prefsStorageKey(userId),
      JSON.stringify(normalizeCampaignTablePrefs(prefs))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function useCampaignTablePrefs(userId: string | null | undefined) {
  const [prefs, setPrefsState] = useState<CampaignTablePrefs>(() =>
    normalizeCampaignTablePrefs(null)
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPrefsState(normalizeCampaignTablePrefs(null));
      setReady(true);
      return;
    }
    setPrefsState(readPrefs(userId));
    setReady(true);
  }, [userId]);

  const setPrefs = useCallback(
    (updater: CampaignTablePrefs | ((prev: CampaignTablePrefs) => CampaignTablePrefs)) => {
      setPrefsState((prev) => {
        const next = normalizeCampaignTablePrefs(
          typeof updater === "function" ? updater(prev) : updater
        );
        if (userId) writePrefs(userId, next);
        return next;
      });
    },
    [userId]
  );

  const setSort = useCallback(
    (sort: CampaignTableSort) => {
      setPrefs((prev) => ({ ...prev, sort }));
    },
    [setPrefs]
  );

  const setColumnOrder = useCallback(
    (columnOrder: CampaignTableColumnId[]) => {
      setPrefs((prev) => ({ ...prev, columnOrder }));
    },
    [setPrefs]
  );

  const setVisibleColumns = useCallback(
    (visibleColumns: CampaignTableColumnId[]) => {
      setPrefs((prev) => ({ ...prev, visibleColumns }));
    },
    [setPrefs]
  );

  const resetPrefs = useCallback(() => {
    setPrefs(normalizeCampaignTablePrefs(null));
  }, [setPrefs]);

  return {
    prefs,
    ready,
    setPrefs,
    setSort,
    setColumnOrder,
    setVisibleColumns,
    resetPrefs,
    sort: prefs.sort ?? DEFAULT_SORT,
  };
}
