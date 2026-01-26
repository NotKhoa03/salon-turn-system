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
import { toast, Toaster } from "sonner";
import type { Employee } from "@/lib/types/database";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ full_name: "", display_order: "" });
  const supabase = createClient();

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("display_order", { ascending: true });
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      full_name: formData.full_name,
      display_order: formData.display_order ? parseInt(formData.display_order) : null,
    };

    if (editingEmployee) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("employees")
        .update(payload)
        .eq("id", editingEmployee.id);

      if (error) {
        toast.error("Failed to update employee");
      } else {
        toast.success("Employee updated");
        fetchEmployees();
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("employees").insert(payload);

      if (error) {
        toast.error("Failed to create employee");
      } else {
        toast.success("Employee created");
        fetchEmployees();
      }
    }

    setDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ full_name: "", display_order: "" });
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      display_order: employee.display_order?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (employee: Employee) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("employees")
      .update({ is_active: !employee.is_active })
      .eq("id", employee.id);

    if (error) {
      toast.error("Failed to update employee");
    } else {
      toast.success(
        employee.is_active ? "Employee deactivated" : "Employee activated"
      );
      fetchEmployees();
    }
  };

  const openNewDialog = () => {
    setEditingEmployee(null);
    setFormData({ full_name: "", display_order: "" });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order (optional)</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                {editingEmployee ? "Update" : "Create"}
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
                <TableHead>Name</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.full_name}
                  </TableCell>
                  <TableCell>{employee.display_order || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.is_active ? "default" : "secondary"}
                    >
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(employee)}
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
