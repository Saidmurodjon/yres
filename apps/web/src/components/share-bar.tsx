import { useTranslation } from "react-i18next";

export interface ShareBarSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A single 100%-stacked horizontal bar for part-to-whole breakdowns —
 * preferred over a pie/donut per the dataviz skill (choosing-a-form.md:
 * "part-to-whole -> stacked bar"; components.md: "donut stays
 * deprioritized"). Segments are separated by a 2px surface gap rather than
 * a stroke.
 */
export function ShareBar({ segments }: { segments: ShareBarSegment[] }) {
  const { t } = useTranslation("common");
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("noDataAvailable")}</p>;
  }

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
        {segments.map((segment, index) => {
          const pct = (segment.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={segment.key}
              className="h-full"
              style={{
                width: `${pct}%`,
                backgroundColor: segment.color,
                marginLeft: index === 0 ? 0 : 2,
              }}
              title={`${segment.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium tabular-nums">
              {((segment.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
