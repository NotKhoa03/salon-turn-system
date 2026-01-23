"use client";

import { useMemo } from "react";
import type { ClockInWithEmployee } from "./use-clock-ins";
import type { TurnWithDetails } from "./use-turns";
import type { Employee, Service } from "@/lib/types/database";

export type QueueEmployee = {
  employee: Employee;
  clockIn: ClockInWithEmployee;
  completedTurns: number;
  halfTurnCredits: number; // 0 or 0.5 for pending half-turn
  isInProgress: boolean;
  currentTurn?: TurnWithDetails;
};

export function useQueue(
  clockIns: ClockInWithEmployee[],
  turns: TurnWithDetails[]
) {
  const queue = useMemo(() => {
    // Only use active clock-ins for the queue
    const activeClockIns = clockIns.filter((ci) => ci.isActive);

    // Build queue from clocked-in employees
    const queueMap = new Map<string, QueueEmployee>();

    activeClockIns.forEach((clockIn) => {
      queueMap.set(clockIn.employee_id, {
        employee: clockIn.employee,
        clockIn,
        completedTurns: 0,
        halfTurnCredits: 0,
        isInProgress: false,
        currentTurn: undefined,
      });
    });

    // Track which half-turns are paired
    const pairedHalfTurnIds = new Set<string>();
    turns.forEach((turn) => {
      if (turn.paired_with_turn_id) {
        pairedHalfTurnIds.add(turn.paired_with_turn_id);
      }
    });

    // Process turns to calculate credits and status
    turns.forEach((turn) => {
      const queueItem = queueMap.get(turn.employee_id);
      if (!queueItem) return;

      if (turn.status === "completed") {
        if (turn.paired_with_turn_id) {
          // This is the pairing turn - it completes a half-turn to make a full turn
          // The half-turn itself should have already been counted, so add 0.5 to make it 1
          queueItem.completedTurns += 1;
          // Remove the 0.5 credit from the half-turn
          queueItem.halfTurnCredits = 0;
        } else if (turn.is_half_turn) {
          if (pairedHalfTurnIds.has(turn.id)) {
            // This half-turn has been paired - don't count it separately
            // The pairing turn will add 1 full turn
          } else {
            // Unpaired half-turn - counts as 0.5
            queueItem.halfTurnCredits = 0.5;
          }
        } else {
          // Regular full turn
          queueItem.completedTurns += 1;
        }
      } else if (turn.status === "in_progress") {
        queueItem.isInProgress = true;
        queueItem.currentTurn = turn;
      }
    });

    // Sort by: completed turns + half credits (ascending), then position (ascending)
    const sorted = Array.from(queueMap.values()).sort((a, b) => {
      const aTotal = a.completedTurns + a.halfTurnCredits;
      const bTotal = b.completedTurns + b.halfTurnCredits;

      // First by total turns
      if (aTotal !== bTotal) {
        return aTotal - bTotal;
      }
      // Then by position (queue order)
      return a.clockIn.position - b.clockIn.position;
    });

    return sorted;
  }, [clockIns, turns]);

  const getNextEmployee = useMemo(() => {
    // Find first available (not in progress) employee
    return queue.find((q) => !q.isInProgress) || null;
  }, [queue]);

  const quickAssign = (
    serviceId: string,
    service: Service,
    assignTurn: (
      employeeId: string,
      serviceId: string,
      isHalfTurn: boolean
    ) => Promise<{ error: unknown }>
  ) => {
    const nextEmployee = getNextEmployee;
    if (!nextEmployee) return { error: "No available employees" };

    return assignTurn(
      nextEmployee.employee.id,
      serviceId,
      service.is_half_turn
    );
  };

  return { queue, getNextEmployee, quickAssign };
}
