/**
 * Giá USD cho một triệu token (vào / ra), cập nhật thủ công theo bảng giá nhà cung cấp.
 * Chỉ để ước tính chi phí mỗi lần nhập trong log và ImportJob.result.meta; không dùng để tính tiền.
 * Cập nhật lần cuối: 09/2026 (Gemini 3.7 Flash áp dụng giá khuyến mãi đến hết 31/12/2026).
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'gemini-3.7-flash': { input: 0.75, output: 3.75 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-fable-5-1': { input: 10, output: 50 },
};

function priceFor(model: string): { input: number; output: number } | undefined {
  if (MODEL_PRICES[model]) return MODEL_PRICES[model];
  const key = Object.keys(MODEL_PRICES).find((k) => model.startsWith(k));
  return key ? MODEL_PRICES[key] : undefined;
}

/** Ước tính USD; undefined nếu thiếu số token hoặc model chưa có trong bảng giá. */
export function estimateUsd(
  model: string,
  inputTokens?: number,
  outputTokens?: number,
): number | undefined {
  const price = priceFor(model);
  if (!price || inputTokens === undefined || outputTokens === undefined) return undefined;
  const usd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}
