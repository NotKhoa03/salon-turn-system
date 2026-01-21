"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClockIn, Employee } from "@/lib/types/database";

export type ClockInWithEmployee = ClockIn & {
  employee: Employee;
};

export function useClockIns(sessionId: string | null) {
  const [clockIns, setClockIns] = useState<ClockInWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchClockIns = useCallback(async () => {
    if (!sessionId) {
      setClockIns([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("clock_ins")
      .select(
        `
        *,
        employee:employees(*)
      `
      )
      .eq("session_id", sessionId)
      .is("clock_out_time", null)
      .order("position", { ascending: true });

    setClockIns((data as ClockInWithEmployee[]) || []);
    setLoading(false);
  }, [supabase, sessionId]);

  useEffect(() => {
    fetchClockIns();

    if (!sessionId) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`clock_ins_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clock_ins",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchClockIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, fetchClockIns]);

  const clockIn = async (employeeId: string) => {
    if (!sessionId) return { error: "No session" };

    // Get next position
    const { data: maxPosition } = await supabase
      .from("clock_ins")
      .select("position")
      .eq("session_id", sessionId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position || 0) + 1;

    const { error } = await supabase.from("clock_ins").insert({
      session_id: sessionId,
      employee_id: employeeId,
      position: nextPosition,
    });

    return { error };
  };

  const clockOut = async (clockInId: string) => {
    const { error } = await supabase
      .from("clock_ins")
      .update({ clock_out_time: new Date().toISOString() })
      .eq("id", clockInId);

    return { error };
  };

  return { clockIns, loading, clockIn, clockOut, refetch: fetchClockIns };
}
