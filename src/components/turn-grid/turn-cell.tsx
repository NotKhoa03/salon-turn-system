"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TurnWithDetails } from "@/lib/hooks/use-turns";
import { Check, Clock, Slash } from "lucide-react";
import { format } from "date-fns";

interface TurnCellProps {
  turn?: TurnWithDetails;
  onComplete?: (turnId: string) => void;
}

export function TurnCell({ turn, onComplete }: TurnCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!turn) {
    return <div className="h-12 w-full" />;
  }

  const isInProgress = turn.status === "in_progress";
  const isCompleted = turn.status === "completed";
  const isHalfTurn = turn.is_half_turn;

  // Cell content based on status
  const getCellContent = () => {
    if (isInProgress) {
      return (
        <div className="flex items-center justify-center h-full bg-amber-100 border-2 border-amber-400 rounded-md animate-pulse">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
      );
    }

    if (isCompleted && isHalfTurn) {
      return (
        <div className="relative flex items-center justify-center h-full bg-green-100 border-2 border-green-400 rounded-md">
          <Check className="h-5 w-5 text-green-600" />
          <Slash className="h-3 w-3 text-green-600 absolute top-0.5 right-0.5" />
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="flex items-center justify-center h-full bg-green-100 border-2 border-green-400 rounded-md">
          <Check className="h-5 w-5 text-green-600" />
        </div>
      );
    }

    return null;
  };

  // Tooltip content
  const tooltipContent = (
    <div className="text-sm">
      <div className="font-semibold">{turn.service.name}</div>
      <div className="text-zinc-400">${turn.service.price.toFixed(2)}</div>
      <div className="text-zinc-400">
        {isInProgress ? "In progress" : format(new Date(turn.completed_at!), "h:mm a")}
      </div>
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-12 w-full cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setDialogOpen(true)}
            >
              {getCellContent()}
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Turn Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-zinc-500">Employee</div>
                <div className="font-medium">{turn.employee.full_name}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Service</div>
                <div className="font-medium">{turn.service.name}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Price</div>
                <div className="font-medium">${turn.service.price.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Turn Type</div>
                <Badge variant={isHalfTurn ? "secondary" : "default"}>
                  {isHalfTurn ? "Half Turn" : "Full Turn"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Started</div>
                <div className="font-medium">
                  {format(new Date(turn.started_at), "h:mm a")}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Status</div>
                <Badge
                  variant={isInProgress ? "outline" : "default"}
                  className={
                    isInProgress
                      ? "border-amber-500 text-amber-700"
                      : "bg-green-500"
                  }
                >
                  {isInProgress ? "In Progress" : "Completed"}
                </Badge>
              </div>
            </div>

            {isInProgress && onComplete && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onComplete(turn.id);
                  setDialogOpen(false);
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
