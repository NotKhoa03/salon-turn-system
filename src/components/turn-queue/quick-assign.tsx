"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Service } from "@/lib/types/database";
import type { QueueEmployee } from "@/lib/hooks/use-queue";
import { Target, AlertCircle } from "lucide-react";

interface QuickAssignProps {
  services: Service[];
  nextEmployee: QueueEmployee | null;
  onAssign: (serviceId: string, service: Service) => Promise<{ error: unknown }>;
  loading?: boolean;
}

export function QuickAssign({
  services,
  nextEmployee,
  onAssign,
  loading,
}: QuickAssignProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const handleAssign = async () => {
    if (!selectedServiceId || !selectedService) return;

    setAssigning(true);
    await onAssign(selectedServiceId, selectedService);
    setAssigning(false);
    setSelectedServiceId("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Quick Assign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!nextEmployee ? (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">No available employees</span>
          </div>
        ) : (
          <div className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-lg">
            Next up: <span className="font-semibold">{nextEmployee.employee.full_name}</span>
          </div>
        )}

        <Select
          value={selectedServiceId}
          onValueChange={setSelectedServiceId}
          disabled={!nextEmployee || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a service..." />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{service.name}</span>
                  <span className="text-zinc-500">
                    ${service.price.toFixed(2)}
                    {service.is_half_turn && " (half)"}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="w-full"
          size="lg"
          disabled={!selectedServiceId || !nextEmployee || assigning || loading}
          onClick={handleAssign}
        >
          {assigning ? "Assigning..." : "Assign Next"}
        </Button>
      </CardContent>
    </Card>
  );
}
