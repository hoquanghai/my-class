import type { ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

/** Chạy schema Zod ở client, trả về lỗi đầu tiên theo từng trường để hiện dưới ô nhập. */
export function validate<T>(
  schema: ZodType<T>,
  data: unknown,
): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}
