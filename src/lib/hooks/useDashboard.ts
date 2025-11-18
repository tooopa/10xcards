import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreateDeckCommand,
  DeckDeletionResultDto,
  DeckDto,
  DeckListResponseDto,
  ErrorResponse,
  PaginationMeta,
} from "@/types";
import {
  DEFAULT_DECKS_PER_PAGE,
  DECKS_PER_PAGE_OPTIONS,
  dashboardFiltersSchema,
  type DashboardFilters,
} from "@/lib/validation/dashboard";

interface DeleteModalState {
  isOpen: boolean;
  deck: DeckDto | null;
}

interface UseDashboardOptions {
  skip?: boolean;
}

interface UseDashboardReturn {
  decks: DeckDto[];
  pagination: PaginationMeta;
  filters: DashboardFilters;
  isLoading: boolean;
  error: ErrorResponse | null;
  createModalOpen: boolean;
  deleteModalState: DeleteModalState;
  editModalState: DeleteModalState;
  setFilters: (filters: DashboardFilters) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  loadDecks: () => Promise<void>;
  createDeck: (data: CreateDeckCommand) => Promise<DeckDto>;
  deleteDeck: (deckId: number) => Promise<DeckDeletionResultDto>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDeleteModal: (deck: DeckDto) => void;
  closeDeleteModal: () => void;
  updateDeck: (deckId: number, data: CreateDeckCommand) => Promise<DeckDto>;
  openEditModal: (deck: DeckDto) => void;
  closeEditModal: () => void;
}

type DecksPerPageOption = (typeof DECKS_PER_PAGE_OPTIONS)[number];

const API_BASE = "/api/v1";

const initialFilters = dashboardFiltersSchema.parse({});
const initialPagination: PaginationMeta = {
  page: 1,
  limit: DEFAULT_DECKS_PER_PAGE,
  total: 0,
  total_pages: 0,
};

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorResponse).error?.message === "string"
  );
};

const parseApiError = async (response: Response): Promise<ErrorResponse> => {
  try {
    const payload = (await response.json()) as unknown;
    if (isErrorResponse(payload)) {
      return payload;
    }
  } catch {
    // ignore parse errors – fall back to default message
  }

  return {
    error: {
      code: response.status.toString(),
      message: "Wystąpił błąd podczas komunikacji z API.",
      details: null,
    },
  };
};

const normalizeUnknownError = (error: unknown): ErrorResponse => {
  if (isErrorResponse(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      error: {
        code: error.name || "unknown_error",
        message: error.message,
        details: null,
      },
    };
  }

  return {
    error: {
      code: "unknown_error",
      message: "Wystąpił nieoczekiwany błąd.",
      details: typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null,
    },
  };
};

export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { skip = false } = options;
  const [decks, setDecks] = useState<DeckDto[]>([]);
  const [filters, setFiltersState] = useState<DashboardFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationMeta>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>({ isOpen: false, deck: null });
  const [editModalState, setEditModalState] = useState<DeleteModalState>({ isOpen: false, deck: null });
  const requestAbortRef = useRef<AbortController | null>(null);

  const loadDecks = useCallback(async () => {
    if (skip) {
      return;
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      sort: filters.sort,
      order: filters.order,
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    if (filters.search) {
      params.set("search", filters.search);
    }

    try {
      const response = await fetch(`${API_BASE}/decks?${params.toString()}`, {
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      const payload: DeckListResponseDto = await response.json();
      setDecks(payload.data);
      setPagination((prev) => ({
        ...prev,
        ...payload.pagination,
      }));
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      setError(normalizeUnknownError(err));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        requestAbortRef.current = null;
      }
    }
  }, [filters, pagination.page, pagination.limit, skip]);

  useEffect(() => {
    if (skip) {
      requestAbortRef.current?.abort();
      return;
    }

    loadDecks();

    return () => {
      requestAbortRef.current?.abort();
    };
  }, [loadDecks, skip]);

  const setFilters = useCallback((nextFilters: DashboardFilters) => {
    const parsed = dashboardFiltersSchema.safeParse(nextFilters);
    setFiltersState(parsed.success ? parsed.data : initialFilters);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => {
      const safePage = Math.max(1, Math.min(page, Math.max(prev.total_pages, 1)));
      if (safePage === prev.page) {
        return prev;
      }
      return { ...prev, page: safePage };
    });
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPagination((prev) => {
      const allowedLimit: DecksPerPageOption = DECKS_PER_PAGE_OPTIONS.includes(limit as DecksPerPageOption)
        ? (limit as DecksPerPageOption)
        : DEFAULT_DECKS_PER_PAGE;

      if (prev.limit === allowedLimit && prev.page === 1) {
        return prev;
      }

      return {
        ...prev,
        page: 1,
        limit: allowedLimit,
      };
    });
  }, []);

  const createDeck = useCallback(
    async (command: CreateDeckCommand): Promise<DeckDto> => {
      try {
        const response = await fetch(`${API_BASE}/decks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          throw await parseApiError(response);
        }

        const deck: DeckDto = await response.json();
        await loadDecks();
        return deck;
      } catch (err) {
        throw normalizeUnknownError(err);
      }
    },
    [loadDecks]
  );

  const deleteDeck = useCallback(
    async (deckId: number): Promise<DeckDeletionResultDto> => {
      try {
        const response = await fetch(`${API_BASE}/decks/${deckId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw await parseApiError(response);
        }

        const result: DeckDeletionResultDto = await response.json();
        await loadDecks();
        return result;
      } catch (err) {
        throw normalizeUnknownError(err);
      }
    },
    [loadDecks]
  );

  const updateDeck = useCallback(
    async (deckId: number, command: CreateDeckCommand): Promise<DeckDto> => {
      try {
        const response = await fetch(`${API_BASE}/decks/${deckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(command),
        });
        if (!response.ok) {
          throw await parseApiError(response);
        }
        const deck: DeckDto = await response.json();
        await loadDecks();
        return deck;
      } catch (err) {
        throw normalizeUnknownError(err);
      }
    },
    [loadDecks]
  );

  const openCreateModal = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  const openDeleteModal = useCallback((deck: DeckDto) => {
    setDeleteModalState({ isOpen: true, deck });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalState({ isOpen: false, deck: null });
  }, []);

  const openEditModal = useCallback((deck: DeckDto) => {
    setEditModalState({ isOpen: true, deck });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalState({ isOpen: false, deck: null });
  }, []);

  return {
    decks,
    pagination,
    filters,
    isLoading,
    error,
    createModalOpen,
    deleteModalState,
    editModalState,
    setFilters,
    setPage,
    setLimit,
    loadDecks,
    createDeck,
    deleteDeck,
    openCreateModal,
    closeCreateModal,
    openDeleteModal,
    closeDeleteModal,
    updateDeck,
    openEditModal,
    closeEditModal,
  };
}
