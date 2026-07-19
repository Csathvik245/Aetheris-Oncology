import { createServiceRoleClient } from "./supabase/server";

interface UsageRow {
  case_gen_used_this_period: number;
  case_gen_monthly_limit: number | null;
  usage_period_start: string;
}

/** Checks the caller's institution case-gen quota and increments the
 * counter if there's room. Resets the counter first if the billing period
 * (calendar month) has rolled over since the last reset — a lazy
 * check-and-reset on read, same pattern as the Free Pilot expiry check, so
 * no scheduled job is needed. Returns an error message to surface to the
 * user, or null if the generation may proceed.
 *
 * Uses the service-role client: institutions.case_gen_used_this_period is a
 * system accounting field, not something residents/faculty have direct
 * write access to under RLS (only admins can update an institution row). */
export async function checkAndIncrementCaseGenUsage(institutionId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("institutions")
    .select("case_gen_used_this_period, case_gen_monthly_limit, usage_period_start")
    .eq("id", institutionId)
    .single<UsageRow>();

  if (!data) return "Institution not found.";

  const periodStart = new Date(data.usage_period_start);
  const now = new Date();
  const periodElapsed = periodStart.getUTCFullYear() !== now.getUTCFullYear() || periodStart.getUTCMonth() !== now.getUTCMonth();

  const used = periodElapsed ? 0 : data.case_gen_used_this_period;

  if (data.case_gen_monthly_limit != null && used >= data.case_gen_monthly_limit) {
    return `Case-generation limit reached for this billing period (${data.case_gen_monthly_limit}/mo). Contact your program admin to upgrade.`;
  }

  await supabase
    .from("institutions")
    .update({
      case_gen_used_this_period: used + 1,
      usage_period_start: periodElapsed ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10) : data.usage_period_start,
    })
    .eq("id", institutionId);

  return null;
}
