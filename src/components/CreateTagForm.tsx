import { useState } from "react";
import { toast } from "sonner";
import type { DeckDto, CreateTagCommand } from "@/types";

interface CreateTagFormProps {
  decks: DeckDto[];
  onSuccess: () => void;
}

export function CreateTagForm({ decks, onSuccess }: CreateTagFormProps) {
  const [name, setName] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; deck?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; deck?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Tag name is required";
    } else if (name.trim().length < 1 || name.trim().length > 50) {
      newErrors.name = "Tag name must be between 1 and 50 characters";
    }

    if (!selectedDeckId) {
      newErrors.deck = "Please select a deck for this tag";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const tagData: CreateTagCommand = {
        name: name.trim(),
        deck_id: selectedDeckId,
      };

      const response = await fetch("/api/v1/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setErrors({ name: "A tag with this name already exists in the selected deck" });
          return;
        }
        if (response.status === 400) {
          // Handle validation errors
          const fieldErrors: { name?: string; deck?: string } = {};
          if (errorData.error?.details) {
            errorData.error.details.forEach((detail: string) => {
              if (detail.includes("name")) {
                fieldErrors.name = detail;
              } else if (detail.includes("deck")) {
                fieldErrors.deck = detail;
              }
            });
          }
          setErrors(fieldErrors);
          return;
        }
        throw new Error(errorData.error?.message || "Failed to create tag");
      }

      const newTag = await response.json();
      toast.success(`Tag "${newTag.name}" created successfully!`);

      // Reset form
      setName("");
      setSelectedDeckId("");
      setErrors({});

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
      console.error("Create tag error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tag-name" className="block text-sm font-medium text-foreground mb-2">
          Tag Name *
        </label>
        <input
          id="tag-name"
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
          required
        />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
        <p className="text-xs text-muted-foreground mt-1">{name.length}/50 characters</p>
      </div>

      <div>
        <label htmlFor="tag-deck" className="block text-sm font-medium text-foreground mb-2">
          Deck *
        </label>
        <select
          id="tag-deck"
          value={selectedDeckId}
          onChange={(e) => {
            setSelectedDeckId(e.target.value);
            if (errors.deck) {
              setErrors({ ...errors, deck: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.deck ? "border-destructive" : "border-input"
          }`}
          disabled={isLoading}
          required
        >
          <option value="">Select a deck</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
        {errors.deck && <p className="text-sm text-destructive mt-1">{errors.deck}</p>}
      </div>

      <div className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded-lg">
        <strong>Note:</strong> Tags are scoped to specific decks. You can create the same tag name in different decks.
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating..." : "Create Tag"}
        </button>
      </div>
    </form>
  );
}
