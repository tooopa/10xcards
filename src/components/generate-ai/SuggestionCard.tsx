import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit3, Trash2, Eye, EyeOff } from "lucide-react";
import type { SuggestionCardProps, EditableSuggestion } from "../../lib/validation/generate-ai";
import { cn } from "@/lib/utils";

export function SuggestionCard({ suggestion, onChange, onDelete }: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [editFront, setEditFront] = useState(suggestion.edited.front);
  const [editBack, setEditBack] = useState(suggestion.edited.back);

  const handleSave = () => {
    const updatedSuggestion: EditableSuggestion = {
      ...suggestion,
      edited: {
        front: editFront.trim(),
        back: editBack.trim(),
        edited: true,
      },
    };
    onChange(updatedSuggestion);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditFront(suggestion.edited.front);
    setEditBack(suggestion.edited.back);
    setIsEditing(false);
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return "text-[color:var(--color-success-strong)] bg-[color:var(--color-success-soft)]";
    if (score >= 0.6) return "text-[color:var(--color-warning-strong)] bg-[color:var(--color-warning-soft)]";
    return "text-[color:var(--color-destructive-strong)] bg-[color:var(--color-destructive-soft)]";
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", getQualityColor(suggestion.quality_score))}>
                {Math.round(suggestion.quality_score * 100)}%
              </Badge>
              {suggestion.edited.edited && (
                <Badge variant="secondary" className="text-xs">
                  Edytowana
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="h-8 w-8 p-0">
              {showBack ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-8 w-8 p-0">
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Front Side */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pytanie</label>
          {isEditing ? (
            <Textarea
              value={editFront}
              onChange={(e) => setEditFront(e.target.value)}
              placeholder="Wpisz pytanie..."
              className="min-h-[60px] text-sm"
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded border text-sm min-h-[60px]">
              {suggestion.edited.front || "Brak pytania"}
            </div>
          )}
        </div>

        {/* Back Side - conditionally shown */}
        {showBack && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Odpowiedź</label>
            {isEditing ? (
              <Textarea
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                placeholder="Wpisz odpowiedź..."
                className="min-h-[60px] text-sm"
              />
            ) : (
              <div className="p-3 bg-muted/50 rounded border text-sm min-h-[60px]">
                {suggestion.edited.back || "Brak odpowiedzi"}
              </div>
            )}
          </div>
        )}

        {/* Suggested Tags */}
        {suggestion.suggested_tags.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sugerowane tagi</label>
            <div className="flex flex-wrap gap-1">
              {suggestion.suggested_tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={handleSave} disabled={!editFront.trim() || !editBack.trim()} className="flex-1">
              Zapisz
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
              Anuluj
            </Button>
          </div>
        )}

        {/* Show/Hide Back Button */}
        {!isEditing && (
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="w-full text-xs">
              {showBack ? "Ukryj odpowiedź" : "Pokaż odpowiedź"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
