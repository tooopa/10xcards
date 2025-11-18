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

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateDeckFormData) => Promise<DeckDto>;
}

export function CreateDeckModal({ isOpen, onClose, onSubmit }: CreateDeckModalProps) {
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
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset({
        name: "",
        description: "",
      });
      setGeneralError(null);
    }
  }, [isOpen, reset]);

  const descriptionLength = watch("description")?.length ?? 0;

  const onFormSubmit = async (values: CreateDeckFormData) => {
    setGeneralError(null);
    try {
      await onSubmit(values);
      reset({
        name: "",
        description: "",
      });
      onClose();
    } catch (error) {
      const typedError = error as ErrorResponse | undefined;
      const errorCode = typedError?.error?.code;
      const errorMessage = typedError?.error?.message ?? "Wystąpił błąd podczas tworzenia talii. Spróbuj ponownie.";

      if (errorCode === "duplicate_deck") {
        setError("name", { type: "server", message: "Talia o tej nazwie już istnieje" });
        return;
      }

      setGeneralError(errorMessage);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      reset({
        name: "",
        description: "",
      });
      setGeneralError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Utwórz nową talię</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">Nazwa talii *</Label>
              <Input
                id="deck-name"
                {...register("name")}
                placeholder="np. Programowanie w Python"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "deck-name-error" : undefined}
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive" id="deck-name-error">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deck-description">Opis talii</Label>
              <Textarea
                id="deck-description"
                {...register("description")}
                placeholder="Opcjonalny opis talii..."
                rows={3}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.description)}
                aria-describedby="deck-description-counter"
                className={errors.description ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <div id="deck-description-counter" className="text-xs text-muted-foreground text-right">
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
              Utwórz talię
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
