import { createHash, randomBytes } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/** Token ngẫu nhiên dạng base64url (32 byte → 43 ký tự). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashPassword(password: string): Promise<string> {
  return argonHash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(passwordHash, password);
  } catch {
    return false;
  }
}
