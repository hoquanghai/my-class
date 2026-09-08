import { config as loadDotenv } from 'dotenv';

process.env.NODE_ENV = 'test';
loadDotenv({ path: '.env.test' });
