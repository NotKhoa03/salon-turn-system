"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { TurnGrid } from "@/components/turn-grid/turn-grid";
import { Toaster, toast } from "sonner";
import {
  useSession,
  useClockIns,
  useTurns,
  useQueue,
  useAuth,
  useUndo,
  useSkip,
  useEmployees,
} from "@/lib/hooks";
import type { Service, Employee } from "@/lib/types/database";
import {
  Sparkles,
  UserPlus,
  Clock,
  Scissors,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClearDayButton } from "@/components/admin-controls";
import { SwipeableQueueItem } from "@/components/queue";
import { UndoButton } from "@/components/undo-button";
import logger from "@/lib/logger";

// Track page mount time for performance logging
const pageStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

interface DashboardClientProps {
  employees: Employee[]; // Initial server-cached employees
  services: Service[];
}

export default function DashboardClient({ employees: initialEmployees, services }: DashboardClientProps) {
  // Use real-time employees hook, falling back to server-cached data initially
  const { employees: liveEmployees, loading: employeesLoading } = useEmployees();
  const employees = liveEmployees.length > 0 ? liveEmployees : initialEmployees;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [manualServiceId, setManualServiceId] = useState<string>("");
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [hasVisited, setHasVisited] = useState(true);

  // Clock out confirmation dialog state
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [clockOutEmployeeId, setClockOutEmployeeId] = useState<string | null>(null);

  // Check for previous visit
  useEffect(() => {
    const visited = localStorage.getItem("salon-pos-visited");
    if (!visited) {
      setHasVisited(false);
      localStorage.setItem("salon-pos-visited", "true");
    }
    // Trigger welcome animation completion
    const timer = setTimeout(() => setWelcomeComplete(true), hasVisited ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [hasVisited]);

  // Data hooks
  const { isAdmin } = useAuth();
  const { session, loading: sessionLoading } = useSession(selectedDate);
  const {
    clockIns,
    loading: clockInsLoading,
    clockIn,
    clockOut,
    refetch: refetchClockIns,
  } = useClockIns(session?.id || null);
  const {
    turns,
    loading: turnsLoading,
    assignTurn,
    completeTurn,
    refetch: refetchTurns,
  } = useTurns(session?.id || null);

  // Queue logic
  const { queue } = useQueue(clockIns, turns);

  // Skip functionality
  const { skipEmployee, unskipEmployee, isSkipped } = useSkip();

  // Get next employee excluding skipped ones
  const getNextEmployee = useMemo(() => {
    return queue.find((q) => !q.isInProgress && !isSkipped(q.employee.id)) || null;
  }, [queue, isSkipped]);

  // Sort queue to show skipped employees at the bottom of their tier
  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      const aSkipped = isSkipped(a.employee.id);
      const bSkipped = isSkipped(b.employee.id);
      if (aSkipped !== bSkipped) {
        return aSkipped ? 1 : -1;
      }
      return 0;
    });
  }, [queue, isSkipped]);

  // Undo functionality - refresh data after undo
  const handleUndoComplete = useCallback(() => {
    refetchClockIns();
    refetchTurns();
  }, [refetchClockIns, refetchTurns]);

  const { recordAction, history, performUndo, isLoading } = useUndo({
    sessionId: session?.id || null,
    onUndoComplete: handleUndoComplete,
  });

  // Callback for when day is cleared
  const handleClearDayComplete = useCallback(() => {
    logger.info('Clear day complete - refetching data', undefined, 'PAGE');
    refetchClockIns();
    refetchTurns();
  }, [refetchClockIns, refetchTurns]);

  // Log when all data has loaded
  const allDataLoaded = !sessionLoading && !clockInsLoading && !turnsLoading && !employeesLoading;
  useEffect(() => {
    if (allDataLoaded) {
      const loadTime = performance.now() - pageStartTime;
      logger.info(`All data loaded in ${loadTime.toFixed(0)}ms`, {
        session: !!session,
        employees: employees.length,
        services: services.length,
        clockIns: clockIns.length,
        turns: turns.length,
      }, 'PAGE');
    }
  }, [allDataLoaded, session, employees.length, services.length, clockIns.length, turns.length]);

  // Only show splash screen for first-time visitors
  const showSplashScreen = !hasVisited && !welcomeComplete;

  // Track employee clock-in status
  const getEmployeeStatus = useCallback((employeeId: string) => {
    const clockInRecord = clockIns.find((c) => c.employee_id === employeeId);
    if (!clockInRecord) return 'never';
    if (clockInRecord.isActive) return 'active';
    return 'inactive';
  }, [clockIns]);

  // Handlers
  const handleClockIn = async (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const status = getEmployeeStatus(employeeId);
    // Pass employee for optimistic update
    const result = await clockIn(employeeId, emp);
    if (result.error) {
      toast.error("Failed to clock in");
    } else if (result.clockInId) {
      const message = status === 'inactive' ? `${emp?.full_name} clocked back in` : `${emp?.full_name} clocked in`;
      recordAction("clock_in", message, {
        clockInId: result.clockInId,
        wasReactivation: result.wasReactivation,
        previousClockOutTime: result.previousClockOutTime,
        employeeId: employeeId,
        employeeName: emp?.full_name,
      });
    }
  };

  const handleClockOut = async (employeeId: string) => {
    const clockInRecord = clockIns.find((c) => c.employee_id === employeeId && c.isActive);
    const emp = employees.find((e) => e.id === employeeId);
    if (!clockInRecord) return;

    const result = await clockOut(clockInRecord.id);
    if (result.error) {
      toast.error("Failed to clock out");
    } else {
      recordAction("clock_out", `${emp?.full_name} clocked out`, {
        clockInId: result.clockInId,
        employeeName: emp?.full_name,
      });
    }
  };

  // Handle employee tap - clock in or show clock out dialog
  const handleEmployeeTap = (employeeId: string) => {
    const status = getEmployeeStatus(employeeId);
    if (status === 'active') {
      // Show confirmation dialog for clock out
      setClockOutEmployeeId(employeeId);
      setClockOutDialogOpen(true);
    } else {
      // Clock in directly
      handleClockIn(employeeId);
    }
  };

  // Confirm clock out from dialog
  const confirmClockOut = () => {
    if (clockOutEmployeeId) {
      handleClockOut(clockOutEmployeeId);
    }
    setClockOutDialogOpen(false);
    setClockOutEmployeeId(null);
  };

  // Get employee name for dialog
  const clockOutEmployeeName = clockOutEmployeeId
    ? employees.find(e => e.id === clockOutEmployeeId)?.full_name
    : '';

  // Service tap - assign to next employee
  const handleServiceTap = async (service: Service) => {
    if (!getNextEmployee) {
      toast.error("No available technicians");
      return;
    }

    const employee = getNextEmployee.employee;
    const employeeName = employee.full_name;
    // Pass employee and service for optimistic update
    const result = await assignTurn(
      employee.id,
      service.id,
      service.is_half_turn,
      employee,
      service
    );
    if (result.error) {
      toast.error("Failed to assign service");
    } else if (result.turnId) {
      recordAction("assign_turn", `${service.name} assigned to ${employeeName}`, {
        turnId: result.turnId,
        serviceName: service.name,
        employeeName,
      });
    }
  };

  const handleManualAssign = async () => {
    if (!manualEmployeeId || !manualServiceId) return;
    const service = services.find((s) => s.id === manualServiceId);
    const queueItem = queue.find((q) => q.employee.id === manualEmployeeId);

    if (!service || !queueItem) return;

    const employee = queueItem.employee;
    const employeeName = employee.full_name;
    // Pass employee and service for optimistic update
    const result = await assignTurn(
      manualEmployeeId,
      manualServiceId,
      service.is_half_turn,
      employee,
      service
    );
    if (result.error) {
      toast.error("Failed to assign service");
    } else if (result.turnId) {
      recordAction("assign_turn", `${service.name} assigned to ${employeeName}`, {
        turnId: result.turnId,
        serviceName: service.name,
        employeeName,
      });
    }
    setManualAssignOpen(false);
    setManualEmployeeId("");
    setManualServiceId("");
  };

  const handleCompleteTurn = async (turnId: string) => {
    const turn = turns.find((t) => t.id === turnId);
    const { error } = await completeTurn(turnId);
    if (error) {
      toast.error("Failed to complete turn");
    } else {
      const employeeName = turn?.employee?.full_name || "Unknown";
      const serviceName = turn?.service?.name || "Service";
      recordAction("complete_turn", `${serviceName} completed for ${employeeName}`, {
        turnId,
        serviceName,
        employeeName,
      });
    }
  };

  const handleSkipEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    skipEmployee(employeeId);
    toast.success(`${emp?.full_name || 'Technician'} is on break`, {
      description: "Tap Resume to bring them back",
      duration: 3000,
    });
  };

  const handleUnskipEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    unskipEmployee(employeeId);
    toast.success(`${emp?.full_name || 'Technician'} is back in queue`);
  };

  // Welcome animation screen
  if (showSplashScreen) {
    return (
      <div className="min-h-screen bg-salon-gradient flex items-center justify-center">
        <div className="text-center welcome-logo">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#b76e79] to-[#d4a5ab] flex items-center justify-center mx-auto mb-6 shadow-salon-lg">
            <Scissors className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-4xl font-semibold text-[#2d2d2d] mb-2"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Salon POS
          </h1>
          <p className="text-[#6b6b6b]">Turn Management System</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#faf8f5]">
        <TopNav selectedDate={selectedDate} onDateChange={setSelectedDate} />

        <main className="p-6 lg:p-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Controls */}
              <div className="lg:col-span-4 space-y-6">

                {/* Employee Avatars - Clock In/Out */}
                <div
                  className="bg-white rounded-2xl shadow-salon p-5 opacity-0 animate-drop-down"
                  style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
                >
                  <h2
                    className="text-lg font-semibold text-[#2d2d2d] mb-4"
                    style={{ fontFamily: 'var(--font-cormorant), serif' }}
                  >
                    Technicians
                  </h2>
                  <div className="flex flex-wrap gap-4 md:gap-3">
                    {employees.map((employee) => {
                      const status = getEmployeeStatus(employee.id);
                      const isActive = status === 'active';
                      const isInactive = status === 'inactive';
                      const queueItem = queue.find(q => q.employee.id === employee.id);
                      const isBusy = queueItem?.isInProgress;

                      const tooltipText = isActive
                        ? 'Tap to clock out'
                        : isInactive
                        ? 'Tap to clock back in'
                        : 'Tap to clock in';

                      return (
                        <Tooltip key={employee.id}>
                          <TooltipTrigger asChild>
                            <button
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl active:scale-[0.95] active:shadow-inner active:shadow-[#b76e79]/20 transition-all duration-200 touch-action-manipulation ${
                                isActive
                                  ? 'bg-[#f7e7ce]/30'
                                  : isInactive
                                  ? 'bg-[#f5f0eb]/50'
                                  : 'hover:bg-[#f5f0eb]'
                              }`}
                              onClick={() => handleEmployeeTap(employee.id)}
                            >
                              <div
                                className={`relative w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
                                  isActive
                                    ? 'bg-gradient-to-br from-[#b76e79] to-[#d4a5ab] text-white shadow-lg'
                                    : isInactive
                                    ? 'bg-[#d4a5ab]/50 text-white/80'
                                    : 'bg-[#e8e4df] text-[#6b6b6b] opacity-50'
                                }`}
                              >
                                {employee.full_name.charAt(0)}
                                {isActive && (
                                  <span className="absolute inset-0 rounded-full border-2 border-[#b76e79] animate-glow-pulse" />
                                )}
                                {isInactive && (
                                  <span className="absolute inset-0 rounded-full border-2 border-dashed border-[#d4a5ab]" />
                                )}
                                {isBusy && (
                                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f7e7ce] border-2 border-white rounded-full flex items-center justify-center">
                                    <Clock className="w-3 h-3 text-[#b76e79]" />
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs font-medium truncate max-w-[60px] ${
                                isActive ? 'text-[#2d2d2d]' : 'text-[#6b6b6b]'
                              }`}>
                                {employee.full_name.split(' ')[0]}
                              </span>
                              {isInactive && (
                                <span className="text-[10px] text-[#b76e79]">left</span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="rounded-lg">
                            {tooltipText}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Service Grid */}
                <div
                  className="bg-white rounded-2xl shadow-salon p-5 opacity-0 animate-slide-in"
                  style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b76e79] to-[#d4a5ab] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2
                          className="text-lg font-semibold text-[#2d2d2d]"
                          style={{ fontFamily: 'var(--font-cormorant), serif' }}
                        >
                          Services
                        </h2>
                        {getNextEmployee && (
                          <p className="text-xs text-[#6b6b6b]">
                            Next: <span className="font-medium text-[#b76e79]">{getNextEmployee.employee.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!getNextEmployee ? (
                    <div className="bg-[#f7e7ce]/30 rounded-xl p-6 text-center">
                      <p className="text-[#6b6b6b]">Clock in technicians to start</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
                        {services.map((service, index) => (
                          <button
                            key={service.id}
                            onClick={() => handleServiceTap(service)}
                            className={`service-card relative p-4 rounded-xl border-2 text-left opacity-0 animate-scale-in active:scale-[0.97] active:shadow-inner active:shadow-[#b76e79]/20 transition-all duration-100 ease-out touch-action-manipulation ${
                              service.is_half_turn
                                ? 'service-card-half border-[#f7e7ce]'
                                : 'service-card-full border-[#e8e4df] hover:border-[#b76e79]'
                            }`}
                            style={{ animationDelay: `${0.3 + index * 0.05}s`, animationFillMode: 'forwards' }}
                          >
                            <div className="font-medium text-[#2d2d2d] text-sm mb-1 line-clamp-2">
                              {service.name}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#6b6b6b] text-sm font-semibold">
                                ${service.price.toFixed(0)}
                              </span>
                              {service.is_half_turn && (
                                <span className="text-xs bg-[#b76e79]/10 text-[#b76e79] px-2 py-0.5 rounded-full font-medium">
                                  ½
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Manual Assign Link */}
                      <button
                        onClick={() => setManualAssignOpen(true)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-[#6b6b6b] hover:text-[#b76e79] py-2 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to specific technician...
                      </button>
                    </>
                  )}
                </div>

                {/* Queue Panel */}
                <div
                  className="bg-white rounded-2xl shadow-salon p-5 opacity-0 animate-slide-in"
                  style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className="text-lg font-semibold text-[#2d2d2d]"
                      style={{ fontFamily: 'var(--font-cormorant), serif' }}
                    >
                      Queue Order
                    </h2>
                    {sortedQueue.length > 0 && (
                      <span className="text-xs text-[#6b6b6b] italic">
                        swipe left to skip
                      </span>
                    )}
                  </div>

                  {sortedQueue.length === 0 ? (
                    <div className="text-center py-6 text-[#6b6b6b]">
                      <p className="text-sm">No technicians clocked in</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedQueue.map((item, index) => {
                        const employeeIsSkipped = isSkipped(item.employee.id);
                        const isNext = !employeeIsSkipped && !item.isInProgress &&
                          getNextEmployee?.employee.id === item.employee.id;

                        return (
                          <SwipeableQueueItem
                            key={item.employee.id}
                            item={item}
                            index={index}
                            isNext={isNext}
                            isSkipped={employeeIsSkipped}
                            onComplete={handleCompleteTurn}
                            onSkip={handleSkipEmployee}
                            onUnskip={handleUnskipEmployee}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Admin Controls */}
                {isAdmin && (
                  <div
                    className="bg-white rounded-2xl shadow-salon p-5 opacity-0 animate-slide-in border border-red-100"
                    style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
                  >
                    <h2
                      className="text-lg font-semibold text-[#2d2d2d] mb-4"
                      style={{ fontFamily: 'var(--font-cormorant), serif' }}
                    >
                      Admin Controls
                    </h2>
                    <div className="space-y-3">
                      <p className="text-xs text-[#6b6b6b]">
                        Reset all data for the current day. This will delete all turns and clock-ins.
                      </p>
                      <ClearDayButton
                        sessionId={session?.id || null}
                        onClearComplete={handleClearDayComplete}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Turn Grid */}
              <div
                className="lg:col-span-8 opacity-0 animate-slide-in-right"
                style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
              >
                <TurnGrid
                  clockIns={clockIns}
                  turns={turns}
                  onCompleteTurn={handleCompleteTurn}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Clock Out Confirmation Dialog */}
        <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle
                className="text-xl"
                style={{ fontFamily: 'var(--font-cormorant), serif' }}
              >
                Clock out {clockOutEmployeeName}?
              </DialogTitle>
              <DialogDescription className="text-[#6b6b6b]">
                They will be removed from the queue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setClockOutDialogOpen(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmClockOut}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#b76e79] to-[#d4a5ab] hover:from-[#a55d68] hover:to-[#c4949a]"
              >
                Clock Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Assign Dialog */}
        <Dialog open={manualAssignOpen} onOpenChange={setManualAssignOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle
                className="text-2xl"
                style={{ fontFamily: 'var(--font-cormorant), serif' }}
              >
                Manual Assignment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Select Technician
                </label>
                <Select value={manualEmployeeId} onValueChange={setManualEmployeeId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {queue.map((q) => (
                      <SelectItem key={q.employee.id} value={q.employee.id}>
                        <div className="flex items-center gap-2">
                          <span>{q.employee.full_name}</span>
                          {q.isInProgress && (
                            <span className="text-xs bg-[#f7e7ce] text-[#b76e79] px-2 py-0.5 rounded-full">
                              Busy
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6b6b6b] mb-2 block">
                  Select Service
                </label>
                <Select value={manualServiceId} onValueChange={setManualServiceId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Choose service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price.toFixed(0)}
                        {service.is_half_turn && " (½ turn)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#b76e79] to-[#d4a5ab] hover:from-[#a55d68] hover:to-[#c4949a]"
                disabled={!manualEmployeeId || !manualServiceId}
                onClick={handleManualAssign}
              >
                Assign Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              background: '#fff',
              border: '1px solid #e8e4df',
              boxShadow: '0 4px 20px rgba(183, 110, 121, 0.1)',
            },
          }}
        />

        {/* Floating Undo Button */}
        <UndoButton
          history={history}
          onUndo={performUndo}
          isLoading={isLoading}
        />
      </div>
    </TooltipProvider>
  );
}
