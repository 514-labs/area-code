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
import { FooDataTable } from "../model-components/foo/foo.data-table";
import { FooCreateForm } from "../model-components/foo/foo.create";
import { Foo, FooStatus, CreateFoo } from "@workspace/models";

const API_BASE = import.meta.env.VITE_API_BASE;

// API Functions
const fetchFoos = async (): Promise<Foo[]> => {
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

const updateFoo = async ({
  id,
  data,
}: {
  id: string;
  data: CreateFoo;
}): Promise<Foo> => {
  const response = await fetch(`${API_BASE}/foo/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update foo");
  return response.json();
};

const deleteFoo = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/foo/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete foo");
};

function FooManagement() {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFoo, setEditingFoo] = useState<Foo | null>(null);
  const [formData, setFormData] = useState<CreateFoo>({
    name: "",
    description: "",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
  });

  // Queries
  const {
    data: foos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: updateFoo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
      setIsEditOpen(false);
      setEditingFoo(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: FooStatus.ACTIVE,
      priority: 1,
      isActive: true,
    });
  };

  const handleEdit = (foo: Foo) => {
    setEditingFoo(foo);
    setFormData({
      name: foo.name,
      description: foo.description || "",
      status: foo.status,
      priority: foo.priority,
      isActive: foo.isActive,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFoo) {
      updateMutation.mutate({ id: editingFoo.id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this foo?")) return;
    deleteMutation.mutate(id);
  };

  const isSubmitting = updateMutation.isPending;
  const mutationError = updateMutation.error || deleteMutation.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card>
          <CardContent className="p-6">
            <p>Loading foos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">Foo Management</h1>
            <p className="text-muted-foreground">Create and manage your foos</p>
          </div>
        </div>
        <FooCreateForm />
      </div>

      {/* Data Table */}
      {foos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No foos found</p>
          <FooCreateForm
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create your first foo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="col-span-12">
          <FooDataTable data={foos} />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Foo</DialogTitle>
            <DialogDescription>Update the foo details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as FooStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FooStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={FooStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={FooStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={FooStatus.ARCHIVED}>Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Input
                id="edit-priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <Label htmlFor="edit-isActive">Is Active</Label>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isSubmitting || !formData.name}>
                {isSubmitting ? "Updating..." : "Update"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingFoo(null);
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

export const Route = createFileRoute("/foo")({
  component: FooManagement,
});
