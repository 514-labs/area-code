import { FormEvent, ReactNode, useState } from "react";
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
import { Bar, CreateBar, anonymousBar } from "@workspace/models";
import { getTransactionApiBase } from "../../env-vars";
import { useAuth } from "../../auth/auth-context";

interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

const createBar = async (data: CreateBar): Promise<Bar> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/bar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create bar");
  return response.json();
};

const createAnonymousBar = async (): Promise<Bar> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/bar/anonymous-create`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to create anonymous bar");
  return response.json();
};

const fetchFoos = async (): Promise<Foo[]> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/foo`);
  if (!response.ok) throw new Error("Failed to fetch foos");
  const result = await response.json();
  // The API returns { data: Foo[], pagination: {...} }
  return result.data || [];
};

interface BarCreateFormProps {
  trigger?: ReactNode;
  onSuccess?: () => void;
}

export function BarCreateForm({ trigger, onSuccess }: BarCreateFormProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState<CreateBar>(
    isAdmin
      ? {
          foo_id: "",
          value: 0,
          label: "",
          notes: "",
          is_enabled: true,
        }
      : anonymousBar
  );

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
    mutationFn: isAdmin ? createBar : () => createAnonymousBar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      setIsOpen(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setFormData(
      isAdmin
        ? {
            foo_id: "",
            value: 0,
            label: "",
            notes: "",
            is_enabled: true,
          }
        : anonymousBar
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={resetForm} variant="secondary">
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
        {!isAdmin && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              As an anonymous user, this form is pre-filled with demo data. You
              can click the create button to test CDC updates with the anonymous
              bar.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Associated Foo */}
          <div className="space-y-2">
            <Label htmlFor="foo_id">Associated Foo *</Label>
            <Select
              value={formData.foo_id}
              onValueChange={(value) =>
                setFormData({ ...formData, foo_id: value })
              }
              disabled={!isAdmin}
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
              disabled={!isAdmin}
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Value *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              required
              disabled={!isAdmin}
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
              disabled={!isAdmin}
            />
          </div>

          {/* Is Enabled */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_enabled"
              checked={formData.is_enabled}
              onChange={(e) =>
                setFormData({ ...formData, is_enabled: e.target.checked })
              }
              disabled={!isAdmin}
            />
            <Label htmlFor="is_enabled">Is Enabled</Label>
          </div>

          {/* Error Display */}
          {createMutation.error && (
            <div className="text-red-500 text-sm">
              Error: {createMutation.error.message}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.foo_id}>
              {isSubmitting ? "Creating..." : "Create Bar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
