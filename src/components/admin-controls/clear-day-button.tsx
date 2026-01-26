"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { useClearDay } from "@/lib/hooks";
import { toast } from "sonner";

interface ClearDayButtonProps {
  sessionId: string | null;
  onClearComplete?: () => void;
}

export function ClearDayButton({ sessionId, onClearComplete }: ClearDayButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { clearDay, isClearing } = useClearDay(sessionId);

  const handleClear = async () => {
    const { error } = await clearDay();

    if (error) {
      toast.error(error);
    } else {
      toast.success("Day cleared successfully! Starting fresh.");
      setConfirmOpen(false);
      setConfirmText("");
      onClearComplete?.();
    }
  };

  const isConfirmValid = confirmText.toLowerCase() === "clear";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
        disabled={!sessionId}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Clear Day / Restart
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(open) => {
        setConfirmOpen(open);
        if (!open) setConfirmText("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Clear Day Data
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                This action will <strong>permanently delete</strong> all data for today:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All turns and services assigned today</li>
                <li>All clock-in/clock-out records</li>
              </ul>
              <p className="text-red-600 font-medium">
                This cannot be undone!
              </p>
              <div className="pt-2">
                <label htmlFor="confirm-input" className="text-sm font-medium text-[#2d2d2d]">
                  Type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">CLEAR</span> to confirm:
                </label>
                <input
                  id="confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type CLEAR"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoComplete="off"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmText("");
              }}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={!isConfirmValid || isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
