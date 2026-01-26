"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DailySession } from "@/lib/types/database";

export function useSession(date: Date) {
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const dateString = date.toISOString().split("T")[0];

  const fetchOrCreateSession = useCallback(async () => {
    setLoading(true);

    // Try to get existing session
    const { data: existingSession } = await supabase
      .from("daily_sessions")
      .select("*")
      .eq("date", dateString)
      .single();

    if (existingSession) {
      setSession(existingSession);
      setLoading(false);
      return existingSession;
    }

    // Create new session for today
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newSession, error } = await (supabase as any)
      .from("daily_sessions")
      .insert({ date: dateString })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      setLoading(false);
      return null;
    }

    setSession(newSession);
    setLoading(false);
    return newSession;
  }, [supabase, dateString]);

  useEffect(() => {
    fetchOrCreateSession();
  }, [fetchOrCreateSession]);

  return { session, loading, refetch: fetchOrCreateSession };
}
