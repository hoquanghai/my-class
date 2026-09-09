'use client';

import type {
  AiJobCreatedDto,
  AiJobDto,
  AiJobSummaryDto,
  AiQuotaDto,
  BulkCreateQuestionsInput,
  BulkCreateResultDto,
  MediaUploadDto,
  ParseResult,
  QuestionDto,
  QuestionFacetsDto,
  QuestionFacetsQuery,
  QuestionFilter,
  QuestionInput,
  QuestionListDto,
  UpdateQuestionInput,
} from '@lophoc/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api';

export type QuestionFilterInput = Partial<QuestionFilter>;

export const questionKeys = {
  all: ['questions'] as const,
  list: (filter: QuestionFilterInput) => ['questions', 'list', filter] as const,
  facets: ['questions', 'facets'] as const,
  detail: (id: string) => ['questions', id] as const,
  aiQuota: ['questions', 'ai', 'quota'] as const,
  aiJobs: ['questions', 'ai', 'jobs'] as const,
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

/** Môn/khối/chủ đề đã dùng; truyền `subject`/`grade` để chỉ lấy chủ đề của môn/khối đó. */
export function useQuestionFacets(query: QuestionFacetsQuery = {}) {
  return useQuery({
    queryKey: [...questionKeys.facets, query] as const,
    queryFn: () => apiFetch<QuestionFacetsDto>(`/questions/facets${toQuery(query)}`),
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

// ---------- AI ----------

export function useAiQuota() {
  return useQuery({
    queryKey: questionKeys.aiQuota,
    queryFn: () => apiFetch<AiQuotaDto>('/questions/import/ai/quota'),
    staleTime: 30_000,
  });
}

/** Các lần chạy AI gần đây (kết quả đã lưu trên máy chủ, mở lại không tốn hạn mức). */
export function useAiJobs() {
  return useQuery({
    queryKey: questionKeys.aiJobs,
    queryFn: () => apiFetch<AiJobSummaryDto[]>('/questions/import/ai/jobs'),
    staleTime: 15_000,
  });
}

export function useAiJob() {
  return useMutation({
    mutationFn: (id: string) => apiFetch<AiJobDto>(`/questions/import/ai/jobs/${id}`),
  });
}

export interface AiImportRequest {
  files: File[];
  subject?: string;
  grade?: string;
  onProgress?: (status: AiJobDto['status'], elapsedMs: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tạo job AI rồi thăm dò tới khi xong (≤ 5 phút). Trả về job hoàn thành hoặc ném lỗi. */
export function useAiImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      subject,
      grade,
      onProgress,
    }: AiImportRequest): Promise<AiJobDto> => {
      const formData = new FormData();
      for (const f of files) formData.append('files', f, f.name);
      if (subject) formData.append('subject', subject);
      if (grade) formData.append('grade', grade);
      const created = await apiFetch<AiJobCreatedDto>('/questions/import/ai', {
        method: 'POST',
        formData,
      });
      const started = Date.now();
      for (;;) {
        const job = await apiFetch<AiJobDto>(`/questions/import/ai/jobs/${created.jobId}`);
        onProgress?.(job.status, Date.now() - started);
        if (job.status === 'done') return job;
        if (job.status === 'failed') {
          throw new ApiError(500, 'AI_FAILED', job.error ?? 'Trích xuất thất bại');
        }
        if (Date.now() - started > 5 * 60_000) {
          throw new ApiError(504, 'AI_TIMEOUT', 'Trích xuất quá lâu, hãy thử lại với ít trang hơn');
        }
        await sleep(2000);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: questionKeys.aiQuota });
      void queryClient.invalidateQueries({ queryKey: questionKeys.aiJobs });
    },
  });
}
