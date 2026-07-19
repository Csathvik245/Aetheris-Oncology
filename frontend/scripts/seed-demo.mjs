// One-off seed script: upgrades the existing demo institution to Academic
// tier, creates a second Free Pilot institution, adds more faculty/resident
// accounts with backdated history_entries so dashboards/leaderboards/
// competency views look alive on first login, and publishes 2 verified
// marketplace cases.
//
// Run: node scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PASSWORD = "DemoPass1234!";

async function upsertAccount({ email, fullName, role, displayRole, institutionId }) {
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    user = data.user;
    console.log(`Created auth user ${email}`);
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      institution_id: institutionId,
      role,
      display_role: displayRole,
      full_name: fullName,
      avatar_initials: fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      onboarded_at: new Date().toISOString(),
    });
    if (error) throw new Error(`insert profile ${email}: ${error.message}`);
    console.log(`Created profile for ${fullName} (${role})`);
  }
  return user.id;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const SEED_CASES = [
  { caseId: "842", title: "Metastatic NSCLC with EGFR Resistance", difficulty: "Advanced" },
  { caseId: "melanoma-1", title: "Metastatic Melanoma", difficulty: "Advanced" },
  { caseId: "nsclc-egfr19", title: "Non-Small Cell Lung Cancer", difficulty: "Intermediate" },
  { caseId: "breast-1", title: "Invasive Ductal Carcinoma", difficulty: "Beginner" },
  { caseId: "rcc-1", title: "Clear Cell Renal Cell Carcinoma", difficulty: "Intermediate" },
];

async function backfillHistory(userId, institutionId, profile) {
  const { count } = await supabase
    .from("history_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (count && count > 0) {
    console.log(`  history already present for ${userId}, skipping backfill`);
    return;
  }

  const rows = [];
  for (let i = 0; i < profile.sessionCount; i++) {
    const c = SEED_CASES[i % SEED_CASES.length];
    const agreement = Math.max(35, Math.min(98, Math.round(profile.baseAgreement + (Math.random() - 0.5) * 20 + i * profile.trendPerSession)));
    rows.push({
      case_id: c.caseId,
      user_id: userId,
      institution_id: institutionId,
      title: c.title,
      difficulty: c.difficulty,
      agreement,
      occurred_at: daysAgo(profile.sessionCount * 3 - i * 3).toISOString(),
    });
  }
  const { error } = await supabase.from("history_entries").insert(rows);
  if (error) throw new Error(`backfill history: ${error.message}`);
  console.log(`  backfilled ${rows.length} history entries`);
}

async function publishMarketplaceCase({ id, ownerId, institutionId, title, chiefComplaint, diagnosis, genomicProfile, stage, difficulty }) {
  const { data: existing } = await supabase.from("cases").select("id").eq("id", id).maybeSingle();
  if (existing) {
    console.log(`Case ${id} already exists, skipping`);
    return;
  }
  const { error } = await supabase.from("cases").insert({
    id,
    owner_id: ownerId,
    institution_id: institutionId,
    source: "faculty_authored",
    visibility: "marketplace",
    verified: true,
    title,
    difficulty,
    est_minutes: 20,
    stage,
    tags: [],
    age: 62,
    sex: "Female",
    ecog: 1,
    chief_complaint: chiefComplaint,
    medical_history: [],
    imaging: [],
    pathology: { diagnosis, markers: [], genomicProfile },
    candidate_drugs: [],
    toxicity_concerns: [],
    clinical_pearl: null,
  });
  if (error) throw new Error(`publish case ${id}: ${error.message}`);
  console.log(`Published marketplace case: ${title}`);
}

