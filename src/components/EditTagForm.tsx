import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { TagWithUsageDto, UpdateTagCommand } from "@/types";

interface EditTagFormProps {
  tag: TagWithUsageDto;
  onSuccess: () => void;
}

export function EditTagForm({ tag, onSuccess }: EditTagFormProps) {
  const [name, setName] = useState(tag.name);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    setName(tag.name);
  }, [tag]);

  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Tag name is required";
    } else if (name.trim().length < 1 || name.trim().length > 50) {
      newErrors.name = "Tag name must be between 1 and 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if name changed
    if (name.trim() === tag.name) {
      toast.info("No changes made");
      onSuccess();
      return;
    }

    setIsLoading(true);

    try {
      const updateData: UpdateTagCommand = {
        name: name.trim(),
      };

      const response = await fetch(`/api/v1/tags/${tag.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setErrors({ name: "A tag with this name already exists in this deck" });
          return;
        }
        if (response.status === 400) {
          // Handle validation errors
          const fieldErrors: { name?: string } = {};
          if (errorData.error?.details) {
            errorData.error.details.forEach((detail: string) => {
              if (detail.includes("name")) {
                fieldErrors.name = detail;
              }
            });
          }
          setErrors(fieldErrors);
          return;
        }
        throw new Error(errorData.error?.message || "Failed to update tag");
      }

      const updatedTag = await response.json();
      toast.success(`Tag updated to "${updatedTag.name}" successfully!`);

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update tag");
      console.error("Update tag error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all associated flashcards.`)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/v1/tags/${tag.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to delete tag");
      }

      toast.success(`Tag "${tag.name}" deleted successfully!`);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tag");
      console.error("Delete tag error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <strong>Scope:</strong> {tag.scope} {tag.scope === "deck" && tag.deck_id && `(Deck-specific)`}
      </div>

      <div>
        <label htmlFor="edit-tag-name" className="block text-sm font-medium text-foreground mb-2">
          Tag Name
        </label>
        <input
          id="edit-tag-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors({ ...errors, name: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.name ? "border-destructive" : "border-input"
          }`}
          placeholder="Enter tag name"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {name.length}/50 characters
        </p>
      </div>

      <div className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded-lg">
        <strong>Usage:</strong> This tag is used in {tag.usage_count} flashcard{tag.usage_count !== 1 ? 's' : ''}.
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Updating..." : "Update Tag"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
