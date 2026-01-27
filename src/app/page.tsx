"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { TurnGrid } from "@/components/turn-grid/turn-grid";
import { Toaster, toast } from "sonner";
import {
  useSession,
  useEmployees,
  useServices,
  useClockIns,
  useTurns,
  useQueue,
  useAuth,
  useUndo,
  useSkip,
  useDebounceClick,
} from "@/lib/hooks";
import type { Service, Employee } from "@/lib/types/database";
import type { QueueEmployee } from "@/lib/hooks/use-queue";
import {
  Sparkles,
  UserPlus,
  Clock,
  ChevronRight,
  Scissors,
  Check,
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
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClearDayButton } from "@/components/admin-controls";
import { SwipeableQueueItem } from "@/components/queue";
import logger from "@/lib/logger";

// Track page mount time for performance logging
const pageStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [manualServiceId, setManualServiceId] = useState<string>("");
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [hasVisited, setHasVisited] = useState(true);
  // Swipe gesture state for clock out
  const [swipeState, setSwipeState] = useState<{
    employeeId: string | null;
    startY: number;
    currentY: number;
    isSwiping: boolean;
  }>({ employeeId: null, startY: 0, currentY: 0, isSwiping: false });

  const SWIPE_THRESHOLD = 60; // pixels needed for a successful swipe-up

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
  const { session, loading: sessionLoading, refetch: refetchSession } = useSession(selectedDate);
  const { employees, loading: employeesLoading } = useEmployees();
  const { services, loading: servicesLoading } = useServices();
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
  const { queue, getNextEmployee: rawNextEmployee } = useQueue(clockIns, turns);

  // Skip functionality
  const { skippedEmployees, skipEmployee, unskipEmployee, isSkipped } = useSkip();

  // Get next employee excluding skipped ones
  const getNextEmployee = useMemo(() => {
    return queue.find((q) => !q.isInProgress && !isSkipped(q.employee.id)) || null;
  }, [queue, isSkipped]);

  // Sort queue to show skipped employees at the bottom of their tier
  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      const aSkipped = isSkipped(a.employee.id);
      const bSkipped = isSkipped(b.employee.id);

      // If skip status is different, non-skipped comes first
      if (aSkipped !== bSkipped) {
        return aSkipped ? 1 : -1;
      }

      // Otherwise maintain original order
      return 0;
    });
  }, [queue, isSkipped]);

  // Undo functionality
  const { recordAction } = useUndo();

  // Callback for when day is cleared - manually refetch data
  // Real-time subscriptions may not reliably fire for bulk deletes
  const handleClearDayComplete = useCallback(() => {
    logger.info('Clear day complete - refetching data', undefined, 'PAGE');
    refetchClockIns();
    refetchTurns();
  }, [refetchClockIns, refetchTurns]);

  // Log when all data has loaded
  const allDataLoaded = !sessionLoading && !employeesLoading && !servicesLoading && !clockInsLoading && !turnsLoading;
  useEffect(() => {
    if (allDataLoaded) {
      const loadTime = performance.now() - pageStartTime;
      logger.info(`📊 All data loaded in ${loadTime.toFixed(0)}ms`, {
        session: !!session,
        employees: employees.length,
        services: services.length,
        clockIns: clockIns.length,
        turns: turns.length,
      }, 'PAGE');
    }
  }, [allDataLoaded, session, employees.length, services.length, clockIns.length, turns.length]);

  // Only show splash screen for first-time visitors during welcome animation
  // Returning visitors see dashboard immediately with loading skeletons
  const showSplashScreen = !hasVisited && !welcomeComplete;

  // Track employee clock-in status
  const getEmployeeStatus = useCallback((employeeId: string) => {
    const clockInRecord = clockIns.find((c) => c.employee_id === employeeId);
    if (!clockInRecord) return 'never'; // Never clocked in today
    if (clockInRecord.isActive) return 'active'; // Currently clocked in
    return 'inactive'; // Clocked out
  }, [clockIns]);

  // Handlers
  const handleClockIn = async (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const status = getEmployeeStatus(employeeId);
    const result = await clockIn(employeeId);
    if (result.error) {
      toast.error("Failed to clock in");
    } else if (result.clockInId) {
      const message = status === 'inactive' ? `${emp?.full_name} clocked back in` : `${emp?.full_name} clocked in`;
      recordAction("clock_in", message, {
        clockInId: result.clockInId,
        wasReactivation: result.wasReactivation,
        previousClockOutTime: result.previousClockOutTime,
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

  // Swipe gesture handlers for clock out
  const handleTouchStart = useCallback((employeeId: string, e: React.TouchEvent) => {
    const status = getEmployeeStatus(employeeId);
    if (status !== 'active') return;

    const touch = e.touches[0];
    setSwipeState({
      employeeId,
      startY: touch.clientY,
      currentY: touch.clientY,
      isSwiping: true,
    });
  }, [getEmployeeStatus]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isSwiping || !swipeState.employeeId) return;

    const touch = e.touches[0];
    setSwipeState(prev => ({
      ...prev,
      currentY: touch.clientY,
    }));
  }, [swipeState.isSwiping, swipeState.employeeId]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isSwiping || !swipeState.employeeId) return;

    const swipeDistance = swipeState.startY - swipeState.currentY;

    // If swiped up past threshold, clock out
    if (swipeDistance >= SWIPE_THRESHOLD) {
      handleClockOut(swipeState.employeeId);
    }

    // Reset swipe state
    setSwipeState({ employeeId: null, startY: 0, currentY: 0, isSwiping: false });
  }, [swipeState]);

  // Calculate swipe visual feedback
  const getSwipeTransform = (employeeId: string) => {
    if (swipeState.employeeId !== employeeId || !swipeState.isSwiping) {
      return { transform: 'translateY(0)', opacity: 1 };
    }

    const swipeDistance = Math.max(0, swipeState.startY - swipeState.currentY);
    const clampedDistance = Math.min(swipeDistance, 80); // Max visual offset
    const opacity = 1 - (clampedDistance / 120); // Fade as swipe progresses

    return {
      transform: `translateY(-${clampedDistance}px)`,
      opacity: Math.max(0.3, opacity),
    };
  };

  // Service tap - assign to next employee
  const handleServiceTap = async (service: Service) => {
    if (!getNextEmployee) {
      toast.error("No available technicians");
      return;
    }

    const employeeName = getNextEmployee.employee.full_name;
    const result = await assignTurn(
      getNextEmployee.employee.id,
      service.id,
      service.is_half_turn
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

  const debouncedServiceTap = useDebounceClick(handleServiceTap, 400);
  const debouncedClockIn = useDebounceClick(handleClockIn, 400);

  const handleManualAssign = async () => {
    if (!manualEmployeeId || !manualServiceId) return;
    const service = services.find((s) => s.id === manualServiceId);
    const employee = queue.find((q) => q.employee.id === manualEmployeeId);

    if (!service || !employee) return;

    const employeeName = employee.employee.full_name;
    const result = await assignTurn(
      manualEmployeeId,
      manualServiceId,
      service.is_half_turn
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
      description: "Swipe again or tap Resume to bring them back",
      duration: 3000,
    });
  };

  const handleUnskipEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    unskipEmployee(employeeId);
    toast.success(`${emp?.full_name || 'Technician'} is back in queue`);
  };

  // Welcome animation screen - only for first-time visitors
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
                  {employeesLoading ? (
                    <div className="flex gap-4 md:gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 p-2">
                          <div className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-[#f5f0eb] animate-pulse" />
                          <div className="w-10 h-3 bg-[#f5f0eb] rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="flex flex-wrap gap-4 md:gap-3">
                    {employees.map((employee) => {
                      const status = getEmployeeStatus(employee.id);
                      const isActive = status === 'active';
                      const isInactive = status === 'inactive';
                      const queueItem = queue.find(q => q.employee.id === employee.id);
                      const isBusy = queueItem?.isInProgress;
                      const isCurrentlySwiping = swipeState.employeeId === employee.id && swipeState.isSwiping;
                      const swipeStyles = getSwipeTransform(employee.id);

                      const tooltipText = isActive
                        ? 'Swipe up to clock out'
                        : isInactive
                        ? 'Tap to clock back in'
                        : 'Tap to clock in';

                      return (
                        <Tooltip key={employee.id}>
                          <TooltipTrigger asChild>
                            <button
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl active:scale-[0.95] active:shadow-inner active:shadow-[#b76e79]/20 transition-all touch-action-manipulation ${
                                isCurrentlySwiping ? 'duration-0' : 'duration-200'
                              } ${
                                isActive
                                  ? 'bg-[#f7e7ce]/30'
                                  : isInactive
                                  ? 'bg-[#f5f0eb]/50'
                                  : 'hover:bg-[#f5f0eb]'
                              }`}
                              style={isActive ? swipeStyles : undefined}
                              onClick={() => !isActive && debouncedClockIn(employee.id)}
                              onTouchStart={(e) => handleTouchStart(employee.id, e)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
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
                  )}
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

                  {servicesLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-20 bg-[#f5f0eb] rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : !getNextEmployee ? (
                    <div className="bg-[#f7e7ce]/30 rounded-xl p-6 text-center">
                      <p className="text-[#6b6b6b]">Clock in technicians to start</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
                        {services.map((service, index) => (
                          <button
                            key={service.id}
                            onClick={() => debouncedServiceTap(service)}
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
                        // Calculate "next" based on first non-skipped, non-in-progress
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

                {/* Admin Controls - Only visible to admins */}
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
      </div>
    </TooltipProvider>
  );
}
