# S0 — Khởi tạo monorepo: Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng monorepo `lophoc` chạy được: API NestJS 12 (ESM) có `/api/health` kiểm tra DB, Prisma 7 với toàn bộ schema MVP + migration + seed demo, web Next.js 16 + Tailwind 4 + next-intl (vi) có trang landing giữ chỗ, Docker Compose dev, Dockerfile cho api/web, CI GitHub Actions.

**Architecture:** pnpm workspaces + Turborepo; `packages/shared` build ra ESM `dist` và được `apps/api` (nodenext) lẫn `apps/web` (bundler) dùng chung; api là ESM (`"type": "module"`, import tương đối có đuôi `.js`); Prisma dùng generator `prisma-client` sinh TypeScript vào `apps/api/src/generated/prisma` (gitignore, sinh lại khi build/typecheck/test); cấu hình env kiểm tra bằng Zod qua `@nestjs/config`; test bằng Vitest (unit + e2e supertest).

**Tech Stack:** Node 24, pnpm 9.15.9, TypeScript 5.9, Turborepo 2, NestJS 12.0, Prisma 7.10 + `@prisma/adapter-pg`, Zod 4, Vitest 4, Next.js 16.3, React 19.2, Tailwind 4.3, next-intl 4.14, PostgreSQL 16, Redis 7, MinIO, Mailpit.

**Quy ước:** mọi lệnh chạy từ thư mục gốc repo (`c:\Users\ホクアンハイ\Documents\GitHub\my class`) trong Git Bash trừ khi ghi khác. Tên package: `@lophoc/shared`, `@lophoc/api`, `@lophoc/web`.

---

## Cấu trúc file tạo trong S0

```
.
├── .editorconfig  .gitignore  .npmrc  .nvmrc  .prettierrc  .prettierignore
├── package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json  README.md
├── .github/workflows/ci.yml
├── infra/
│   ├── docker-compose.dev.yml
│   └── postgres-init/01-create-test-db.sql
├── packages/shared/
│   ├── package.json  tsconfig.json  tsconfig.build.json  vitest.config.ts  eslint.config.mjs
│   └── src/index.ts  src/class-code.ts  src/class-code.spec.ts
└── apps/
    ├── api/
    │   ├── package.json  tsconfig.json  tsconfig.build.json  nest-cli.json
    │   ├── vitest.config.ts  vitest.config.e2e.ts  eslint.config.mjs  Dockerfile
    │   ├── .env.example  .env.test  prisma.config.ts
    │   ├── prisma/schema.prisma  prisma/seed.ts  prisma/migrations/...
    │   ├── src/main.ts  src/app.module.ts
    │   ├── src/config/env.ts
    │   ├── src/prisma/prisma.module.ts  src/prisma/prisma.service.ts
    │   ├── src/modules/health/health.module.ts  health.controller.ts  health.controller.spec.ts
    │   └── test/setup-e2e.ts  test/health.e2e-spec.ts
    └── web/
        ├── package.json  tsconfig.json  next.config.ts  postcss.config.mjs  eslint.config.mjs  Dockerfile
        ├── .env.example  messages/vi.json
        └── src/app/layout.tsx  src/app/page.tsx  src/app/globals.css  src/i18n/request.ts
```

---

### Task 1: Khởi tạo git và cấu hình workspace gốc

**Files:**

- Create: `.gitignore`, `.editorconfig`, `.npmrc`, `.nvmrc`, `.prettierrc`, `.prettierignore`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`

- [ ] **Step 1: git init**

```bash
git init -b main
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Tạo `.gitignore`**

```gitignore
node_modules/
dist/
.next/
out/
.turbo/
coverage/
*.tsbuildinfo
.DS_Store
Thumbs.db

# env: chỉ commit .env.example và .env.test (không có secret)
.env
.env.local
.env.*.local
.env.production

# Prisma generated client (sinh lại bằng `prisma generate`)
apps/api/src/generated/

# logs
*.log
```

- [ ] **Step 3: Tạo `.editorconfig`, `.npmrc`, `.nvmrc`, `.prettierrc`, `.prettierignore`**

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.npmrc`:

```ini
auto-install-peers=true
strict-peer-dependencies=false
```

`.nvmrc`:

```
24
```

`.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.prettierignore`:

```
node_modules
dist
.next
.turbo
coverage
pnpm-lock.yaml
apps/api/src/generated
apps/api/prisma/migrations
```

- [ ] **Step 4: Tạo `package.json` gốc**

```json
{
  "name": "lophoc",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:migrate": "pnpm --filter @lophoc/api db:migrate",
    "db:seed": "pnpm --filter @lophoc/api db:seed",
    "infra:up": "docker compose -f infra/docker-compose.dev.yml up -d",
    "infra:down": "docker compose -f infra/docker-compose.dev.yml down"
  },
  "devDependencies": {
    "prettier": "^3.9.6",
    "turbo": "^2.10.12",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 5: Tạo `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`**

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2023",
    "lib": ["ES2023"]
  }
}
```

- [ ] **Step 6: Cài đặt và commit**

```bash
pnpm install
git add -A && git commit -m "chore: init monorepo workspace (pnpm + turbo)"
```

Expected: `pnpm install` tạo `pnpm-lock.yaml`, không lỗi.

---

### Task 2: `packages/shared` với tiện ích mã lớp (TDD)

**Files:**

- Create: `packages/shared/package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `eslint.config.mjs`, `src/index.ts`, `src/class-code.ts`
- Test: `packages/shared/src/class-code.spec.ts`

