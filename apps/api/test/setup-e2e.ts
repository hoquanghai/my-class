import { config as loadDotenv } from 'dotenv';

process.env.NODE_ENV = 'test';
loadDotenv({ path: '.env.test' });

// Mặc định tắt rate limit trong e2e; file auth-throttle.e2e-spec.ts bật lại để kiểm tra.
process.env.THROTTLE_SKIP = 'true';
