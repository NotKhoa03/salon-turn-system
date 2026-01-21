"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types/database";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setEmployees(data || []);
      setLoading(false);
    };

    fetchEmployees();
  }, [supabase]);

  return { employees, loading };
}
