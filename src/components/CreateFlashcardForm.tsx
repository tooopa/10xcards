import { useState } from "react";
import { toast } from "sonner";
import type { CreateFlashcardCommand } from "@/types";

interface CreateFlashcardFormProps {
  deckId: string;
  onSuccess: () => void;
}

export function CreateFlashcardForm({ deckId, onSuccess }: CreateFlashcardFormProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});

  const validateForm = () => {
    const newErrors: { front?: string; back?: string } = {};

    if (!front.trim()) {
      newErrors.front = "Front text is required";
    } else if (front.trim().length < 1 || front.trim().length > 200) {
      newErrors.front = "Front text must be between 1 and 200 characters";
    }

    if (!back.trim()) {
      newErrors.back = "Back text is required";
    } else if (back.trim().length < 1 || back.trim().length > 500) {
      newErrors.back = "Back text must be between 1 and 500 characters";
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
      const flashcardData: CreateFlashcardCommand = {
        deck_id: deckId,
        front: front.trim(),
        back: back.trim(),
      };

      const response = await fetch("/api/v1/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flashcardData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          // Handle validation errors
          const fieldErrors: { front?: string; back?: string } = {};
          if (errorData.error?.details) {
            errorData.error.details.forEach((detail: string) => {
              if (detail.includes("front")) {
                fieldErrors.front = detail;
              } else if (detail.includes("back")) {
                fieldErrors.back = detail;
              }
            });
          }
          setErrors(fieldErrors);
          return;
        }
        throw new Error(errorData.error?.message || "Failed to create flashcard");
      }

      const newFlashcard = await response.json();
      toast.success("Flashcard created successfully!");

      // Reset form
      setFront("");
      setBack("");
      setErrors({});

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create flashcard");
      console.error("Create flashcard error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="flashcard-front" className="block text-sm font-medium text-foreground mb-2">
          Front (Question) *
        </label>
        <textarea
          id="flashcard-front"
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
            if (errors.front) {
              setErrors({ ...errors, front: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
            errors.front ? "border-destructive" : "border-input"
          }`}
          placeholder="Enter the question or front of the flashcard"
          rows={3}
          disabled={isLoading}
          required
        />
        {errors.front && (
          <p className="text-sm text-destructive mt-1">{errors.front}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {front.length}/200 characters
        </p>
      </div>

      <div>
        <label htmlFor="flashcard-back" className="block text-sm font-medium text-foreground mb-2">
          Back (Answer) *
        </label>
        <textarea
          id="flashcard-back"
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
            if (errors.back) {
              setErrors({ ...errors, back: undefined });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
            errors.back ? "border-destructive" : "border-input"
          }`}
          placeholder="Enter the answer or back of the flashcard"
          rows={4}
          disabled={isLoading}
          required
        />
        {errors.back && (
          <p className="text-sm text-destructive mt-1">{errors.back}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {back.length}/500 characters
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating..." : "Create Flashcard"}
        </button>
      </div>
    </form>
  );
}
