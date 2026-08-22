-- Migration: UserShift.templateId uuid → text
--
-- Template row ids became user-prefixed strings (`nithesh_tpl1`) in
-- 20260714150000_user_prefixed_ids, but this FK-ish column was left as
-- uuid — every shift saved from a template failed with
-- `invalid input syntax for type uuid` (22P02).
--
-- No FK constraint exists on this column, so a plain type widening is
-- safe; legacy uuid values remain valid text.

ALTER TABLE "user_shifts"
  ALTER COLUMN "templateId" TYPE TEXT USING "templateId"::text;
