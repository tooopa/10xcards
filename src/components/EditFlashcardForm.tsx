import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { FlashcardDto, UpdateFlashcardCommand } from "@/types";

interface EditFlashcardFormProps {
  flashcard: FlashcardDto;
  onSuccess: () => void;
}

export function EditFlashcardForm({ flashcard, onSuccess }: EditFlashcardFormProps) {
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});

  // Update form when flashcard changes
  useEffect(() => {
    setFront(flashcard.front);
    setBack(flashcard.back);
  }, [flashcard]);

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

    // Check if anything changed
    if (front.trim() === flashcard.front && back.trim() === flashcard.back) {
      toast.info("No changes made");
      onSuccess();
      return;
    }

    setIsLoading(true);

    try {
      const updateData: UpdateFlashcardCommand = {};

      if (front.trim() !== flashcard.front) {
        updateData.front = front.trim();
      }

      if (back.trim() !== flashcard.back) {
        updateData.back = back.trim();
      }

      const response = await fetch(`/api/v1/flashcards/${flashcard.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
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
        throw new Error(errorData.error?.message || "Failed to update flashcard");
      }

      const updatedFlashcard = await response.json();

      // Show appropriate message based on source change
      const sourceChanged = updatedFlashcard.source !== flashcard.source;
      if (sourceChanged && updatedFlashcard.source === "ai-edited") {
        toast.success("Flashcard updated successfully! Source changed to 'ai-edited' due to manual changes.");
      } else {
        toast.success("Flashcard updated successfully!");
      }

      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update flashcard");
      console.error("Update flashcard error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        <strong>Current source:</strong> {flashcard.source}
        {flashcard.source === "ai-full" && (
          <div className="text-warning mt-1">
            ⚠️ Editing will change source to "ai-edited"
          </div>
        )}
      </div>

      <div>
        <label htmlFor="edit-flashcard-front" className="block text-sm font-medium text-foreground mb-2">
          Front (Question)
        </label>
        <textarea
          id="edit-flashcard-front"
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
        />
        {errors.front && (
          <p className="text-sm text-destructive mt-1">{errors.front}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {front.length}/200 characters
        </p>
      </div>

      <div>
        <label htmlFor="edit-flashcard-back" className="block text-sm font-medium text-foreground mb-2">
          Back (Answer)
        </label>
        <textarea
          id="edit-flashcard-back"
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
          {isLoading ? "Updating..." : "Update Flashcard"}
        </button>
      </div>
    </form>
  );
}
