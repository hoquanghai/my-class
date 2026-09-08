'use client';

import type {
  BulkCreateQuestionsInput,
  BulkCreateResultDto,
  MediaUploadDto,
  ParseResult,
  QuestionDto,
  QuestionFacetsDto,
  QuestionFilter,
  QuestionInput,
  QuestionListDto,
  UpdateQuestionInput,
} from '@lophoc/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export type QuestionFilterInput = Partial<QuestionFilter>;

export const questionKeys = {
  all: ['questions'] as const,
  list: (filter: QuestionFilterInput) => ['questions', 'list', filter] as const,
  facets: ['questions', 'facets'] as const,
  detail: (id: string) => ['questions', id] as const,
};

function toQuery(filter: QuestionFilterInput): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useQuestions(filter: QuestionFilterInput) {
  return useQuery({
    queryKey: questionKeys.list(filter),
    queryFn: () => apiFetch<QuestionListDto>(`/questions${toQuery(filter)}`),
    placeholderData: keepPreviousData,
  });
}

export function useQuestionFacets() {
  return useQuery({
    queryKey: questionKeys.facets,
    queryFn: () => apiFetch<QuestionFacetsDto>('/questions/facets'),
    staleTime: 60_000,
  });
}

function useInvalidateQuestions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: questionKeys.all });
}

export function useCreateQuestion() {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (input: QuestionInput) =>
      apiFetch<QuestionDto>('/questions', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useBulkCreateQuestions() {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (input: BulkCreateQuestionsInput) =>
      apiFetch<BulkCreateResultDto>('/questions/bulk', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateQuestion() {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuestionInput }) =>
      apiFetch<QuestionDto>(`/questions/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestion() {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/questions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useImportDocx() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return apiFetch<ParseResult>('/questions/import/docx', { method: 'POST', formData });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File | Blob) => {
      const formData = new FormData();
      formData.append('file', file, file instanceof File ? file.name : 'image.png');
      return apiFetch<MediaUploadDto>('/media/upload', { method: 'POST', formData });
    },
  });
}
