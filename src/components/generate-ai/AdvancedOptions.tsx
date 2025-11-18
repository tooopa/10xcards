import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings } from "lucide-react";
import { useState } from "react";

interface AdvancedOptionsProps {
  maxFlashcards: number | undefined;
  onMaxFlashcardsChange: (value: number) => void;
  language: string | undefined;
  onLanguageChange: (value: string) => void;
  suggestTags: boolean | undefined;
  onSuggestTagsChange: (value: boolean) => void;
}

export function AdvancedOptions({
  maxFlashcards = 10,
  onMaxFlashcardsChange,
  language = "pl",
  onLanguageChange,
  suggestTags = true,
  onSuggestTagsChange,
}: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { value: "pl", label: "Polski" },
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "fr", label: "Français" },
    { value: "es", label: "Español" },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Opcje zaawansowane
          <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/50">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Maksymalna liczba fiszek: {maxFlashcards}</label>
            <Slider
              value={[maxFlashcards]}
              onValueChange={(value) => onMaxFlashcardsChange(value[0])}
              min={3}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Język fiszek</label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="suggest-tags"
              checked={suggestTags}
              onCheckedChange={(checked) => onSuggestTagsChange(checked as boolean)}
            />
            <label
              htmlFor="suggest-tags"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sugeruj tagi na podstawie treści
            </label>
          </div>

          <div className="text-xs text-muted-foreground">
            Włączenie tej opcji pozwoli AI na automatyczne sugerowanie odpowiednich tagów dla wygenerowanych fiszek.
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
