"use client";

import { useMemo } from "react";
import type { ClockInWithEmployee } from "./use-clock-ins";
import type { TurnWithDetails } from "./use-turns";
import type { Employee, Service } from "@/lib/types/database";

export type QueueEmployee = {
  employee: Employee;
  clockIn: ClockInWithEmployee;
  completedTurns: number;
  halfTurnCredits: number;
  isInProgress: boolean;
  currentTurn?: TurnWithDetails;
};

export function useQueue(
  clockIns: ClockInWithEmployee[],
  turns: TurnWithDetails[]
) {
  const queue = useMemo(() => {
    // Build queue from clocked-in employees
    const queueMap = new Map<string, QueueEmployee>();

    clockIns.forEach((clockIn) => {
      queueMap.set(clockIn.employee_id, {
        employee: clockIn.employee,
        clockIn,
        completedTurns: 0,
        halfTurnCredits: 0,
        isInProgress: false,
        currentTurn: undefined,
      });
    });

    // Process turns to calculate credits and status
    turns.forEach((turn) => {
      const queueItem = queueMap.get(turn.employee_id);
      if (!queueItem) return;

      if (turn.status === "completed") {
        if (turn.is_half_turn) {
          queueItem.halfTurnCredits += 0.5;
        } else {
          queueItem.completedTurns += 1;
        }
      } else if (turn.status === "in_progress") {
        queueItem.isInProgress = true;
        queueItem.currentTurn = turn;
      }
    });

    // Convert half turn credits to full turns
    queueMap.forEach((item) => {
      const fullTurnsFromHalf = Math.floor(item.halfTurnCredits);
      item.completedTurns += fullTurnsFromHalf;
      item.halfTurnCredits = item.halfTurnCredits - fullTurnsFromHalf;
    });

    // Sort by: completed turns (ascending), then clock-in time (ascending)
    const sorted = Array.from(queueMap.values()).sort((a, b) => {
      // First by completed turns
      if (a.completedTurns !== b.completedTurns) {
        return a.completedTurns - b.completedTurns;
      }
      // Then by clock-in time
      return (
        new Date(a.clockIn.clock_in_time).getTime() -
        new Date(b.clockIn.clock_in_time).getTime()
      );
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
