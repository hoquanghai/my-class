'use client';

import type {
  CloneSetInput,
  CloneSetResultDto,
  CommunityFacetsDto,
  CommunityFacetsQuery,
  CommunityListQuery,
  CreateCommentInput,
  LikeSetResultDto,
  PublishSetInput,
  ReportSetInput,
  ReportSetResultDto,
  RepublishSetInput,
  SharedSetCommentDto,
  SharedSetDetailDto,
  SharedSetListDto,
  SharedSetSummaryDto,
  UpdateSetInput,
} from '@lophoc/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';

export type CommunityListInput = Partial<CommunityListQuery>;

export const communityKeys = {
  all: ['community'] as const,
  list: (query: CommunityListInput) => ['community', 'list', query] as const,
  mine: ['community', 'mine'] as const,
  facets: (query: CommunityFacetsQuery) => ['community', 'facets', query] as const,
  detail: (id: string) => ['community', 'set', id] as const,
  comments: (id: string) => ['community', 'set', id, 'comments'] as const,
};

function toQuery(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useCommunitySets(query: CommunityListInput) {
  return useQuery({
    queryKey: communityKeys.list(query),
    queryFn: () => apiFetch<SharedSetListDto>(`/community/sets${toQuery(query)}`),
    placeholderData: keepPreviousData,
  });
}

export function useMySets() {
  return useQuery({
    queryKey: communityKeys.mine,
    queryFn: () => apiFetch<SharedSetSummaryDto[]>('/community/mine'),
  });
}

export function useCommunityFacets(query: CommunityFacetsQuery) {
  return useQuery({
    queryKey: communityKeys.facets(query),
    queryFn: () => apiFetch<CommunityFacetsDto>(`/community/facets${toQuery(query)}`),
    staleTime: 60_000,
  });
}

export function useSharedSet(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => apiFetch<SharedSetDetailDto>(`/community/sets/${id}`),
    retry: false,
  });
}

export function useSetComments(id: string) {
  return useQuery({
    queryKey: communityKeys.comments(id),
    queryFn: () => apiFetch<SharedSetCommentDto[]>(`/community/sets/${id}/comments`),
  });
}

/** Làm mới danh sách kho / bài của tôi (và chi tiết một bài nếu truyền id). */
function useInvalidateSets() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['community', 'list'] });
    void queryClient.invalidateQueries({ queryKey: communityKeys.mine });
    void queryClient.invalidateQueries({ queryKey: ['community', 'facets'] });
    if (id) void queryClient.invalidateQueries({ queryKey: communityKeys.detail(id) });
  };
}

export function usePublishSet() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (input: PublishSetInput) =>
      apiFetch<SharedSetDetailDto>('/community/sets', { method: 'POST', body: input }),
    onSuccess: (set) => {
      queryClient.setQueryData(communityKeys.detail(set.id), set);
      invalidate();
    },
  });
}

export function useUpdateSet(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (input: UpdateSetInput) =>
      apiFetch<SharedSetDetailDto>(`/community/sets/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (set) => {
      queryClient.setQueryData(communityKeys.detail(id), set);
      invalidate();
    },
  });
}

export function useRepublishSet(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (input: RepublishSetInput) =>
      apiFetch<SharedSetDetailDto>(`/community/sets/${id}/republish`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (set) => {
      queryClient.setQueryData(communityKeys.detail(id), set);
      invalidate();
    },
  });
}

export function useDeleteSet() {
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/community/sets/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}

/** Lấy về ngân hàng: sau đó ngân hàng câu hỏi và danh sách đề của tôi đổi → làm mới cả hai. */
export function useCloneSet(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (input: CloneSetInput) =>
      apiFetch<CloneSetResultDto>(`/community/sets/${id}/clone`, { method: 'POST', body: input }),
    onSuccess: () => {
      invalidate(id);
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useLikeSet(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (liked: boolean) =>
      apiFetch<LikeSetResultDto>(`/community/sets/${id}/like`, {
        method: liked ? 'POST' : 'DELETE',
      }),
    onSuccess: (r) => {
      queryClient.setQueryData<SharedSetDetailDto>(communityKeys.detail(id), (old) =>
        old ? { ...old, likeCount: r.likeCount, viewer: { ...old.viewer, liked: r.liked } } : old,
      );
      invalidate();
    },
  });
}

function useInvalidateComments(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: communityKeys.comments(id) });
    void queryClient.invalidateQueries({ queryKey: communityKeys.detail(id) });
  };
}

export function useAddComment(id: string) {
  const invalidate = useInvalidateComments(id);
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiFetch<SharedSetCommentDto>(`/community/sets/${id}/comments`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteComment(id: string) {
  const invalidate = useInvalidateComments(id);
  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<void>(`/community/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useResolveComment(id: string) {
  const invalidate = useInvalidateComments(id);
  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<SharedSetCommentDto>(`/community/comments/${commentId}/resolve`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
}

export function useReportSet(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSets();
  return useMutation({
    mutationFn: (input: ReportSetInput) =>
      apiFetch<ReportSetResultDto>(`/community/sets/${id}/report`, { method: 'POST', body: input }),
    onSuccess: (r) => {
      queryClient.setQueryData<SharedSetDetailDto>(communityKeys.detail(id), (old) =>
        old ? { ...old, hidden: r.hidden, viewer: { ...old.viewer, reported: true } } : old,
      );
      invalidate();
    },
  });
}
