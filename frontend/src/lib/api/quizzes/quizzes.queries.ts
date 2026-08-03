import { createQuery } from "@tanstack/svelte-query";
import { quizRequests } from "./quizzes.requests";

// ── Query Keys ───────────────────────────────────────────────────────

export const quizKeys = {
  all: ["quizzes"] as const,
  list: (page: number) => ["quizzes", "list", page] as const,
  detail: (id: string) => ["quizzes", "detail", id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────

export function useQuizList(page = 1) {
  return createQuery(() => ({
    queryKey: quizKeys.list(page),
    queryFn: () => quizRequests.list(page),
  }));
}

export function useQuiz(id: string) {
  return createQuery(() => ({
    queryKey: quizKeys.detail(id),
    queryFn: () => quizRequests.getById(id),
    enabled: !!id,
  }));
}

export function usePublicQuizzes(getSearch: () => string) {
  return createQuery(() => ({
    // getSearch() é lido dentro da função de options — reativo no runes mode
    queryKey: ["quizzes", "public", getSearch()],
    queryFn: () => quizRequests.listPublic(getSearch()),
    placeholderData: (previous) => previous, // mantém a lista visível durante novas buscas
  }));
}

export function usePublicQuiz(id: string) {
  return createQuery(() => ({
    queryKey: ["quizzes", "public", "detail", id],
    queryFn: () => quizRequests.getPublic(id),
    enabled: !!id,
  }));
}
