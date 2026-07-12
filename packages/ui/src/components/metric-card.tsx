import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card, CardContent } from "./card";

export interface MetricCardProps {
  label: string;
  value: string;
  trend?: "up" | "down";
  trendIsGood?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  trendIsGood = true,
  icon,
  className,
}: MetricCardProps) {
  const TrendIcon = trend === "up" ? ArrowUp : ArrowDown;
  const trendColor = trendIsGood ? "text-success" : "text-destructive";

  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {trend && <TrendIcon className={cn("h-4 w-4", trendColor)} />}
          </div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
}
