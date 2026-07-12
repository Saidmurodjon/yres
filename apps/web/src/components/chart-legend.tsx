interface ChartLegendItem {
  label: string;
  color: string;
}

/**
 * A legend is always present for two or more series (dataviz skill,
 * marks-and-anatomy.md) — this renders it with a swatch that mirrors the
 * mark (a filled circle stands in for both bar/area fills and line keys)
 * and text in the muted-foreground token, never the series color itself.
 */
export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
