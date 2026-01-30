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
  toastId?: string | number;
}

const UNDO_TIMEOUT = 30000; // 30 seconds
const MAX_HISTORY = 5;

export function useUndo() {
  const [history, setHistory] = useState<UndoAction[]>([]);
  const historyRef = useRef<UndoAction[]>([]);
  const supabase = createClient();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Keep historyRef in sync
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  // Remove expired actions
  const removeAction = useCallback((actionId: string) => {
    setHistory((prev) => prev.filter((a) => a.id !== actionId));
    const timeout = timeoutsRef.current.get(actionId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(actionId);
    }
  }, []);

  // Add action to history with auto-expiry
  const addAction = useCallback(
    (action: Omit<UndoAction, "id" | "timestamp">) => {
      const id = crypto.randomUUID();
      const newAction: UndoAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const updated = [newAction, ...prev].slice(0, MAX_HISTORY);
        return updated;
      });

      // Set timeout for auto-removal
      const timeout = setTimeout(() => {
        removeAction(id);
      }, UNDO_TIMEOUT);
      timeoutsRef.current.set(id, timeout);

      return id;
    },
    [removeAction]
  );

  // Undo turn assignment (delete the turn)
  const undoAssignTurn = useCallback(
    async (turnId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("turns").delete().eq("id", turnId);

      if (error) {
        toast.error("Failed to undo turn assignment");
        return { error };
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
        toast.error("Failed to undo turn completion");
        return { error };
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Undo clock-in (clock out the employee)
  const undoClockIn = useCallback(
    async (clockInId: string, wasReactivation: boolean, previousClockOutTime: string | null) => {
      if (wasReactivation && previousClockOutTime) {
        // If it was a reactivation, restore the previous clock_out_time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("clock_ins")
          .update({ clock_out_time: previousClockOutTime })
          .eq("id", clockInId);

        if (error) {
          toast.error("Failed to undo clock-in");
          return { error };
        }
      } else {
        // If it was a new clock-in, delete the record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("clock_ins")
          .delete()
          .eq("id", clockInId);

        if (error) {
          toast.error("Failed to undo clock-in");
          return { error };
        }
      }

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
        toast.error("Failed to undo clock-out");
        return { error };
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
        return;
      }

      let result: { error: unknown };

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
            action.data.previousClockOutTime as string | null
          );
          break;
        case "clock_out":
          result = await undoClockOut(action.data.clockInId as string);
          break;
        default:
          toast.error("Unknown action type");
          return;
      }

      if (!result.error) {
        // Dismiss the original toast if it exists
        if (action.toastId) {
          toast.dismiss(action.toastId);
        }
        toast.success("Action undone");
        removeAction(actionId);
      }
    },
    [undoAssignTurn, undoCompleteTurn, undoClockIn, undoClockOut, removeAction]
  );

  // Show toast with undo button
  const showUndoToast = useCallback(
    (actionId: string, message: string) => {
      const toastId = toast.success(message, {
        duration: UNDO_TIMEOUT,
        action: {
          label: "Undo",
          onClick: () => performUndo(actionId),
        },
      });

      // Update the action with the toast ID
      setHistory((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, toastId } : a))
      );

      return toastId;
    },
    [performUndo]
  );

  // Record action and show undo toast in one call
  const recordAction = useCallback(
    (
      type: UndoActionType,
      description: string,
      data: Record<string, unknown>
    ) => {
      const actionId = addAction({ type, description, data });
      showUndoToast(actionId, description);
      return actionId;
    },
    [addAction, showUndoToast]
  );

  return {
    history,
    recordAction,
    performUndo,
    removeAction,
    canUndo: history.length > 0,
  };
}
