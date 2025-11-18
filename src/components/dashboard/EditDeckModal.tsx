import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import type { DeckDto, ErrorResponse } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDeckFormSchema, type CreateDeckFormData } from "@/lib/validation/dashboard";

interface EditDeckModalProps {
  isOpen: boolean;
  deck: DeckDto | null;
  onClose: () => void;
  onSubmit: (values: CreateDeckFormData) => Promise<DeckDto>;
}

export function EditDeckModal({ isOpen, deck, onClose, onSubmit }: EditDeckModalProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setError,
  } = useForm<CreateDeckFormData>({
    resolver: zodResolver(createDeckFormSchema),
    defaultValues: {
      name: deck?.name ?? "",
      description: deck?.description ?? "",
    },
  });

  // Reset form when deck or modal visibility changes
  useEffect(() => {
    if (isOpen && deck) {
      reset({ name: deck.name, description: deck.description ?? "" });
    }
  }, [deck, isOpen, reset]);

  const descriptionLength = watch("description")?.length ?? 0;

  const onFormSubmit = async (values: CreateDeckFormData) => {
    setGeneralError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      const typedError = error as ErrorResponse | undefined;
      const errorCode = typedError?.error?.code;
      const errorMessage =
        typedError?.error?.message ?? "Wystąpił błąd podczas aktualizacji talii. Spróbuj ponownie.";

      if (errorCode === "duplicate_deck") {
        setError("name", { type: "server", message: "Talia o tej nazwie już istnieje" });
        return;
      }

      setGeneralError(errorMessage);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      setGeneralError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj talię</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name-edit">Nazwa talii *</Label>
              <Input
                id="deck-name-edit"
                {...register("name")}
                placeholder="Nazwa talii"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "deck-name-error-edit" : undefined}
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive" id="deck-name-error-edit">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck-description-edit">Opis talii</Label>
              <Textarea
                id="deck-description-edit"
                {...register("description")}
                placeholder="Opcjonalny opis talii..."
                rows={3}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.description)}
                aria-describedby="deck-description-counter-edit"
                className={errors.description ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <div id="deck-description-counter-edit" className="text-xs text-muted-foreground text-right">
                {descriptionLength}/5000 znaków
              </div>
              {errors.description && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>

            {generalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
