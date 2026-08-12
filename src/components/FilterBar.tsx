"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, Platform } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";
import type { CampaignStatus } from "@/lib/config/pacing";
import { STATUS_LABELS } from "@/lib/config/pacing";

export type FilterState = {
  clientId: string;
  platformId: string;
  month: string;
  status: string;
  search: string;
  currency: string;
};

export function FilterBar({
  clients,
  platforms,
  value,
  onChange,
  showCurrency = true,
}: {
  clients: Client[];
  platforms: Platform[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  showCurrency?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        placeholder="Search..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="h-8 w-[160px] border-slate-200 text-sm"
      />
      <Select
        value={value.clientId || "__all__"}
        onValueChange={(v) =>
          onChange({ ...value, clientId: !v || v === "__all__" ? "" : v })
        }
      >
        <SelectTrigger className="h-8 w-[140px] border-slate-200 text-sm">
          <SelectValue>
            {value.clientId
              ? clients.find((c) => c.id === value.clientId)?.name ?? "Client"
              : "Все клиенты"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Все клиенты</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.platformId || "__all__"}
        onValueChange={(v) =>
          onChange({ ...value, platformId: !v || v === "__all__" ? "" : v })
        }
      >
        <SelectTrigger className="h-8 w-[140px] border-slate-200 text-sm">
          <SelectValue>
            {value.platformId
              ? platforms.find((p) => p.id === value.platformId)?.name ?? "Platform"
              : "Все площадки"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Все площадки</SelectItem>
          {platforms.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="month"
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        className="h-8 w-[140px] border-slate-200 text-sm"
        title="Period"
      />
      <Select
        value={value.status || "__all__"}
        onValueChange={(v) =>
          onChange({ ...value, status: !v || v === "__all__" ? "" : v })
        }
      >
        <SelectTrigger className="h-8 w-[130px] border-slate-200 text-sm">
          <SelectValue>
            {value.status
              ? STATUS_LABELS[value.status as CampaignStatus] ?? "Status"
              : "Все статусы"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Все статусы</SelectItem>
          {(Object.keys(STATUS_LABELS) as CampaignStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCurrency ? (
        <Select
          value={value.currency || "__all__"}
          onValueChange={(v) =>
            onChange({ ...value, currency: !v || v === "__all__" ? "" : v })
          }
        >
          <SelectTrigger className="h-8 w-[120px] border-slate-200 text-sm">
            <SelectValue>
              {value.currency
                ? CURRENCIES.find((c) => c.code === value.currency)?.label ?? "Currency"
                : "Все валюты"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все валюты</SelectItem>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
