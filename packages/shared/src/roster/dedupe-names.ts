const normalize = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Trả về danh sách tên mới đã thêm hậu tố " (n)" để không trùng với `existing`
 * và không trùng với nhau. Tên đầu tiên giữ nguyên, tên trùng kế tiếp thành "Tên (2)", "Tên (3)"…
 */
export function dedupeNames(existing: string[], incoming: string[]): string[] {
  const taken = new Set(existing.map(normalize));
  const result: string[] = [];
  for (const raw of incoming) {
    const base = raw.trim();
    let candidate = base;
    let n = 2;
    while (taken.has(normalize(candidate))) {
      candidate = `${base} (${n})`;
      n += 1;
    }
    taken.add(normalize(candidate));
    result.push(candidate);
  }
  return result;
}
