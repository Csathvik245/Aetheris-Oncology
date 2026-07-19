// One-off: grants is_platform_admin (access to /admin) to the profile
// belonging to the given email. Run once per founder.
// Usage: node scripts/grant-platform-admin.mjs you@example.com
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/grant-platform-admin.mjs <email>");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: userList, error: userError } = await supabase.auth.admin.listUsers();
if (userError) {
  console.error(userError.message);
  process.exit(1);
}
const user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found with email ${email}`);
  process.exit(1);
}

const { error } = await supabase.from("profiles").update({ is_platform_admin: true }).eq("id", user.id);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Granted platform admin to ${email} (${user.id})`);
