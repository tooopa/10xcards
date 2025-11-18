import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckSquare, Trash2, Download, FileText, Clock, Zap } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";
import type { SuggestionsListProps } from "../../lib/validation/generate-ai";

export function SuggestionsList({
  suggestions,
  onSuggestionChange,
  onSuggestionDelete,
  onAcceptSelected,
  generationMetadata,
}: SuggestionsListProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIndices(checked ? suggestions.map((_, i) => i) : []);
  };

  const handleSelectSuggestion = (index: number, checked: boolean) => {
    setSelectedIndices((prev) => (checked ? [...prev, index] : prev.filter((i) => i !== index)));
  };

  const handleDeleteSelected = () => {
    // Remove selected suggestions in reverse order to maintain indices
    const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
    sortedIndices.forEach((index) => {
      onSuggestionDelete(index);
    });
    setSelectedIndices([]);
  };

  const handleAcceptSelected = () => {
    onAcceptSelected(selectedIndices);
  };

  const selectedSuggestions = selectedIndices.map((i) => suggestions[i]).filter(Boolean);
  const allSelected = suggestions.length > 0 && selectedIndices.length === suggestions.length;
  const someSelected = selectedIndices.length > 0 && selectedIndices.length < suggestions.length;

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Brak sugestii fiszek</h3>
        <p className="text-muted-foreground">
          Wygenerowane fiszki pojawią się tutaj. Spróbuj zmienić parametry generowania jeśli nie otrzymujesz wyników.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Wygenerowane sugestie fiszek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{suggestions.length}</div>
                <div className="text-muted-foreground">fiszki</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{generationMetadata?.model || "Nieznany"}</div>
                <div className="text-muted-foreground">model</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">${generationMetadata?.cost_estimate?.toFixed(4) || "0.0000"}</div>
                <div className="text-muted-foreground">koszt</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {Math.round((generationMetadata?.generation_duration_ms || 0) / 1000)}s
                </div>
                <div className="text-muted-foreground">czas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {suggestions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedIndices.length} z {suggestions.length} wybranych
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedIndices.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń wybrane ({selectedIndices.length})
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleAcceptSelected}
                      disabled={selectedSuggestions.some((s) => !s.edited.front.trim() || !s.edited.back.trim())}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Akceptuj wybrane ({selectedIndices.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selectedSuggestions.some((s) => !s.edited.front.trim() || !s.edited.back.trim()) && (
              <Alert className="mt-4">
                <AlertDescription>
                  Niektóre wybrane fiszki mają puste pytania lub odpowiedzi. Proszę je wypełnić przed akceptacją.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedIndices.includes(index)}
                onCheckedChange={(checked) => handleSelectSuggestion(index, checked as boolean)}
                className="bg-background border-2"
              />
            </div>
            <SuggestionCard
              suggestion={suggestion}
              onChange={(updatedSuggestion) => onSuggestionChange(index, updatedSuggestion)}
              onDelete={() => onSuggestionDelete(index)}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-center text-sm text-muted-foreground">
        Wyświetlono {suggestions.length} fiszek z {selectedIndices.length} zaznaczonymi
      </div>
    </div>
  );
}
