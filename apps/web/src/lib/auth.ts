'use client';

import type { AuthProvidersDto, TeacherDto } from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => apiFetch<{ teacher: TeacherDto }>('/auth/me').then((r) => r.teacher),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAuthProviders() {
  return useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => apiFetch<AuthProvidersDto>('/auth/providers'),
    staleTime: Infinity,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => queryClient.clear(),
  });
}
