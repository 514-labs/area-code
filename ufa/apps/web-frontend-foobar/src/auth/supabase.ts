import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/env-vars";

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
