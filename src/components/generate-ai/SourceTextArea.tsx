import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, FileText } from "lucide-react";
import type { SourceTextAreaProps } from "../../lib/validation/generate-ai";
import { cn } from "@/lib/utils";

export function SourceTextArea({ value, onChange, error, maxLength, minLength }: SourceTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const newValue = value + (value ? "\n\n" : "") + text;
      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const characterCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isValidLength = characterCount >= minLength && characterCount <= maxLength;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tekst źródłowy *</label>
        <Button type="button" variant="outline" size="sm" onClick={handlePaste} className="h-8">
          <ClipboardPaste className="mr-2 h-3 w-3" />
          Wklej
        </Button>
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Wklej lub wpisz tekst źródłowy (minimum 1000 znaków, maksimum 10000 znaków)..."
          className={cn(
            "min-h-[120px] resize-none",
            error && "border-destructive focus-visible:ring-destructive",
            isFocused && "ring-2 ring-ring ring-offset-2"
          )}
          maxLength={maxLength}
        />

        {/* Character counter */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "font-mono",
              isNearLimit && "text-orange-600",
              !isValidLength && characterCount > 0 && "text-destructive",
              isValidLength && "text-muted-foreground"
            )}
          >
            {characterCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Word count and validation */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <FileText className="inline mr-1 h-3 w-3" />
            {wordCount} słów
          </span>
          {!isValidLength && characterCount > 0 && (
            <span className="text-destructive">
              Wymagane: {minLength}-{maxLength} znaków
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
