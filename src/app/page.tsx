"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [manualServiceId, setManualServiceId] = useState<string>("");
  const [welcomeComplete, setWelcomeComplete] = useState(false);
  const [hasVisited, setHasVisited] = useState(true);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);

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
    const { error } = await clockIn(employeeId);
    if (error) {
      toast.error("Failed to clock in");
    } else {
      const message = status === 'inactive' ? `${emp?.full_name} clocked back in` : `${emp?.full_name} clocked in`;
      toast.success(message);
    }
  };

  const handleClockOut = async (employeeId: string) => {
    const clockInRecord = clockIns.find((c) => c.employee_id === employeeId && c.isActive);
    const emp = employees.find((e) => e.id === employeeId);
    if (!clockInRecord) return;

    const { error } = await clockOut(clockInRecord.id);
    if (error) {
      toast.error("Failed to clock out");
    } else {
      toast.success(`${emp?.full_name} clocked out`);
    }
  };

  // Long press handlers for clock out
  const handleLongPressStart = useCallback((employeeId: string) => {
    const status = getEmployeeStatus(employeeId);
    if (status !== 'active') return;

    setLongPressTarget(employeeId);
    longPressTimerRef.current = setTimeout(() => {
      handleClockOut(employeeId);
      setLongPressTarget(null);
    }, 800);
  }, [getEmployeeStatus]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressTarget(null);
  }, []);

  // Service tap - assign to next employee
  const handleServiceTap = async (service: Service) => {
    if (!getNextEmployee) {
      toast.error("No available technicians");
      return;
    }

    const { error } = await assignTurn(
      getNextEmployee.employee.id,
      service.id,
      service.is_half_turn
    );
    if (error) {
      toast.error("Failed to assign service");
    } else {
      toast.success(
        `${service.name} assigned to ${getNextEmployee.employee.full_name}`
      );
    }
  };

  const handleManualAssign = async () => {
    if (!manualEmployeeId || !manualServiceId) return;
    const service = services.find((s) => s.id === manualServiceId);
    const employee = queue.find((q) => q.employee.id === manualEmployeeId);

    if (!service || !employee) return;

    const { error } = await assignTurn(
      manualEmployeeId,
      manualServiceId,
      service.is_half_turn
    );
    if (error) {
      toast.error("Failed to assign service");
    } else {
      toast.success(`${service.name} assigned to ${employee.employee.full_name}`);
    }
    setManualAssignOpen(false);
    setManualEmployeeId("");
    setManualServiceId("");
  };

  const handleCompleteTurn = async (turnId: string) => {
    const { error } = await completeTurn(turnId);
    if (error) {
      toast.error("Failed to complete turn");
    } else {
      toast.success("Service completed");
    }
  };

  // Welcome animation screen
  if (isLoading || (!welcomeComplete && !hasVisited)) {
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
                  <div className="flex flex-wrap gap-3">
                    {employees.map((employee) => {
                      const status = getEmployeeStatus(employee.id);
                      const isActive = status === 'active';
                      const isInactive = status === 'inactive';
                      const queueItem = queue.find(q => q.employee.id === employee.id);
                      const isBusy = queueItem?.isInProgress;
                      const isLongPressing = longPressTarget === employee.id;

                      const tooltipText = isActive
                        ? 'Long press to clock out'
                        : isInactive
                        ? 'Tap to clock back in'
                        : 'Tap to clock in';

                      return (
                        <Tooltip key={employee.id}>
                          <TooltipTrigger asChild>
                            <button
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                                isActive
                                  ? 'bg-[#f7e7ce]/30'
                                  : isInactive
                                  ? 'bg-[#f5f0eb]/50'
                                  : 'hover:bg-[#f5f0eb]'
                              } ${isLongPressing ? 'scale-95' : ''}`}
                              onClick={() => !isActive && handleClockIn(employee.id)}
                              onMouseDown={() => handleLongPressStart(employee.id)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(employee.id)}
                              onTouchEnd={handleLongPressEnd}
                            >
                              <div
                                className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
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
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {services.map((service, index) => (
                          <button
                            key={service.id}
                            onClick={() => handleServiceTap(service)}
                            className={`service-card relative p-4 rounded-xl border-2 text-left opacity-0 animate-scale-in ${
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
                  <h2
                    className="text-lg font-semibold text-[#2d2d2d] mb-4"
                    style={{ fontFamily: 'var(--font-cormorant), serif' }}
                  >
                    Queue Order
                  </h2>

                  {queue.length === 0 ? (
                    <div className="text-center py-6 text-[#6b6b6b]">
                      <p className="text-sm">No technicians clocked in</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {queue.map((item, index) => {
                        const isNext = index === 0 && !item.isInProgress;
                        return (
                          <div
                            key={item.employee.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              isNext
                                ? 'bg-gradient-to-r from-[#b76e79]/10 to-[#e8c4c4]/10 border border-[#b76e79]/30'
                                : item.isInProgress
                                ? 'bg-[#f7e7ce]/30'
                                : 'bg-[#f5f0eb]/50'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isNext
                                ? 'bg-[#b76e79] text-white'
                                : 'bg-white text-[#6b6b6b] border border-[#e8e4df]'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[#2d2d2d] text-sm flex items-center gap-2">
                                {item.employee.full_name}
                                {isNext && (
                                  <span className="text-[10px] bg-[#b76e79] text-white px-1.5 py-0.5 rounded font-bold">
                                    NEXT
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#6b6b6b]">
                                {item.completedTurns} turn{item.completedTurns !== 1 ? 's' : ''}
                                {item.halfTurnCredits > 0 && ' + ½'}
                              </div>
                            </div>
                            {item.isInProgress && item.currentTurn && (
                              <Button
                                size="sm"
                                className="h-7 px-2 rounded-lg bg-[#9caf88] hover:bg-[#8a9d78] text-white text-xs"
                                onClick={() => handleCompleteTurn(item.currentTurn!.id)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Done
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Turn Grid */}
              <div
                className="lg:col-span-8 opacity-0 animate-slide-in-right"
                style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
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
