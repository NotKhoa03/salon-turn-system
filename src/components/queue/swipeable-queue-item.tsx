"use client";

import { useState, useRef, useCallback } from "react";
import { Check, Pause, Play, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueueEmployee } from "@/lib/hooks/use-queue";

type SwipeableQueueItemProps = {
  item: QueueEmployee;
  index: number;
  isNext: boolean;
  isSkipped: boolean;
  onComplete: (turnId: string) => void;
  onSkip: (employeeId: string) => void;
  onUnskip: (employeeId: string) => void;
};

export function SwipeableQueueItem({
  item,
  index,
  isNext,
  isSkipped,
  onComplete,
  onSkip,
  onUnskip,
}: SwipeableQueueItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 100;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isSkipped) return; // Don't allow swipe if already skipped
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [isSkipped]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX; // Positive = left swipe
    // Only allow left swipe, clamp to max
    const clampedDiff = Math.min(Math.max(0, diff), MAX_SWIPE);
    setSwipeX(clampedDiff);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    if (swipeX >= SWIPE_THRESHOLD) {
      // Trigger skip
      onSkip(item.employee.id);
    }

    // Animate back
    setSwipeX(0);
    setIsSwiping(false);
  }, [isSwiping, swipeX, onSkip, item.employee.id]);

  // Mouse events for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSkipped) return;
    startXRef.current = e.clientX;
    setIsSwiping(true);
  }, [isSkipped]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSwiping) return;
    const diff = startXRef.current - e.clientX;
    const clampedDiff = Math.min(Math.max(0, diff), MAX_SWIPE);
    setSwipeX(clampedDiff);
  }, [isSwiping]);

  const handleMouseUp = useCallback(() => {
    if (!isSwiping) return;

    if (swipeX >= SWIPE_THRESHOLD) {
      onSkip(item.employee.id);
    }

    setSwipeX(0);
    setIsSwiping(false);
  }, [isSwiping, swipeX, onSkip, item.employee.id]);

  const handleMouseLeave = useCallback(() => {
    if (isSwiping) {
      setSwipeX(0);
      setIsSwiping(false);
    }
  }, [isSwiping]);

  // Calculate visual states
  const swipeProgress = swipeX / SWIPE_THRESHOLD;
  const isNearThreshold = swipeProgress >= 0.9;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Skip action background revealed by swipe */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-4 transition-colors duration-200"
        style={{
          background: isNearThreshold
            ? 'linear-gradient(90deg, transparent 0%, #b76e79 50%, #d4a5ab 100%)'
            : `linear-gradient(90deg, transparent 0%, rgba(247, 231, 206, ${0.3 + swipeProgress * 0.5}) 50%, rgba(183, 110, 121, ${swipeProgress * 0.3}) 100%)`,
          transition: isSwiping ? 'none' : 'background 0.3s ease-out',
        }}
      >
        <div
          className="flex items-center gap-2 transition-all duration-200"
          style={{
            opacity: Math.min(1, swipeProgress * 1.5),
            transform: `scale(${0.8 + swipeProgress * 0.4}) translateX(${(1 - swipeProgress) * 10}px)`,
            transition: isSwiping ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Coffee
            className="w-5 h-5 transition-colors duration-200"
            style={{ color: isNearThreshold ? '#b76e79' : '#6b6b6b' }}
          />
          <span
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: isNearThreshold ? '#b76e79' : '#6b6b6b' }}
          >
            Skip
          </span>
        </div>
      </div>

      {/* Main item content */}
      <div
        ref={itemRef}
        className={`relative flex items-center gap-3 p-4 sm:p-3 min-h-[56px] sm:min-h-0 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none touch-action-pan-y ${
          isSkipped
            ? 'bg-gradient-to-r from-[#f7e7ce]/40 to-[#f5f0eb]/60 border-2 border-dashed border-[#d4a574]/40'
            : isNext && !item.isInProgress
            ? 'bg-gradient-to-r from-[#b76e79]/10 to-[#e8c4c4]/10 border border-[#b76e79]/30'
            : item.isInProgress
            ? 'bg-[#f7e7ce]/30'
            : 'bg-[#f5f0eb]/50'
        }`}
        style={{
          transform: `translateX(-${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Position number */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            isSkipped
              ? 'bg-[#f7e7ce] text-[#d4a574] border border-[#d4a574]/30'
              : isNext && !item.isInProgress
              ? 'bg-[#b76e79] text-white'
              : 'bg-white text-[#6b6b6b] border border-[#e8e4df]'
          }`}
        >
          {isSkipped ? (
            <Pause className="w-3 h-3" />
          ) : (
            index + 1
          )}
        </div>

        {/* Name and turns */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#2d2d2d] text-sm flex items-center gap-2">
            <span className={isSkipped ? 'opacity-60' : ''}>
              {item.employee.full_name}
            </span>
            {isSkipped && (
              <span className="text-[10px] bg-[#f7e7ce] text-[#d4a574] px-1.5 py-0.5 rounded font-semibold tracking-wide">
                BREAK
              </span>
            )}
            {isNext && !isSkipped && !item.isInProgress && (
              <span className="text-[10px] bg-[#b76e79] text-white px-1.5 py-0.5 rounded font-bold">
                NEXT
              </span>
            )}
          </div>
          <div className={`text-xs ${isSkipped ? 'text-[#d4a574]' : 'text-[#6b6b6b]'}`}>
            {item.completedTurns} turn{item.completedTurns !== 1 ? 's' : ''}
            {item.halfTurnCredits > 0 && ' + ½'}
          </div>
        </div>

        {/* Action buttons */}
        {isSkipped ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 sm:h-7 px-4 sm:px-3 rounded-lg text-[#d4a574] hover:text-[#b76e79] hover:bg-[#f7e7ce]/50 active:scale-[0.95] active:shadow-inner transition-all duration-100 text-xs font-medium touch-action-manipulation"
            onClick={() => onUnskip(item.employee.id)}
          >
            <Play className="w-3 h-3 mr-1" />
            Resume
          </Button>
        ) : item.isInProgress && item.currentTurn ? (
          <Button
            size="sm"
            className="h-9 sm:h-7 px-3 sm:px-2 rounded-lg bg-[#9caf88] hover:bg-[#8a9d78] active:scale-[0.95] active:shadow-inner active:shadow-[#9caf88]/30 transition-all duration-100 text-white text-xs touch-action-manipulation"
            onClick={() => onComplete(item.currentTurn!.id)}
          >
            <Check className="w-3 h-3 mr-1" />
            Done
          </Button>
        ) : null}
      </div>
    </div>
  );
}