- [ ] **Step 1: Tạo cấu hình package**

`packages/shared/package.json`:

```json
{
  "name": "@lophoc/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch --preserveWatchOutput",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint src",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.5.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.70.0",
    "vitest": "^4.1.11"
  }
}
```

`packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`packages/shared/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": []
  },
  "exclude": ["src/**/*.spec.ts"]
}
```

`packages/shared/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
```

`packages/shared/eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 2: Viết test thất bại `src/class-code.spec.ts`**

```ts
import {
  CLASS_CODE_ALPHABET,
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from './class-code.js';

describe('generateClassCode', () => {
  it('sinh mã 6 ký tự chỉ gồm bảng chữ không nhầm lẫn', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateClassCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(CLASS_CODE_ALPHABET).toContain(ch);
    }
  });

  it('không chứa ký tự dễ nhầm 0 O 1 I L', () => {
    for (const ch of '0O1IL') expect(CLASS_CODE_ALPHABET).not.toContain(ch);
  });

  it('dùng nguồn ngẫu nhiên được truyền vào (deterministic)', () => {
    const fixed = () => 0; // luôn chọn ký tự đầu bảng
    expect(generateClassCode(fixed)).toBe('AAAAAA');
  });
});

describe('isValidClassCode', () => {
  it('chấp nhận mã hợp lệ', () => {
    expect(isValidClassCode('AB2CD3')).toBe(true);
  });
  it('từ chối sai độ dài hoặc ký tự ngoài bảng', () => {
    expect(isValidClassCode('AB2CD')).toBe(false);
    expect(isValidClassCode('AB0CD3')).toBe(false);
    expect(isValidClassCode('ab2cd3')).toBe(false);
  });
});

describe('normalizeClassCode', () => {
  it('bỏ khoảng trắng, viết hoa', () => {
    expect(normalizeClassCode(' ab2 cd3 ')).toBe('AB2CD3');
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận thất bại**

```bash
pnpm --filter @lophoc/shared test
```

Expected: FAIL, `Cannot find module './class-code.js'`.

- [ ] **Step 4: Viết `src/class-code.ts` và `src/index.ts`**

`src/class-code.ts`:

```ts
/** Bảng chữ không có 0/O, 1/I/L để đọc trên máy chiếu không nhầm. */
export const CLASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CLASS_CODE_LENGTH = 6;

const CODE_REGEX = new RegExp(`^[${CLASS_CODE_ALPHABET}]{${CLASS_CODE_LENGTH}}$`);

function secureRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return (buf[0] as number) / 0x1_0000_0000;
}

/**
 * Sinh mã lớp 6 ký tự. `random` trả về số trong [0, 1); mặc định dùng crypto.
 */
export function generateClassCode(random: () => number = secureRandom): string {
  let code = '';
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) {
    const idx = Math.floor(random() * CLASS_CODE_ALPHABET.length);
    code += CLASS_CODE_ALPHABET[idx];
  }
  return code;
}

export function isValidClassCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

/** Chuẩn hóa mã do người dùng nhập: bỏ khoảng trắng, viết hoa. */
export function normalizeClassCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}
```

`src/index.ts`:

```ts
export * from './class-code.js';
```

- [ ] **Step 5: Cài, chạy test và build**

```bash
pnpm install
pnpm --filter @lophoc/shared test
pnpm --filter @lophoc/shared build && ls packages/shared/dist
```

Expected: 7 tests PASS; `dist/index.js`, `dist/class-code.js`, `dist/index.d.ts` tồn tại.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(shared): class code utilities with tests"
```

---

### Task 3: Khung `apps/api` NestJS 12 ESM + env Zod + health (unit test)

**Files:**

- Create: `apps/api/package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `vitest.config.ts`, `eslint.config.mjs`, `.env.example`, `src/main.ts`, `src/app.module.ts`, `src/config/env.ts`, `src/modules/health/health.module.ts`, `src/modules/health/health.controller.ts`
- Test: `apps/api/src/modules/health/health.controller.spec.ts`, `apps/api/src/config/env.spec.ts`

Lưu ý: Task 3 tạo `PrismaService` dạng tối thiểu trong Task 4; ở Task 3 health controller phụ thuộc vào `PrismaService` nên tạo luôn file `src/prisma/prisma.service.ts` và `prisma.module.ts` ở đây, còn schema/migration làm ở Task 4.

- [ ] **Step 1: Tạo cấu hình package**

`apps/api/package.json`:

```json
{
  "name": "@lophoc/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "files": ["dist", "prisma", "prisma.config.ts"],
  "scripts": {
    "build": "prisma generate && nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "typecheck": "prisma generate && tsc -p tsconfig.json --noEmit",
    "lint": "eslint src test",
    "test": "prisma generate && vitest run",
    "test:e2e": "prisma generate && cross-env NODE_ENV=test prisma migrate deploy && cross-env NODE_ENV=test vitest run --config ./vitest.config.e2e.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@lophoc/shared": "workspace:*",
    "@nestjs/common": "^12.0.1",
    "@nestjs/config": "^12.0.0",
    "@nestjs/core": "^12.0.1",
    "@nestjs/platform-express": "^12.0.1",
    "@node-rs/argon2": "^2.0.2",
    "@prisma/adapter-pg": "7.10.0",
    "@prisma/client": "7.10.0",
    "dotenv": "^17.4.2",
    "pg": "^8.23.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "zod": "^4.5.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@nestjs/cli": "^12.0.0",
    "@nestjs/schematics": "^12.0.0",
    "@nestjs/testing": "^12.0.1",
    "@swc/core": "^1.16.2",
    "@types/express": "^5.0.0",
    "@types/node": "^24.0.0",
    "@types/pg": "^8.23.1",
    "@types/supertest": "^7.0.0",
    "cross-env": "^7.0.3",
    "eslint": "^9.0.0",
    "prisma": "7.10.0",
    "supertest": "^7.2.2",
    "tsx": "^4.23.13",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.70.0",
    "unplugin-swc": "^1.6.0",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^4.1.11"
  }
}
```

`apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "allowSyntheticDefaultImports": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "removeComments": true,
    "sourceMap": true,
    "incremental": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "strictPropertyInitialization": false,
    "types": ["vitest/globals", "node"]
  },
  "include": [
    "src",
    "test",
    "prisma",
    "prisma.config.ts",
    "vitest.config.ts",
    "vitest.config.e2e.ts"
  ]
}
```

`apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "test", "dist", "**/*.spec.ts"]
}
```

`apps/api/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

