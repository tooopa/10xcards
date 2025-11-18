import { useState } from "react";
import { toast } from "sonner";
import type { CreateDeckCommand } from "@/types";

interface CreateDeckFormProps {
  onSuccess: () => void;
}

export function CreateDeckForm({ onSuccess }: CreateDeckFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Deck name is required";
    } else if (name.trim().length < 1 || name.trim().length > 100) {
      newErrors.name = "Deck name must be between 1 and 100 characters";
    }

    if (description && description.length > 5000) {
      newErrors.description = "Description must not exceed 5000 characters";
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
      const deckData: CreateDeckCommand = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      const response = await fetch("/api/v1/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deckData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setErrors({ name: "A deck with this name already exists" });
          return;
        }
        throw new Error(errorData.error?.message || "Failed to create deck");
      }

      const newDeck = await response.json();
      toast.success(`Deck "${newDeck.name}" created successfully!`);

      // Reset form
      setName("");
      setDescription("");
      setErrors({});

      onSuccess();

      // Optionally redirect to the new deck
      window.location.href = `/decks/${newDeck.id}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create deck");
      console.error("Create deck error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="deck-name" className="block text-sm font-medium text-foreground mb-2">
          Deck Name *
        </label>
        <input
          id="deck-name"
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
          placeholder="Enter deck name"
          disabled={isLoading}
          required
        />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="deck-description" className="block text-sm font-medium text-foreground mb-2">
          Description
        </label>
        <textarea
          id="deck-description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) {
              setErrors({ ...errors, description: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
            errors.description ? "border-destructive" : "border-input"
          }`}
          placeholder="Optional description for your deck"
          rows={3}
          disabled={isLoading}
        />
        {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
        <p className="text-xs text-muted-foreground mt-1">{description.length}/5000 characters</p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating..." : "Create Deck"}
        </button>
      </div>
    </form>
  );
}
