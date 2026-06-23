import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wmsutkcvdkipfznrxzxj.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc3V0a2N2ZGtpcGZ6bnJ4enhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzUxMzQsImV4cCI6MjA5NzcxMTEzNH0.QKECk6-XC6Q1u5cj9W-dAbmcTKV_eUAN_rXQorzBh_k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);