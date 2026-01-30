"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Turn, Employee, Service } from "@/lib/types/database";
import logger from "@/lib/logger";

export type TurnWithDetails = Turn & {
  employee: Employee;
  service: Service;
  paired_with_turn_id?: string | null;
  // For paired turns, we'll include the paired turn's details
  pairedTurn?: TurnWithDetails | null;
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

    logger.time('turns', 'Fetch turns');

    // First, do a quick count check to avoid heavy JOINs on empty data
    const { count } = await supabase
      .from("turns")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    // If no turns exist, skip the expensive JOIN query
    if (count === 0) {
      logger.timeEnd('turns', '0 turns (skipped JOIN)');
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

    // Build a map of turns by ID for pairing lookup
    const turnsById = new Map<string, TurnWithDetails>();
    (data || []).forEach((turn: Record<string, unknown>) => {
      turnsById.set(turn.id as string, turn as TurnWithDetails);
    });

    // Link paired turns
    const turnsWithPairing = (data || []).map((turn: Record<string, unknown>) => {
      const t = turn as TurnWithDetails;
      if (t.paired_with_turn_id) {
        t.pairedTurn = turnsById.get(t.paired_with_turn_id) || null;
      }
      return t;
    });

    const inProgressCount = turnsWithPairing.filter((t: TurnWithDetails) => t.status === 'in_progress').length;
    logger.timeEnd('turns', `${data?.length || 0} total, ${inProgressCount} in progress`);
    setTurns(turnsWithPairing);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    fetchTurns();

    if (!sessionId) return;

    // Subscribe to real-time updates
    logger.info(`Subscribing to turns realtime for session ${sessionId}`, undefined, 'REALTIME');
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
        (payload) => {
          logger.realtime(payload.eventType, 'turns', payload);
          fetchTurns();
        }
      )
      .subscribe((status) => {
        logger.info(`Turns subscription status: ${status}`, undefined, 'REALTIME');
      });

    return () => {
      logger.info(`Unsubscribing from turns realtime`, undefined, 'REALTIME');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, fetchTurns]);

  const assignTurn = async (
    employeeId: string,
    serviceId: string,
    isHalfTurn: boolean
  ) => {
    if (!sessionId) return { error: "No session", turnId: null };

    // Check if employee has a completed half-turn that hasn't been paired yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingHalfTurn } = await (supabase as any)
      .from("turns")
      .select("id, turn_number")
      .eq("session_id", sessionId)
      .eq("employee_id", employeeId)
      .eq("is_half_turn", true)
      .eq("status", "completed")
      .is("paired_with_turn_id", null)
      .order("turn_number", { ascending: false })
      .limit(1)
      .single() as { data: { id: string; turn_number: number } | null };

    // Also check there's no turn already paired WITH this half-turn
    let actualPendingHalfTurn = pendingHalfTurn;
    if (pendingHalfTurn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingPair } = await (supabase as any)
        .from("turns")
        .select("id")
        .eq("paired_with_turn_id", pendingHalfTurn.id)
        .limit(1)
        .single() as { data: { id: string } | null };

      if (existingPair) {
        // Already paired, so this isn't actually pending
        actualPendingHalfTurn = null;
      }
    }

    let turnNumber: number;
    let pairedWithTurnId: string | null = null;

    if (actualPendingHalfTurn) {
      // Pair with the existing half-turn - use same turn number
      turnNumber = actualPendingHalfTurn.turn_number;
      pairedWithTurnId = actualPendingHalfTurn.id;
    } else {
      // Get next turn number for this employee
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: employeeTurns } = await (supabase as any)
        .from("turns")
        .select("turn_number")
        .eq("session_id", sessionId)
        .eq("employee_id", employeeId)
        .order("turn_number", { ascending: false })
        .limit(1)
        .single() as { data: { turn_number: number } | null };

      turnNumber = (employeeTurns?.turn_number || 0) + 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("turns").insert({
      session_id: sessionId,
      employee_id: employeeId,
      service_id: serviceId,
      turn_number: turnNumber,
      is_half_turn: isHalfTurn,
      status: "in_progress",
      paired_with_turn_id: pairedWithTurnId,
    }).select("id").single();

    return { error, turnId: data?.id || null };
  };

  const completeTurn = async (turnId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
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
