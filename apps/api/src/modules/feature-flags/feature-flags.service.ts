import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Đọc feature flag từ bảng FeatureFlag, cache trong RAM 60 giây.
 * Đổi giá trị bằng SQL/seed; mỗi instance tự làm mới sau tối đa 60 giây.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.value as T;

    const row = await this.prisma.featureFlag.findUnique({ where: { key } });
    const value = row ? (row.value as T) : fallback;
    this.cache.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
