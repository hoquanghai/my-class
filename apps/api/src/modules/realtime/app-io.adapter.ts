import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Adapter Socket.IO của app: CORS theo APP_URL và (tùy chọn) Redis adapter để chạy nhiều instance api.
 */
export class AppIoAdapter extends IoAdapter {
  private redisAdapter: ReturnType<typeof createAdapter> | null = null;
  private clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string | string[] | boolean,
  ) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pub = new Redis(url, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    this.clients = [pub, sub];
    this.redisAdapter = createAdapter(pub, sub);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const merged = {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
      transports: ['websocket', 'polling'],
    } as ServerOptions;
    const server = super.createIOServer(port, merged) as Server;
    if (this.redisAdapter) server.adapter(this.redisAdapter);
    return server;
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((c) => c.quit().catch(() => undefined)));
  }
}
