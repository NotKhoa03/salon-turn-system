"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/lib/types/database";
import type { ClockInWithEmployee } from "@/lib/hooks/use-clock-ins";
import { LogIn, LogOut } from "lucide-react";

interface ClockInOutProps {
  employees: Employee[];
  clockIns: ClockInWithEmployee[];
  onClockIn: (employeeId: string) => Promise<{ error: unknown }>;
  onClockOut: (clockInId: string) => Promise<{ error: unknown }>;
  loading?: boolean;
}

export function ClockInOut({
  employees,
  clockIns,
  onClockIn,
  onClockOut,
  loading,
}: ClockInOutProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Filter out already clocked-in employees
  const clockedInIds = new Set(clockIns.map((c) => c.employee_id));
  const availableForClockIn = employees.filter((e) => !clockedInIds.has(e.id));

  const handleClockIn = async () => {
    if (!selectedEmployeeId) return;

    setProcessing(true);
    await onClockIn(selectedEmployeeId);
    setProcessing(false);
    setSelectedEmployeeId("");
  };

  const handleClockOut = async (clockInId: string) => {
    setProcessing(true);
    await onClockOut(clockInId);
    setProcessing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Clock In/Out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clock In Section */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={availableForClockIn.length === 0 || loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    availableForClockIn.length === 0
                      ? "All employees clocked in"
                      : "Select employee..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableForClockIn.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleClockIn}
              disabled={!selectedEmployeeId || processing || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              In
            </Button>
          </div>
        </div>

        {/* Clocked In Employees */}
        {clockIns.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-700">
              Currently Working ({clockIns.length})
            </div>
            <div className="space-y-1">
              {clockIns.map((clockIn) => (
                <div
                  key={clockIn.id}
                  className="flex items-center justify-between p-2 bg-zinc-50 rounded-md"
                >
                  <span className="text-sm">{clockIn.employee.full_name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleClockOut(clockIn.id)}
                    disabled={processing || loading}
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Out
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
