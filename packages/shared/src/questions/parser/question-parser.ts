import { stripDiacritics } from '../../text/normalize.js';
import type { QuestionType } from '../schemas.js';
import type { ParsedOption, ParsedQuestion, ParseIssue, ParserLine, ParseResult } from './types.js';

// ---------- Nhận dạng dòng ----------

const NOISE_PATTERNS: RegExp[] = [
  /^ho va ten/i,
  /^ho ten/i,
  /^ma de/i,
  /^de so/i,
  /^so bao danh/i,
  /^lop\s*[:.]/i,
  /^trang\s*\d+/i,
  /^page\s*\d+/i,
  /^\d{1,3}\s*\/\s*\d{1,3}$/,
  /^-{3,}$|^_{3,}$|^={3,}$|^\.{3,}$/,
  /^so giao duc/i,
  /^so gd/i,
  /^phong giao duc/i,
  /^phong gd/i,
  /^truong /i,
  /^de (kiem tra|thi|on tap|cuong)/i,
  /^kiem tra (\d+ phut|giua|cuoi|hoc ki)/i,
  /^thoi gian( lam bai)?/i,
  /^nam hoc/i,
  /^mon\s*[:.]/i,
  /^diem\s*[:.]?$/i,
  /^diem\b.*loi phe/i,
  /^(phan|part)\s+[ivx\d]+\s*[:.]?\s*(trac nghiem|tu luan)?$/i,
  /^(i|ii|iii|iv)\s*[.)]\s*(phan\s+)?(trac nghiem|tu luan)/i,
];

const QUESTION_WORD = /^(?:cau|bai|question)\s*(\d{1,3})\s*[:.)\-–]*\s*(.*)$/i;
const QUESTION_NUM = /^(\d{1,3})\s*[.)]\s*(.*)$/;
const ANSWER_KEY_HEADING = /^(?:bang\s+)?(?:dap an|answer key|answers?)\b/i;
const INLINE_ANSWER = /^(?:dap an|answer)\s*[:.]\s*(.+)$/i;
const EXPLANATION_START =
  /^(?:loi giai|giai thich|huong dan(?: giai)?|giai\s*[:.]|hd giai|phan tich)\s*[:.]?\s*(.*)$/i;
const OPTION_TOKEN = /^(\*?)\s*(?:\(\s*)?([A-Ha-h])\s*[.)]\s*(.*)$/s;
const OPTION_SPLIT = /\s+(?=\*?\(?[A-Ha-h]\s*[.)]\s)/;
const TRUE_FALSE = /^(dung|sai|true|false|d|s)$/i;

const norm = (s: string): string => stripDiacritics(s).toLowerCase().trim();

function isNoise(text: string): boolean {
  const n = norm(text);
  if (n === '') return true;
  return NOISE_PATTERNS.some((re) => re.test(n));
}

/** Bỏ đánh dấu đậm/gạch chân bao quanh; trả về cờ có đánh dấu ở phần nhãn hoặc toàn bộ. */
function stripEmphasis(raw: string): { text: string; emphasized: boolean } {
  let text = raw.trim();
  let emphasized = false;
  const whole = /^(\*\*|__)(.+?)\1$/s.exec(text);
  if (whole) {
    text = (whole[2] as string).trim();
    emphasized = true;
  }
  return { text, emphasized };
}

interface OptionMatch {
  label: string;
  content: string;
  marked: boolean;
}

/** Thử đọc một token phương án "A. nội dung" (có thể có `*` hoặc **đậm** ở nhãn). */
function matchOption(token: string): OptionMatch | null {
  const { text, emphasized } = stripEmphasis(token);
  // Nhãn in đậm riêng: "**A.** nội dung" hoặc "__A)__ nội dung"
  const labelEmph = /^(\*\*|__)\s*(\*?)\s*\(?([A-Ha-h])\s*[.)]\s*\1\s*(.*)$/s.exec(text);
  if (labelEmph) {
    return {
      label: (labelEmph[3] as string).toUpperCase(),
      content: (labelEmph[4] as string).trim(),
      marked: true,
    };
  }
  const m = OPTION_TOKEN.exec(text);
  if (!m) return null;
  return {
    label: (m[2] as string).toUpperCase(),
    content: (m[3] as string).trim(),
    marked: emphasized || m[1] === '*',
  };
}

const nextLabel = (label: string | null): string =>
  label === null ? 'A' : String.fromCharCode(label.charCodeAt(0) + 1);

/**
 * Tách các phương án trên một dòng. Chỉ chấp nhận khi nhãn nối tiếp nhau
 * (A rồi B rồi C…) tính từ nhãn kế tiếp mong đợi, để tránh nhận nhầm chữ trong câu.
 */
function parseOptionLine(line: string, lastLabel: string | null): OptionMatch[] | null {
  const tokens = line.split(OPTION_SPLIT);
  const matches: OptionMatch[] = [];
  let expected = nextLabel(lastLabel);
  for (const token of tokens) {
    const m = matchOption(token);
    if (!m) return null;
    if (m.label !== expected) return null;
    matches.push(m);
    expected = nextLabel(m.label);
  }
  return matches.length > 0 ? matches : null;
}

