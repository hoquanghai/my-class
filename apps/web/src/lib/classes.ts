'use client';

import type {
  ClassDetailDto,
  ClassSummaryDto,
  CreateClassInput,
  LimitsDto,
  RosterImportResultDto,
  StudentDto,
  UpdateClassInput,
  UpdateStudentInput,
} from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export const classKeys = {
  all: ['classes'] as const,
  detail: (id: string) => ['classes', id] as const,
  limits: ['limits'] as const,
};

export function useClasses() {
  return useQuery({
    queryKey: classKeys.all,
    queryFn: () => apiFetch<ClassSummaryDto[]>('/classes'),
  });
}

export function useClassDetail(id: string) {
  return useQuery({
    queryKey: classKeys.detail(id),
    queryFn: () => apiFetch<ClassDetailDto>(`/classes/${id}`),
    retry: (count, err) =>
      !(err instanceof Error && 'status' in err && err.status === 404) && count < 1,
  });
}

export function useLimits() {
  return useQuery({
    queryKey: classKeys.limits,
    queryFn: () => apiFetch<LimitsDto>('/limits'),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateClass(id?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: classKeys.all });
    await queryClient.invalidateQueries({ queryKey: classKeys.limits });
    if (id) await queryClient.invalidateQueries({ queryKey: classKeys.detail(id) });
  };
}

export function useCreateClass() {
  const invalidate = useInvalidateClass();
  return useMutation({
    mutationFn: (input: CreateClassInput) =>
      apiFetch<ClassDetailDto>('/classes', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateClass(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClassInput) =>
      apiFetch<ClassDetailDto>(`/classes/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (detail) => {
      queryClient.setQueryData(classKeys.detail(id), detail);
      void queryClient.invalidateQueries({ queryKey: classKeys.all });
    },
  });
}

export function useDeleteClass(id: string) {
  const invalidate = useInvalidateClass(id);
  return useMutation({
    mutationFn: (permanent: boolean) =>
      apiFetch<void>(`/classes/${id}${permanent ? '/permanent' : ''}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useRegenerateCode(id: string) {
  const invalidate = useInvalidateClass(id);
  return useMutation({
    mutationFn: () =>
      apiFetch<{ code: string }>(`/classes/${id}/regenerate-code`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

function useApplyRoster(id: string) {
  const queryClient = useQueryClient();
  return (students: StudentDto[]) => {
    queryClient.setQueryData<ClassDetailDto>(classKeys.detail(id), (old) =>
      old ? { ...old, students, studentCount: students.length } : old,
    );
    void queryClient.invalidateQueries({ queryKey: classKeys.all });
    void queryClient.invalidateQueries({ queryKey: classKeys.limits });
  };
}

/** `fit`: vượt giới hạn gói thì chỉ nhập số học sinh còn chỗ thay vì lỗi LIMIT_STUDENTS. */
const fitQuery = (fit?: boolean) => (fit ? '?fit=1' : '');

export function useImportNames(id: string) {
  const apply = useApplyRoster(id);
  return useMutation({
    mutationFn: ({ names, fit }: { names: string[]; fit?: boolean }) =>
      apiFetch<RosterImportResultDto>(`/classes/${id}/students/import${fitQuery(fit)}`, {
        method: 'POST',
        body: { names },
      }),
    onSuccess: (r) => apply(r.students),
  });
}

export function useImportExcel(id: string) {
  const apply = useApplyRoster(id);
  return useMutation({
    mutationFn: ({ file, fit }: { file: File; fit?: boolean }) => {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return apiFetch<RosterImportResultDto>(
        `/classes/${id}/students/import-excel${fitQuery(fit)}`,
        { method: 'POST', formData },
      );
    },
    onSuccess: (r) => apply(r.students),
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: string; input: UpdateStudentInput }) =>
      apiFetch<StudentDto>(`/classes/${id}/students/${studentId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (student) => {
      queryClient.setQueryData<ClassDetailDto>(classKeys.detail(id), (old) =>
        old
          ? { ...old, students: old.students.map((s) => (s.id === student.id ? student : s)) }
          : old,
      );
    },
  });
}

export function useRemoveStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiFetch<void>(`/classes/${id}/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: (_, studentId) => {
      queryClient.setQueryData<ClassDetailDto>(classKeys.detail(id), (old) => {
        if (!old) return old;
        const students = old.students.filter((s) => s.id !== studentId);
        return { ...old, students, studentCount: students.length };
      });
      void queryClient.invalidateQueries({ queryKey: classKeys.all });
      void queryClient.invalidateQueries({ queryKey: classKeys.limits });
    },
  });
}

export function useReorderStudents(id: string) {
  const apply = useApplyRoster(id);
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<StudentDto[]>(`/classes/${id}/students/reorder`, {
        method: 'POST',
        body: { ids },
      }),
    onSuccess: apply,
  });
}
