"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClockIn, Employee } from "@/lib/types/database";

export type ClockInWithEmployee = ClockIn & {
  employee: Employee;
  isActive: boolean;
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

    // Quick count check to avoid JOIN overhead on empty data
    const { count } = await supabase
      .from("clock_ins")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (count === 0) {
      setClockIns([]);
      setLoading(false);
      return;
    }

    // Fetch ALL clock-ins for the session (not just active ones)
    const { data } = await supabase
      .from("clock_ins")
      .select(
        `
        *,
        employee:employees(*)
      `
      )
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    // Add isActive flag based on clock_out_time
    const clockInsWithStatus = (data || []).map((ci: Record<string, unknown>) => ({
      ...ci,
      isActive: ci.clock_out_time === null,
    })) as ClockInWithEmployee[];

    setClockIns(clockInsWithStatus);
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
    if (!sessionId) return { error: "No session", clockInId: null, wasReactivation: false, previousClockOutTime: null };

    // Check if employee already has a clock-in record for this session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingClockIn } = await (supabase as any)
      .from("clock_ins")
      .select("id, clock_out_time, position")
      .eq("session_id", sessionId)
      .eq("employee_id", employeeId)
      .single() as { data: { id: string; clock_out_time: string | null; position: number } | null };

    if (existingClockIn) {
      // Re-activate: clear clock_out_time and update position
      // Position should be after all currently active workers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: maxActivePosition } = await (supabase as any)
        .from("clock_ins")
        .select("position")
        .eq("session_id", sessionId)
        .is("clock_out_time", null)
        .order("position", { ascending: false })
        .limit(1)
        .single() as { data: { position: number } | null };

      const newPosition = (maxActivePosition?.position || 0) + 1;
      const previousClockOutTime = existingClockIn.clock_out_time;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("clock_ins")
        .update({
          clock_out_time: null,
          position: newPosition
        })
        .eq("id", existingClockIn.id);

      return {
        error,
        clockInId: existingClockIn.id,
        wasReactivation: true,
        previousClockOutTime
      };
    }

    // New clock-in: get next position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: maxPosition } = await (supabase as any)
      .from("clock_ins")
      .select("position")
      .eq("session_id", sessionId)
      .order("position", { ascending: false })
      .limit(1)
      .single() as { data: { position: number } | null };

    const nextPosition = (maxPosition?.position || 0) + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("clock_ins").insert({
      session_id: sessionId,
      employee_id: employeeId,
      position: nextPosition,
    }).select("id").single();

    return {
      error,
      clockInId: data?.id || null,
      wasReactivation: false,
      previousClockOutTime: null
    };
  };

  const clockOut = async (clockInId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("clock_ins")
      .update({ clock_out_time: new Date().toISOString() })
      .eq("id", clockInId);

    return { error, clockInId };
  };

  // Helper to get only active clock-ins (for queue display)
  const activeClockIns = clockIns.filter((ci) => ci.isActive);

  return {
    clockIns,           // All clock-ins (for turn grid)
    activeClockIns,     // Only active (for queue)
    loading,
    clockIn,
    clockOut,
    refetch: fetchClockIns
  };
}
