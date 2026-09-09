import { config as loadDotenv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Dev: `.env.dev` (cá nhân, gitignore) nạp trước nên thắng `.env`; dotenv không ghi đè biến đã có.
if (process.env.NODE_ENV === 'test') loadDotenv({ path: '.env.test' });
else loadDotenv({ path: ['.env.dev', '.env'] });

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
