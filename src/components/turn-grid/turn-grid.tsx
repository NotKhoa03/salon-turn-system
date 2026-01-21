"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TurnCell } from "./turn-cell";
import type { TurnWithDetails } from "@/lib/hooks/use-turns";
import type { ClockInWithEmployee } from "@/lib/hooks/use-clock-ins";

interface TurnGridProps {
  clockIns: ClockInWithEmployee[];
  turns: TurnWithDetails[];
  onCompleteTurn: (turnId: string) => void;
}

export function TurnGrid({ clockIns, turns, onCompleteTurn }: TurnGridProps) {
  // Build grid data
  const { employees, maxTurnNumber, turnsByEmployeeAndNumber } = useMemo(() => {
    // Employees ordered by clock-in position
    const employees = clockIns
      .sort((a, b) => a.position - b.position)
      .map((c) => c.employee);

    // Find max turn number
    const maxTurn = turns.reduce(
      (max, t) => Math.max(max, t.turn_number),
      0
    );

    // Build lookup map: employee_id -> turn_number -> turn
    const turnMap = new Map<string, Map<number, TurnWithDetails>>();
    turns.forEach((turn) => {
      if (!turnMap.has(turn.employee_id)) {
        turnMap.set(turn.employee_id, new Map());
      }
      turnMap.get(turn.employee_id)!.set(turn.turn_number, turn);
    });

    return {
      employees,
      maxTurnNumber: Math.max(maxTurn, 1),
      turnsByEmployeeAndNumber: turnMap,
    };
  }, [clockIns, turns]);

  if (employees.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Turn History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-zinc-500">
            No employees clocked in yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate row numbers (turn numbers)
  const rowNumbers = Array.from({ length: maxTurnNumber }, (_, i) => i + 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Turn History</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <div className="min-w-fit">
          {/* Header row with employee names */}
          <div
            className="grid gap-2 mb-2 sticky top-0 bg-white pb-2 border-b"
            style={{
              gridTemplateColumns: `60px repeat(${employees.length}, minmax(80px, 1fr))`,
            }}
          >
            <div className="text-sm font-medium text-zinc-500 flex items-center">
              Turn
            </div>
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="text-sm font-semibold text-center truncate px-1"
                title={employee.full_name}
              >
                {employee.full_name}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="space-y-2">
            {rowNumbers.map((turnNumber) => (
              <div
                key={turnNumber}
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `60px repeat(${employees.length}, minmax(80px, 1fr))`,
                }}
              >
                {/* Row label */}
                <div className="text-sm text-zinc-500 flex items-center justify-center font-medium">
                  T{turnNumber}
                </div>

                {/* Employee cells */}
                {employees.map((employee) => {
                  const turn = turnsByEmployeeAndNumber
                    .get(employee.id)
                    ?.get(turnNumber);
                  return (
                    <TurnCell
                      key={`${employee.id}-${turnNumber}`}
                      turn={turn}
                      onComplete={onCompleteTurn}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-zinc-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-amber-100 border-2 border-amber-400 rounded animate-pulse" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative w-4 h-4 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
                <span className="absolute -top-0.5 -right-0.5 text-green-600 text-[8px]">/</span>
              </div>
              <span>Half Turn</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