// ---------- Bảng đáp án ----------

function parseAnswerKey(lines: string[]): Map<number, string[]> {
  const key = new Map<number, string[]>();
  const cleaned = lines.map((l) => l.replace(/\*\*|__/g, '').trim()).filter((l) => l.length > 0);

  // Bảng hai dòng: "1 2 3 4" rồi "A B C D"
  for (let i = 0; i + 1 < cleaned.length; i++) {
    const nums = cleaned[i]!.split(/[\s|]+/).filter(Boolean);
    const letters = cleaned[i + 1]!.split(/[\s|]+/).filter(Boolean);
    if (
      nums.length >= 2 &&
      nums.length === letters.length &&
      nums.every((n) => /^\d{1,3}$/.test(n)) &&
      letters.every((l) => /^[A-Ha-h]$/.test(l))
    ) {
      nums.forEach((n, j) => key.set(Number(n), [letters[j]!.toUpperCase()]));
      i++;
    }
  }

  const joined = cleaned.join(' ');
  const re =
    /(?:cau\s*)?(\d{1,3})\s*[-.:)]?\s*([A-Ha-h](?:\s*[,;/]?\s*[A-Ha-h])*)(?![A-Za-z0-9])/gi;
  for (const m of norm(joined).matchAll(re)) {
    const n = Number(m[1]);
    const letters = (m[2] as string).toUpperCase().match(/[A-H]/g) ?? [];
    if (!key.has(n) && letters.length > 0) key.set(n, letters);
  }
  return key;
}

// ---------- Ghép câu hỏi ----------

interface Draft {
  number: number | null;
  stem: string[];
  options: { label: string; content: string[]; marked: boolean; images: string[] }[];
  inlineAnswer: string | null;
  explanation: string[];
  images: string[];
}

function newDraft(number: number | null, firstStem: string, images: string[]): Draft {
  return {
    number,
    stem: firstStem ? [firstStem] : [],
    options: [],
    inlineAnswer: null,
    explanation: [],
    images: [...images],
  };
}

function finalize(d: Draft, key: Map<number, string[]>): ParsedQuestion {
  const issues: ParseIssue[] = [];
  const stemMd = d.stem.join('\n').trim();
  if (!stemMd) issues.push('empty_stem');

  const options: ParsedOption[] = d.options.map((o) => ({
    label: o.label,
    contentMd: o.content.join('\n').trim(),
    isCorrect: o.marked,
    imageKeys: o.images,
  }));

  const keyLetters = d.number !== null ? key.get(d.number) : undefined;
  const inlineLetters = d.inlineAnswer?.toUpperCase().match(/\b[A-H]\b/g) ?? null;
  const answerLetters =
    keyLetters ??
    (inlineLetters && inlineLetters.every((l) => options.some((o) => o.label === l))
      ? inlineLetters
      : null);
  if (answerLetters && options.length > 0) {
    for (const o of options) o.isCorrect = answerLetters.includes(o.label);
  }

  let acceptedAnswers: string[] = [];
  let type: QuestionType;
  if (options.length === 0) {
    type = 'short_text';
    issues.push('no_options');
    const answerText = d.inlineAnswer?.trim() ?? (keyLetters ? keyLetters.join(', ') : '');
    if (answerText) acceptedAnswers = [answerText];
    else issues.push('no_answer');
  } else {
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (options.length === 1) issues.push('too_few_options');
    const isTrueFalse =
      options.length === 2 && options.every((o) => TRUE_FALSE.test(norm(o.contentMd)));
    if (isTrueFalse) type = 'true_false';
    else if (correctCount > 1) type = 'multiple_choice';
    else type = 'single_choice';
    if (correctCount === 0) issues.push('no_answer');
    if (type === 'true_false' && correctCount > 1) issues.push('multiple_correct_in_single');
  }

  return {
    number: d.number,
    type,
    stemMd,
    options,
    acceptedAnswers,
    explanationMd: d.explanation.length ? d.explanation.join('\n').trim() : null,
    imageKeys: d.images,
    issues,
  };
}

function toLines(input: string | ParserLine[]): ParserLine[] {
  if (typeof input === 'string') {
    return input.split(/\r?\n/).map((text) => ({ text: text.replace(/\t/g, ' ').trimEnd() }));
  }
  return input.map((l) => ({ ...l, text: l.text.replace(/\t/g, ' ').trimEnd() }));
}

/**
 * Parser rule-based cho đề trắc nghiệm tiếng Việt: dán văn bản hoặc dòng từ Word.
 * Không gọi AI. Mọi câu đều được trả về kèm `issues` để giáo viên sửa trong lưới.
 */
