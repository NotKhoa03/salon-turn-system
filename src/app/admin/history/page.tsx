"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import type { TurnWithDetails } from "@/lib/hooks/use-turns";
import { CalendarIcon, Download } from "lucide-react";
import { format, subDays } from "date-fns";

export default function HistoryPage() {
  const [turns, setTurns] = useState<TurnWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const supabase = createClient();

  const fetchTurns = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("turns")
      .select(
        `
        *,
        employee:employees(*),
        service:services(*)
      `
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    setTurns((data as TurnWithDetails[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTurns();
  }, [startDate, endDate]);

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee",
      "Service",
      "Price",
      "Turn Type",
      "Status",
      "Started",
      "Completed",
    ];

    const rows = turns.map((turn) => [
      format(new Date(turn.created_at), "yyyy-MM-dd"),
      turn.employee.full_name,
      turn.service.name,
      turn.service.price.toFixed(2),
      turn.is_half_turn ? "Half" : "Full",
      turn.status,
      format(new Date(turn.started_at), "HH:mm"),
      turn.completed_at ? format(new Date(turn.completed_at), "HH:mm") : "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `turn-history-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    toast.success("History exported to CSV");
  };

  // Calculate totals
  const totalRevenue = turns
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.service.price, 0);
  const totalTurns = turns.filter((t) => t.status === "completed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Turn History</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(startDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-zinc-500">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(endDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-zinc-500">Total Revenue</div>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-zinc-500">Completed Turns</div>
          <div className="text-2xl font-bold">{totalTurns}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-zinc-500">Loading...</div>
      ) : turns.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No turns found in the selected date range
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Turn Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turns.map((turn) => (
                <TableRow key={turn.id}>
                  <TableCell>
                    {format(new Date(turn.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {turn.employee.full_name}
                  </TableCell>
                  <TableCell>{turn.service.name}</TableCell>
                  <TableCell>${turn.service.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={turn.is_half_turn ? "secondary" : "default"}>
                      {turn.is_half_turn ? "Half" : "Full"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        turn.status === "completed" ? "default" : "outline"
                      }
                      className={
                        turn.status === "completed"
                          ? "bg-green-500"
                          : "border-amber-500 text-amber-700"
                      }
                    >
                      {turn.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(turn.started_at), "h:mm a")}
                    {turn.completed_at && (
                      <span className="text-zinc-500">
                        {" "}
                        - {format(new Date(turn.completed_at), "h:mm a")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
