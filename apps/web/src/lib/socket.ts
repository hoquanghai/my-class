'use client';

import type {
  ClientToServerEvents,
  RtAuth,
  RunPublicStateDto,
  ServerToClientEvents,
  SessionStateDto,
} from '@lophoc/shared';
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, apiFetch } from './api';

export type RtSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SessionSocketState {
  runState: RunPublicStateDto | null;
  sessionState: SessionStateDto | null;
  connected: boolean;
  /** Số lần kết nối thành công (tăng khi reconnect) — dùng để gửi lại hàng đợi. */
  connectCount: number;
  /** serverTime - Date.now(): cộng vào giờ máy để đếm ngược khớp với server. */
  offsetMs: number;
  error: string | null;
}

/**
 * Kết nối Socket.IO tới phòng buổi học và giữ trạng thái mới nhất của lượt kiểm tra.
 * Tự reconnect; giáo viên hết hạn access token sẽ được làm mới một lần rồi kết nối lại.
 */
export function useSessionSocket(
  sessionId: string | null,
  auth: RtAuth | null,
): SessionSocketState {
  const [state, setState] = useState<SessionSocketState>({
    runState: null,
    sessionState: null,
    connected: false,
    connectCount: 0,
    offsetMs: 0,
    error: null,
  });
  const authKey = auth ? `${auth.role}:${auth.token ?? ''}` : '';

  useEffect(() => {
    if (!sessionId || !authKey) return;
    const sep = authKey.indexOf(':');
    const role = authKey.slice(0, sep) as RtAuth['role'];
    const token = authKey.slice(sep + 1);
    const socket: RtSocket = io(`${API_URL}/rt`, {
      auth: token ? { role, token } : { role },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    let refreshed = false;

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true, connectCount: s.connectCount + 1, error: null }));
      socket.emit('session:join', { sessionId }, (ok) => {
        if (!ok) setState((s) => ({ ...s, error: 'Không vào được phòng buổi học' }));
      });
    });
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));
    socket.on('run:state', (runState) => {
      setState((s) => ({
        ...s,
        runState,
        offsetMs: Date.parse(runState.serverTime) - Date.now(),
      }));
    });
    socket.on('session:state', (sessionState) => setState((s) => ({ ...s, sessionState })));
    socket.on('rt:error', async (payload) => {
      if (payload.code === 'UNAUTHORIZED' && role === 'teacher' && !refreshed) {
        refreshed = true;
        // apiFetch tự refresh cookie khi 401 rồi thử lại
        try {
          await apiFetch('/auth/me');
          socket.connect();
          return;
        } catch {
          // rơi xuống báo lỗi
        }
      }
      setState((s) => ({ ...s, error: payload.message }));
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, authKey]);

  return state;
}
