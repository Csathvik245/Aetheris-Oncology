-- Phase 5: Case Variations — "branch this case" (older patient, new mutation,
-- pregnancy, renal failure, brain mets, trial closes). Reuses the `cases`
-- table (same shape, same usePacket/getGeneratedCase read path) instead of a
-- parallel table, since a variation is just another practicable case that
-- happens to remember what it branched from.

alter table public.cases drop constraint if exists cases_source_check;
alter table public.cases add constraint cases_source_check
  check (source in ('synthetic', 'faculty_authored', 'vcf_upload', 'variation'));

alter table public.cases add column if not exists base_case_id text;
alter table public.cases add column if not exists variation_type text;
