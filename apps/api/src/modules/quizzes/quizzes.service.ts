import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateQuizInput,
  type QuizDetailDto,
  type QuizItemDto,
  type QuizRandomFilter,
  type QuizSummaryDto,
  type UpdateQuizInput,
  type UpdateQuizItemInput,
} from '@lophoc/shared';
import type {
  Prisma,
  Question,
  QuestionOption,
  Quiz,
  QuizQuestion,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toQuestionDto } from '../questions/questions.service.js';

type ItemWithQuestion = QuizQuestion & { question: Question & { options: QuestionOption[] } };
type QuizWithItems = Quiz & { questions: ItemWithQuestion[] };

const detailInclude = {
  questions: {
    include: { question: { include: { options: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.QuizInclude;

function toSummary(q: Quiz, items: { points: number }[]): QuizSummaryDto {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    defaultTimeLimitSec: q.defaultTimeLimitSec,
    questionCount: items.length,
    totalPoints: items.reduce((s, i) => s + i.points, 0),
    updatedAt: q.updatedAt.toISOString(),
  };
}

function toItem(i: ItemWithQuestion): QuizItemDto {
  return {
    id: i.id,
    questionId: i.questionId,
    sortOrder: i.sortOrder,
    timeLimitSec: i.timeLimitSec,
    points: i.points,
    question: toQuestionDto(i.question),
  };
}

export function toQuizDetail(q: QuizWithItems): QuizDetailDto {
  const items = [...q.questions].sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...toSummary(q, items), items: items.map(toItem) };
}

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(teacherId: string): Promise<QuizSummaryDto[]> {
    const rows = await this.prisma.quiz.findMany({
      where: { teacherId, deletedAt: null },
      include: { questions: { select: { points: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((q) => toSummary(q, q.questions));
  }

  async create(teacherId: string, input: CreateQuizInput): Promise<QuizDetailDto> {
    const quiz = await this.prisma.quiz.create({
      data: {
        teacherId,
        title: input.title,
        description: input.description ?? null,
        defaultTimeLimitSec: input.defaultTimeLimitSec,
      },
      include: detailInclude,
    });
    return toQuizDetail(quiz);
  }

  async detail(teacherId: string, id: string): Promise<QuizDetailDto> {
    return toQuizDetail(await this.findOwned(teacherId, id));
  }

  async update(teacherId: string, id: string, input: UpdateQuizInput): Promise<QuizDetailDto> {
    await this.findOwned(teacherId, id);
    const quiz = await this.prisma.quiz.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.defaultTimeLimitSec !== undefined && {
          defaultTimeLimitSec: input.defaultTimeLimitSec,
        }),
      },
      include: detailInclude,
    });
    return toQuizDetail(quiz);
  }

  async softDelete(teacherId: string, id: string): Promise<void> {
    await this.findOwned(teacherId, id);
    await this.prisma.quiz.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Thêm câu vào cuối đề, bỏ qua câu đã có hoặc không thuộc giáo viên. */
  async addItems(teacherId: string, quizId: string, questionIds: string[]): Promise<QuizDetailDto> {
    const quiz = await this.findOwned(teacherId, quizId);
    const existing = new Set(quiz.questions.map((i) => i.questionId));
    const valid = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, teacherId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(valid.map((v) => v.id));
    const toAdd = [...new Set(questionIds)].filter((id) => validIds.has(id) && !existing.has(id));
    let order = quiz.questions.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
    if (toAdd.length > 0) {
      await this.prisma.quizQuestion.createMany({
        data: toAdd.map((questionId) => ({ quizId, questionId, sortOrder: order++ })),
      });
      await this.touch(quizId);
    }
    return this.detail(teacherId, quizId);
  }

  /** Chọn ngẫu nhiên N câu theo bộ lọc, không trùng câu đã có trong đề. */
  async addRandom(
    teacherId: string,
    quizId: string,
    count: number,
    filter: QuizRandomFilter,
  ): Promise<QuizDetailDto> {
    const quiz = await this.findOwned(teacherId, quizId);
    const existing = quiz.questions.map((i) => i.questionId);
    const candidates = await this.prisma.question.findMany({
      where: {
        teacherId,
        deletedAt: null,
        id: { notIn: existing },
        ...(filter.subject && { subject: filter.subject }),
        ...(filter.grade && { grade: filter.grade }),
        ...(filter.topic && { topic: filter.topic }),
        ...(filter.difficulty && { difficulty: filter.difficulty }),
        ...(filter.type && { type: filter.type }),
      },
      select: { id: true },
    });
    if (candidates.length === 0) {
      throw new BadRequestException('Không còn câu hỏi phù hợp bộ lọc trong ngân hàng');
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }
    return this.addItems(
      teacherId,
      quizId,
      candidates.slice(0, count).map((c) => c.id),
    );
  }

  async updateItem(
    teacherId: string,
    quizId: string,
    itemId: string,
    input: UpdateQuizItemInput,
  ): Promise<QuizDetailDto> {
    await this.findOwned(teacherId, quizId);
    const item = await this.prisma.quizQuestion.findFirst({ where: { id: itemId, quizId } });
    if (!item) throw new NotFoundException('Không tìm thấy câu trong đề');
    await this.prisma.quizQuestion.update({
      where: { id: itemId },
      data: {
        ...(input.timeLimitSec !== undefined && { timeLimitSec: input.timeLimitSec }),
        ...(input.points !== undefined && { points: input.points }),
      },
    });
    await this.touch(quizId);
    return this.detail(teacherId, quizId);
  }

  async removeItem(teacherId: string, quizId: string, itemId: string): Promise<void> {
    await this.findOwned(teacherId, quizId);
    const deleted = await this.prisma.quizQuestion.deleteMany({ where: { id: itemId, quizId } });
    if (deleted.count === 0) throw new NotFoundException('Không tìm thấy câu trong đề');
    await this.touch(quizId);
  }

  async reorder(teacherId: string, quizId: string, itemIds: string[]): Promise<QuizDetailDto> {
    const quiz = await this.findOwned(teacherId, quizId);
    const current = new Set(quiz.questions.map((i) => i.id));
    const sameSet =
      itemIds.length === current.size &&
      new Set(itemIds).size === itemIds.length &&
      itemIds.every((id) => current.has(id));
    if (!sameSet) throw new BadRequestException('Danh sách câu không khớp với đề');
    await this.prisma.$transaction(
      itemIds.map((id, i) =>
        this.prisma.quizQuestion.update({ where: { id }, data: { sortOrder: i } }),
      ),
    );
    await this.touch(quizId);
    return this.detail(teacherId, quizId);
  }

  async findOwned(teacherId: string, id: string): Promise<QuizWithItems> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, teacherId, deletedAt: null },
      include: detailInclude,
    });
    if (!quiz) throw new NotFoundException('Không tìm thấy đề');
    return quiz;
  }

  private async touch(quizId: string): Promise<void> {
    await this.prisma.quiz.update({ where: { id: quizId }, data: { updatedAt: new Date() } });
  }
}
