import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
function validUrl(value: string | undefined) {
  try {
    return !!value && ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export const configured = Boolean(
  url &&
  key &&
  validUrl(url) &&
  !url.includes("your-project") &&
  key !== "your-publishable-key",
);
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
export function db() {
  if (!supabase) throw new Error("Configure Supabase first. See README.md.");
  return supabase;
}
