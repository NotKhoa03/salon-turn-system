"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { QueueList } from "@/components/turn-queue/queue-list";
import { QuickAssign } from "@/components/turn-queue/quick-assign";
import { ClockInOut } from "@/components/turn-queue/clock-in-out";
import { TurnGrid } from "@/components/turn-grid/turn-grid";
import { Toaster, toast } from "sonner";
import {
  useSession,
  useEmployees,
  useServices,
  useClockIns,
  useTurns,
  useQueue,
} from "@/lib/hooks";
import type { Service } from "@/lib/types/database";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Data hooks
  const { session, loading: sessionLoading } = useSession(selectedDate);
  const { employees, loading: employeesLoading } = useEmployees();
  const { services, loading: servicesLoading } = useServices();
  const {
    clockIns,
    loading: clockInsLoading,
    clockIn,
    clockOut,
  } = useClockIns(session?.id || null);
  const {
    turns,
    loading: turnsLoading,
    assignTurn,
    completeTurn,
  } = useTurns(session?.id || null);

  // Queue logic
  const { queue, getNextEmployee } = useQueue(clockIns, turns);

  const isLoading =
    sessionLoading ||
    employeesLoading ||
    servicesLoading ||
    clockInsLoading ||
    turnsLoading;

  // Handlers
  const handleClockIn = async (employeeId: string) => {
    const { error } = await clockIn(employeeId);
    if (error) {
      toast.error("Failed to clock in");
    } else {
      toast.success("Clocked in successfully");
    }
    return { error };
  };

  const handleClockOut = async (clockInId: string) => {
    const { error } = await clockOut(clockInId);
    if (error) {
      toast.error("Failed to clock out");
    } else {
      toast.success("Clocked out successfully");
    }
    return { error };
  };

  const handleQuickAssign = async (serviceId: string, service: Service) => {
    const nextEmployee = getNextEmployee;
    if (!nextEmployee) {
      toast.error("No available employees");
      return { error: "No available employees" };
    }

    const { error } = await assignTurn(
      nextEmployee.employee.id,
      serviceId,
      service.is_half_turn
    );
    if (error) {
      toast.error("Failed to assign turn");
    } else {
      toast.success(
        `Assigned ${service.name} to ${nextEmployee.employee.full_name}`
      );
    }
    return { error };
  };

  const handleCompleteTurn = async (turnId: string) => {
    const { error } = await completeTurn(turnId);
    if (error) {
      toast.error("Failed to complete turn");
    } else {
      toast.success("Turn completed");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <div className="text-zinc-500">Loading...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-8rem)]">
            {/* Left Side - 40% */}
            <div className="lg:col-span-2 space-y-6 overflow-auto">
              <QuickAssign
                services={services}
                nextEmployee={getNextEmployee}
                onAssign={handleQuickAssign}
                loading={isLoading}
              />
              <QueueList queue={queue} onCompleteTurn={handleCompleteTurn} />
              <ClockInOut
                employees={employees}
                clockIns={clockIns}
                onClockIn={handleClockIn}
                onClockOut={handleClockOut}
                loading={isLoading}
              />
            </div>

            {/* Right Side - 60% */}
            <div className="lg:col-span-3 overflow-auto">
              <TurnGrid
                clockIns={clockIns}
                turns={turns}
                onCompleteTurn={handleCompleteTurn}
              />
            </div>
          </div>
        )}
      </main>

      <Toaster position="top-right" />
    </div>
  );
}
