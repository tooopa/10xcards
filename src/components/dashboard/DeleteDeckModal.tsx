import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, FolderOpen, FileText, Trash2 } from "lucide-react";
import type { DeckDto } from "@/types";
import { Logger } from "@/lib/logger";

interface DeleteDeckModalProps {
  isOpen: boolean;
  deck: DeckDto | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const deleteDeckLogger = new Logger("DeleteDeckModal");

export function DeleteDeckModal({ isOpen, deck, onClose, onConfirm }: DeleteDeckModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!deck || isDeleting) return;

    setIsDeleting(true);
    setFeedbackMessage(null);
    try {
      await onConfirm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Nie udało się usunąć talii.";
      setFeedbackMessage(errorMessage);
      const errorForLog = error instanceof Error ? error : new Error("Unknown error while confirming deck deletion.");
      deleteDeckLogger.error(errorForLog, { deckId: deck?.id });
    } finally {
      setIsDeleting(false);
    }
  };

  const isDefaultDeck = deck?.is_default;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Usuń talię
          </DialogTitle>
        </DialogHeader>

        {deck && (
          <div className="space-y-4">
            {/* Deck Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <FolderOpen className="h-8 w-8 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{deck.name}</h3>
                    {deck.description && <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{deck.flashcard_count} fiszek</span>
                      </div>
                      <Badge variant={deck.is_default ? "default" : "secondary"}>
                        {deck.is_default ? "Domyślna" : "Zwykła"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isDefaultDeck ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Talia domyślna nie może zostać usunięta.</strong>
                  <br />
                  Jest to specjalna talia systemowa, która przechowuje fiszki bez przypisanej talii.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Czy na pewno chcesz usunąć tę talię?</strong>
                    <br />
                    Ta akcja jest nieodwracalna. Wszystkie fiszki w tej talii zostaną przeniesione do domyślnej talii
                    &quot;Uncategorized&quot;.
                  </AlertDescription>
                </Alert>

                {deck.flashcard_count > 0 && (
                  <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Migracja fiszek</p>
                    <p className="mt-1">
                      {deck.flashcard_count} fiszek zostanie przeniesionych do domyślnej talii. Wszystkie tagi zostaną
                      zachowane i oznaczone tagiem migracji.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {feedbackMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription aria-live="assertive">{feedbackMessage}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Anuluj
          </Button>
          {!isDefaultDeck && (
            <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń talię
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
