import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";
import { DECKS_PER_PAGE_OPTIONS } from "@/lib/validation/dashboard";

interface PaginationControlsProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PaginationControls({ pagination, onPageChange, onLimitChange }: PaginationControlsProps) {
  const { page, limit, total, total_pages } = pagination;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers to show
  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const totalPages = total_pages;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (page > 4) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 3) {
        pages.push("ellipsis");
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  if (total === 0) {
    return null;
  }

  const handleLimitChange = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    onLimitChange(parsed);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > total_pages || nextPage === page) {
      return;
    }
    onPageChange(nextPage);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      {/* Results info */}
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        Wyświetlono {startItem}-{endItem} z {total} talii
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Na stronę:</span>
          <Select value={limit.toString()} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DECKS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3"
            aria-label="Poprzednia strona"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {visiblePages.map((pageNum, index) => {
            if (pageNum === "ellipsis") {
              return (
                <div key={`ellipsis-${index}`} className="px-3 py-2">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={cn("px-3", pageNum === page && "pointer-events-none")}
                aria-current={pageNum === page ? "page" : undefined}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= total_pages}
            className="px-3"
            aria-label="Następna strona"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
