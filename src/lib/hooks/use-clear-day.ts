"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import logger from "@/lib/logger";

export function useClearDay(sessionId: string | null) {
  const [isClearing, setIsClearing] = useState(false);
  const supabase = createClient();

  const clearDay = async () => {
    if (!sessionId) {
      return { error: "No session to clear" };
    }

    setIsClearing(true);
    logger.time('clear_day', 'Clear day operation');
    logger.warn(`Clearing all data for session ${sessionId}`, undefined, 'CLEAR_DAY');

    try {
      // 1. Delete all turns for this session
      logger.info('Deleting all turns...', undefined, 'CLEAR_DAY');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: turnsError, count: turnsCount } = await (supabase as any)
        .from("turns")
        .delete({ count: 'exact' })
        .eq("session_id", sessionId);

      if (turnsError) {
        logger.error(`Failed to delete turns: ${turnsError.message}`, turnsError, 'CLEAR_DAY');
        logger.timeEnd('clear_day', 'failed at turns');
        setIsClearing(false);
        return { error: `Failed to delete turns: ${turnsError.message}` };
      }
      logger.info(`Deleted ${turnsCount || 0} turns`, undefined, 'CLEAR_DAY');

      // 2. Delete all clock-ins for this session
      logger.info('Deleting all clock-ins...', undefined, 'CLEAR_DAY');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: clockInsError, count: clockInsCount } = await (supabase as any)
        .from("clock_ins")
        .delete({ count: 'exact' })
        .eq("session_id", sessionId);

      if (clockInsError) {
        logger.error(`Failed to delete clock-ins: ${clockInsError.message}`, clockInsError, 'CLEAR_DAY');
        logger.timeEnd('clear_day', 'failed at clock_ins');
        setIsClearing(false);
        return { error: `Failed to delete clock-ins: ${clockInsError.message}` };
      }
      logger.info(`Deleted ${clockInsCount || 0} clock-ins`, undefined, 'CLEAR_DAY');

      logger.timeEnd('clear_day', 'success');
      setIsClearing(false);
      return { error: null };
    } catch (err) {
      logger.error('Unexpected error during clear day', err, 'CLEAR_DAY');
      logger.timeEnd('clear_day', 'exception');
      setIsClearing(false);
      return { error: "An unexpected error occurred" };
    }
  };

  return { clearDay, isClearing };
}
