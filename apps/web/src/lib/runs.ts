'use client';

import type { LaunchRunInput, RunDetailDto, RunListItemDto } from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export const runKeys = {
  bySession: (sessionId: string) => ['sessions', sessionId, 'runs'] as const,
  detail: (id: string) => ['runs', id] as const,
};

export function useSessionRuns(sessionId: string) {
  return useQuery({
    queryKey: runKeys.bySession(sessionId),
    queryFn: () => apiFetch<RunListItemDto[]>(`/sessions/${sessionId}/runs`),
  });
}

export function useRunDetail(id: string) {
  return useQuery({
    queryKey: runKeys.detail(id),
    queryFn: () => apiFetch<RunDetailDto>(`/runs/${id}`),
    retry: false,
  });
}

export function useLaunchRun(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LaunchRunInput) =>
      apiFetch<RunDetailDto>(`/sessions/${sessionId}/runs`, { method: 'POST', body: input }),
    onSuccess: (detail) => {
      queryClient.setQueryData(runKeys.detail(detail.state.id), detail);
      void queryClient.invalidateQueries({ queryKey: runKeys.bySession(sessionId) });
    },
  });
}

export type RunAction = 'start' | 'next' | 'close' | 'finish';

export function useRunAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: RunAction) =>
      apiFetch<RunDetailDto>(`/runs/${id}/${action}`, { method: 'POST' }),
    onSuccess: (detail) => {
      queryClient.setQueryData(runKeys.detail(id), detail);
      void queryClient.invalidateQueries({ queryKey: runKeys.bySession(detail.state.sessionId) });
    },
  });
}

export function useOverrideAnswer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, isCorrect }: { answerId: string; isCorrect: boolean }) =>
      apiFetch<RunDetailDto>(`/runs/${id}/answers/${answerId}`, {
        method: 'PATCH',
        body: { isCorrect },
      }),
    onSuccess: (detail) => queryClient.setQueryData(runKeys.detail(id), detail),
  });
}
