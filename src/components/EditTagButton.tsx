import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditTagForm } from "./EditTagForm";
import type { TagWithUsageDto } from "@/types";

interface EditTagButtonProps {
  tag: TagWithUsageDto;
  onSuccess: () => void;
}

export function EditTagButton({ tag, onSuccess }: EditTagButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="icon" size="icon" aria-label="Edytuj tag">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
        </DialogHeader>
        <EditTagForm tag={tag} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
