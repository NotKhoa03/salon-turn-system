"use client";

import { useMemo, useState } from "react";
import type { TurnWithDetails } from "@/lib/hooks/use-turns";
import type { ClockInWithEmployee } from "@/lib/hooks/use-clock-ins";
import { Check, Clock, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface TurnGridProps {
  clockIns: ClockInWithEmployee[];
  turns: TurnWithDetails[];
  onCompleteTurn: (turnId: string) => void;
}

// Represents a cell which may contain 1 or 2 turns (for paired half-turns)
type CellData = {
  halfTurn?: TurnWithDetails;      // The original half-turn
  pairingTurn?: TurnWithDetails;   // The turn that completes the half
  fullTurn?: TurnWithDetails;      // A regular full turn (not paired)
};

type CellState =
  | "empty"
  | "full_in_progress"
  | "full_completed"
  | "half_in_progress"
  | "half_completed_pending"   // Waiting for pairing
  | "paired_in_progress"       // Half done, second in progress
  | "paired_completed";        // Both halves done

const FIXED_ROW_COUNT = 10;

function getCellState(cell: CellData): CellState {
  // Regular full turn (not paired)
  if (cell.fullTurn) {
    return cell.fullTurn.status === "completed" ? "full_completed" : "full_in_progress";
  }

  // Paired scenario
  if (cell.halfTurn) {
    const halfCompleted = cell.halfTurn.status === "completed";

    if (!cell.pairingTurn) {
      // Only half-turn exists
      return halfCompleted ? "half_completed_pending" : "half_in_progress";
    }

    // Both turns exist
    const pairingCompleted = cell.pairingTurn.status === "completed";
    if (halfCompleted && pairingCompleted) {
      return "paired_completed";
    }
    return "paired_in_progress";
  }

  return "empty";
}

export function TurnGrid({ clockIns, turns, onCompleteTurn }: TurnGridProps) {
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);

  // Build grid data
  const { employees, cellsByEmployeeAndNumber } = useMemo(() => {
    // Employees ordered by clock-in position
    const employees = clockIns
      .sort((a, b) => a.position - b.position)
      .map((c) => c.employee);

    // Build cell data: employee_id -> turn_number -> CellData
    const cellMap = new Map<string, Map<number, CellData>>();

    turns.forEach((turn) => {
      if (!cellMap.has(turn.employee_id)) {
        cellMap.set(turn.employee_id, new Map());
      }
      const employeeCells = cellMap.get(turn.employee_id)!;

      if (!employeeCells.has(turn.turn_number)) {
        employeeCells.set(turn.turn_number, {});
      }
      const cell = employeeCells.get(turn.turn_number)!;

      if (turn.paired_with_turn_id) {
        // This is the pairing turn (completes a half-turn)
        cell.pairingTurn = turn;
        // Also set the halfTurn if we have it
        const halfTurn = turns.find(t => t.id === turn.paired_with_turn_id);
        if (halfTurn) {
          cell.halfTurn = halfTurn;
        }
      } else if (turn.is_half_turn) {
        // This is a half-turn
        cell.halfTurn = turn;
      } else {
        // Regular full turn
        cell.fullTurn = turn;
      }
    });

    return {
      employees,
      cellsByEmployeeAndNumber: cellMap,
    };
  }, [clockIns, turns]);

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-salon p-8 h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#f7e7ce]/50 flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-[#b76e79]" />
          </div>
          <h3 className="text-xl font-semibold text-[#2d2d2d] mb-2" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
            No Technicians
          </h3>
          <p className="text-[#6b6b6b]">Clock in technicians to start tracking turns</p>
        </div>
      </div>
    );
  }

  const rowNumbers = Array.from({ length: FIXED_ROW_COUNT }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-2xl shadow-salon p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#2d2d2d]" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
            Turn History
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-[#9caf88] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-[#6b6b6b]">Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#b76e79] from-50% to-[#faf8f5] to-50%" />
              </div>
              <span className="text-[#6b6b6b]">Half</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#b76e79] from-50% to-[#9caf88] to-50%" />
                <div className="absolute top-1/2 left-1/2 w-[1px] h-[141%] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
              </div>
              <span className="text-[#6b6b6b]">Paired</span>
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="min-w-fit">
            {/* Header row */}
            <div
              className="grid gap-3 mb-4 pb-4 border-b border-[#e8e4df]"
              style={{
                gridTemplateColumns: `80px repeat(${employees.length}, minmax(100px, 1fr))`,
              }}
            >
              <div className="text-sm font-medium text-[#6b6b6b] flex items-center px-2">
                Turn
              </div>
              {employees.map((employee) => (
                <div key={employee.id} className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f5f0eb] to-[#f7e7ce]/50">
                    <div className="w-6 h-6 rounded-full bg-[#b76e79] text-white flex items-center justify-center text-xs font-medium">
                      {employee.full_name.charAt(0)}
                    </div>
                    <span className="font-medium text-[#2d2d2d] text-sm">
                      {employee.full_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="space-y-3">
              {rowNumbers.map((turnNumber) => (
                <div
                  key={turnNumber}
                  className="grid gap-3 items-center"
                  style={{
                    gridTemplateColumns: `80px repeat(${employees.length}, minmax(100px, 1fr))`,
                  }}
                >
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#b76e79] bg-[#b76e79]/10 px-3 py-1.5 rounded-lg">
                      T{turnNumber}
                    </span>
                  </div>

                  {employees.map((employee) => {
                    const cell = cellsByEmployeeAndNumber
                      .get(employee.id)
                      ?.get(turnNumber) || {};
                    const state = getCellState(cell);
                    return (
                      <TurnCell
                        key={`${employee.id}-${turnNumber}`}
                        cell={cell}
                        state={state}
                        onClick={() => {
                          if (state !== "empty") setSelectedCell(cell);
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Dialog */}
        <CellDetailDialog
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onCompleteTurn={onCompleteTurn}
        />
      </div>
    </TooltipProvider>
  );
}

function TurnCell({
  cell,
  state,
  onClick,
}: {
  cell: CellData;
  state: CellState;
  onClick: () => void;
}) {
  if (state === "empty") {
    return (
      <div className="h-14 rounded-xl border-2 border-dashed border-[#e8e4df] bg-[#faf8f5]/30" />
    );
  }

  const turn = cell.fullTurn || cell.pairingTurn || cell.halfTurn;
  if (!turn) return null;

  const tooltipContent = getTooltipContent(cell, state);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} className="turn-cell h-14 rounded-xl cursor-pointer relative overflow-hidden">
          <CellVisual state={state} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-white border border-[#e8e4df] shadow-salon-lg rounded-xl px-4 py-3"
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

function CellVisual({ state }: { state: CellState }) {
  switch (state) {
    case "full_in_progress":
      return (
        <>
          <div className="absolute inset-0 border-2 border-[#f7e7ce] rounded-xl bg-gradient-to-t from-[#f7e7ce] from-50% to-white to-50%" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:200%_100%] animate-shimmer" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#b76e79]" />
          </div>
        </>
      );

    case "full_completed":
      return (
        <div className="absolute inset-0 border-2 border-[#9caf88] rounded-xl bg-gradient-to-br from-[#9caf88] to-[#b5c4a5] flex items-center justify-center">
          <Check className="w-6 h-6 text-white drop-shadow-sm" />
        </div>
      );

    case "half_in_progress":
      return (
        <>
          <div className="absolute inset-0 border-2 border-[#f7e7ce] rounded-xl bg-gradient-to-t from-[#f7e7ce] from-50% to-white to-50%" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:200%_100%] animate-shimmer" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#b76e79]" />
          </div>
        </>
      );

    case "half_completed_pending":
      // Rose-gold left half, cream right half - waiting for pairing
      return (
        <>
          <div className="absolute inset-0 border-2 border-[#d4a5ab] rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b76e79] from-50% to-[#faf8f5] to-50%" />
            <div className="absolute top-1/2 left-1/2 w-[2px] h-[150%] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
          </div>
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <span className="text-white text-lg font-bold drop-shadow-sm">/</span>
          </div>
        </>
      );

    case "paired_in_progress":
      // Rose-gold left, shimmer on right
      return (
        <>
          <div className="absolute inset-0 border-2 border-[#d4a5ab] rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b76e79] from-50% to-[#f7e7ce] to-50%" />
            <div className="absolute top-1/2 left-1/2 w-[2px] h-[150%] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent bg-[length:200%_100%] animate-shimmer" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-white drop-shadow-sm" />
          </div>
        </>
      );

    case "paired_completed":
      // Rose-gold left + sage right (both filled) - half became full
      return (
        <>
          <div className="absolute inset-0 border-2 border-[#9caf88] rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b76e79] from-50% to-[#9caf88] to-50%" />
            <div className="absolute top-1/2 left-1/2 w-[2px] h-[150%] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
          </div>
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Check className="w-6 h-6 text-white drop-shadow-sm" />
          </div>
        </>
      );

    default:
      return null;
  }
}

function getTooltipContent(cell: CellData, state: CellState) {
  if (state === "paired_completed" || state === "paired_in_progress") {
    const half = cell.halfTurn!;
    const pair = cell.pairingTurn!;
    const totalPrice = half.service.price + pair.service.price;

    return (
      <div className="text-sm">
        <div className="font-semibold text-[#2d2d2d] mb-1">
          {half.service.name} + {pair.service.name}
        </div>
        <div className="text-[#6b6b6b]">
          ${totalPrice.toFixed(2)} • Started as half turn
        </div>
        <div className="text-[#6b6b6b] text-xs mt-1">
          {state === "paired_completed" ? "Completed" : "In Progress"}
        </div>
      </div>
    );
  }

  const turn = cell.fullTurn || cell.halfTurn;
  if (!turn) return null;

  const stateLabels: Record<CellState, string> = {
    empty: "",
    full_in_progress: "In Progress",
    full_completed: "Full Turn",
    half_in_progress: "Half Turn (In Progress)",
    half_completed_pending: "Half Turn (Waiting for pair)",
    paired_in_progress: "In Progress",
    paired_completed: "Completed",
  };

  return (
    <div className="text-sm">
      <div className="font-semibold text-[#2d2d2d] mb-1">{turn.service.name}</div>
      <div className="text-[#6b6b6b]">
        ${turn.service.price.toFixed(2)} • {stateLabels[state]}
      </div>
      <div className="text-[#6b6b6b] text-xs mt-1">
        {format(new Date(turn.started_at), "h:mm a")}
        {turn.completed_at && ` - ${format(new Date(turn.completed_at), "h:mm a")}`}
      </div>
    </div>
  );
}

function CellDetailDialog({
  cell,
  onClose,
  onCompleteTurn,
}: {
  cell: CellData | null;
  onClose: () => void;
  onCompleteTurn: (turnId: string) => void;
}) {
  if (!cell) return null;

  const state = getCellState(cell);
  const isPaired = state === "paired_completed" || state === "paired_in_progress";
  const halfTurn = cell.halfTurn;
  const pairingTurn = cell.pairingTurn;
  const fullTurn = cell.fullTurn;
  const mainTurn = fullTurn || pairingTurn || halfTurn;

  if (!mainTurn) return null;

  return (
    <Dialog open={!!cell} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
            Service Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-[#f5f0eb] rounded-xl p-4">
            <div className="text-sm text-[#6b6b6b] mb-1">Technician</div>
            <div className="font-semibold text-[#2d2d2d]">
              {mainTurn.employee.full_name}
            </div>
          </div>

          {isPaired && halfTurn && pairingTurn ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#b76e79]/10 rounded-xl p-4">
                  <div className="text-sm text-[#6b6b6b] mb-1">First Service (½)</div>
                  <div className="font-semibold text-[#2d2d2d]">{halfTurn.service.name}</div>
                  <div className="text-sm text-[#6b6b6b]">${halfTurn.service.price.toFixed(2)}</div>
                </div>
                <div className="bg-[#9caf88]/10 rounded-xl p-4">
                  <div className="text-sm text-[#6b6b6b] mb-1">Second Service</div>
                  <div className="font-semibold text-[#2d2d2d]">{pairingTurn.service.name}</div>
                  <div className="text-sm text-[#6b6b6b]">${pairingTurn.service.price.toFixed(2)}</div>
                </div>
              </div>
              <div className="bg-[#f5f0eb] rounded-xl p-4">
                <div className="text-sm text-[#6b6b6b] mb-1">Total</div>
                <div className="font-semibold text-[#2d2d2d]">
                  ${(halfTurn.service.price + pairingTurn.service.price).toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f5f0eb] rounded-xl p-4">
                <div className="text-sm text-[#6b6b6b] mb-1">Service</div>
                <div className="font-semibold text-[#2d2d2d]">{mainTurn.service.name}</div>
              </div>
              <div className="bg-[#f5f0eb] rounded-xl p-4">
                <div className="text-sm text-[#6b6b6b] mb-1">Price</div>
                <div className="font-semibold text-[#2d2d2d]">${mainTurn.service.price.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="bg-[#f5f0eb] rounded-xl p-4">
            <div className="text-sm text-[#6b6b6b] mb-1">Turn Type</div>
            <div className="font-semibold text-[#2d2d2d]">
              {isPaired
                ? "Paired (started as half)"
                : mainTurn.is_half_turn
                ? "Half Turn"
                : "Full Turn"}
            </div>
          </div>

          {/* Complete buttons for in-progress turns */}
          {state === "full_in_progress" && fullTurn && (
            <Button
              className="w-full h-12 rounded-xl bg-[#9caf88] hover:bg-[#8a9d78]"
              onClick={() => {
                onCompleteTurn(fullTurn.id);
                onClose();
              }}
            >
              <Check className="w-5 h-5 mr-2" />
              Mark as Complete
            </Button>
          )}

          {state === "half_in_progress" && halfTurn && (
            <Button
              className="w-full h-12 rounded-xl bg-[#9caf88] hover:bg-[#8a9d78]"
              onClick={() => {
                onCompleteTurn(halfTurn.id);
                onClose();
              }}
            >
              <Check className="w-5 h-5 mr-2" />
              Mark as Complete
            </Button>
          )}

          {state === "paired_in_progress" && pairingTurn && (
            <Button
              className="w-full h-12 rounded-xl bg-[#9caf88] hover:bg-[#8a9d78]"
              onClick={() => {
                onCompleteTurn(pairingTurn.id);
                onClose();
              }}
            >
              <Check className="w-5 h-5 mr-2" />
              Mark as Complete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
