import { Link, createFileRoute } from "@tanstack/react-router";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@yres/ui";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVerifyAuditRun } from "../hooks/use-audit";
import { formatDate } from "../lib/labels";

export const Route = createFileRoute("/verify/$auditRunId")({
  component: VerifyReportPage,
});

/**
 * Public, unauthenticated page the PDF report's cover-page QR code links to
 * (docs/report-redesign-proposal.md §8) — deliberately outside `_authenticated`
 * so anyone with a printed/downloaded report can confirm its authenticity
 * without logging in. Shows only what `GET /api/verify/:id` returns
 * (building name + completion date) — never location/financial/technical
 * detail, since this route has no access control beyond the URL's UUID.
 */
function VerifyReportPage() {
  const { t } = useTranslation("verify");
  const { auditRunId } = Route.useParams();
  const query = useVerifyAuditRun(auditRunId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("checking")}
            </div>
          ) : query.data?.valid ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">{t("validTitle")}</p>
              </div>
              <CardDescription>
                {t("validDescription", {
                  buildingName: query.data.buildingName,
                  date: query.data.completedAt ? formatDate(query.data.completedAt) : "",
                })}
              </CardDescription>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">{t("invalidTitle")}</p>
              </div>
              <CardDescription>{t("invalidDescription")}</CardDescription>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">{t("backToHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
