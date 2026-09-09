import { PDFDocument } from 'pdf-lib';
import type { ExtractionPage } from './types.js';

/** Tách một PDF thành các PDF một trang (giữ nguyên nội dung trang). */
export async function splitPdf(data: Buffer): Promise<Buffer[]> {
  const src = await PDFDocument.load(data, { ignoreEncryption: true });
  const out: Buffer[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page!);
    out.push(Buffer.from(await doc.save()));
  }
  return out;
}

/**
 * Đưa input về danh sách trang đơn theo đúng thứ tự tài liệu: ảnh giữ nguyên, PDF tách từng trang.
 * Chỉ số mảng + 1 chính là `page` mà model điền trong kết quả.
 */
export async function explodePages(pages: ExtractionPage[]): Promise<ExtractionPage[]> {
  const out: ExtractionPage[] = [];
  for (const page of pages) {
    if (page.kind !== 'pdf') {
      out.push(page);
      continue;
    }
    const parts = await splitPdf(page.data);
    parts.forEach((data, i) =>
      out.push({ kind: 'pdf', data, filename: page.filename && `${page.filename}#${i + 1}` }),
    );
  }
  return out;
}
