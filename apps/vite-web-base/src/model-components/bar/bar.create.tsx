import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
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
import { Plus } from "lucide-react";
import { Bar, CreateBar } from "@workspace/models";

const API_BASE = import.meta.env.VITE_API_BASE;

interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

// API functions
const createBar = async (data: CreateBar): Promise<Bar> => {
  const response = await fetch(`${API_BASE}/bar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create bar");
  return response.json();
};

const fetchFoos = async (): Promise<Foo[]> => {
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  const result = await response.json();
  // The API returns { data: Foo[], pagination: {...} }
  return result.data || [];
};

interface BarCreateFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function BarCreateForm({ trigger, onSuccess }: BarCreateFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateBar>({
    fooId: "",
    value: 0,
    label: "",
    notes: "",
    isEnabled: true,
  });

  // Fetch foos for the dropdown
  const {
    data: foos = [],
    isLoading: foosLoading,
    error: foosError,
  } = useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });

  const createMutation = useMutation({
    mutationFn: createBar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      setIsOpen(false);
      resetForm();
      onSuccess?.();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={resetForm}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Bar</DialogTitle>
          <DialogDescription>
            Add a new bar to your collection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Associated Foo */}
          <div className="space-y-2">
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
            {foosLoading && (
              <p className="text-sm text-gray-500">Loading foos...</p>
            )}
            {foosError && (
              <p className="text-sm text-red-500">Error loading foos</p>
            )}
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={formData.label || ""}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder="Enter additional notes..."
            />
          </div>

          {/* Is Enabled */}
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

          {/* Error Display */}
          {createMutation.error && (
            <div className="text-red-500 text-sm">
              Error: {createMutation.error.message}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-2">
            <Button type="submit" disabled={isSubmitting || !formData.fooId}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
