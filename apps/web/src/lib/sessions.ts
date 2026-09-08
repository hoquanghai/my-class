'use client';

import type {
  AttendanceUpdateItem,
  SessionDetailDto,
  SessionFeedbackInput,
  SessionListDto,
  StudentAttendanceHistoryDto,
} from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export const sessionKeys = {
  list: (classId: string) => ['classes', classId, 'sessions'] as const,
  detail: (id: string) => ['sessions', id] as const,
  history: (classId: string, studentId: string) =>
    ['classes', classId, 'students', studentId, 'attendance'] as const,
};

export function useSessions(classId: string) {
  return useQuery({
    queryKey: sessionKeys.list(classId),
    queryFn: () => apiFetch<SessionListDto>(`/classes/${classId}/sessions`),
  });
}

export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => apiFetch<SessionDetailDto>(`/sessions/${id}`),
    retry: false,
  });
}

export function useStartSession(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SessionDetailDto>(`/classes/${classId}/sessions`, { method: 'POST' }),
    onSuccess: (detail) => {
      queryClient.setQueryData(sessionKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: sessionKeys.list(classId) });
    },
  });
}

function useApplyDetail(id: string) {
  const queryClient = useQueryClient();
  return (detail: SessionDetailDto) => {
    queryClient.setQueryData(sessionKeys.detail(id), detail);
    void queryClient.invalidateQueries({ queryKey: sessionKeys.list(detail.classId) });
  };
}

export function useUpdateAttendance(id: string) {
  const apply = useApplyDetail(id);
  return useMutation({
    mutationFn: (updates: AttendanceUpdateItem[]) =>
      apiFetch<SessionDetailDto>(`/sessions/${id}/attendance`, {
        method: 'PATCH',
        body: { updates },
      }),
    onSuccess: apply,
  });
}

export function useEndSession(id: string) {
  const apply = useApplyDetail(id);
  return useMutation({
    mutationFn: () => apiFetch<SessionDetailDto>(`/sessions/${id}/end`, { method: 'POST' }),
    onSuccess: apply,
  });
}

export function useSessionFeedback(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionFeedbackInput) =>
      apiFetch<void>(`/sessions/${id}/feedback`, { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.setQueryData<SessionDetailDto>(sessionKeys.detail(id), (old) =>
        old ? { ...old, hasFeedback: true } : old,
      );
    },
  });
}

export function useStudentAttendance(classId: string, studentId: string | null) {
  return useQuery({
    queryKey: sessionKeys.history(classId, studentId ?? ''),
    queryFn: () =>
      apiFetch<StudentAttendanceHistoryDto>(`/classes/${classId}/students/${studentId}/attendance`),
    enabled: studentId !== null,
  });
}
