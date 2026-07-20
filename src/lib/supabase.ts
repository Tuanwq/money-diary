import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnvError =
  !supabaseUrl || !supabaseAnonKey
    ? "Thiếu cấu hình Supabase. Hãy set VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong môi trường deploy rồi build lại."
    : "";

export const supabase = createClient(
  supabaseUrl || "https://missing-supabase-url.supabase.co",
  supabaseAnonKey || "missing-supabase-anon-key"
);
