import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client anonyme pour les pages publiques. Contrairement à `server.ts`, il ne
 * lit pas les cookies : `cookies()` rendrait la route dynamique et annulerait
 * le `revalidate` (ISR) des pages publiques. Il ne voit donc que ce que les
 * RPC `security definer` exposent à `anon`.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
