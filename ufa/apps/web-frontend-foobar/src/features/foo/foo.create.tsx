import { FormEvent, ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@workspace/ui/components/badge";
import { Plus, X } from "lucide-react";
import { Foo, FooStatus, CreateFoo } from "@workspace/models";
import { getTransactionApiBase } from "../../env-vars";
import { useAuth } from "../../auth/auth-context";

export const anonymousFoo: CreateFoo = {
  name: "Anonymous Demo Foo",
  description:
    "This is a demo foo created by an anonymous user to test CDC functionality",
  status: "active" as FooStatus,
  priority: 42,
  is_active: true,
  metadata: {
    source: "anonymous",
    demo: true,
    timestamp: new Date().toISOString(),
  },
  tags: ["demo", "anonymous", "test"],
  score: 88.5,
  large_text:
    "This is some sample large text content for the anonymous demo foo. It demonstrates how the CDC system works when anonymous users create new records.",
};

const createFoo = async (data: CreateFoo): Promise<Foo> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/foo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create foo");
  return response.json();
};

const createAnonymousFoo = async (): Promise<Foo> => {
  const API_BASE = getTransactionApiBase();
  const response = await fetch(`${API_BASE}/foo/anonymous-create`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to create anonymous foo");
  return response.json();
};

interface FooCreateFormProps {
  trigger?: ReactNode;
  onSuccess?: () => void;
}

export function FooCreateForm({ trigger, onSuccess }: FooCreateFormProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState<CreateFoo>(
    isAdmin
      ? {
          name: "",
          description: "",
          status: FooStatus.ACTIVE,
          priority: 1,
          is_active: true,
          metadata: {},
          tags: [],
          score: 0,
          large_text: "",
        }
      : anonymousFoo
  );
  const [newTag, setNewTag] = useState("");
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  const createMutation = useMutation({
    mutationFn: isAdmin ? createFoo : () => createAnonymousFoo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
      setIsOpen(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setFormData(
      isAdmin
        ? {
            name: "",
            description: "",
            status: FooStatus.ACTIVE,
            priority: 1,
            is_active: true,
            metadata: {},
            tags: [],
            score: 0,
            large_text: "",
          }
        : anonymousFoo
    );
    setNewTag("");
    setMetadataKey("");
    setMetadataValue("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const addMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          [metadataKey.trim()]: metadataValue.trim(),
        },
      });
      setMetadataKey("");
      setMetadataValue("");
    }
  };

  const removeMetadata = (keyToRemove: string) => {
    const newMetadata = { ...formData.metadata };
    delete newMetadata[keyToRemove];
    setFormData({
      ...formData,
      metadata: newMetadata,
    });
  };

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={resetForm} variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Create Foo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Foo</DialogTitle>
          <DialogDescription>
            Add a new foo to your collection.
          </DialogDescription>
        </DialogHeader>
        {!isAdmin && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              As an anonymous user, this form is pre-filled with demo data. You
              can click the create button to test CDC updates with the anonymous
              foo.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={!isAdmin}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              disabled={!isAdmin}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: FooStatus) =>
                setFormData({ ...formData, status: value })
              }
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FooStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={FooStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={FooStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={FooStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
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
              disabled={!isAdmin}
            />
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              step="0.1"
              value={formData.score}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  score: parseFloat(e.target.value) || 0,
                })
              }
              disabled={!isAdmin}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              disabled={!isAdmin}
            />
            <Label htmlFor="is_active">Is Active</Label>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={!isAdmin}
              />
              <Button type="button" onClick={addTag} disabled={!isAdmin}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  {isAdmin && (
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label>Metadata</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Key"
                value={metadataKey}
                onChange={(e) => setMetadataKey(e.target.value)}
                disabled={!isAdmin}
              />
              <Input
                placeholder="Value"
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
                disabled={!isAdmin}
              />
              <Button type="button" onClick={addMetadata} disabled={!isAdmin}>
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {Object.entries(formData.metadata || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">
                    <strong>{key}:</strong> {String(value)}
                  </span>
                  {isAdmin && (
                    <X
                      className="h-4 w-4 cursor-pointer text-red-500"
                      onClick={() => removeMetadata(key)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Large Text */}
          <div className="space-y-2">
            <Label htmlFor="large_text">Large Text</Label>
            <Textarea
              id="large_text"
              value={formData.large_text || ""}
              onChange={(e) =>
                setFormData({ ...formData, large_text: e.target.value })
              }
              rows={4}
              disabled={!isAdmin}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? "Creating..." : "Create Foo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
