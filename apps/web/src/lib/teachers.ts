'use client';

import type { ChangePasswordInput, TeacherDto, UpdateProfileInput } from '@lophoc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { ME_QUERY_KEY } from './auth';

function useApplyTeacher() {
  const queryClient = useQueryClient();
  return (res: { teacher: TeacherDto }) => queryClient.setQueryData(ME_QUERY_KEY, res.teacher);
}

export function useUpdateProfile() {
  const apply = useApplyTeacher();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<{ teacher: TeacherDto }>('/teachers/me', { method: 'PATCH', body: input }),
    onSuccess: apply,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiFetch<{ changed: true }>('/teachers/me/password', { method: 'POST', body: input }),
  });
}

export function useUploadAvatar() {
  const apply = useApplyTeacher();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch<{ teacher: TeacherDto }>('/teachers/me/avatar', {
        method: 'POST',
        formData,
      });
    },
    onSuccess: apply,
  });
}

export function useRemoveAvatar() {
  const apply = useApplyTeacher();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ teacher: TeacherDto }>('/teachers/me/avatar', { method: 'DELETE' }),
    onSuccess: apply,
  });
}

/** Chữ cái đầu của hai từ cuối trong tên, dùng khi chưa có ảnh đại diện. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const picked = parts.length >= 2 ? parts.slice(-2) : parts;
  return picked
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}
