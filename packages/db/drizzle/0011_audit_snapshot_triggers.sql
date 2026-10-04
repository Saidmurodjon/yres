-- audit_snapshot is immutable (ADR-004, data-integrity.md): the frozen result of an audit run
-- never changes after insert. Only `status` and the approval-workflow columns
-- (submitted/approved/superseded) are allowed to move, and only through the status-flow trigger
-- below — every other column is blocked here.
CREATE TRIGGER audit_snapshot_frozen
BEFORE UPDATE OF building_id, engine_version, methodology_version, build_sha, generated_at,
  inputs_r2_key, inputs_sha256, result_r2_key, result_sha256, context_r2_key, context_sha256,
  summary, created_by_user_id, created_at ON audit_snapshot
BEGIN
  SELECT RAISE(ABORT, 'audit_snapshot is immutable');
END;
--> statement-breakpoint
-- Only four transitions are legal: draft->submitted, draft->superseded, submitted->approved,
-- submitted->superseded, approved->superseded. This also closes A05b's concurrent-approval race
-- atomically — two parallel "approve" writes on the same draft/submitted row can't both succeed,
-- since the second one's OLD.status no longer matches what it expected.
CREATE TRIGGER audit_snapshot_status_flow
BEFORE UPDATE OF status ON audit_snapshot
WHEN NOT (
  (OLD.status = 'draft' AND NEW.status IN ('submitted', 'superseded'))
  OR (OLD.status = 'submitted' AND NEW.status IN ('approved', 'superseded'))
  OR (OLD.status = 'approved' AND NEW.status = 'superseded')
)
BEGIN
  SELECT RAISE(ABORT, 'illegal snapshot status transition');
END;
--> statement-breakpoint
-- audit_snapshot_report rows are write-once (one PDF per snapshot x lang) — no column is ever
-- legitimately updated after insert, so every UPDATE is blocked.
CREATE TRIGGER audit_snapshot_report_frozen
BEFORE UPDATE ON audit_snapshot_report
BEGIN
  SELECT RAISE(ABORT, 'audit_snapshot_report is immutable');
END;
