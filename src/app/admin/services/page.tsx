"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast, Toaster } from "sonner";
import type { Service } from "@/lib/types/database";
import { Plus, Pencil, Trash2, Check } from "lucide-react";

const COLOR_OPTIONS = [
  { value: "green", label: "Green", bg: "bg-green-100", border: "border-green-400", text: "text-green-600" },
  { value: "blue", label: "Blue", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-600" },
  { value: "purple", label: "Purple", bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-600" },
  { value: "pink", label: "Pink", bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-600" },
  { value: "orange", label: "Orange", bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-600" },
  { value: "red", label: "Red", bg: "bg-red-100", border: "border-red-400", text: "text-red-600" },
  { value: "yellow", label: "Yellow", bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-600" },
  { value: "teal", label: "Teal", bg: "bg-teal-100", border: "border-teal-400", text: "text-teal-600" },
] as const;

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", color: "green", isHalfTurn: false });
  const supabase = createClient();

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true });
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(formData.price);
    const payload = {
      name: formData.name,
      price,
      is_half_turn: formData.isHalfTurn,
      color: formData.color,
    };

    if (editingService) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("services")
        .update(payload)
        .eq("id", editingService.id);

      if (error) {
        toast.error("Failed to update service");
      } else {
        toast.success("Service updated");
        fetchServices();
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("services").insert(payload);

      if (error) {
        toast.error("Failed to create service");
      } else {
        toast.success("Service created");
        fetchServices();
      }
    }

    setDialogOpen(false);
    setEditingService(null);
    setFormData({ name: "", price: "", color: "green", isHalfTurn: false });
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      color: service.color || "green",
      isHalfTurn: service.is_half_turn,
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (service: Service) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      toast.error("Failed to update service");
    } else {
      toast.success(
        service.is_active ? "Service deactivated" : "Service activated"
      );
      fetchServices();
    }
  };

  const openNewDialog = () => {
    setEditingService(null);
    setFormData({ name: "", price: "", color: "green", isHalfTurn: false });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add Service"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="half-turn">Half Turn</Label>
                  <p className="text-sm text-zinc-500">
                    Half turns pair together as one full turn
                  </p>
                </div>
                <Switch
                  id="half-turn"
                  checked={formData.isHalfTurn}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, isHalfTurn: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Grid Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-10 rounded-md border-2 ${color.bg} ${color.border} flex items-center justify-center transition-all ${
                        formData.color === color.value ? "ring-2 ring-offset-2 ring-zinc-900" : ""
                      }`}
                    >
                      {formData.color === color.value && (
                        <Check className={`h-4 w-4 ${color.text}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingService ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-zinc-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Turn Type</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>${service.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={service.is_half_turn ? "secondary" : "default"}>
                      {service.is_half_turn ? "Half Turn" : "Full Turn"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const colorOption = COLOR_OPTIONS.find(c => c.value === (service.color || "green"));
                      return colorOption ? (
                        <div className={`h-6 w-6 rounded border-2 ${colorOption.bg} ${colorOption.border}`} />
                      ) : null;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(service)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
