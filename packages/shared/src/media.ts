/**
 * Ảnh trong nội dung câu hỏi được lưu bằng tham chiếu `media:<key>` thay vì đường dẫn đầy đủ.
 *
 * Nội dung câu hỏi sống rất lâu: nó được chụp lại vào lượt kiểm tra (`QuizRunQuestion.snapshot`)
 * và vào bộ đề chia sẻ (`SharedSetQuestion.snapshot`). Nếu ghi thẳng URL của nhà cung cấp lưu trữ,
 * đổi nhà cung cấp, bật CDN hay gắn tên miền riêng sẽ làm hỏng toàn bộ ảnh trong đề cũ.
 * Với tham chiếu, địa chỉ thật được dựng lúc hiển thị nên đổi cấu hình là đủ.
 */
export const MEDIA_REF_PREFIX = 'media:';

export function mediaRef(key: string): string {
  return `${MEDIA_REF_PREFIX}${key}`;
}

/** Trả key nếu `src` là tham chiếu nội bộ; URL tuyệt đối hoặc `data:` trả null (giữ nguyên). */
export function mediaRefKey(src: string | null | undefined): string | null {
  if (!src || !src.startsWith(MEDIA_REF_PREFIX)) return null;
  const key = src.slice(MEDIA_REF_PREFIX.length).replace(/^\/+/, '').trim();
  return key === '' ? null : key;
}
