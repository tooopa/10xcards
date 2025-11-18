import { z } from "zod";
import { DeckSortFieldSchema, SortOrderSchema, DECK_CONSTRAINTS } from "./decks";

export const DECKS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_DECKS_PER_PAGE = 20;
export const MAX_SEARCH_LENGTH = DECK_CONSTRAINTS.SEARCH_MAX_LENGTH;

const deckNameRegex = /^[a-zA-Z0-9\s\-_]+$/;

export const searchSchema = z
  .string()
  .max(MAX_SEARCH_LENGTH, `Wyszukiwanie nie może być dłuższe niż ${MAX_SEARCH_LENGTH} znaków`)
  .transform((value) => value.trim());

export const deckNameSchema = z
  .string()
  .min(DECK_CONSTRAINTS.NAME_MIN_LENGTH, `Nazwa talii jest wymagana`)
  .max(
    DECK_CONSTRAINTS.NAME_MAX_LENGTH,
    `Nazwa talii nie może być dłuższa niż ${DECK_CONSTRAINTS.NAME_MAX_LENGTH} znaków`
  )
  .regex(deckNameRegex, "Nazwa może zawierać tylko litery, cyfry, spacje, myślniki i podkreślniki")
  .transform((value) => value.trim());

export const deckDescriptionSchema = z
  .string()
  .max(
    DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
    `Opis nie może być dłuższy niż ${DECK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} znaków`
  )
  .transform((value) => value.trim())
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const dashboardFiltersSchema = z.object({
  search: searchSchema.optional(),
  sort: DeckSortFieldSchema.default("created_at"),
  order: SortOrderSchema.default("desc"),
});

export const searchFiltersSchema = z.object({
  query: searchSchema.optional().default(""),
  sort: DeckSortFieldSchema.default("created_at"),
  order: SortOrderSchema.default("desc"),
});

export const paginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(DECKS_PER_PAGE_OPTIONS[DECKS_PER_PAGE_OPTIONS.length - 1])
    .default(DEFAULT_DECKS_PER_PAGE),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).default(DEFAULT_DECKS_PER_PAGE),
  total: z.number().int().min(0).default(0),
  total_pages: z.number().int().min(0).default(0),
});

export const createDeckFormSchema = z.object({
  name: deckNameSchema,
  description: deckDescriptionSchema,
});

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type PaginationMetaShape = z.infer<typeof paginationMetaSchema>;
export type CreateDeckFormData = z.infer<typeof createDeckFormSchema>;
export type CreateDeckFormErrors = Partial<Record<keyof CreateDeckFormData | "general", string>>;
