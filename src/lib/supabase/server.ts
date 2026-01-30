import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import type { Database, Employee, Service } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

// Simple client for public data (no cookies needed)
function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Cached fetch for employees (5 minute cache)
export const getCachedEmployees = unstable_cache(
  async (): Promise<Employee[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    return data || [];
  },
  ["employees"],
  { revalidate: 300, tags: ["employees"] }
);

// Cached fetch for services (5 minute cache)
export const getCachedServices = unstable_cache(
  async (): Promise<Service[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    return data || [];
  },
  ["services"],
  { revalidate: 300, tags: ["services"] }
);
