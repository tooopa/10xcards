import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateFlashcardForm } from "./CreateFlashcardForm";

interface CreateFlashcardButtonProps {
  deckId: string;
  onSuccess?: () => void;
}

export function CreateFlashcardButton({ deckId, onSuccess }: CreateFlashcardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 rounded-full px-5">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Dodaj ręczną fiszkę
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Flashcard</DialogTitle>
        </DialogHeader>
        <CreateFlashcardForm deckId={deckId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