`apps/api/vitest.config.ts`:

```ts
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
```

`apps/api/eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

`apps/api/.env.example`:

```ini
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://lophoc:lophoc@localhost:5432/lophoc
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

- [ ] **Step 2: Viết test thất bại cho env `src/config/env.spec.ts`**

```ts
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('áp giá trị mặc định', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('ép kiểu PORT từ chuỗi', () => {
    expect(validateEnv({ ...base, PORT: '5001' }).PORT).toBe(5001);
  });

  it('ném lỗi có tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 3: Viết `src/config/env.ts`**

```ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  APP_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url().default('http://localhost:4000'),
});

export type Env = z.infer<typeof envSchema>;

/** Dùng cho ConfigModule.forRoot({ validate }). Ném lỗi rõ tên biến khi cấu hình sai. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Viết Prisma service tối thiểu (schema thật ở Task 4)**

`src/prisma/prisma.service.ts`:

```ts
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

`src/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Viết test thất bại cho health `src/modules/health/health.controller.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('trả về status ok khi DB trả lời', async () => {
    const prismaMock = { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Viết health controller/module, app module, main**

`src/modules/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; db: 'ok'; time: string }> {
    await this.prisma.$queryRaw`SELECT 1 AS ok`;
    return { status: 'ok', db: 'ok', time: new Date().toISOString() };
  }
}
```

`src/modules/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

`src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
```

`src/main.ts`:

```ts
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('APP_URL', { infer: true }), credentials: true });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}

await bootstrap();
```

- [ ] **Step 7: Tạo schema Prisma tạm để `prisma generate` chạy được** (schema đầy đủ thay ở Task 4)

`apps/api/prisma.config.ts`:

```ts
import { config as loadDotenv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadDotenv({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

`apps/api/prisma/schema.prisma` (tạm):

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "js"
}

datasource db {
  provider = "postgresql"
}

model FeatureFlag {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 8: Cài đặt, chạy unit test, typecheck**

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @lophoc/api test
pnpm --filter @lophoc/api typecheck
```

Expected: 4 tests PASS (3 env + 1 health); typecheck không lỗi.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(api): NestJS 12 ESM skeleton with zod env and health endpoint"
```

---

### Task 4: Docker Compose dev + schema Prisma đầy đủ + migration + e2e health

**Files:**

- Create: `infra/docker-compose.dev.yml`, `infra/postgres-init/01-create-test-db.sql`, `apps/api/.env.test`, `apps/api/vitest.config.e2e.ts`, `apps/api/test/setup-e2e.ts`
- Modify: `apps/api/prisma/schema.prisma` (thay toàn bộ)
- Test: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Tạo Compose dev**

`infra/docker-compose.dev.yml`:

```yaml
name: lophoc-dev

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lophoc
      POSTGRES_PASSWORD: lophoc
      POSTGRES_DB: lophoc
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U lophoc -d lophoc']
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    command: server /data --console-address ':9001'
    environment:
      MINIO_ROOT_USER: lophoc
      MINIO_ROOT_PASSWORD: lophoc123
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - miniodata:/data

  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      until mc alias set local http://minio:9000 lophoc lophoc123; do sleep 1; done;
      mc mb --ignore-existing local/lophoc;
      mc anonymous set download local/lophoc;
      "

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - '8025:8025'
      - '1025:1025'

volumes:
  pgdata:
  miniodata:
```

`infra/postgres-init/01-create-test-db.sql`:

```sql
CREATE DATABASE lophoc_test;
```

- [ ] **Step 2: Khởi động hạ tầng**

```bash
pnpm infra:up
docker compose -f infra/docker-compose.dev.yml ps
```

Expected: `postgres`, `redis`, `minio`, `mailpit` ở trạng thái `running`/`healthy`; `minio-init` exited 0.

- [ ] **Step 3: Thay `apps/api/prisma/schema.prisma` bằng schema đầy đủ**

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "js"
}

datasource db {
  provider = "postgresql"
}

// ---------- Giáo viên & xác thực ----------

model Teacher {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerifiedAt DateTime?
  name            String
  avatarUrl       String?
  passwordHash    String?
  plan            String    @default("free")
  acceptedTermsAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  identities    AuthIdentity[]
  emailTokens   EmailToken[]
  refreshTokens RefreshToken[]
  classes       Class[]
  sessions      ClassSession[]
  questions     Question[]
  quizzes       Quiz[]
  importJobs    ImportJob[]
  mediaFiles    MediaFile[]
  feedbacks     SessionFeedback[]
  events        AnalyticsEvent[]
}

model AuthIdentity {
  id             String   @id @default(cuid())
  teacherId      String
  provider       String // google | facebook
  providerUserId String
  createdAt      DateTime @default(now())

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId])
  @@index([teacherId])
}

model EmailToken {
  id        String    @id @default(cuid())
  teacherId String
  type      String // verify | reset
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([teacherId, type])
}

model RefreshToken {
  id        String    @id @default(cuid())
  teacherId String
  tokenHash String    @unique
  userAgent String?
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([teacherId])
}

// ---------- Lớp & học sinh ----------

model Class {
  id                 String    @id @default(cuid())
  teacherId          String
  name               String
  subject            String?
  grade              String?
  schedule           Json?
  code               String    @unique
  requireStudentCode Boolean   @default(false)
  rosterLocked       Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?

  teacher  Teacher         @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  students Student[]
  devices  StudentDevice[]
  sessions ClassSession[]

  @@index([teacherId])
}

model Student {
  id          String    @id @default(cuid())
  classId     String
  name        String
  studentCode String?
  parentPhone String?
  sortOrder   Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  class        Class                @relation(fields: [classId], references: [id], onDelete: Cascade)
  devices      StudentDevice[]
  attendance   AttendanceRecord[]
  participants SessionParticipant[]
  answers      Answer[]
  runResults   QuizRunResult[]

  @@index([classId])
}

model StudentDevice {
  id         String    @id @default(cuid())
  studentId  String
  classId    String
  tokenHash  String    @unique
  userAgent  String?
  lastSeenAt DateTime  @default(now())
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  student      Student              @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class        Class                @relation(fields: [classId], references: [id], onDelete: Cascade)
  participants SessionParticipant[]

  @@index([studentId])
  @@index([classId])
}

// ---------- Buổi học, điểm danh, tham gia ----------

model ClassSession {
  id        String    @id @default(cuid())
  classId   String
  teacherId String
  status    String    @default("active") // active | ended
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  note      String?
  createdAt DateTime  @default(now())

  class        Class                @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacher      Teacher              @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  attendance   AttendanceRecord[]
  participants SessionParticipant[]
  quizRuns     QuizRun[]
  feedback     SessionFeedback?

  @@index([classId, startedAt])
  @@index([teacherId])
}

model AttendanceRecord {
  id        String   @id @default(cuid())
  sessionId String
  studentId String
  status    String // present | absent | late | excused
  note      String?
  markedAt  DateTime @default(now())

  session ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  student Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentId])
  @@index([studentId])
}

model SessionParticipant {
  id         String   @id @default(cuid())
  sessionId  String
  studentId  String
  deviceId   String
  joinedAt   DateTime @default(now())
  lastSeenAt DateTime @default(now())

  session ClassSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  student Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  device  StudentDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentId])
  @@index([deviceId])
}

// ---------- Ngân hàng câu hỏi ----------

model Question {
  id              String    @id @default(cuid())
  teacherId       String
  type            String // single_choice | multiple_choice | true_false | short_text
  stemMd          String
  explanationMd   String?
  imageKey        String?
  subject         String?
  grade           String?
  topic           String?
  difficulty      String? // nhan_biet | thong_hieu | van_dung
  source          String // paste | docx | image_ai | manual
  acceptedAnswers Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  teacher       Teacher           @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  options       QuestionOption[]
  quizQuestions QuizQuestion[]
  runQuestions  QuizRunQuestion[]

  @@index([teacherId, subject, grade, topic, difficulty])
}

model QuestionOption {
  id         String  @id @default(cuid())
  questionId String
  label      String
  contentMd  String
  imageKey   String?
  isCorrect  Boolean @default(false)
  sortOrder  Int

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([questionId])
}

model ImportJob {
  id         String    @id @default(cuid())
  teacherId  String
  source     String // docx | image_ai
  status     String    @default("pending") // pending | processing | done | failed
  pageCount  Int       @default(0)
  inputKeys  Json
  result     Json?
  error      String?
  createdAt  DateTime  @default(now())
  finishedAt DateTime?

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([teacherId, source, createdAt])
}

model MediaFile {
  id        String   @id @default(cuid())
  teacherId String
  key       String   @unique
  mime      String
  sizeBytes Int
  createdAt DateTime @default(now())

  teacher Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([teacherId])
}

// ---------- Đề kiểm tra ----------

model Quiz {
  id                  String    @id @default(cuid())
  teacherId           String
  title               String
  description         String?
  defaultTimeLimitSec Int       @default(30)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  teacher   Teacher        @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
  runs      QuizRun[]

  @@index([teacherId])
}

model QuizQuestion {
  id           String @id @default(cuid())
  quizId       String
  questionId   String
  sortOrder    Int
  timeLimitSec Int?
  points       Int    @default(1)

  quiz     Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([quizId, questionId])
  @@index([questionId])
}

// ---------- Lượt kiểm tra đầu giờ ----------

model QuizRun {
  id               String    @id @default(cuid())
  sessionId        String
  quizId           String
  mode             String // paced | self_paced
  shuffleQuestions Boolean   @default(false)
  shuffleOptions   Boolean   @default(false)
  status           String    @default("lobby") // lobby | in_progress | finished
  currentIndex     Int?
  questionOpenedAt DateTime?
  questionClosedAt DateTime?
  deadlineAt       DateTime?
  startedAt        DateTime?
  endedAt          DateTime?
  createdAt        DateTime  @default(now())

  session   ClassSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  quiz      Quiz              @relation(fields: [quizId], references: [id], onDelete: Cascade)
  questions QuizRunQuestion[]
  answers   Answer[]
  results   QuizRunResult[]

  @@index([sessionId])
  @@index([quizId])
}

model QuizRunQuestion {
  id           String @id @default(cuid())
  runId        String
  questionId   String
  sortOrder    Int
  timeLimitSec Int
  points       Int
  snapshot     Json

  run      QuizRun  @relation(fields: [runId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answers  Answer[]

  @@unique([runId, sortOrder])
  @@index([questionId])
}

model Answer {
  id                  String   @id @default(cuid())
  runId               String
  runQuestionId       String
  studentId           String
  selectedOptionIds   Json?
  textAnswer          String?
  isCorrect           Boolean?
  pointsAwarded       Int      @default(0)
  overriddenByTeacher Boolean  @default(false)
  responseMs          Int?
  submittedAt         DateTime @default(now())

  run         QuizRun         @relation(fields: [runId], references: [id], onDelete: Cascade)
  runQuestion QuizRunQuestion @relation(fields: [runQuestionId], references: [id], onDelete: Cascade)
  student     Student         @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([runQuestionId, studentId])
  @@index([runId, studentId])
}

model QuizRunResult {
  id            String    @id @default(cuid())
  runId         String
  studentId     String
  score         Int
  correctCount  Int
  answeredCount Int
  rank          Int?
  finishedAt    DateTime?

  run     QuizRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([runId, studentId])
  @@index([studentId])
}

// ---------- Phản hồi, đo lường, feature flag ----------

model SessionFeedback {
  id        String   @id @default(cuid())
  sessionId String   @unique
  teacherId String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())

  session ClassSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  teacher Teacher      @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model AnalyticsEvent {
  id        String   @id @default(cuid())
  teacherId String?
  name      String
  props     Json
  createdAt DateTime @default(now())

  teacher Teacher? @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([name, createdAt])
  @@index([teacherId])
}

model FeatureFlag {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Tạo migration init**

```bash
pnpm --filter @lophoc/api exec prisma migrate dev --name init
```

Expected: thư mục `apps/api/prisma/migrations/<timestamp>_init/migration.sql` được tạo, DB `lophoc` có 22 bảng, client được generate.

- [ ] **Step 5: Thêm migration partial unique index cho tên học sinh**

```bash
pnpm --filter @lophoc/api exec prisma migrate dev --create-only --name student_name_unique_active
```

Mở file `migration.sql` vừa tạo (rỗng) và ghi:

```sql
-- Tên học sinh duy nhất trong lớp, chỉ tính bản ghi chưa xóa mềm
CREATE UNIQUE INDEX "Student_classId_name_active_key"
  ON "Student" ("classId", "name")
  WHERE "deletedAt" IS NULL;
```

Rồi áp dụng:

```bash
pnpm --filter @lophoc/api exec prisma migrate dev
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 6: Tạo `.env.test`, cấu hình e2e và setup**

`apps/api/.env.test`:

```ini
NODE_ENV=test
PORT=4001
DATABASE_URL=postgresql://lophoc:lophoc@localhost:5432/lophoc_test
REDIS_URL=redis://localhost:6379
APP_URL=http://localhost:3000
API_URL=http://localhost:4001
```

`apps/api/vitest.config.e2e.ts`:

```ts
import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
```

`apps/api/test/setup-e2e.ts`:

```ts
import { config as loadDotenv } from 'dotenv';

process.env.NODE_ENV = 'test';
loadDotenv({ path: '.env.test' });
```

- [ ] **Step 7: Viết e2e test `apps/api/test/health.e2e-spec.ts`**

```ts
import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('trả về 200 và status ok từ DB thật', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.time).toBe('string');
  });
});
```

- [ ] **Step 8: Chạy e2e**

```bash
pnpm --filter @lophoc/api test:e2e
```

Expected: migrate deploy lên `lophoc_test` thành công; 1 test PASS.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(api): full MVP prisma schema, migrations, dev compose, health e2e"
```

---

### Task 5: Seed dữ liệu demo

**Files:**

- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Viết `apps/api/prisma/seed.ts`**

```ts
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client.js';

loadDotenv({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const DEMO_EMAIL = 'demo@lophoc.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_CLASS_CODE = 'DEM268';

const FEATURE_FLAGS: Record<string, unknown> = {
  'free.max_classes': 2,
  'free.max_students_per_class': 50,
  'free.ai_pages_per_month': 20,
  'free.history_days': 30,
  'free.export_enabled': false,
  'ai_extraction.enabled': true,
};

const STUDENT_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Châu',
  'Phạm Quốc Dũng',
  'Hoàng Thu Hà',
  'Vũ Đức Huy',
  'Đặng Ngọc Lan',
  'Bùi Hải Nam',
  'Đỗ Phương Nhi',
  'Ngô Thanh Phong',
  'Dương Bảo Quyên',
  'Lý Hoài Sơn',
];

type SeedQuestion = {
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';
  stemMd: string;
  topic: string;
  difficulty: 'nhan_biet' | 'thong_hieu' | 'van_dung';
  options?: { label: string; contentMd: string; isCorrect: boolean }[];
  acceptedAnswers?: string[];
  explanationMd?: string;
};

const QUESTIONS: SeedQuestion[] = [
  {
    type: 'single_choice',
    stemMd: 'Nghiệm của phương trình $2x + 3 = 11$ là:',
    topic: 'Phương trình bậc nhất',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$x = 3$', isCorrect: false },
      { label: 'B', contentMd: '$x = 4$', isCorrect: true },
      { label: 'C', contentMd: '$x = 5$', isCorrect: false },
      { label: 'D', contentMd: '$x = 7$', isCorrect: false },
    ],
    explanationMd: '$2x = 8 \\Rightarrow x = 4$.',
  },
  {
    type: 'single_choice',
    stemMd: 'Căn bậc hai số học của 49 là:',
    topic: 'Căn bậc hai',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$-7$', isCorrect: false },
      { label: 'B', contentMd: '$7$', isCorrect: true },
      { label: 'C', contentMd: '$\\pm 7$', isCorrect: false },
      { label: 'D', contentMd: '$49$', isCorrect: false },
    ],
  },
  {
    type: 'single_choice',
    stemMd: 'Giá trị của biểu thức $\\sqrt{16} + \\sqrt{9}$ bằng:',
    topic: 'Căn bậc hai',
    difficulty: 'thong_hieu',
    options: [
      { label: 'A', contentMd: '$5$', isCorrect: false },
      { label: 'B', contentMd: '$7$', isCorrect: true },
      { label: 'C', contentMd: '$25$', isCorrect: false },
      { label: 'D', contentMd: '$\\sqrt{25}$', isCorrect: false },
    ],
  },
  {
    type: 'multiple_choice',
    stemMd: 'Chọn các số là nghiệm của phương trình $x^2 - 5x + 6 = 0$:',
    topic: 'Phương trình bậc hai',
    difficulty: 'thong_hieu',
    options: [
      { label: 'A', contentMd: '$1$', isCorrect: false },
      { label: 'B', contentMd: '$2$', isCorrect: true },
      { label: 'C', contentMd: '$3$', isCorrect: true },
      { label: 'D', contentMd: '$6$', isCorrect: false },
    ],
  },
  {
    type: 'true_false',
    stemMd: 'Tổng ba góc trong một tam giác bằng $180^\\circ$.',
    topic: 'Tam giác',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: 'Đúng', isCorrect: true },
      { label: 'B', contentMd: 'Sai', isCorrect: false },
    ],
  },
  {
    type: 'true_false',
    stemMd: 'Số $0$ là số nguyên dương.',
    topic: 'Số nguyên',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: 'Đúng', isCorrect: false },
      { label: 'B', contentMd: 'Sai', isCorrect: true },
    ],
  },
  {
    type: 'short_text',
    stemMd: 'Tính $15 \\times 4$.',
    topic: 'Số học',
    difficulty: 'nhan_biet',
    acceptedAnswers: ['60'],
  },
  {
    type: 'short_text',
    stemMd: 'Hình có bốn cạnh bằng nhau và bốn góc vuông gọi là hình gì?',
    topic: 'Tứ giác',
    difficulty: 'nhan_biet',
    acceptedAnswers: ['hình vuông', 'hinh vuong'],
  },
  {
    type: 'single_choice',
    stemMd: 'Một hình chữ nhật có chiều dài 8 cm, chiều rộng 5 cm. Diện tích là:',
    topic: 'Tứ giác',
    difficulty: 'van_dung',
    options: [
      { label: 'A', contentMd: '$13\\ \\text{cm}^2$', isCorrect: false },
      { label: 'B', contentMd: '$26\\ \\text{cm}^2$', isCorrect: false },
      { label: 'C', contentMd: '$40\\ \\text{cm}^2$', isCorrect: true },
      { label: 'D', contentMd: '$80\\ \\text{cm}^2$', isCorrect: false },
    ],
  },
  {
    type: 'single_choice',
    stemMd: 'Hệ số góc của đường thẳng $y = -3x + 2$ là:',
    topic: 'Hàm số bậc nhất',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$2$', isCorrect: false },
      { label: 'B', contentMd: '$-3$', isCorrect: true },
      { label: 'C', contentMd: '$3$', isCorrect: false },
      { label: 'D', contentMd: '$-2$', isCorrect: false },
    ],
  },
];

async function seedFeatureFlags(): Promise<void> {
  for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, value: value as never },
      update: {},
    });
  }
  console.log(`Feature flags: ${Object.keys(FEATURE_FLAGS).length} khóa`);
}

async function seedDemo(): Promise<void> {
  const teacher = await prisma.teacher.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: 'Cô Demo',
      passwordHash: await hash(DEMO_PASSWORD),
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
    update: {},
  });

  const existing = await prisma.class.findFirst({
    where: { teacherId: teacher.id, code: DEMO_CLASS_CODE },
  });
  if (existing) {
    console.log('Lớp demo đã tồn tại, bỏ qua.');
    return;
  }

  const klass = await prisma.class.create({
    data: {
      teacherId: teacher.id,
      name: 'Toán 9A (demo)',
      subject: 'Toán',
      grade: '9',
      code: DEMO_CLASS_CODE,
      schedule: [
        { weekday: 2, start: '18:00', end: '19:30' },
        { weekday: 5, start: '18:00', end: '19:30' },
      ],
      students: {
        create: STUDENT_NAMES.map((name, i) => ({ name, sortOrder: i })),
      },
    },
  });

  const createdQuestions = [];
  for (const q of QUESTIONS) {
    createdQuestions.push(
      await prisma.question.create({
        data: {
          teacherId: teacher.id,
          type: q.type,
          stemMd: q.stemMd,
          explanationMd: q.explanationMd,
          subject: 'Toán',
          grade: '9',
          topic: q.topic,
          difficulty: q.difficulty,
          source: 'manual',
          acceptedAnswers: q.acceptedAnswers ?? undefined,
          options: q.options
            ? {
                create: q.options.map((o, i) => ({
                  label: o.label,
                  contentMd: o.contentMd,
                  isCorrect: o.isCorrect,
                  sortOrder: i,
                })),
              }
            : undefined,
        },
      }),
    );
  }

  await prisma.quiz.create({
    data: {
      teacherId: teacher.id,
      title: 'Kiểm tra đầu giờ – Căn bậc hai & phương trình (demo)',
      defaultTimeLimitSec: 30,
      questions: {
        create: createdQuestions.slice(0, 5).map((q, i) => ({
          questionId: q.id,
          sortOrder: i,
          points: 1,
        })),
      },
    },
  });

  console.log(
    `Demo: giáo viên ${DEMO_EMAIL} / ${DEMO_PASSWORD}, lớp "${klass.name}" mã ${klass.code}, ${STUDENT_NAMES.length} học sinh, ${QUESTIONS.length} câu hỏi, 1 đề.`,
  );
}

async function main(): Promise<void> {
  await seedFeatureFlags();
  await seedDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Chạy seed hai lần (kiểm tra idempotent)**

```bash
pnpm --filter @lophoc/api db:seed
pnpm --filter @lophoc/api db:seed
```

Expected lần 1: `Feature flags: 6 khóa` và `Demo: giáo viên demo@lophoc.app ...`. Lần 2: `Lớp demo đã tồn tại, bỏ qua.`

- [ ] **Step 3: Kiểm tra dữ liệu**

```bash
docker compose -f infra/docker-compose.dev.yml exec postgres psql -U lophoc -d lophoc -c 'SELECT (SELECT count(*) FROM "Teacher") teachers, (SELECT count(*) FROM "Student") students, (SELECT count(*) FROM "Question") questions, (SELECT count(*) FROM "QuizQuestion") quiz_questions, (SELECT count(*) FROM "FeatureFlag") flags;'
```

Expected: `1 | 12 | 10 | 5 | 6`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(api): demo seed (teacher, class, roster, questions, quiz, feature flags)"
```

---

### Task 6: `apps/web` Next.js 16 + Tailwind 4 + next-intl (vi) + landing giữ chỗ

**Files:**

- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.env.example`, `messages/vi.json`, `src/i18n/request.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Tạo cấu hình package**

`apps/web/package.json`:

```json
{
  "name": "@lophoc/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "typecheck": "next typegen && tsc --noEmit",
    "lint": "eslint"
  },
  "dependencies": {
    "@lophoc/shared": "workspace:*",
    "next": "16.3.4",
    "next-intl": "^4.14.2",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "16.3.4",
    "tailwindcss": "^4.3.3",
    "typescript": "~5.9.3"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

`apps/web/next.config.ts`:

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo: để bản standalone gom cả packages/shared
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
```

`apps/web/postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

`apps/web/eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
```

`apps/web/.env.example`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 2: i18n và messages**

`apps/web/src/i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'vi';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

`apps/web/messages/vi.json`:

```json
{
  "Landing": {
    "title": "Điểm danh, kiểm tra đầu giờ và bảng xếp hạng cho lớp học của bạn",
    "subtitle": "Miễn phí cho giáo viên. Nhập đề từ Word, ảnh chụp hoặc dán văn bản, học sinh làm bài trên điện thoại, kết quả hiện ngay trên máy chiếu.",
    "cta": "Dùng thử miễn phí",
    "demoPlaceholder": "Video demo 60 giây (sắp có)",
    "contact": "Liên hệ Zalo / Facebook"
  }
}
```

- [ ] **Step 3: Layout, page, CSS**

`apps/web/src/app/globals.css`:

```css
@import 'tailwindcss';

@theme {
  --font-sans: var(--font-be-vietnam), system-ui, sans-serif;
  --color-brand-50: oklch(0.97 0.02 250);
  --color-brand-500: oklch(0.55 0.18 250);
  --color-brand-600: oklch(0.48 0.18 250);
  --color-brand-700: oklch(0.42 0.16 250);
}

body {
  @apply bg-white text-slate-900 antialiased;
}
```

`apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Lớp Học – Điểm danh & kiểm tra đầu giờ',
  description:
    'Ứng dụng miễn phí cho giáo viên: điểm danh, ngân hàng câu hỏi, kiểm tra đầu giờ, máy chiếu.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${beVietnam.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`apps/web/src/app/page.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('Landing');
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">{t('subtitle')}</p>
      <a
        href="/signup"
        className="rounded-lg bg-brand-600 px-6 py-3 text-lg font-semibold text-white shadow hover:bg-brand-700"
      >
        {t('cta')}
      </a>
      <div className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        {t('demoPlaceholder')}
      </div>
      <p className="text-sm text-slate-500">{t('contact')}</p>
    </main>
  );
}
```

- [ ] **Step 4: Cài, typecheck, lint, build**

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter @lophoc/web typecheck
pnpm --filter @lophoc/web lint
pnpm --filter @lophoc/web build
```

Expected: không lỗi; build in ra route `/` và tạo `apps/web/.next/standalone`.

- [ ] **Step 5: Chạy thử và kiểm tra bằng curl**

```bash
(cd apps/web && pnpm start &) ; sleep 5 ; curl -s http://localhost:3000 | grep -o "Dùng thử miễn phí" ; pkill -f "next start" || true
```

Expected: in ra `Dùng thử miễn phí`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(web): Next.js 16 app with Tailwind 4, next-intl (vi) and landing placeholder"
```

---

### Task 7: Dockerfile api/web, CI GitHub Actions, README

**Files:**

- Create: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1: `.dockerignore` ở gốc**

```
node_modules
**/node_modules
**/dist
**/.next
**/.turbo
.git
**/.env
**/.env.local
apps/api/src/generated
```

- [ ] **Step 2: `apps/api/Dockerfile`** (build từ gốc repo: `docker build -f apps/api/Dockerfile .`)

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @lophoc/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @lophoc/shared build && pnpm --filter @lophoc/api build
RUN pnpm --filter @lophoc/api --prod deploy /out

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: `apps/web/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @lophoc/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @lophoc/shared build && pnpm --filter @lophoc/web build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 4: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: lophoc
          POSTGRES_PASSWORD: lophoc
          POSTGRES_DB: lophoc_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U lophoc"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      DATABASE_URL: postgresql://lophoc:lophoc@localhost:5432/lophoc_test
      REDIS_URL: redis://localhost:6379
      APP_URL: http://localhost:3000
      API_URL: http://localhost:4000
      NEXT_PUBLIC_API_URL: http://localhost:4000
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm turbo run build lint typecheck test
      - run: pnpm --filter @lophoc/api test:e2e

  docker:
    runs-on: ubuntu-latest
    needs: verify
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build api image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/api/Dockerfile
          push: false
          tags: lophoc-api:ci
      - name: Build web image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          push: false
          tags: lophoc-web:ci
