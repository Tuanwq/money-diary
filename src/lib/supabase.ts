import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://wmsutkcvdkipfznrxzxj.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc3V0a2N2ZGtpcGZ6bnJ4enhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzUxMzQsImV4cCI6MjA5NzcxMTEzNH0.QKECk6-XC6Q1u5cj9W-dAbmcTKV_eUAN_rXQorzBh_k";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabaseEnvError =
  !supabaseUrl || !supabaseAnonKey
    ? "Thiếu cấu hình Supabase. Hãy set VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong môi trường deploy rồi build lại."
    : "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
