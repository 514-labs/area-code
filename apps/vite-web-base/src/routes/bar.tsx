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
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Link } from "@tanstack/react-router";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";

interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface Bar {
  id: string;
  fooId: string;
  value: number;
  label: string | null;
  notes: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  foo?: Foo;
}

interface CreateBar {
  fooId: string;
  value: number;
  label?: string | null;
  notes?: string | null;
  isEnabled?: boolean;
}

const API_BASE = "http://localhost:8081/api";

// API Functions
const fetchBars = async (): Promise<Bar[]> => {
  const response = await fetch(`${API_BASE}/bar`);
  if (!response.ok) throw new Error("Failed to fetch bars");
  return response.json();
};

const fetchFoos = async (): Promise<Foo[]> => {
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  return response.json();
};

const createBar = async (data: CreateBar): Promise<Bar> => {
  const response = await fetch(`${API_BASE}/bar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create bar");
  return response.json();
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    data: bars = [],
    isLoading: barsLoading,
    error: barsError,
  } = useQuery({
    queryKey: ["bars"],
    queryFn: fetchBars,
  });

  const {
    data: foos = [],
    isLoading: foosLoading,
    error: foosError,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

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
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this bar?")) return;
    deleteMutation.mutate(id);
  };

  const isLoading = barsLoading || foosLoading;
  const error = barsError || foosError;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    createMutation.error || updateMutation.error || deleteMutation.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Card>
          <CardContent className="p-6">
            <p>Loading bars...</p>
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
            <h1 className="text-3xl font-bold">Bar Management</h1>
            <p className="text-muted-foreground">Create and manage your bars</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bar</DialogTitle>
              <DialogDescription>
                Add a new bar to your collection.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fooId">Associated Foo *</Label>
                <Select
                  value={formData.fooId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, fooId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a foo" />
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
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
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
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, isEnabled: e.target.checked })
                  }
                />
                <Label htmlFor="isEnabled">Is Enabled</Label>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.fooId}
                >
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

      {/* Create Foo Link */}
      {foos.length === 0 && (
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
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bars ({bars.length})</CardTitle>
          <CardDescription>Manage your bar collection</CardDescription>
        </CardHeader>
        <CardContent>
          {bars.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No bars found</p>
              {foos.length > 0 && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first bar
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Associated Foo</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bars.map((bar) => (
                  <TableRow key={bar.id}>
                    <TableCell className="font-medium">
                      {bar.label || (
                        <span className="text-muted-foreground italic">
                          No label
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{bar.value}</TableCell>
                    <TableCell>
                      {bar.foo ? (
                        <div>
                          <span className="font-medium">{bar.foo.name}</span>
                          <Badge className="ml-2 text-xs">
                            {bar.foo.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bar.notes ? (
                        <span className="text-sm">{bar.notes}</span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          No notes
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bar.isEnabled ? "default" : "secondary"}>
                        {bar.isEnabled ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bar.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(bar)}
                          disabled={isSubmitting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(bar.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bar</DialogTitle>
            <DialogDescription>Update the bar details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={formData.label || ""}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>
            <div>
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
            <div>
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
