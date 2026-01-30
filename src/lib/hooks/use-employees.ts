"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types/database";
import logger from "@/lib/logger";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEmployees = async () => {
      logger.time('employees', 'Fetch employees');

      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      logger.timeEnd('employees', `${data?.length || 0} employees`);
      setEmployees(data || []);
      setLoading(false);
    };

    fetchEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { employees, loading };
}
