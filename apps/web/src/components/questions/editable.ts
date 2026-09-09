import {
  type Difficulty,
  type Grade,
  type ParsedQuestion,
  type QuestionDto,
  type QuestionInput,
  questionInputSchema,
  type QuestionSource,
  type QuestionType,
  type Subject,
} from '@lophoc/shared';

export interface EditableOption {
  label: string;
  contentMd: string;
  isCorrect: boolean;
}

/** Trạng thái câu hỏi đang sửa trong lưới hoặc hộp thoại. */
export interface EditableQuestion {
  localId: string;
  type: QuestionType;
  stemMd: string;
  explanationMd: string;
  options: EditableOption[];
  acceptedAnswers: string[];
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty | '';
}

export interface BatchTags {
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty | '';
}

let counter = 0;
export const newLocalId = (): string => `q${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const nextLabel = (options: EditableOption[]): string =>
  String.fromCharCode('A'.charCodeAt(0) + options.length);

export function emptyQuestion(): EditableQuestion {
  return {
    localId: newLocalId(),
    type: 'single_choice',
    stemMd: '',
    explanationMd: '',
    options: [
      { label: 'A', contentMd: '', isCorrect: false },
      { label: 'B', contentMd: '', isCorrect: false },
      { label: 'C', contentMd: '', isCorrect: false },
      { label: 'D', contentMd: '', isCorrect: false },
    ],
    acceptedAnswers: [],
    subject: '',
    grade: '',
    topic: '',
    difficulty: '',
  };
}

export function fromParsed(p: ParsedQuestion): EditableQuestion {
  return {
    localId: newLocalId(),
    type: p.type,
    stemMd: p.stemMd,
    explanationMd: p.explanationMd ?? '',
    options: p.options.map((o) => ({
      label: o.label,
      contentMd: o.contentMd,
      isCorrect: o.isCorrect,
    })),
    acceptedAnswers: p.acceptedAnswers,
    subject: '',
    grade: '',
    topic: '',
    difficulty: '',
  };
}

export function fromDto(q: QuestionDto): EditableQuestion {
  return {
    localId: q.id,
    type: q.type,
    stemMd: q.stemMd,
    explanationMd: q.explanationMd ?? '',
    options: q.options.map((o) => ({
      label: o.label,
      contentMd: o.contentMd,
      isCorrect: o.isCorrect,
    })),
    acceptedAnswers: q.acceptedAnswers,
    subject: q.subject ?? '',
    grade: q.grade ?? '',
    topic: q.topic ?? '',
    difficulty: q.difficulty ?? '',
  };
}

/**
 * Chuyển sang payload API; phân loại trống trong câu được thay bằng phân loại của đợt.
 * Môn/khối/chủ đề là bắt buộc: giá trị rỗng sẽ bị schema báo lỗi khi kiểm tra.
 */
export function toInput(
  q: EditableQuestion,
  source: QuestionSource,
  batch?: BatchTags,
): QuestionInput {
  const pick = (own: string, shared?: string) => (own.trim() ? own.trim() : shared?.trim() || '');
  const difficulty = q.difficulty || batch?.difficulty || null;
  return {
    type: q.type,
    stemMd: q.stemMd.trim(),
    explanationMd: q.explanationMd.trim() || null,
    imageKey: null,
    subject: pick(q.subject, batch?.subject) as Subject,
    grade: pick(q.grade, batch?.grade) as Grade,
    topic: pick(q.topic, batch?.topic),
    difficulty,
    source,
    options:
      q.type === 'short_text'
        ? []
        : q.options.map((o) => ({
            label: o.label,
            contentMd: o.contentMd.trim(),
            isCorrect: o.isCorrect,
          })),
    acceptedAnswers:
      q.type === 'short_text' ? q.acceptedAnswers.map((a) => a.trim()).filter(Boolean) : [],
  };
}

/** Lỗi kiểm tra ở client (cùng schema với server). Trả [] nếu hợp lệ. */
export function validateEditable(
  q: EditableQuestion,
  source: QuestionSource = 'manual',
  batch?: BatchTags,
): string[] {
  const result = questionInputSchema.safeParse(toInput(q, source, batch));
  if (result.success) return [];
  const seen = new Set<string>();
  for (const issue of result.error.issues) seen.add(issue.message);
  return [...seen];
}

/** Khi đổi loại câu hỏi, chỉnh phương án cho hợp lý. */
export function applyType(q: EditableQuestion, type: QuestionType): EditableQuestion {
  if (type === q.type) return q;
  let options = q.options;
  if (type === 'true_false') {
    options = [
      { label: 'A', contentMd: 'Đúng', isCorrect: q.options[0]?.isCorrect ?? false },
      { label: 'B', contentMd: 'Sai', isCorrect: q.options[1]?.isCorrect ?? false },
    ];
  } else if (type !== 'short_text' && options.length < 2) {
    options = [
      { label: 'A', contentMd: '', isCorrect: false },
      { label: 'B', contentMd: '', isCorrect: false },
    ];
  }
  if (type === 'single_choice' || type === 'true_false') {
    let seenCorrect = false;
    options = options.map((o) => {
      if (o.isCorrect && !seenCorrect) {
        seenCorrect = true;
        return o;
      }
      return { ...o, isCorrect: false };
    });
  }
  return { ...q, type, options };
}

/** Bấm chữ cái: câu một lựa chọn chỉ giữ một đáp án đúng, nhiều lựa chọn thì bật/tắt. */
export function toggleCorrect(q: EditableQuestion, index: number): EditableQuestion {
  const single = q.type === 'single_choice' || q.type === 'true_false';
  return {
    ...q,
    options: q.options.map((o, i) =>
      i === index ? { ...o, isCorrect: !o.isCorrect } : single ? { ...o, isCorrect: false } : o,
    ),
  };
}

export function relabel(options: EditableOption[]): EditableOption[] {
  return options.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
}