```

- [ ] **Step 5: `README.md`**

````markdown
# Lớp Học (lophoc) — Điểm danh & kiểm tra đầu giờ

Ứng dụng web miễn phí cho giáo viên (trung tâm gia sư): lớp & danh sách, điểm danh, ngân hàng câu hỏi (dán / Word / ảnh AI), kiểm tra đầu giờ, chế độ máy chiếu, báo cáo.

Tài liệu: `mvp-requirements-classroom-app.md` (yêu cầu), `docs/superpowers/specs/` (thiết kế), `docs/superpowers/plans/` (kế hoạch từng slice).

## Cấu trúc

- `apps/api` — NestJS 12 (ESM), Prisma 7, PostgreSQL, Redis, Socket.IO
- `apps/web` — Next.js 16, Tailwind 4, next-intl (vi), PWA
- `packages/shared` — kiểu dữ liệu, schema Zod, parser câu hỏi, chấm điểm, hợp đồng socket
- `infra` — Docker Compose, Caddy

## Chạy local

Yêu cầu: Node 24, pnpm 9 (`corepack enable`), Docker Desktop.

```bash
pnpm install
pnpm infra:up                      # postgres, redis, minio, mailpit
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate                    # tạo bảng
pnpm db:seed                       # dữ liệu demo: demo@lophoc.app / demo1234
pnpm dev                           # api :4000, web :3000
```
````

- API health: http://localhost:4000/api/health
- Web: http://localhost:3000
- Mailpit (email dev): http://localhost:8025
- MinIO console: http://localhost:9001 (lophoc / lophoc123)

## Kiểm thử

```bash
pnpm test              # unit (shared + api)
pnpm --filter @lophoc/api test:e2e   # e2e trên DB lophoc_test
pnpm lint && pnpm typecheck
```

## Biến môi trường

Xem `apps/api/.env.example` và `apps/web/.env.example`. `apps/api/.env.test` dùng cho e2e (không có secret).

## Deploy

Sẽ bổ sung ở slice S8 (Docker Compose production + Caddy + backup + Cloudflare).

````

- [ ] **Step 6: Build thử image local**

```bash
docker build -f apps/api/Dockerfile -t lophoc-api:dev . && docker build -f apps/web/Dockerfile -t lophoc-web:dev .
````

