import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Link } from "@tanstack/react-router";
import { Plus, ArrowLeft } from "lucide-react";
import { BarDataTable } from "../model-components/bar/bar.data-table";
import { BarCreateForm } from "../model-components/bar/bar.create";
import { Bar as BaseBar, CreateBar } from "@workspace/models";
import { getTransactionApiBase } from "../env-vars";

interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface Bar extends BaseBar {
  foo?: Foo;
}

const fetchFoos = async (): Promise<Foo[]> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  const result = await response.json();
  // The API returns { data: Foo[], pagination: {...} }
  return result.data || [];
};

const updateBar = async ({
  id,
  data,
}: {
  id: string;
  data: CreateBar;
}): Promise<Bar> => {
  const response = await fetch(`${API_BASE}/bar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update bar");
  return response.json();
};

const deleteBar = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/bar/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete bar");
};

function BarManagement() {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [formData, setFormData] = useState<CreateBar>({
    fooId: "",
    value: 0,
    label: "",
    notes: "",
    isEnabled: true,
  });

  // Queries
  const {
    data: foos = [],
    isLoading: foosLoading,
    error: foosError,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: updateBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      setIsEditOpen(false);
      setEditingBar(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
    },
  });

  const resetForm = () => {
    setFormData({
      fooId: "",
      value: 0,
      label: "",
      notes: "",
      isEnabled: true,
    });
  };

  const handleEdit = (bar: Bar) => {
    setEditingBar(bar);
    setFormData({
      fooId: bar.fooId,
      value: bar.value,
      label: bar.label || "",
      notes: bar.notes || "",
      isEnabled: bar.isEnabled,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBar) {
      updateMutation.mutate({ id: editingBar.id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this bar?")) return;
    deleteMutation.mutate(id);
  };

  const isSubmitting = updateMutation.isPending;
  const mutationError = updateMutation.error || deleteMutation.error;

  return (
    <div className="grid grid-cols-12 px-4 lg:px-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between col-span-12">
        <div className="flex items-center space-x-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Bar Management</h1>
            <p className="text-muted-foreground">Create and manage your bars</p>
          </div>
        </div>
        <BarCreateForm />
      </div>

      {/* Error Display */}
      {(mutationError || foosError) && (
        <div className="col-span-12">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800">
                {mutationError?.message ||
                  foosError?.message ||
                  "An error occurred"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Foo Link */}
      {foos.length === 0 && (
        <div className="col-span-12">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <p className="text-yellow-800 mb-2">
                You need to create some foos first before creating bars.
              </p>
              <Link to="/foo">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Foos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <div className="col-span-12">
        <BarDataTable />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bar</DialogTitle>
            <DialogDescription>Update the bar details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fooId">Associated Foo *</Label>
              <Select
                value={formData.fooId}
                onValueChange={(value) =>
                  setFormData({ ...formData, fooId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {foos.map((foo) => (
                    <SelectItem key={foo.id} value={foo.id}>
                      {foo.name} ({foo.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={formData.label || ""}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value *</Label>
              <Input
                id="edit-value"
                type="number"
                step="1"
                value={formData.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isEnabled"
                checked={formData.isEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, isEnabled: e.target.checked })
                }
              />
              <Label htmlFor="edit-isEnabled">Is Enabled</Label>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isSubmitting || !formData.fooId}>
                {isSubmitting ? "Updating..." : "Update"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingBar(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/bar")({
  component: BarManagement,
});
