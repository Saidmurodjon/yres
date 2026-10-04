import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yres/ui";
import type { AuditSnapshotListItem, AuditSnapshotReportLang } from "@yres/types";
import {
  CheckCircle2,
  Circle,
  Clock,
  Download,
  History,
  Loader2,
  Snowflake,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useApproveSnapshot,
  useCreateSnapshot,
  useDownloadSnapshotReport,
  useIssueSnapshotReport,
  useSnapshots,
  useSubmitSnapshot,
} from "../../hooks";
import { ApiError } from "../../lib/api";
import type { BuildingRole } from "../../lib/api-types";
import { formatDate } from "../../lib/labels";
import { ConfirmDialog } from "../confirm-dialog";

interface SnapshotsPanelProps {
  buildingId: string;
  role: BuildingRole;
}

/**
 * K24/A05b: the UI only *hides* buttons the user's `role` wouldn't be able to use — the real
 * check always lives server-side (`canWrite`/`canApprove`, building-access.ts). Never treat this
 * as the authorization boundary.
 */
function canWriteUi(role: BuildingRole): boolean {
  return role !== "viewer";
}
function canApproveUi(role: BuildingRole): boolean {
  return role === "owner";
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function StatusBadge({ status, t }: { status: AuditSnapshotListItem["status"]; t: (k: string) => string }) {
  if (status === "approved") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("snapshots.statusApproved")}
      </Badge>
    );
  }
  if (status === "submitted") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3.5 w-3.5" />
        {t("snapshots.statusSubmitted")}
      </Badge>
    );
  }
  if (status === "superseded") {
    return (
      <Badge variant="secondary" className="gap-1">
        <History className="h-3.5 w-3.5" />
        {t("snapshots.statusSuperseded")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Circle className="h-3.5 w-3.5" />
      {t("snapshots.statusDraft")}
    </Badge>
  );
}

export function SnapshotsPanel({ buildingId, role }: SnapshotsPanelProps) {
  const { t, i18n } = useTranslation("audit");
  const currentLang = i18n.language as AuditSnapshotReportLang;

  const snapshotsQuery = useSnapshots(buildingId);
  const createSnapshot = useCreateSnapshot(buildingId);
  const submitSnapshot = useSubmitSnapshot(buildingId);
  const approveSnapshot = useApproveSnapshot(buildingId);
  const issueReport = useIssueSnapshotReport(buildingId);
  const downloadReport = useDownloadSnapshotReport(buildingId);

  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const isWriter = canWriteUi(role);
  const isOwner = canApproveUi(role);
  const snapshots = snapshotsQuery.data?.snapshots ?? [];
  const hasOpenSnapshot = snapshots.some((s) => s.status === "draft" || s.status === "submitted");

  async function handleFreeze() {
    try {
      await createSnapshot.mutateAsync();
      setFreezeDialogOpen(false);
    } catch (err) {
      setRowError({ id: "freeze", message: errorMessage(err, t("snapshots.freezeFailed")) });
    }
  }

  async function handleApprove() {
    if (!approveTargetId) return;
    try {
      await approveSnapshot.mutateAsync(approveTargetId);
      setApproveTargetId(null);
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "illegal_transition"
          ? t("snapshots.staleStatus")
          : errorMessage(err, t("snapshots.approveFailed"));
      setRowError({ id: approveTargetId, message });
      setApproveTargetId(null);
    }
  }

  async function handleSubmit(snapshotId: string) {
    setRowError(null);
    try {
      await submitSnapshot.mutateAsync(snapshotId);
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === "illegal_transition"
          ? t("snapshots.staleStatus")
          : errorMessage(err, t("snapshots.submitFailed"));
      setRowError({ id: snapshotId, message });
    }
  }

  async function handleIssueReport(snapshotId: string) {
    setRowError(null);
    try {
      await issueReport.mutateAsync({ snapshotId, lang: currentLang });
    } catch (err) {
      setRowError({ id: snapshotId, message: errorMessage(err, t("snapshots.issueReportFailed")) });
    }
  }

  async function handleDownload(snapshotId: string, lang: AuditSnapshotReportLang) {
    setRowError(null);
    try {
      await downloadReport.mutateAsync({ snapshotId, lang });
    } catch (err) {
      setRowError({ id: snapshotId, message: errorMessage(err, t("snapshots.downloadFailed")) });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("snapshots.title")}</CardTitle>
          <CardDescription>{t("snapshots.description")}</CardDescription>
        </div>
        {isWriter && (
          <Button onClick={() => setFreezeDialogOpen(true)} disabled={createSnapshot.isPending}>
            {createSnapshot.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("snapshots.freezing")}
              </>
            ) : (
              <>
                <Snowflake className="h-4 w-4" />
                {t("snapshots.freeze")}
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {snapshotsQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("snapshots.loading")}</p>
        ) : snapshotsQuery.isError ? (
          <p className="py-8 text-center text-sm text-destructive">{t("snapshots.loadFailed")}</p>
        ) : snapshots.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("snapshots.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("snapshots.columnStatus")}</TableHead>
                <TableHead>{t("snapshots.columnEngineVersion")}</TableHead>
                <TableHead>{t("snapshots.columnCreatedBy")}</TableHead>
                <TableHead>{t("snapshots.columnCreatedAt")}</TableHead>
                <TableHead>{t("snapshots.columnReports")}</TableHead>
                <TableHead>{t("snapshots.columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const canIssueCurrentLang =
                  (snapshot.status === "submitted" || snapshot.status === "approved") &&
                  isWriter &&
                  !snapshot.reports.some((r) => r.lang === currentLang);
                const canSubmit = snapshot.status === "draft" && isWriter;
                const canApproveThis = snapshot.status === "submitted" && isOwner;
                const canVerify = snapshot.status === "submitted" || snapshot.status === "approved";
                const isSubmitPending = submitSnapshot.isPending && submitSnapshot.variables === snapshot.id;
                const isApprovePending =
                  approveSnapshot.isPending && approveSnapshot.variables === snapshot.id;
                const isIssuePending =
                  issueReport.isPending && issueReport.variables?.snapshotId === snapshot.id;

                return (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <StatusBadge status={snapshot.status} t={t} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{snapshot.engineVersion}</TableCell>
                    <TableCell>{snapshot.createdByName ?? t("snapshots.createdByUnknown")}</TableCell>
                    <TableCell>{formatDate(snapshot.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {snapshot.reports.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t("snapshots.noReports")}
                          </span>
                        ) : (
                          snapshot.reports.map((report) => (
                            <Button
                              key={report.lang}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(snapshot.id, report.lang)}
                              disabled={
                                downloadReport.isPending &&
                                downloadReport.variables?.snapshotId === snapshot.id &&
                                downloadReport.variables?.lang === report.lang
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                              {report.lang.toUpperCase()}
                            </Button>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {canSubmit && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSubmit(snapshot.id)}
                            disabled={isSubmitPending}
                          >
                            {isSubmitPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {t("snapshots.submit")}
                          </Button>
                        )}
                        {canApproveThis && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setApproveTargetId(snapshot.id)}
                            disabled={isApprovePending}
                          >
                            {isApprovePending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {t("snapshots.approve")}
                          </Button>
                        )}
                        {canIssueCurrentLang && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleIssueReport(snapshot.id)}
                            disabled={isIssuePending}
                          >
                            {isIssuePending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {t("snapshots.issueReport", { lang: currentLang.toUpperCase() })}
                          </Button>
                        )}
                        {canVerify && (
                          <a
                            href={`/verify/s/${snapshot.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline"
                          >
                            {t("snapshots.verifyLink")}
                          </a>
                        )}
                      </div>
                      {rowError?.id === snapshot.id && (
                        <p role="alert" className="mt-1 text-xs text-destructive">
                          ⚠ {rowError.message}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {rowError?.id === "freeze" && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            ⚠ {rowError.message}
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={freezeDialogOpen}
        title={t("snapshots.freezeDialogTitle")}
        description={
          hasOpenSnapshot
            ? t("snapshots.freezeDialogDescriptionReplace")
            : t("snapshots.freezeDialogDescription")
        }
        confirmLabel={createSnapshot.isPending ? t("snapshots.freezing") : t("snapshots.freeze")}
        pending={createSnapshot.isPending}
        onConfirm={handleFreeze}
        onCancel={() => setFreezeDialogOpen(false)}
      />

      <ConfirmDialog
        open={approveTargetId !== null}
        title={t("snapshots.approveDialogTitle")}
        description={t("snapshots.approveDialogDescription")}
        confirmLabel={approveSnapshot.isPending ? t("snapshots.approving") : t("snapshots.approve")}
        pending={approveSnapshot.isPending}
        onConfirm={handleApprove}
        onCancel={() => setApproveTargetId(null)}
      />
    </Card>
  );
}
