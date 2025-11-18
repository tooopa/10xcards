import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, RotateCcw } from "lucide-react";
import type { DashboardFilters } from "@/lib/validation/dashboard";

interface SearchAndFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  isLoading?: boolean;
}

export interface SearchAndFiltersHandle {
  focusSearchInput: () => void;
  clearSearchInput: () => void;
}

export const SearchAndFilters = forwardRef<SearchAndFiltersHandle, SearchAndFiltersProps>(function SearchAndFilters(
  { filters, onFiltersChange, isLoading = false },
  ref
) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({
        ...filters,
        search: debouncedSearch || undefined,
      });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  const externalSearchValue = filters.search ?? "";

  useEffect(() => {
    setSearchQuery(externalSearchValue);
    setDebouncedSearch(externalSearchValue);
  }, [externalSearchValue]);

  useImperativeHandle(ref, () => ({
    focusSearchInput: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    clearSearchInput: () => {
      setSearchQuery("");
      onFiltersChange({
        ...filters,
        search: undefined,
      });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }));

  const handleSortChange = (sort: "created_at" | "updated_at" | "name") => {
    onFiltersChange({
      ...filters,
      sort,
    });
  };

  const handleOrderToggle = () => {
    onFiltersChange({
      ...filters,
      order: filters.order === "asc" ? "desc" : "asc",
    });
  };

  const handleClearFilters = () => {
    const clearedFilters: DashboardFilters = {
      search: undefined,
      sort: "created_at",
      order: "desc",
    };
    setSearchQuery("");
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.sort !== "created_at" || filters.order !== "desc";

  const currentSortLabel =
    filters.sort === "name" ? "Nazwie" : filters.sort === "updated_at" ? "Dacie aktualizacji" : "Dacie utworzenia";

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          inputMode="search"
          placeholder="Szukaj talii (Ctrl+F)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          disabled={isLoading}
          aria-label="Wyszukaj talie"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Sortujesz według <span className="font-medium lowercase">{currentSortLabel}</span> w kolejności{" "}
          <span className="font-medium">{filters.order === "asc" ? "rosnącej" : "malejącej"}</span>.
        </p>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 items-center">
        <Select value={filters.sort} onValueChange={handleSortChange} disabled={isLoading}>
          <SelectTrigger className="w-[175px]" aria-label="Sortuj talie">
            <SelectValue placeholder="Sortowanie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Data utworzenia</SelectItem>
            <SelectItem value="updated_at">Data aktualizacji</SelectItem>
            <SelectItem value="name">Nazwa</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOrderToggle}
          disabled={isLoading}
          className="px-3"
          aria-pressed={filters.order === "desc"}
          aria-label={`Zmień kolejność sortowania na ${filters.order === "asc" ? "malejącą" : "rosnącą"}`}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="ml-1">{filters.order === "asc" ? "↑" : "↓"}</span>
        </Button>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="px-3"
            aria-label="Wyczyść filtry"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Wyczyść filtry</span>
          </Button>
        )}
      </div>
    </div>
  );
});
