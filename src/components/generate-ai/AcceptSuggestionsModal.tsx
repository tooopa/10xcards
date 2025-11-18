import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, FolderOpen, Tag, FileText, AlertTriangle, Plus } from "lucide-react";
import type { AcceptSuggestionsModalProps, AcceptOptions } from "../../lib/validation/generate-ai";
import type { TagDto } from "../../types";

interface DeckOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface TagOption extends TagDto {
  isSelected: boolean;
}

export function AcceptSuggestionsModal({
  isOpen,
  selectedSuggestions,
  onClose,
  onAccept,
  availableDecks,
  availableTags,
}: AcceptSuggestionsModalProps) {
  const [acceptOptions, setAcceptOptions] = useState<AcceptOptions>({
    add_tags: false,
    tag_ids: [],
    create_new_deck: false,
    target_deck_id: "",
  });

  const [newDeckName, setNewDeckName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!validateOptions()) return;

    setIsSubmitting(true);
    try {
      const finalOptions: AcceptOptions = {
        ...acceptOptions,
        new_deck_name: acceptOptions.create_new_deck ? newDeckName : undefined,
        target_deck_id: acceptOptions.create_new_deck ? undefined : acceptOptions.target_deck_id,
      };

      await onAccept(finalOptions);
      handleClose();
    } catch (error) {
      console.error("Error accepting suggestions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAcceptOptions({
      add_tags: false,
      tag_ids: [],
      create_new_deck: false,
      target_deck_id: "",
    });
    setNewDeckName("");
    setIsSubmitting(false);
    onClose();
  };

  const validateOptions = (): boolean => {
    if (acceptOptions.create_new_deck) {
      if (!newDeckName.trim()) {
        return false;
      }
    } else {
      if (!acceptOptions.target_deck_id) {
        return false;
      }
    }
    return true;
  };

  const selectedCount = selectedSuggestions.length;
  const validSuggestions = selectedSuggestions.filter((s) => s.edited.front.trim() && s.edited.back.trim());
  const invalidCount = selectedCount - validSuggestions.length;

  const totalTags = selectedSuggestions.reduce((sum, s) => sum + s.suggested_tags.length, 0);
  const averageQuality = selectedSuggestions.reduce((sum, s) => sum + s.quality_score, 0) / selectedCount;

  // Transform available decks to options
  const deckOptions: DeckOption[] = availableDecks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    isDefault: deck.is_default,
  }));

  // Transform available tags to options
  const tagOptions: TagOption[] = availableTags.map((tag) => ({
    ...tag,
    isSelected: acceptOptions.tag_ids.includes(tag.id),
  }));

  const handleTagToggle = (tagId: string) => {
    setAcceptOptions((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId) ? prev.tag_ids.filter((id) => id !== tagId) : [...prev.tag_ids, tagId],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Akceptacja fiszek
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-green-600">{validSuggestions.length}</div>
                    <div className="text-muted-foreground">prawidłowych</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium text-destructive">{invalidCount}</div>
                    <div className="text-muted-foreground">nieprawidłowych</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{totalTags}</div>
                    <div className="text-muted-foreground">sugerowanych tagów</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{Math.round(averageQuality * 100)}%</div>
                    <div className="text-muted-foreground">średnia jakość</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded text-sm">
                <p className="font-medium">Podsumowanie:</p>
                <p>
                  Akceptujesz <span className="font-semibold text-green-600">{validSuggestions.length}</span> fiszek
                  {invalidCount > 0 && (
                    <span className="text-destructive"> ({invalidCount} nieprawidłowych zostanie pominiętych)</span>
                  )}
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {invalidCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {invalidCount} fiszek ma puste pytania lub odpowiedzi i zostanie pominiętych podczas akceptacji. Tylko
                prawidłowe fiszki zostaną utworzone.
              </AlertDescription>
            </Alert>
          )}

          {/* Deck Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Gdzie utworzyć fiszki?</Label>

            <RadioGroup
              value={acceptOptions.create_new_deck ? "new" : "existing"}
              onValueChange={(value) =>
                setAcceptOptions((prev) => ({
                  ...prev,
                  create_new_deck: value === "new",
                  target_deck_id: value === "existing" ? prev.target_deck_id : "",
                }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing-deck" />
                <Label htmlFor="existing-deck" className="flex-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span>Dodaj do istniejącej talii</span>
                  </div>
                </Label>
              </div>

              {acceptOptions.create_new_deck === false && (
                <div className="ml-6 mt-2">
                  <Select
                    value={acceptOptions.target_deck_id}
                    onValueChange={(value) => setAcceptOptions((prev) => ({ ...prev, target_deck_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz talię..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deckOptions.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            <span>{deck.name}</span>
                            {deck.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Domyślna
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new-deck" />
                <Label htmlFor="new-deck" className="flex-1">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Utwórz nową talię</span>
                  </div>
                </Label>
              </div>

              {acceptOptions.create_new_deck === true && (
                <div className="ml-6 mt-2">
                  <Input
                    placeholder="Nazwa nowej talii..."
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                  />
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Tag Assignment */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-tags"
                checked={acceptOptions.add_tags}
                onCheckedChange={(checked) =>
                  setAcceptOptions((prev) => ({
                    ...prev,
                    add_tags: checked as boolean,
                    tag_ids: checked ? prev.tag_ids : [],
                  }))
                }
              />
              <Label htmlFor="add-tags" className="text-base font-medium">
                Dodaj tagi do fiszek
              </Label>
            </div>

            {acceptOptions.add_tags && (
              <div className="ml-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Wybierz tagi, które chcesz przypisać do wszystkich akceptowanych fiszek:
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {tagOptions.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={tag.isSelected}
                        onCheckedChange={() => handleTagToggle(tag.id)}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="text-sm flex items-center gap-1 cursor-pointer">
                        <span>#{tag.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tag.scope}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>

                {tagOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Brak dostępnych tagów</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button onClick={handleAccept} disabled={!validateOptions() || validSuggestions.length === 0 || isSubmitting}>
            {isSubmitting ? "Tworzenie..." : `Utwórz ${validSuggestions.length} fiszek`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
