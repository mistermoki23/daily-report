import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function formatYesterdayLabel(date: string): string {
  return format(new Date(date + "T00:00:00"), "d MMM", { locale: ru });
}
