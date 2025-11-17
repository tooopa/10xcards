import useSWR from 'swr';
import type {
  DeckDto,
  DeckListResponseDto,
  FlashcardDto,
  FlashcardListResponseDto,
  TagWithUsageDto
} from '@/types';

const API_BASE = '/api/v1';

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

// Decks API hooks
export function useDecks() {
  const { data, error, isLoading, mutate } = useSWR<DeckListResponseDto>(
    `${API_BASE}/decks`,
    fetcher
  );

  return {
    decks: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useDeck(deckId: string) {
  const { data, error, isLoading, mutate } = useSWR<DeckDto>(
    deckId ? `${API_BASE}/decks/${deckId}` : null,
    fetcher
  );

  return {
    deck: data,
    isLoading,
    error,
    mutate,
  };
}

// Flashcards API hooks
export function useFlashcards(deckId?: string, filters?: {
  source?: string;
  tag_id?: string;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (deckId) queryParams.append('deck_id', deckId);
  if (filters?.source) queryParams.append('source', filters.source);
  if (filters?.tag_id) queryParams.append('tag_id', filters.tag_id);
  if (filters?.search) queryParams.append('search', filters.search);

  const queryString = queryParams.toString();
  const url = `${API_BASE}/flashcards${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<FlashcardListResponseDto>(
    url,
    fetcher
  );

  return {
    flashcards: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

export function useFlashcard(flashcardId: string) {
  const { data, error, isLoading, mutate } = useSWR<FlashcardDto>(
    flashcardId ? `${API_BASE}/flashcards/${flashcardId}` : null,
    fetcher
  );

  return {
    flashcard: data,
    isLoading,
    error,
    mutate,
  };
}

// Tags API hooks
export function useTags(filters?: {
  scope?: string;
  deck_id?: string;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  if (filters?.scope) queryParams.append('scope', filters.scope);
  if (filters?.deck_id) queryParams.append('deck_id', filters.deck_id);
  if (filters?.search) queryParams.append('search', filters.search);

  const queryString = queryParams.toString();
  const url = `${API_BASE}/tags${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{ data: TagWithUsageDto[] }>(
    url,
    fetcher
  );

  return {
    tags: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
