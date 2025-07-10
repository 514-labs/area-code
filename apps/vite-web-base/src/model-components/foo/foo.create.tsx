import { useState } from "react";
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

const API_BASE = import.meta.env.VITE_API_BASE;

// API function for creating foo
const createFoo = async (data: CreateFoo): Promise<Foo> => {
  const response = await fetch(`${API_BASE}/foo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create foo");
  return response.json();
};

interface FooCreateFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function FooCreateForm({ trigger, onSuccess }: FooCreateFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateFoo>({
    name: "",
    description: "",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
    metadata: {},
    tags: [],
    score: 0,
    largeText: "",
  });
  const [newTag, setNewTag] = useState("");
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  const createMutation = useMutation({
    mutationFn: createFoo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
      setIsOpen(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: FooStatus.ACTIVE,
      priority: 1,
      isActive: true,
      metadata: {},
      tags: [],
      score: 0,
      largeText: "",
    });
    setNewTag("");
    setMetadataKey("");
    setMetadataValue("");
  };

  const handleSubmit = (e: React.FormEvent) => {
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
          <Button onClick={resetForm}>
            <Plus className="h-4 w-4 mr-2" />
            Create Foo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Foo</DialogTitle>
          <DialogDescription>
            Add a new foo to your collection with all the details.
          </DialogDescription>
        </DialogHeader>
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
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
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
            />
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              step="0.01"
              value={formData.score}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  score: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          {/* Is Active */}
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

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label>Metadata</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="Key"
                value={metadataKey}
                onChange={(e) => setMetadataKey(e.target.value)}
              />
              <Input
                placeholder="Value"
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
              />
              <Button type="button" onClick={addMetadata} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {Object.entries(formData.metadata || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm">
                    <strong>{key}:</strong> {String(value)}
                  </span>
                  <X
                    className="h-4 w-4 cursor-pointer text-red-500"
                    onClick={() => removeMetadata(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Large Text */}
          <div className="space-y-2">
            <Label htmlFor="largeText">Large Text</Label>
            <Textarea
              id="largeText"
              value={formData.largeText || ""}
              onChange={(e) =>
                setFormData({ ...formData, largeText: e.target.value })
              }
              rows={4}
              placeholder="Enter large text content here..."
            />
          </div>

          {/* Error Display */}
          {createMutation.error && (
            <div className="text-red-500 text-sm">
              Error: {createMutation.error.message}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-2">
            <Button type="submit" disabled={isSubmitting || !formData.name}>
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
