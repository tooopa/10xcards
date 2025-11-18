import React, { memo, useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Edit3, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeckDto } from "@/types";
import { cn } from "@/lib/utils";

export type DeckAction = "view" | "edit" | "delete" | "create";

interface DeckCardProps {
  deck: DeckDto;
  onAction: (action: DeckAction, deck: DeckDto) => void;
}

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

const DeckCardComponent = ({ deck, onAction }: DeckCardProps) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on buttons or dropdown
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    onAction("view", deck);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAction("view", deck);
    }
  };

  const formattedDates = useMemo(() => {
    const createdAtLabel = dateFormatter.format(new Date(deck.created_at));
    const updatedAtLabel = dateFormatter.format(new Date(deck.updated_at));
    return { createdAtLabel, updatedAtLabel };
  }, [deck.created_at, deck.updated_at]);

  const canDelete = !deck.is_default;

  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all duration-200 hover:border-primary/30 cursor-pointer focus-within:ring-2 focus-within:ring-primary/40"
      )}
      onClick={handleCardClick}
      role="button"
      aria-label={`Otwórz talię ${deck.name}`}
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <FolderOpen className="h-8 w-8 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-card-foreground truncate" title={deck.name}>
                  {deck.name}
                </h3>
                {deck.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Domyślna
                  </Badge>
                )}
              </div>
              {deck.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2" title={deck.description}>
                  {deck.description}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{deck.flashcard_count} fiszek</span>
                </div>
                <span
                  className={cn(
                    "text-xs",
                    deck.flashcard_count === 0 ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {deck.flashcard_count === 0 ? "Pusta talia" : "Gotowa do nauki"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Akcje dla talii ${deck.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction("edit", deck)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAction("delete", deck)}
                className="text-destructive focus:text-destructive"
                disabled={!canDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {canDelete ? "Usuń" : "Nie można usunąć"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Utworzono: {formattedDates.createdAtLabel}</span>
          <span>Zaktualizowano: {formattedDates.updatedAtLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const DeckCard = memo(DeckCardComponent);
