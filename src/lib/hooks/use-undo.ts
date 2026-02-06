"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type UndoActionType =
  | "assign_turn"
  | "complete_turn"
  | "clock_in"
  | "clock_out";

export interface UndoAction {
  id: string;
  type: UndoActionType;
  description: string;
  timestamp: number;
  data: Record<string, unknown>;
}

const STORAGE_KEY_PREFIX = "undo_history_";

// Get storage key for a session
function getStorageKey(sessionId: string | null): string {
  return `${STORAGE_KEY_PREFIX}${sessionId || "no_session"}`;
}

// Load history from localStorage
function loadHistory(sessionId: string | null): UndoAction[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getStorageKey(sessionId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save history to localStorage
function saveHistory(sessionId: string | null, history: UndoAction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(sessionId), JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
}

// Clear history from localStorage
function clearStoredHistory(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(sessionId));
  } catch {
    // Ignore errors
  }
}

interface UseUndoOptions {
  sessionId: string | null;
  onUndoComplete?: () => void; // Called after successful undo to refresh UI
}

export function useUndo(options: UseUndoOptions | string | null = null) {
  // Support both old signature (just sessionId) and new signature (options object)
  const sessionId = typeof options === 'object' && options !== null ? options.sessionId : options;
  const onUndoComplete = typeof options === 'object' && options !== null ? options.onUndoComplete : undefined;

  const [history, setHistory] = useState<UndoAction[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null); // Action ID being undone
  const historyRef = useRef<UndoAction[]>([]);
  const supabase = createClient();
  const sessionIdRef = useRef(sessionId);
  const onUndoCompleteRef = useRef(onUndoComplete);

  // Keep callback ref updated
  useEffect(() => {
    onUndoCompleteRef.current = onUndoComplete;
  }, [onUndoComplete]);

  // Load history from localStorage on mount and when session changes
  useEffect(() => {
    const loaded = loadHistory(sessionId);
    setHistory(loaded);
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Keep historyRef in sync and persist to localStorage
  useEffect(() => {
    historyRef.current = history;
    if (sessionIdRef.current !== null) {
      saveHistory(sessionIdRef.current, history);
    }
  }, [history]);

  // Remove an action from history
  const removeAction = useCallback((actionId: string) => {
    setHistory((prev) => prev.filter((a) => a.id !== actionId));
  }, []);

  // Add action to history (no timeout, no limit)
  const addAction = useCallback(
    (action: Omit<UndoAction, "id" | "timestamp">) => {
      const id = crypto.randomUUID();
      const newAction: UndoAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };

      setHistory((prev) => [newAction, ...prev]);

      return id;
    },
    []
  );

  // Clear all history (called when session changes)
  const clearHistory = useCallback(() => {
    setHistory([]);
    clearStoredHistory(sessionIdRef.current);
  }, []);

  // Check if an employee has active turns (for clock-in dependency)
  const checkClockInDependencies = useCallback(
    async (employeeId: string): Promise<{ hasTurns: boolean; turnCount: number }> => {
      if (!sessionIdRef.current) return { hasTurns: false, turnCount: 0 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("turns")
        .select("id")
        .eq("session_id", sessionIdRef.current)
        .eq("employee_id", employeeId)
        .eq("status", "in_progress");

      if (error) return { hasTurns: false, turnCount: 0 };
      return { hasTurns: data.length > 0, turnCount: data.length };
    },
    []
  );

  // Undo turn assignment (delete the turn)
  const undoAssignTurn = useCallback(
    async (turnId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("turns").delete().eq("id", turnId);

      if (error) {
        return { error, message: "Failed to undo turn assignment" };
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Undo turn completion (set back to in_progress)
  const undoCompleteTurn = useCallback(
    async (turnId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("turns")
        .update({
          status: "in_progress",
          completed_at: null,
        })
        .eq("id", turnId);

      if (error) {
        return { error, message: "Failed to undo turn completion" };
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Undo clock-in (clock out the employee)
  const undoClockIn = useCallback(
    async (clockInId: string, wasReactivation: boolean, previousClockOutTime: string | null, employeeId: string) => {
      // Check for active turns first
      const { hasTurns, turnCount } = await checkClockInDependencies(employeeId);
      if (hasTurns) {
        return {
          error: "DEPENDENCY_ERROR",
          message: `Can't undo clock-in — employee has ${turnCount} active turn${turnCount > 1 ? 's' : ''}. Undo those first.`
        };
      }

      if (wasReactivation && previousClockOutTime) {
        // If it was a reactivation, restore the previous clock_out_time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("clock_ins")
          .update({ clock_out_time: previousClockOutTime })
          .eq("id", clockInId);

        if (error) {
          return { error, message: "Failed to undo clock-in" };
        }
      } else {
        // If it was a new clock-in, delete the record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("clock_ins")
          .delete()
          .eq("id", clockInId);

        if (error) {
          return { error, message: "Failed to undo clock-in" };
        }
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkClockInDependencies]
  );

  // Undo clock-out (clock back in - clear clock_out_time)
  const undoClockOut = useCallback(
    async (clockInId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("clock_ins")
        .update({ clock_out_time: null })
        .eq("id", clockInId);

      if (error) {
        return { error, message: "Failed to undo clock-out" };
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Perform undo for a specific action (uses ref to avoid stale closure)
  const performUndo = useCallback(
    async (actionId: string) => {
      const action = historyRef.current.find((a) => a.id === actionId);
      if (!action) {
        toast.error("Action no longer available");
        return { success: false };
      }

      setIsLoading(actionId);

      let result: { error: unknown; message?: string };

      try {
        switch (action.type) {
          case "assign_turn":
            result = await undoAssignTurn(action.data.turnId as string);
            break;
          case "complete_turn":
            result = await undoCompleteTurn(action.data.turnId as string);
            break;
          case "clock_in":
            result = await undoClockIn(
              action.data.clockInId as string,
              action.data.wasReactivation as boolean,
              action.data.previousClockOutTime as string | null,
              action.data.employeeId as string
            );
            break;
          case "clock_out":
            result = await undoClockOut(action.data.clockInId as string);
            break;
          default:
            toast.error("Unknown action type");
            setIsLoading(null);
            return { success: false };
        }

        if (result.error) {
          toast.error(result.message || "Failed to undo action");
          setIsLoading(null);
          return { success: false, blocked: result.error === "DEPENDENCY_ERROR" };
        }

        toast.success(`Undone: ${action.description}`);
        removeAction(actionId);
        setIsLoading(null);

        // Trigger UI refresh after successful undo
        if (onUndoCompleteRef.current) {
          onUndoCompleteRef.current();
        }

        return { success: true };
      } catch {
        toast.error("Failed to undo action");
        setIsLoading(null);
        return { success: false };
      }
    },
    [undoAssignTurn, undoCompleteTurn, undoClockIn, undoClockOut, removeAction]
  );

  // Record action (simplified - no toast with undo button)
  const recordAction = useCallback(
    (
      type: UndoActionType,
      description: string,
      data: Record<string, unknown>
    ) => {
      const actionId = addAction({ type, description, data });
      // Show simple success toast without undo button (undo is in floating button now)
      toast.success(description);
      return actionId;
    },
    [addAction]
  );

  return {
    history,
    recordAction,
    performUndo,
    removeAction,
    clearHistory,
    canUndo: history.length > 0,
    isLoading,
    actionCount: history.length,
  };
}
