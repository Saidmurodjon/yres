import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface ChartTooltipProps extends TooltipProps<ValueType, NameType> {
  formatValue?: (value: number) => string;
}

/**
 * Shared Recharts tooltip content, styled with the design system's popover
 * tokens (so it adapts to dark mode, unlike Recharts' default inline-styled
 * tooltip) and following the dataviz skill's tooltip contract: the value
 * leads (bold, high contrast), the series name is secondary, and each row
 * is keyed with a short stroke of the series color rather than a filled box.
 */
export function ChartTooltip({ active, payload, label, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const format = formatValue ?? ((value: number) => value.toLocaleString());

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && label !== null && (
        <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const numericValue = typeof entry.value === "number" ? entry.value : Number(entry.value);
          return (
            <div
              key={`${entry.dataKey?.toString() ?? entry.name?.toString() ?? index}`}
              className="flex items-center gap-2"
            >
              <span
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-semibold tabular-nums">
                {Number.isNaN(numericValue) ? String(entry.value) : format(numericValue)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
