'use client';

import type { BillingDto, CreatePaymentRequestInput, PaymentRequestDto } from '@lophoc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { ME_QUERY_KEY } from './auth';

export const billingKeys = {
  me: ['billing', 'me'] as const,
};

/** Gói đang hiệu lực, yêu cầu đang chờ và lịch sử thanh toán của giáo viên. */
export function useBilling() {
  return useQuery({
    queryKey: billingKeys.me,
    queryFn: () => apiFetch<BillingDto>('/billing/me'),
  });
}

/** Báo "đã chuyển khoản" → yêu cầu chờ admin xác nhận. */
export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentRequestInput) =>
      apiFetch<PaymentRequestDto>('/billing/requests', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.me });
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
