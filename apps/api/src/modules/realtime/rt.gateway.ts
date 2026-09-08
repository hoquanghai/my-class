import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  RT_NAMESPACE,
  type RtAuth,
  type ServerToClientEvents,
  sessionRoom,
} from '@lophoc/shared';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AccessTokenPayload } from '../auth/auth.service.js';
import { ACCESS_COOKIE } from '../auth/cookies.js';
import { STUDENT_COOKIE, StudentTokenService } from '../student-auth/student-token.service.js';
import { RunBroadcaster } from './run-broadcaster.service.js';

interface SocketData {
  role: 'teacher' | 'student' | 'present';
  teacherId?: string;
  studentId?: string;
  classId?: string;
}

type RtSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
type RtNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/**
 * Namespace `/rt`: client gửi `session:join`, server phát `session:state` + `run:state`.
 * Xác thực theo `handshake.auth` (role + token) hoặc cookie; máy chiếu không cần token.
 */
@WebSocketGateway({ namespace: RT_NAMESPACE })
export class RtGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RtGateway.name);

  @WebSocketServer()
  namespace!: RtNamespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly studentTokens: StudentTokenService,
    private readonly prisma: PrismaService,
    private readonly broadcaster: RunBroadcaster,
  ) {}

  afterInit(namespace: RtNamespace): void {
    this.broadcaster.attach(namespace);
    this.logger.log(`Socket.IO namespace ${RT_NAMESPACE} sẵn sàng`);
  }

  async handleConnection(client: RtSocket): Promise<void> {
    const auth = (client.handshake.auth ?? {}) as Partial<RtAuth>;
    const cookies = parseCookies(client.handshake.headers.cookie);
    const role: RtAuth['role'] = auth.role ?? 'present';

    try {
      if (role === 'teacher') {
        const token = auth.token ?? cookies[ACCESS_COOKIE];
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token ?? '');
        client.data = { role, teacherId: payload.sub };
      } else if (role === 'student') {
        const principal = await this.studentTokens.verify(auth.token ?? cookies[STUDENT_COOKIE]);
        if (!principal) throw new Error('invalid student token');
        client.data = { role, studentId: principal.studentId, classId: principal.classId };
      } else {
        client.data = { role: 'present' };
      }
    } catch {
      client.emit('rt:error', { code: 'UNAUTHORIZED', message: 'Xác thực realtime thất bại' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('session:join')
  async onJoin(
    @ConnectedSocket() client: RtSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<boolean> {
    const sessionId = body?.sessionId;
    if (!sessionId) return false;
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: { select: { teacherId: true, id: true } } },
    });
    if (!session) return false;

    const d = client.data;
    const allowed =
      d.role === 'present' ||
      (d.role === 'teacher' && d.teacherId === session.class.teacherId) ||
      (d.role === 'student' && d.classId === session.class.id);
    if (!allowed) {
      client.emit('rt:error', { code: 'FORBIDDEN', message: 'Không có quyền theo dõi buổi này' });
      return false;
    }

    await client.join(sessionRoom(sessionId));
    const { sessionState, runState } = await this.broadcaster.buildStates(sessionId);
    client.emit('session:state', sessionState);
    if (runState) client.emit('run:state', runState);
    return true;
  }
}
