"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Turn, Employee, Service } from "@/lib/types/database";

export type TurnWithDetails = Turn & {
  employee: Employee;
  service: Service;
};

export function useTurns(sessionId: string | null) {
  const [turns, setTurns] = useState<TurnWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTurns = useCallback(async () => {
    if (!sessionId) {
      setTurns([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("turns")
      .select(
        `
        *,
        employee:employees(*),
        service:services(*)
      `
      )
      .eq("session_id", sessionId)
      .order("turn_number", { ascending: true })
      .order("created_at", { ascending: true });

    setTurns((data as TurnWithDetails[]) || []);
    setLoading(false);
  }, [supabase, sessionId]);

  useEffect(() => {
    fetchTurns();

    if (!sessionId) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`turns_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turns",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchTurns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, fetchTurns]);

  const assignTurn = async (
    employeeId: string,
    serviceId: string,
    isHalfTurn: boolean
  ) => {
    if (!sessionId) return { error: "No session" };

    // Get next turn number
    const { data: maxTurn } = await supabase
      .from("turns")
      .select("turn_number")
      .eq("session_id", sessionId)
      .order("turn_number", { ascending: false })
      .limit(1)
      .single();

    const nextTurnNumber = (maxTurn?.turn_number || 0) + 1;

    const { error } = await supabase.from("turns").insert({
      session_id: sessionId,
      employee_id: employeeId,
      service_id: serviceId,
      turn_number: nextTurnNumber,
      is_half_turn: isHalfTurn,
      status: "in_progress",
    });

    return { error };
  };

  const completeTurn = async (turnId: string) => {
    const { error } = await supabase
      .from("turns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", turnId);

    return { error };
  };

  return { turns, loading, assignTurn, completeTurn, refetch: fetchTurns };
}
