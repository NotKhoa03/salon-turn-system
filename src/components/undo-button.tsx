"use client";

import { useState, useRef, useEffect } from "react";
import { Undo2, X, Loader2 } from "lucide-react";
import type { UndoAction } from "@/lib/hooks/use-undo";

interface UndoButtonProps {
  history: UndoAction[];
  onUndo: (actionId: string) => Promise<{ success: boolean; blocked?: boolean }>;
  isLoading: string | null;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActionDescription(action: UndoAction): string {
  // Shorten descriptions for the button preview
  const desc = action.description;
  if (desc.length > 25) {
    return desc.substring(0, 22) + "...";
  }
  return desc;
}

export function UndoButton({ history, onUndo, isLoading }: UndoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const hasActions = history.length > 0;
  const lastAction = history[0];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-full right-0 mb-2 w-80 max-h-96 bg-white rounded-2xl shadow-2xl border border-[#e8e4df] overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e4df] bg-[#faf8f5]">
            <h3
              className="font-semibold text-[#2d2d2d]"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Today&apos;s Actions
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[#e8e4df] transition-colors"
            >
              <X className="w-4 h-4 text-[#6b6b6b]" />
            </button>
          </div>

          {/* Action List */}
          <div className="overflow-y-auto max-h-72">
            {history.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#6b6b6b]">
                No actions yet today
              </div>
            ) : (
              <div className="divide-y divide-[#e8e4df]">
                {history.map((action) => {
                  const isUndoing = isLoading === action.id;
                  return (
                    <div
                      key={action.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#faf8f5] transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm text-[#2d2d2d] truncate">
                          {action.description}
                        </p>
                        <p className="text-xs text-[#6b6b6b]">
                          {formatTime(action.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => onUndo(action.id)}
                        disabled={isLoading !== null}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          isUndoing
                            ? "bg-[#e8e4df] text-[#6b6b6b]"
                            : "bg-[#b76e79]/10 text-[#b76e79] hover:bg-[#b76e79]/20 active:scale-95"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUndoing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Undo"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 active:scale-95 ${
          hasActions
            ? "bg-gradient-to-r from-[#b76e79] to-[#d4a5ab] text-white hover:shadow-xl"
            : "bg-[#e8e4df] text-[#6b6b6b]"
        }`}
      >
        <Undo2 className="w-5 h-5" />
        {hasActions ? (
          <>
            <span className="text-sm font-medium max-w-[120px] truncate">
              {formatActionDescription(lastAction)}
            </span>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-bold">
              {history.length}
            </span>
          </>
        ) : (
          <span className="text-sm">No actions</span>
        )}
      </button>
    </div>
  );
}
