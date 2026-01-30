"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types/database";
import logger from "@/lib/logger";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      logger.time('services', 'Fetch services');

      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      logger.timeEnd('services', `${data?.length || 0} services`);
      setServices(data || []);
      setLoading(false);
    };

    fetchServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { services, loading };
}
