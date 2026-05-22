-- Fix Bug 1: Replace the full unique constraint with a partial unique index.
-- The old @@unique([tenantId, status]) prevented having more than ONE closed
-- shift per tenant (ever). The partial index only enforces uniqueness where
-- status = 'OPEN', allowing unlimited closed shifts per tenant.

-- Drop the old full unique constraint (if it exists)
DROP INDEX IF EXISTS "only_one_open_shift_per_tenant";

-- Create a partial unique index: only one OPEN shift per tenant
CREATE UNIQUE INDEX "only_one_open_shift_per_tenant"
  ON "Shift" ("tenantId")
  WHERE status = 'OPEN';
