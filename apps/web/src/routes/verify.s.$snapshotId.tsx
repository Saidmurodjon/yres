import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@yres/ui";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  History,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVerifySnapshot } from "../hooks/use-audit";
import { formatDate } from "../lib/labels";

export const Route = createFileRoute("/verify/s/$snapshotId")({
  component: VerifySnapshotPage,
});

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type FileCheckResult =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "too-large" }
  | { state: "error" }
  | { state: "match"; lang: string }
  | { state: "mismatch" };

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Public, unauthenticated page (A07) the PDF report's cover-page QR code links to when the
 * report is snapshot-backed (A05/A06) — `/verify/$auditRunId` (above, in this same directory)
 * remains for reports issued before that migration. Shows only `GET /api/verify/s/:id`'s strict
 * whitelist response: no location/financial/result data, ever (security.md).
 *
 * The file-check below never uploads anything — `crypto.subtle.digest` runs entirely in the
 * browser and only the resulting hash (a handful of hex characters) is compared locally against
 * what the server already told the page. This is the "verify a PDF I'm holding" step from
 * A07-verify.md §3.
 */
function VerifySnapshotPage() {
  const { t } = useTranslation("verify");
  const { snapshotId } = Route.useParams();
  const query = useVerifySnapshot(snapshotId);
  const [copied, setCopied] = useState(false);
  const [fileCheck, setFileCheck] = useState<FileCheckResult>({ state: "idle" });

  const data = query.data?.valid ? query.data : null;

  async function handleCopyHash() {
    if (!data?.inputsSha256) return;
    try {
      await navigator.clipboard.writeText(data.inputsSha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, non-HTTPS); nothing to recover —
      // the hash is already shown as plain text for manual copy.
    }
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !data) return;

    if (file.size > MAX_FILE_BYTES) {
      setFileCheck({ state: "too-large" });
      return;
    }
    setFileCheck({ state: "checking" });
    try {
      const buffer = await file.arrayBuffer();
      const hash = await sha256Hex(buffer);
      const match = data.reports?.find((report) => report.sha256 === hash);
      setFileCheck(match ? { state: "match", lang: match.lang } : { state: "mismatch" });
    } catch {
      setFileCheck({ state: "error" });
    }
  }

  function statusBadge() {
    if (!data) return null;
    if (data.status === "approved") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("snapshot.statusApproved")}
        </Badge>
      );
    }
    if (data.status === "submitted") {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3.5 w-3.5" />
          {t("snapshot.statusSubmitted")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <History className="h-3.5 w-3.5" />
        {t("snapshot.statusSuperseded")}
      </Badge>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("snapshot.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 break-words">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("checking")}
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {statusBadge()}
                <CardDescription>
                  {t("snapshot.buildingLine", { buildingName: data.buildingName })}
                </CardDescription>
                {data.status === "approved" && data.approvedAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t("snapshot.approvedAt", { date: formatDate(data.approvedAt) })}
                  </p>
                ) : null}
                {data.status === "submitted" ? (
                  <p className="text-xs text-muted-foreground">{t("snapshot.submittedNote")}</p>
                ) : null}
                {data.status === "superseded" && data.supersededAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t("snapshot.supersededAt", { date: formatDate(data.supersededAt) })}
                  </p>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("snapshot.engineVersion")}: <span className="font-mono">{data.engineVersion}</span>
                </p>
                <p>
                  {t("snapshot.methodologyVersion")}:{" "}
                  <span className="font-mono">{data.methodologyVersion}</span>
                </p>
                <p>{t("snapshot.generatedAt", { date: formatDate(data.generatedAt) })}</p>
                <div className="flex items-center gap-2 break-all">
                  <span>
                    {t("snapshot.inputsHash")}:{" "}
                    <span className="font-mono">{data.inputsSha256?.slice(0, 16)}…</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-6 px-2"
                    onClick={handleCopyHash}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("snapshot.fileCheckTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("snapshot.fileCheckDisclaimer")}</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  {t("snapshot.fileCheckSelect")}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
                {fileCheck.state === "checking" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("checking")}
                  </div>
                ) : null}
                {fileCheck.state === "too-large" ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {t("snapshot.fileTooLarge")}
                  </div>
                ) : null}
                {fileCheck.state === "error" ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {t("snapshot.fileCheckError")}
                  </div>
                ) : null}
                {fileCheck.state === "match" ? (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("snapshot.fileMatch", { lang: fileCheck.lang.toUpperCase() })}
                  </div>
                ) : null}
                {fileCheck.state === "mismatch" ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    {t("snapshot.fileMismatch")}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">{t("invalidTitle")}</p>
              </div>
              <CardDescription>{t("snapshot.invalidDescription")}</CardDescription>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("snapshot.disclaimer")}</p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">{t("backToHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
