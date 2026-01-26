"use client";

import { useState, useCallback } from "react";

export type SkippedEmployee = {
  employeeId: string;
  skippedAt: number; // timestamp for ordering
  reason?: string;
};

export function useSkip() {
  const [skippedEmployees, setSkippedEmployees] = useState<Map<string, SkippedEmployee>>(
    new Map()
  );

  const skipEmployee = useCallback((employeeId: string, reason?: string) => {
    setSkippedEmployees((prev) => {
      const next = new Map(prev);
      next.set(employeeId, {
        employeeId,
        skippedAt: Date.now(),
        reason,
      });
      return next;
    });
  }, []);

  const unskipEmployee = useCallback((employeeId: string) => {
    setSkippedEmployees((prev) => {
      const next = new Map(prev);
      next.delete(employeeId);
      return next;
    });
  }, []);

  const isSkipped = useCallback(
    (employeeId: string) => skippedEmployees.has(employeeId),
    [skippedEmployees]
  );

  const getSkipInfo = useCallback(
    (employeeId: string) => skippedEmployees.get(employeeId) || null,
    [skippedEmployees]
  );

  const clearAllSkips = useCallback(() => {
    setSkippedEmployees(new Map());
  }, []);

  return {
    skippedEmployees,
    skipEmployee,
    unskipEmployee,
    isSkipped,
    getSkipInfo,
    clearAllSkips,
  };
}
