"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClockIn, Employee } from "@/lib/types/database";
import logger from "@/lib/logger";

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

    logger.time('clock_ins', 'Fetch clock-ins');

    // Quick count check to avoid JOIN overhead on empty data
    const { count } = await supabase
      .from("clock_ins")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (count === 0) {
      logger.timeEnd('clock_ins', '0 clock-ins (skipped JOIN)');
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

    const activeCount = clockInsWithStatus.filter(c => c.isActive).length;
    logger.timeEnd('clock_ins', `${data?.length || 0} total, ${activeCount} active`);
    setClockIns(clockInsWithStatus);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    fetchClockIns();

    if (!sessionId) return;

    // Subscribe to real-time updates
    logger.info(`Subscribing to clock_ins realtime for session ${sessionId}`, undefined, 'REALTIME');
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
        (payload) => {
          logger.realtime(payload.eventType, 'clock_ins', payload);
          fetchClockIns();
        }
      )
      .subscribe((status) => {
        logger.info(`Clock-ins subscription status: ${status}`, undefined, 'REALTIME');
      });

    return () => {
      logger.info(`Unsubscribing from clock_ins realtime`, undefined, 'REALTIME');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, fetchClockIns]);

  const clockIn = async (employeeId: string, employee?: Employee) => {
    if (!sessionId) return { error: "No session", clockInId: null, wasReactivation: false, previousClockOutTime: null };

    // Check if this is a reactivation (employee already clocked in before)
    const existingRecord = clockIns.find(c => c.employee_id === employeeId);

    if (existingRecord && !existingRecord.isActive) {
      // OPTIMISTIC: Reactivate - set isActive immediately
      const optimisticPosition = Math.max(...clockIns.filter(c => c.isActive).map(c => c.position), 0) + 1;
      setClockIns(prev => prev.map(c =>
        c.employee_id === employeeId
          ? { ...c, isActive: true, clock_out_time: null, position: optimisticPosition }
          : c
      ));

      // Send to server
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
      const previousClockOutTime = existingRecord.clock_out_time;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("clock_ins")
        .update({
          clock_out_time: null,
          position: newPosition
        })
        .eq("id", existingRecord.id);

      if (error) {
        // Rollback optimistic update
        setClockIns(prev => prev.map(c =>
          c.employee_id === employeeId
            ? { ...c, isActive: false, clock_out_time: previousClockOutTime, position: existingRecord.position }
            : c
        ));
        return { error, clockInId: null, wasReactivation: true, previousClockOutTime };
      }

      return {
        error: null,
        clockInId: existingRecord.id,
        wasReactivation: true,
        previousClockOutTime
      };
    }

    // New clock-in
    const tempId = `temp-${Date.now()}`;
    const optimisticPosition = Math.max(...clockIns.map(c => c.position), 0) + 1;

    // OPTIMISTIC: Add new clock-in immediately if we have employee data
    if (employee) {
      const optimisticClockIn: ClockInWithEmployee = {
        id: tempId,
        session_id: sessionId,
        employee_id: employeeId,
        clock_in_time: new Date().toISOString(),
        clock_out_time: null,
        position: optimisticPosition,
        employee: employee,
        isActive: true,
      };
      setClockIns(prev => [...prev, optimisticClockIn]);
    }

    // Send to server
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

    if (error) {
      // Rollback optimistic update
      if (employee) {
        setClockIns(prev => prev.filter(c => c.id !== tempId));
      }
      return { error, clockInId: null, wasReactivation: false, previousClockOutTime: null };
    }

    // Update temp ID with real ID (realtime will sync the rest)
    if (employee) {
      setClockIns(prev => prev.map(c =>
        c.id === tempId ? { ...c, id: data.id, position: nextPosition } : c
      ));
    }

    return {
      error: null,
      clockInId: data?.id || null,
      wasReactivation: false,
      previousClockOutTime: null
    };
  };

  const clockOut = async (clockInId: string) => {
    // OPTIMISTIC: Set isActive to false immediately
    const clockInRecord = clockIns.find(c => c.id === clockInId);
    const clockOutTime = new Date().toISOString();

    setClockIns(prev => prev.map(c =>
      c.id === clockInId
        ? { ...c, isActive: false, clock_out_time: clockOutTime }
        : c
    ));

    // Send to server
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("clock_ins")
      .update({ clock_out_time: clockOutTime })
      .eq("id", clockInId);

    if (error) {
      // Rollback optimistic update
      setClockIns(prev => prev.map(c =>
        c.id === clockInId
          ? { ...c, isActive: true, clock_out_time: clockInRecord?.clock_out_time || null }
          : c
      ));
    }

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
