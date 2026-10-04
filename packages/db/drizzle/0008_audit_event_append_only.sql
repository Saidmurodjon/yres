-- audit_event is append-only (data-integrity.md): no UPDATE is ever a legitimate operation on a
-- journal row. No DELETE trigger on purpose — resetTestDb() (tests/helpers/test-db.ts) empties
-- every table with a plain DELETE between tests, and production code has no delete path onto
-- this table (A02/A12).
CREATE TRIGGER audit_event_append_only
BEFORE UPDATE ON audit_event
BEGIN
  SELECT RAISE(ABORT, 'audit_event is append-only');
END;
