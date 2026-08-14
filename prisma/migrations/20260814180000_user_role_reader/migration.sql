-- Additive enum values only. Existing USER/ADMIN rows are not rewritten.
-- Legacy USER remains valid and is treated as MANAGER in application code.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'READER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
