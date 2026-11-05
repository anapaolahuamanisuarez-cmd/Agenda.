// ATEMPORAL — configuración de Supabase
// Reemplaza estos dos valores por los de tu proyecto:
// Supabase > Project Settings > API
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "TU-CLAVE-PUBLICA-ANON";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