export function parseQuestions(input: string | ParserLine[]): ParseResult {
  const lines = toLines(input);

  // 1. Tách phần bảng đáp án (từ tiêu đề "ĐÁP ÁN" trở đi)
  let keyStart = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (
      ANSWER_KEY_HEADING.test(norm(lines[i]!.text)) &&
      !INLINE_ANSWER.test(norm(lines[i]!.text))
    ) {
      keyStart = i;
      break;
    }
  }
  const body = lines.slice(0, keyStart);
  const keyLines = lines.slice(keyStart + 1).map((l) => l.text);

  // 2. Duyệt thân đề
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let mode: 'stem' | 'options' | 'explanation' = 'stem';
  let skipped = 0;

  const attachImages = (images: string[] | undefined) => {
    if (!images?.length || !current) return;
    if (mode === 'options' && current.options.length > 0) {
      current.options[current.options.length - 1]!.images.push(...images);
    } else {
      current.images.push(...images);
    }
  };

  for (const line of body) {
    const raw = line.text.trim();
    if (raw === '') {
      attachImages(line.images);
      continue;
    }
    const n = norm(raw.replace(/\*\*|__/g, ''));

    if (isNoise(raw.replace(/\*\*|__/g, ''))) {
      skipped++;
      attachImages(line.images);
      continue;
    }

    const qWord = QUESTION_WORD.exec(n);
    const qNum = qWord ? null : QUESTION_NUM.exec(raw.replace(/^\*\*|\*\*$/g, ''));
    if (qWord || qNum) {
      if (current) drafts.push(current);
      const number = Number((qWord ?? qNum)![1]);
      // Lấy phần đề sau nhãn từ dòng gốc (giữ nguyên dấu tiếng Việt)
      const rest = qWord
        ? raw
            .replace(/^\*?\*?\s*(?:câu|bài|question|cau|bai)\s*\d{1,3}\s*[:.)\-–]*\s*/i, '')
            .replace(/\*\*$/, '')
        : (qNum![2] as string);
      current = newDraft(number, rest.trim(), line.images ?? []);
      mode = 'stem';
      // Đề và phương án có thể cùng dòng: "Câu 1. ... A. x B. y"
      const inlineOpts = /\s+(?=\*?\(?A\s*[.)]\s)/.exec(rest);
      if (inlineOpts && inlineOpts.index > 0) {
        const stemPart = rest.slice(0, inlineOpts.index).trim();
        const optPart = rest.slice(inlineOpts.index).trim();
        const opts = parseOptionLine(optPart, null);
        if (opts) {
          current.stem = stemPart ? [stemPart] : [];
          for (const o of opts)
            current.options.push({
              label: o.label,
              content: [o.content],
              marked: o.marked,
              images: [],
            });
          mode = 'options';
        }
      }
      continue;
    }

    if (!current) {
      skipped++;
      continue;
    }

    const inlineAns = INLINE_ANSWER.exec(n);
    if (inlineAns) {
      current.inlineAnswer = raw
        .replace(/^[^:.]*[:.]\s*/, '')
        .replace(/\*\*|__/g, '')
        .trim();
      mode = 'explanation';
      continue;
    }

    const expl = EXPLANATION_START.exec(n);
    if (expl && mode !== 'stem') {
      const restText = raw.replace(/^[^:.]*[:.]?\s*/, '').trim();
      current.explanation.push(restText);
      mode = 'explanation';
      continue;
    }

    const lastLabel = current.options.length
      ? current.options[current.options.length - 1]!.label
      : null;
    const opts = mode !== 'explanation' ? parseOptionLine(raw, lastLabel) : null;
    if (opts) {
      for (const o of opts) {
        current.options.push({
          label: o.label,
          content: [o.content],
          marked: o.marked,
          images: [],
        });
      }
      mode = 'options';
      attachImages(line.images);
      continue;
    }

    // Dòng nối tiếp
    const text = raw.replace(/\*\*|__/g, '');
    if (mode === 'stem') current.stem.push(text);
    else if (mode === 'options' && current.options.length) {
      current.options[current.options.length - 1]!.content.push(text);
    } else current.explanation.push(text);
    attachImages(line.images);
  }
  if (current) drafts.push(current);

  // 3. Bảng đáp án: phần sau tiêu đề, hoặc phần đuôi sau câu cuối nếu toàn ký hiệu đáp án
  let key = parseAnswerKey(keyLines);
  let answerKeyFound = key.size > 0;
  if (!answerKeyFound && drafts.length > 0) {
    const last = drafts[drafts.length - 1]!;
    const tailCandidates: string[] = [];
    const source = last.explanation.length
      ? last.explanation
      : last.options.length
        ? last.options[last.options.length - 1]!.content
        : last.stem;
    for (let i = source.length - 1; i > 0; i--) {
      const t = source[i]!;
      if (
        /^(?:\s*(?:cau\s*)?\d{1,3}\s*[-.:)]?\s*[A-Ha-h](?:\s*[,;/]?\s*[A-Ha-h])*\s*)+$/i.test(
          norm(t),
        )
      ) {
        tailCandidates.unshift(t);
      } else break;
    }
    if (tailCandidates.length > 0) {
      const tailKey = parseAnswerKey(tailCandidates);
      if (tailKey.size >= 2) {
        key = tailKey;
        answerKeyFound = true;
        source.splice(source.length - tailCandidates.length, tailCandidates.length);
      }
    }
  }

  return {
    questions: drafts.map((d) => finalize(d, key)),
    answerKeyFound,
    skippedLines: skipped,
  };
}
