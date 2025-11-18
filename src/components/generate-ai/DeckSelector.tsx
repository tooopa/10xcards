import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, Plus, Users } from "lucide-react";
import type { DeckDto } from "../../types";

interface DeckSelectorProps {
  selectedDeckId: string;
  onDeckChange: (deckId: string) => void;
  availableDecks: DeckDto[];
  error?: string;
}

export function DeckSelector({ selectedDeckId, onDeckChange, availableDecks, error }: DeckSelectorProps) {
  const selectedDeck = availableDecks.find((deck) => deck.id === selectedDeckId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Talia docelowa *</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            // TODO: Navigate to create deck page
            console.log("Navigate to create deck");
          }}
        >
          <Plus className="mr-2 h-3 w-3" />
          Nowa talia
        </Button>
      </div>

      <Select value={selectedDeckId} onValueChange={onDeckChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="Wybierz talię docelową..." />
        </SelectTrigger>
        <SelectContent>
          {availableDecks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id}>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{deck.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {deck.flashcard_count} fiszek • {deck.visibility === "private" ? "Prywatna" : "Publiczna"}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDeck && (
        <Card className="mt-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">{selectedDeck.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedDeck.flashcard_count} fiszek
                    {selectedDeck.is_default && " • Domyślna"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedDeck.visibility === "private" ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Prywatna
                  </span>
                ) : (
                  "Publiczna"
                )}
              </div>
            </div>
            {selectedDeck.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{selectedDeck.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {availableDecks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="mx-auto h-8 w-8 mb-2" />
          <p>Brak dostępnych talii</p>
          <p className="text-xs mt-1">Utwórz swoją pierwszą talię, aby móc generować fiszki</p>
        </div>
      )}
    </div>
  );
}
