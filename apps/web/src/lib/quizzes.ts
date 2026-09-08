'use client';

import type {
  AddQuizItemsInput,
  CreateQuizInput,
  QuizDetailDto,
  QuizSummaryDto,
  RandomQuizItemsInput,
  UpdateQuizInput,
  UpdateQuizItemInput,
} from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export const quizKeys = {
  all: ['quizzes'] as const,
  detail: (id: string) => ['quizzes', id] as const,
};

export function useQuizzes() {
  return useQuery({
    queryKey: quizKeys.all,
    queryFn: () => apiFetch<QuizSummaryDto[]>('/quizzes'),
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: () => apiFetch<QuizDetailDto>(`/quizzes/${id}`),
    retry: false,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizInput) =>
      apiFetch<QuizDetailDto>('/quizzes', { method: 'POST', body: input }),
    onSuccess: (detail) => {
      queryClient.setQueryData(quizKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: quizKeys.all, exact: true });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/quizzes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all, exact: true }),
  });
}

/** Mọi thao tác trên một đề đều trả về QuizDetailDto mới → ghi thẳng vào cache. */
function useApplyQuiz(id: string) {
  const queryClient = useQueryClient();
  return (detail: QuizDetailDto) => {
    queryClient.setQueryData(quizKeys.detail(id), detail);
    void queryClient.invalidateQueries({ queryKey: quizKeys.all, exact: true });
  };
}

export function useUpdateQuiz(id: string) {
  const apply = useApplyQuiz(id);
  return useMutation({
    mutationFn: (input: UpdateQuizInput) =>
      apiFetch<QuizDetailDto>(`/quizzes/${id}`, { method: 'PATCH', body: input }),
    onSuccess: apply,
  });
}

export function useAddQuizItems(id: string) {
  const apply = useApplyQuiz(id);
  return useMutation({
    mutationFn: (input: AddQuizItemsInput) =>
      apiFetch<QuizDetailDto>(`/quizzes/${id}/items`, { method: 'POST', body: input }),
    onSuccess: apply,
  });
}

export function useAddRandomItems(id: string) {
  const apply = useApplyQuiz(id);
  return useMutation({
    mutationFn: (input: RandomQuizItemsInput) =>
      apiFetch<QuizDetailDto>(`/quizzes/${id}/items/random`, { method: 'POST', body: input }),
    onSuccess: apply,
  });
}

export function useUpdateQuizItem(id: string) {
  const apply = useApplyQuiz(id);
  return useMutation({
    mutationFn: ({ itemId, ...input }: UpdateQuizItemInput & { itemId: string }) =>
      apiFetch<QuizDetailDto>(`/quizzes/${id}/items/${itemId}`, { method: 'PATCH', body: input }),
    onSuccess: apply,
  });
}

export function useRemoveQuizItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/quizzes/${id}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quizKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: quizKeys.all, exact: true });
    },
  });
}

export function useReorderQuizItems(id: string) {
  const apply = useApplyQuiz(id);
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      apiFetch<QuizDetailDto>(`/quizzes/${id}/items/reorder`, {
        method: 'POST',
        body: { itemIds },
      }),
    onSuccess: apply,
  });
}
