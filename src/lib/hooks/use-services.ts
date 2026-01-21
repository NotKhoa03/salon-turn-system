"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types/database";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setServices(data || []);
      setLoading(false);
    };

    fetchServices();
  }, [supabase]);

  return { services, loading };
}
