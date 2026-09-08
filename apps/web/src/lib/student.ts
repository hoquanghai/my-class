'use client';

import type {
  JoinInfoDto,
  PickNameResultDto,
  StudentMeDto,
  StudentRunViewDto,
  SubmitAnswerInput,
  SubmitAnswerResultDto,
} from '@lophoc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch, type ApiOptions } from './api';

const TOKEN_KEY = 'lh_student_token';
const QUEUE_KEY = 'lh_student_queue';

/** Token thiết bị lưu ở localStorage làm dự phòng khi trình duyệt chặn cookie bên thứ ba. */
export function getStudentToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStudentToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private mode: chỉ dùng cookie
  }
}

export function studentFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = getStudentToken();
  return apiFetch<T>(path, {
    ...opts,
    retryOn401: false,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export const studentKeys = {
  join: (code: string) => ['join', code] as const,
  me: ['student', 'me'] as const,
  run: (runId: string, version: string) => ['student', 'runs', runId, version] as const,
};

export function useJoinInfo(code: string) {
  return useQuery({
    queryKey: studentKeys.join(code),
    queryFn: () => apiFetch<JoinInfoDto>(`/join/${encodeURIComponent(code)}`),
    retry: false,
  });
}

export function usePickName(code: string) {
  return useMutation({
    mutationFn: (studentId: string) =>
      studentFetch<PickNameResultDto>(`/join/${encodeURIComponent(code)}/pick`, {
        method: 'POST',
        body: { studentId },
      }),
    onSuccess: (result) => setStudentToken(result.token),
  });
}

export function useStudentMe(options: { pollMs?: number | false } = {}) {
  return useQuery({
    queryKey: studentKeys.me,
    queryFn: () => studentFetch<StudentMeDto>('/student/me'),
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 2,
    refetchInterval: options.pollMs ?? false,
  });
}

/** `version` đổi mỗi khi trạng thái lượt đổi (câu mới, đóng câu, kết thúc) → tải lại góc nhìn. */
export function useStudentRunView(runId: string | null, version: string) {
  return useQuery({
    queryKey: studentKeys.run(runId ?? '', version),
    queryFn: () => studentFetch<StudentRunViewDto>(`/student/runs/${runId}`),
    enabled: runId !== null,
    staleTime: 5_000,
  });
}

// ---------- Hàng đợi nộp bài chịu mất mạng ----------

export interface QueuedAnswer {
  runId: string;
  input: SubmitAnswerInput;
  queuedAt: number;
}

function readQueue(): QueuedAnswer[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedAnswer[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedAnswer[]): void {
  try {
    if (items.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // bỏ qua
  }
}

export type SubmitOutcome =
  | { kind: 'accepted' }
  | { kind: 'duplicate' }
  | { kind: 'queued' }
  | { kind: 'closed' }
  | { kind: 'error'; message: string };

/**
 * Nộp bài với hàng đợi: lỗi mạng → giữ trong localStorage và gửi lại theo chu kỳ / khi kết nối lại.
 * Trả `pending` = các runQuestionId đang chờ gửi để UI hiển thị.
 */
export function useAnswerQueue(flushSignal: number) {
  const [pending, setPending] = useState<string[]>(() =>
    readQueue().map((q) => q.input.runQuestionId),
  );
  const [lastOutcome, setLastOutcome] = useState<SubmitOutcome | null>(null);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let queue = readQueue();
      while (queue.length > 0) {
        const item = queue[0]!;
        try {
          await studentFetch<SubmitAnswerResultDto>(`/student/runs/${item.runId}/answers`, {
            method: 'POST',
            body: item.input,
          });
        } catch (err) {
          if (err instanceof ApiError) {
            // 409 câu đã đóng / 400 dữ liệu sai → bỏ khỏi hàng đợi, không lặp mãi
            if (err.code === 'RUN_NOT_OPEN') setLastOutcome({ kind: 'closed' });
          } else {
            break; // mất mạng: giữ lại, thử sau
          }
        }
        queue = queue.slice(1);
        writeQueue(queue);
      }
      setPending(queue.map((q) => q.input.runQuestionId));
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    void flush();
    const id = setInterval(() => {
      if (readQueue().length > 0) void flush();
    }, 2_000);
    return () => clearInterval(id);
  }, [flush, flushSignal]);

  const submit = useCallback(
    async (runId: string, input: SubmitAnswerInput): Promise<SubmitOutcome> => {
      const payload: SubmitAnswerInput = {
        ...input,
        clientRequestId: input.clientRequestId ?? crypto.randomUUID(),
      };
      try {
        const res = await studentFetch<SubmitAnswerResultDto>(`/student/runs/${runId}/answers`, {
          method: 'POST',
          body: payload,
        });
        const outcome: SubmitOutcome = res.accepted ? { kind: 'accepted' } : { kind: 'duplicate' };
        setLastOutcome(outcome);
        return outcome;
      } catch (err) {
        if (err instanceof ApiError) {
          const outcome: SubmitOutcome =
            err.code === 'RUN_NOT_OPEN'
              ? { kind: 'closed' }
              : { kind: 'error', message: err.message };
          setLastOutcome(outcome);
          return outcome;
        }
        const queue = readQueue();
        queue.push({ runId, input: payload, queuedAt: Date.now() });
        writeQueue(queue);
        setPending(queue.map((q) => q.input.runQuestionId));
        setLastOutcome({ kind: 'queued' });
        return { kind: 'queued' };
      }
    },
    [],
  );

  return { submit, pending, lastOutcome, flush };
}
