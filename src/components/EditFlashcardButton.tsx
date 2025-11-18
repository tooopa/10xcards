import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EditFlashcardForm } from "./EditFlashcardForm";
import type { FlashcardDto } from "@/types";

interface EditFlashcardButtonProps {
  flashcard: FlashcardDto;
  onSuccess?: () => void;
}

export function EditFlashcardButton({ flashcard, onSuccess }: EditFlashcardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Edit Flashcard
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
        </DialogHeader>
        <EditFlashcardForm flashcard={flashcard} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