async function main() {
  // --- Institution 1: upgrade existing demo institution to Academic ---
  const { data: demoInst } = await supabase.from("institutions").select("id").eq("name", "Aetheris Demo Medical Center").single();
  await supabase
    .from("institutions")
    .update({
      plan_tier: "academic",
      learner_seat_limit: 120,
      storage_limit_mb: 500 * 1024,
      case_gen_monthly_limit: null,
      free_pilot_started_at: null,
      free_pilot_expires_at: null,
    })
    .eq("id", demoInst.id);
  console.log(`Upgraded "Aetheris Demo Medical Center" to Academic tier`);

  // --- Institution 2: new Free Pilot institution, near expiry ---
  let riversideId;
  const { data: riverside } = await supabase.from("institutions").select("id").eq("name", "Riverside Community Residency").maybeSingle();
  if (riverside) {
    riversideId = riverside.id;
  } else {
    const started = daysAgo(42);
    const expires = new Date(started);
    expires.setDate(expires.getDate() + 45);
    const { data, error } = await supabase
      .from("institutions")
      .insert({
        name: "Riverside Community Residency",
        slug: "riverside-community-residency",
        plan_tier: "free_pilot",
        free_pilot_started_at: started.toISOString(),
        free_pilot_expires_at: expires.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`create Riverside: ${error.message}`);
    riversideId = data.id;
    console.log(`Created "Riverside Community Residency" (Free Pilot, ~3 days left)`);
  }

  // --- Aetheris Demo Medical Center: additional faculty + residents ---
  const drChenId = await upsertAccount({
    email: "dr.chen@demo.aetheris.io",
    fullName: "Dr. Amara Chen",
    role: "faculty",
    displayRole: "Attending",
    institutionId: demoInst.id,
  });

  const demoResidents = [
    { email: "maria.santos@demo.aetheris.io", fullName: "Maria Santos", displayRole: "PGY-3 Resident", sessionCount: 9, baseAgreement: 82, trendPerSession: 1.2 },
    { email: "james.okafor@demo.aetheris.io", fullName: "James Okafor", displayRole: "PGY-2 Resident", sessionCount: 6, baseAgreement: 58, trendPerSession: 2.5 },
    { email: "priya.iyer@demo.aetheris.io", fullName: "Priya Iyer", displayRole: "Fellow", sessionCount: 11, baseAgreement: 88, trendPerSession: 0.5 },
    { email: "tom.brennan@demo.aetheris.io", fullName: "Tom Brennan", displayRole: "PGY-1 Resident", sessionCount: 4, baseAgreement: 50, trendPerSession: 3 },
  ];

  for (const r of demoResidents) {
    const userId = await upsertAccount({ email: r.email, fullName: r.fullName, role: "resident", displayRole: r.displayRole, institutionId: demoInst.id });
    await backfillHistory(userId, demoInst.id, r);
  }

  // --- Riverside: 1 faculty admin + 2 residents, lighter data ---
  const riversideAdminId = await upsertAccount({
    email: "dr.patel@riverside.aetheris.io",
    fullName: "Dr. Raj Patel",
    role: "admin",
    displayRole: "Program Director",
    institutionId: riversideId,
  });

  const riversideResidents = [
    { email: "alex.kim@riverside.aetheris.io", fullName: "Alex Kim", displayRole: "PGY-1 Resident", sessionCount: 3, baseAgreement: 65, trendPerSession: 2 },
    { email: "dana.wu@riverside.aetheris.io", fullName: "Dana Wu", displayRole: "Medical Student", sessionCount: 2, baseAgreement: 55, trendPerSession: 1 },
  ];
  for (const r of riversideResidents) {
    const userId = await upsertAccount({ email: r.email, fullName: r.fullName, role: "resident", displayRole: r.displayRole, institutionId: riversideId });
    await backfillHistory(userId, riversideId, r);
  }

  // --- 2 verified marketplace cases ---
  await publishMarketplaceCase({
    id: "faculty-seed-aml-relapse",
    ownerId: drChenId,
    institutionId: demoInst.id,
    title: "Relapsed AML Post-Transplant",
    chiefComplaint: "68yo with relapsed AML 6 months post allogeneic stem cell transplant, presenting with fatigue and new peripheral blasts.",
    diagnosis: "Acute Myeloid Leukemia, post-transplant relapse",
    genomicProfile: ["FLT3-ITD", "NPM1 mutation"],
    stage: "Relapsed",
    difficulty: "Advanced",
  });

  await publishMarketplaceCase({
    id: "faculty-seed-triple-neg-breast",
    ownerId: riversideAdminId,
    institutionId: riversideId,
    title: "Triple-Negative Breast Cancer with BRCA1",
    chiefComplaint: "45yo with newly diagnosed triple-negative invasive ductal carcinoma, strong family history of breast/ovarian cancer.",
    diagnosis: "Triple-Negative Invasive Ductal Carcinoma",
    genomicProfile: ["BRCA1 germline mutation"],
    stage: "IIB",
    difficulty: "Intermediate",
  });

  console.log("\nSeed complete. Demo accounts (all password: DemoPass1234!):");
  console.log("  Aetheris Demo Medical Center (Academic):");
  console.log("    admin:   jordan.lee@demo.aetheris.io");
  console.log("    faculty: dr.chen@demo.aetheris.io");
  console.log("    residents: maria.santos / james.okafor / priya.iyer / tom.brennan @demo.aetheris.io");
  console.log("  Riverside Community Residency (Free Pilot, ~3 days left):");
  console.log("    admin:   dr.patel@riverside.aetheris.io");
  console.log("    residents: alex.kim / dana.wu @riverside.aetheris.io");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
