import type { RunPublicStateDto } from './runs/types.js';

/** Namespace Socket.IO dùng cho realtime. */
export const RT_NAMESPACE = '/rt';

export const sessionRoom = (sessionId: string): string => `session:${sessionId}`;

export interface SessionStateDto {
  sessionId: string;
  status: 'active' | 'ended';
  activeRunId: string | null;
  joinedCount: number;
}

export interface ServerToClientEvents {
  'run:state': (state: RunPublicStateDto) => void;
  'session:state': (state: SessionStateDto) => void;
  'rt:error': (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'session:join': (payload: { sessionId: string }, ack?: (ok: boolean) => void) => void;
}

export type RtRole = 'teacher' | 'student' | 'present';

/** Dữ liệu client gửi trong `handshake.auth`. */
export interface RtAuth {
  role: RtRole;
  /** Access JWT (giáo viên) hoặc token thiết bị (học sinh); máy chiếu không cần */
  token?: string;
}
