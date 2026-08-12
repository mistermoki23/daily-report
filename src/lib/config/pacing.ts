/**
 * Configurable pacing thresholds for campaign status.
 * Change these values to adjust when campaigns become Attention / Critical.
 */
export const PACING_THRESHOLDS = {
  /** Pacing >= this → ON TRACK */
  onTrack: 95,
  /** Pacing >= this and < onTrack → ATTENTION; below → CRITICAL */
  attention: 80,
} as const;

export type CampaignStatus =
  | "on_track"
  | "attention"
  | "critical"
  | "completed";

export function statusFromPacing(
  pacing: number | null,
  isCompleted: boolean
): CampaignStatus {
  if (isCompleted) return "completed";
  if (pacing === null || Number.isNaN(pacing)) return "attention";
  if (pacing >= PACING_THRESHOLDS.onTrack) return "on_track";
  if (pacing >= PACING_THRESHOLDS.attention) return "attention";
  return "critical";
}

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  on_track: "On track",
  attention: "Attention",
  critical: "Critical",
  completed: "Completed",
};

export const STATUS_LABELS_RU: Record<CampaignStatus, string> = {
  on_track: "По плану",
  attention: "Внимание",
  critical: "Критично",
  completed: "Завершена",
};
