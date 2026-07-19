// One-off: wipes all auth users (cascades to profiles + all their case/
// practice data), all institutions, and all pilot codes/requests. Leaves
// seeded exam/case content and plan_seat_caps config untouched.
// Usage: node scripts/reset-db.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log("Listing auth users...");
const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}
console.log(`Found ${userList.users.length} auth users.`);

for (const u of userList.users) {
  const { error } = await supabase.auth.admin.deleteUser(u.id);
  if (error) {
    console.error(`Failed to delete ${u.email}:`, error.message);
  } else {
    console.log(`Deleted ${u.email} (${u.id})`);
  }
}

console.log("Deleting all institutions...");
const { error: instErr, count: instCount } = await supabase
  .from("institutions")
  .delete({ count: "exact" })
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (instErr) console.error("institutions delete failed:", instErr.message);
else console.log(`Deleted ${instCount} institutions.`);

console.log("Deleting all pilot_codes...");
const { error: codeErr, count: codeCount } = await supabase
  .from("pilot_codes")
  .delete({ count: "exact" })
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (codeErr) console.error("pilot_codes delete failed:", codeErr.message);
else console.log(`Deleted ${codeCount} pilot codes.`);

console.log("Deleting all pilot_requests...");
const { error: reqErr, count: reqCount } = await supabase
  .from("pilot_requests")
  .delete({ count: "exact" })
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (reqErr) console.error("pilot_requests delete failed:", reqErr.message);
else console.log(`Deleted ${reqCount} pilot requests.`);

console.log("Done.");