Expected: cả hai image build thành công. Kiểm tra api image chạy được:

```bash
docker run --rm -e DATABASE_URL=postgresql://lophoc:lophoc@host.docker.internal:5432/lophoc -p 4010:4000 lophoc-api:dev &
sleep 8 && curl -s http://localhost:4010/api/health && docker stop $(docker ps -q --filter ancestor=lophoc-api:dev)
```

Expected: `{"status":"ok","db":"ok","time":"..."}`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: Dockerfiles, GitHub Actions CI, README"
```

---

### Task 8: Kiểm tra toàn bộ pipeline Turbo và kết thúc S0

- [ ] **Step 1: Chạy toàn bộ**

```bash
pnpm format
pnpm turbo run build lint typecheck test
pnpm --filter @lophoc/api test:e2e
```

Expected: mọi task xanh.

- [ ] **Step 2: Chạy `pnpm dev` thử 20 giây, gọi health**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
sleep 20; curl -s http://localhost:4000/api/health; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000; kill %1
```

Expected: JSON health + `200`.

- [ ] **Step 3: Commit cuối S0**

```bash
git add -A && git commit -m "chore(s0): scaffold complete"
```

---

## Tự kiểm tra kế hoạch

- **Bao phủ spec:** S0 trong thiết kế yêu cầu monorepo, compose dev, schema + migration + seed, CI → Task 1–7. Landing thật, PWA, Caddy/production compose thuộc S7/S8 (không thuộc S0).
- **Placeholder:** không có TBD; migration SQL `init` là sản phẩm sinh tự động của Prisma (được kiểm chứng ở Task 4 Step 4).
- **Nhất quán kiểu:** `validateEnv`/`Env` dùng ở `app.module.ts`, `prisma.service.ts`, `main.ts`; `PrismaService` import `../generated/prisma/client.js` khớp `output` của generator; `HealthController.check()` trả `{status, db, time}` khớp unit test và e2e.
