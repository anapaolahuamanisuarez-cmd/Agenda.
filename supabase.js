// ========================================
// ATEMPORAL - CONEXIÓN CON SUPABASE
// ========================================

import { createClient } from
"https://esm.sh/@supabase/supabase-js@2";

// URL DEL PROYECTO
const SUPABASE_URL =
"https://gykvuikziekfmiuuffd.supabase.co";

// CLAVE PÚBLICA
const SUPABASE_ANON_KEY =
"sb_publishable_B6ZQEJ9490Awq44_dYktvg_ZHoPlpBz";

// CREAR CONEXIÓN
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

console.log("ATEMPORAL: conexión configurada");
