import { BadRequestException, Injectable } from '@nestjs/common';
import {
  mediaRef,
  type ParsedQuestion,
  parseQuestions,
  type ParseResult,
  type ParserLine,
} from '@lophoc/shared';
import mammoth from 'mammoth';
import { HTMLElement, type Node, NodeType, parse as parseHtml } from 'node-html-parser';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IMAGE_MIME_EXT, StorageService } from '../storage/storage.service.js';

/** Chuyển một node HTML (từ mammoth) thành text có `**đậm**`, `__gạch chân__`, gom ảnh. */
function inlineText(node: Node, images: string[]): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.rawText.replace(/&nbsp;/g, ' ');
  if (!(node instanceof HTMLElement)) return '';
  const tag = node.tagName?.toLowerCase();
  if (tag === 'img') {
    const src = node.getAttribute('src');
    if (src) images.push(src);
    return '';
  }
  if (tag === 'br') return '\n';
  const inner = node.childNodes.map((c) => inlineText(c, images)).join('');
  if (tag === 'strong' || tag === 'b') return inner.trim() ? `**${inner}**` : inner;
  if (tag === 'u') return inner.trim() ? `__${inner}__` : inner;
  if (tag === 'sup') return `^${inner}`;
  if (tag === 'sub') return `_${inner}`;
  return inner;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Mỗi đoạn văn, ô bảng (gộp theo hàng) hoặc mục danh sách thành một `ParserLine`. */
export function htmlToParserLines(html: string): ParserLine[] {
  const root = parseHtml(html);
  const lines: ParserLine[] = [];

  const pushBlock = (text: string, images: string[]) => {
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      lines.push({ text: decodeEntities(part).trim(), images: i === 0 ? images : [] });
    });
  };

  const walk = (node: Node) => {
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName?.toLowerCase();
    if (tag === 'table') {
      for (const tr of node.querySelectorAll('tr')) {
        const images: string[] = [];
        const cells = tr.querySelectorAll('td, th').map((td) => inlineText(td, images).trim());
        pushBlock(cells.join(' '), images);
      }
      return;
    }
    if (tag === 'p' || /^h[1-6]$/.test(tag ?? '') || tag === 'li') {
      const images: string[] = [];
      pushBlock(inlineText(node, images), images);
      return;
    }
    for (const child of node.childNodes) walk(child);
  };
  for (const child of root.childNodes) walk(child);
  return lines;
}

/** Ảnh trong Word được nhúng vào Markdown của đề/phương án dưới dạng tham chiếu `media:<key>`. */
function embedImages(q: ParsedQuestion): ParsedQuestion {
  const withImg = (md: string, refs: string[]) =>
    refs.length ? `${md}\n\n${refs.map((r) => `![](${r})`).join('\n')}`.trim() : md;
  return {
    ...q,
    stemMd: withImg(q.stemMd, q.imageKeys),
    imageKeys: [],
    options: q.options.map((o) => ({
      ...o,
      contentMd: withImg(o.contentMd, o.imageKeys),
      imageKeys: [],
    })),
  };
}

@Injectable()
export class DocxImportService {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  async parse(teacherId: string, buffer: Buffer): Promise<ParseResult> {
    let html: string;
    try {
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          styleMap: ['u => u', 'b => strong'],
          convertImage: mammoth.images.imgElement(async (image) => {
            const mime = image.contentType;
            const ext = IMAGE_MIME_EXT[mime];
            if (!ext) return { src: '' };
            const body = await image.readAsBuffer();
            const key = this.storage.buildKey(teacherId, ext);
            await this.storage.put(key, body, mime);
            await this.prisma.mediaFile.create({
              data: { teacherId, key, mime, sizeBytes: body.length },
            });
            return { src: mediaRef(key) };
          }),
        },
      );
      html = result.value;
    } catch {
      throw new BadRequestException('Không đọc được file Word. Hãy lưu lại dạng .docx và thử lại.');
    }
    const parsed = parseQuestions(htmlToParserLines(html));
    return { ...parsed, questions: parsed.questions.map(embedImages) };
  }
}
