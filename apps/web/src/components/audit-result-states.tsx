import { Link } from "@tanstack/react-router";
import { Button, Card, CardContent, Skeleton } from "@yres/ui";
import { AlertTriangle, ClipboardList } from "lucide-react";

/** Loading skeleton shared by the results and financial pages. */
export function AuditResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={`kpi-${index}`} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

/** Shown when GET .../audit/results 404s — no completed audit run yet. */
export function AuditNotRunEmptyState({ buildingId }: { buildingId: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No completed audit yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the audit for this building to generate results.
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link to="/buildings/$buildingId/audit" params={{ buildingId }}>
            Run audit
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function AuditErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Couldn't load audit results</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
