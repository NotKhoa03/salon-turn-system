"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useClearDay(sessionId: string | null) {
  const [isClearing, setIsClearing] = useState(false);
  const supabase = createClient();

  const clearDay = async () => {
    if (!sessionId) {
      return { error: "No session to clear" };
    }

    setIsClearing(true);

    try {
      // 1. Delete all turns for this session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: turnsError } = await (supabase as any)
        .from("turns")
        .delete()
        .eq("session_id", sessionId);

      if (turnsError) {
        setIsClearing(false);
        return { error: `Failed to delete turns: ${turnsError.message}` };
      }

      // 2. Delete all clock-ins for this session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: clockInsError } = await (supabase as any)
        .from("clock_ins")
        .delete()
        .eq("session_id", sessionId);

      if (clockInsError) {
        setIsClearing(false);
        return { error: `Failed to delete clock-ins: ${clockInsError.message}` };
      }

      setIsClearing(false);
      return { error: null };
    } catch (err) {
      setIsClearing(false);
      return { error: "An unexpected error occurred" };
    }
  };

  return { clearDay, isClearing };
}
