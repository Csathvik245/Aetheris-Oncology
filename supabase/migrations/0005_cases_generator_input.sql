-- Case Generator's full input (cancerType, metastaticSite, markers, scenario,
-- complexity, objectives) needs to round-trip through the cases table too —
-- the case library UI shows it (e.g. marker list) and the worksheet uses
-- objectiveTitles. Missed in the initial cases table (0003).

alter table public.cases add column if not exists generator_input jsonb;
