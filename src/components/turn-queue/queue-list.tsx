"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { QueueEmployee } from "@/lib/hooks/use-queue";
import { CheckCircle, Clock, User } from "lucide-react";

interface QueueListProps {
  queue: QueueEmployee[];
  onCompleteTurn: (turnId: string) => void;
}

export function QueueList({ queue, onCompleteTurn }: QueueListProps) {
  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-center py-4">
            No employees clocked in
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {queue.map((item, index) => (
          <div
            key={item.employee.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              index === 0 && !item.isInProgress
                ? "bg-blue-50 border-blue-200"
                : item.isInProgress
                ? "bg-amber-50 border-amber-200"
                : "bg-zinc-50 border-zinc-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border text-sm font-semibold">
                {index + 1}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-400" />
                  {item.employee.full_name}
                </div>
                <div className="text-sm text-zinc-500">
                  {item.completedTurns} turns
                  {item.halfTurnCredits > 0 && ` + ${item.halfTurnCredits * 2}/2`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {index === 0 && !item.isInProgress && (
                <Badge className="bg-blue-500 hover:bg-blue-600">NEXT</Badge>
              )}
              {item.isInProgress && (
                <>
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-700"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {item.currentTurn?.is_half_turn ? "Half" : "Busy"}
                  </Badge>
                  {item.currentTurn && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onCompleteTurn(item.currentTurn!.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  )}
                </>
              )}
              {!item.isInProgress && index !== 0 && (
                <Badge variant="secondary">Available</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
