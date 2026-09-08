import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BulkCreateQuestionsInput,
  type BulkCreateResultDto,
  type Difficulty,
  type QuestionDto,
  type QuestionFacetsDto,
  type QuestionFilter,
  type QuestionInput,
  questionInputSchema,
  type QuestionListDto,
  type QuestionSource,
  type QuestionType,
  type UpdateQuestionInput,
} from '@lophoc/shared';
import { z } from 'zod';
import type { Prisma, Question, QuestionOption } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';

type QuestionWithOptions = Question & { options: QuestionOption[] };

export function toQuestionDto(q: QuestionWithOptions): QuestionDto {
  return {
    id: q.id,
    type: q.type as QuestionType,
    stemMd: q.stemMd,
    explanationMd: q.explanationMd,
    imageKey: q.imageKey,
    subject: q.subject,
    grade: q.grade,
    topic: q.topic,
    difficulty: q.difficulty as Difficulty | null,
    source: q.source as QuestionSource,
    acceptedAnswers: Array.isArray(q.acceptedAnswers) ? (q.acceptedAnswers as string[]) : [],
    options: [...q.options]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        id: o.id,
        label: o.label,
        contentMd: o.contentMd,
        imageKey: o.imageKey,
        isCorrect: o.isCorrect,
        sortOrder: o.sortOrder,
      })),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

function toCreateData(teacherId: string, input: QuestionInput): Prisma.QuestionCreateInput {
  return {
    teacher: { connect: { id: teacherId } },
    type: input.type,
    stemMd: input.stemMd,
    explanationMd: input.explanationMd ?? null,
    imageKey: input.imageKey ?? null,
    subject: input.subject ?? null,
    grade: input.grade ?? null,
    topic: input.topic ?? null,
    difficulty: input.difficulty ?? null,
    source: input.source,
    acceptedAnswers: input.type === 'short_text' ? input.acceptedAnswers : [],
    options: {
      create:
        input.type === 'short_text'
          ? []
          : input.options.map((o, i) => ({
              label: o.label,
              contentMd: o.contentMd,
              imageKey: o.imageKey ?? null,
              isCorrect: o.isCorrect,
              sortOrder: i,
            })),
    },
  };
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async list(teacherId: string, filter: QuestionFilter): Promise<QuestionListDto> {
    const where: Prisma.QuestionWhereInput = {
      teacherId,
      deletedAt: null,
      ...(filter.subject && { subject: filter.subject }),
      ...(filter.grade && { grade: filter.grade }),
      ...(filter.topic && { topic: filter.topic }),
      ...(filter.difficulty && { difficulty: filter.difficulty }),
      ...(filter.type && { type: filter.type }),
      ...(filter.q && { stemMd: { contains: filter.q, mode: 'insensitive' } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { options: true },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items: rows.map(toQuestionDto), total, page: filter.page, pageSize: filter.pageSize };
  }

  async facets(teacherId: string): Promise<QuestionFacetsDto> {
    const base = { teacherId, deletedAt: null };
    const [subjects, grades, topics] = await Promise.all([
      this.prisma.question.findMany({
        where: { ...base, subject: { not: null } },
        distinct: ['subject'],
        select: { subject: true },
        orderBy: { subject: 'asc' },
      }),
      this.prisma.question.findMany({
        where: { ...base, grade: { not: null } },
        distinct: ['grade'],
        select: { grade: true },
        orderBy: { grade: 'asc' },
      }),
      this.prisma.question.findMany({
        where: { ...base, topic: { not: null } },
        distinct: ['topic'],
        select: { topic: true },
        orderBy: { topic: 'asc' },
      }),
    ]);
    return {
      subjects: subjects.map((s) => s.subject as string),
      grades: grades.map((g) => g.grade as string),
      topics: topics.map((t) => t.topic as string),
    };
  }

  async get(teacherId: string, id: string): Promise<QuestionDto> {
    return toQuestionDto(await this.findOwned(teacherId, id));
  }

  async create(teacherId: string, input: QuestionInput): Promise<QuestionDto> {
    const created = await this.prisma.question.create({
      data: toCreateData(teacherId, input),
      include: { options: true },
    });
    return toQuestionDto(created);
  }

  async bulkCreate(
    teacherId: string,
    input: BulkCreateQuestionsInput,
  ): Promise<BulkCreateResultDto> {
    const created = await this.prisma.$transaction(
      input.questions.map((q) =>
        this.prisma.question.create({
          data: toCreateData(teacherId, { ...q, source: input.source }),
          select: { id: true },
        }),
      ),
    );
    await this.analytics.track(
      'question_import',
      { source: input.source, count: created.length },
      teacherId,
    );
    return { created: created.length, ids: created.map((c) => c.id) };
  }

  async update(teacherId: string, id: string, input: UpdateQuestionInput): Promise<QuestionDto> {
    const existing = await this.findOwned(teacherId, id);
    const merged = questionInputSchema.safeParse({
      ...toQuestionDto(existing),
      ...input,
      options:
        input.options ??
        existing.options.map((o) => ({
          label: o.label,
          contentMd: o.contentMd,
          isCorrect: o.isCorrect,
          imageKey: o.imageKey,
        })),
    });
    if (!merged.success) {
      throw new BadRequestException(z.prettifyError(merged.error).replace(/\n/g, '; '));
    }
    const q = merged.data;

    await this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          type: q.type,
          stemMd: q.stemMd,
          explanationMd: q.explanationMd ?? null,
          imageKey: q.imageKey ?? null,
          subject: q.subject ?? null,
          grade: q.grade ?? null,
          topic: q.topic ?? null,
          difficulty: q.difficulty ?? null,
          acceptedAnswers: q.type === 'short_text' ? q.acceptedAnswers : [],
        },
      });
      if (input.options !== undefined || input.type !== undefined) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        if (q.type !== 'short_text') {
          await tx.questionOption.createMany({
            data: q.options.map((o, i) => ({
              questionId: id,
              label: o.label,
              contentMd: o.contentMd,
              imageKey: o.imageKey ?? null,
              isCorrect: o.isCorrect,
              sortOrder: i,
            })),
          });
        }
      }
    });
    return this.get(teacherId, id);
  }

  async remove(teacherId: string, id: string): Promise<void> {
    await this.findOwned(teacherId, id);
    await this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOwned(teacherId: string, id: string): Promise<QuestionWithOptions> {
    const q = await this.prisma.question.findFirst({
      where: { id, teacherId, deletedAt: null },
      include: { options: true },
    });
    if (!q) throw new NotFoundException('Không tìm thấy câu hỏi');
    return q;
  }
}
