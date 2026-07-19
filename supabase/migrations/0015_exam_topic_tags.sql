-- Board Exam Mode: topic-level filtering (beyond just cancer type +
-- difficulty) so the custom builder filters are actually specific.

alter table public.exam_questions add column if not exists topic_tags text[] not null default '{}';

-- Best-effort content-based backfill for the 48 existing questions (new
-- seed exams going forward tag topics explicitly at authoring time).
update public.exam_questions
set topic_tags = array_remove(array[
  case when stem ilike '%first-line%' or stem ilike '%treatment-naive%' or stem ilike '%newly diagnosed%' then 'first-line-therapy' end,
  case when stem ilike '%resistan%' or stem ilike '%progress%' or explanation ilike '%resistance%' then 'resistance-mechanisms' end,
  case when stem ilike '%toxicit%' or stem ilike '%adverse%' or stem ilike '%syndrome%' or stem ilike '%develops%' then 'toxicity-management' end,
  case when stem ilike '%adjuvant%' or stem ilike '%resected%' or stem ilike '%post-transplant%' then 'adjuvant-therapy' end,
  case when stem ilike '%testing%' or stem ilike '%biopsy%' or stem ilike '%NGS%' or stem ilike '%confirm%' then 'biomarker-testing' end,
  case when stem ilike '%trial%' then 'trial-eligibility' end,
  case when stem ilike '%monitor%' or stem ilike '%baseline%' then 'monitoring' end,
  case when stem ilike '%relapsed%' or stem ilike '%salvage%' or stem ilike '%second-line%' then 'salvage-therapy' end
], null)
where topic_tags = '{}';
