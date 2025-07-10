import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Foo, FooStatus, CreateFoo } from "@workspace/models";

const API_BASE = import.meta.env.VITE_API_BASE;

// API Functions
const fetchFoos = async (): Promise<Foo[]> => {
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

const createFoo = async (data: CreateFoo): Promise<Foo> => {
  const response = await fetch(`${API_BASE}/foo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create foo");
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
  const createMutation = useMutation({
    mutationFn: createFoo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

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
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this foo?")) return;
    deleteMutation.mutate(id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    createMutation.error || updateMutation.error || deleteMutation.error;

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Foo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Foo</DialogTitle>
              <DialogDescription>
                Add a new foo to your collection.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
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
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
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
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <Label htmlFor="isActive">Is Active</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isSubmitting || !formData.name}>
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {(error || mutationError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">
              {error?.message || mutationError?.message || "An error occurred"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Foos ({foos.length})</CardTitle>
          <CardDescription>Manage your foo collection</CardDescription>
        </CardHeader>
        <CardContent>
          {foos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No foos found</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first foo
              </Button>
            </div>
          ) : (
            <FooDataTable data={foos} />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Foo</DialogTitle>
            <DialogDescription>Update the foo details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
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
            <div>
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
