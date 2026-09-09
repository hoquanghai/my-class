import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CloneSetInput,
  type CloneSetResultDto,
  type CommunityFacetsDto,
  type CommunityFacetsQuery,
  type CommunityListQuery,
  type CreateCommentInput,
  type Difficulty,
  ErrorCodes,
  type LikeSetResultDto,
  type PublishSetInput,
  type QuestionType,
  type ReportSetInput,
  type ReportSetResultDto,
  type RepublishSetInput,
  type SharedQuestionSnapshot,
  type SharedSetCommentDto,
  type SharedSetDetailDto,
  type SharedSetListDto,
  type SharedSetStatus,
  type SharedSetSummaryDto,
  type SharedSetUsageDto,
  type UpdateSetInput,
} from '@lophoc/shared';
import type { Prisma, Question, QuestionOption } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { QuizzesService } from '../quizzes/quizzes.service.js';

/** Flag `community.*` (đổi bằng SQL/seed như các giới hạn khác). */
const DEFAULTS = { reportAutoHide: 3, maxClonesPerDay: 20 };
const DAY_MS = 24 * 60 * 60 * 1000;

const authorSelect = { id: true, name: true, school: true, avatarUrl: true } as const;
type SetWithAuthor = Prisma.SharedSetGetPayload<{
  include: { teacher: { select: typeof authorSelect } };
}>;
type SetFull = Prisma.SharedSetGetPayload<{
  include: { teacher: { select: typeof authorSelect }; questions: true };
}>;
type QuestionWithOptions = Question & { options: QuestionOption[] };

/** Chụp một câu hỏi của tác giả thành nội dung bài đăng (không phụ thuộc ngân hàng về sau). */
function toSnapshot(q: QuestionWithOptions): SharedQuestionSnapshot {
  return {
    type: q.type as QuestionType,
    stemMd: q.stemMd,
    explanationMd: q.explanationMd,
    imageKey: q.imageKey,
    difficulty: q.difficulty as Difficulty | null,
    topic: q.topic,
    options: [...q.options]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        label: o.label,
        contentMd: o.contentMd,
        isCorrect: o.isCorrect,
        imageKey: o.imageKey,
      })),
    acceptedAnswers: Array.isArray(q.acceptedAnswers) ? (q.acceptedAnswers as string[]) : [],
  };
}

function summarizeQuestions(questions: QuestionWithOptions[]) {
  return {
    questionCount: questions.length,
    questionTypes: [...new Set(questions.map((q) => q.type))],
    difficulties: [...new Set(questions.map((q) => q.difficulty).filter((d): d is string => !!d))],
  };
}

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly flags: FeatureFlagsService,
    private readonly quizzes: QuizzesService,
  ) {}

  // ---------- Đăng và quản lý bài của tôi ----------

  async publish(teacherId: string, input: PublishSetInput): Promise<SharedSetDetailDto> {
    await this.assertVerified(teacherId);
    const questions = await this.loadOwnQuestions(teacherId, input);
    const set = await this.prisma.sharedSet.create({
      data: {
        teacherId,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic ?? null,
        source: input.source ?? null,
        status: input.status,
        publishedAt: input.status === 'draft' ? null : new Date(),
        ...summarizeQuestions(questions),
        questions: {
          create: questions.map((q, i) => ({
            sortOrder: i,
            originQuestionId: q.id,
            snapshot: toSnapshot(q) as unknown as Prisma.InputJsonValue,
          })),
        },
      },
      select: { id: true },
    });
    await this.analytics.track(
      'community_publish',
      { setId: set.id, status: input.status, questions: questions.length },
      teacherId,
    );
    return this.detail(teacherId, set.id);
  }

  async update(teacherId: string, id: string, input: UpdateSetInput): Promise<SharedSetDetailDto> {
    const set = await this.findOwnedSet(teacherId, id);
    const status = input.status ?? (set.status as SharedSetStatus);
    const data: Prisma.SharedSetUpdateInput = { status };
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.subject !== undefined) data.subject = input.subject;
    if (input.grade !== undefined) data.grade = input.grade;
    if (input.topic !== undefined) data.topic = input.topic;
    if (input.source !== undefined) data.source = input.source;
    if (status !== 'draft' && set.publishedAt === null) data.publishedAt = new Date();
    await this.prisma.sharedSet.update({ where: { id }, data });
    return this.detail(teacherId, id);
  }

  /** Đăng bản mới: thay toàn bộ câu bằng bản chụp hiện tại, tăng `version`; người đã lấy về giữ bản cũ. */
  async republish(
    teacherId: string,
    id: string,
    input: RepublishSetInput,
  ): Promise<SharedSetDetailDto> {
    const set = await this.findOwnedSet(teacherId, id);
    const questions = await this.loadOwnQuestions(teacherId, input);
    await this.prisma.$transaction([
      this.prisma.sharedSetQuestion.deleteMany({ where: { setId: id } }),
      this.prisma.sharedSetQuestion.createMany({
        data: questions.map((q, i) => ({
          setId: id,
          sortOrder: i,
          originQuestionId: q.id,
          snapshot: toSnapshot(q) as unknown as Prisma.InputJsonValue,
        })),
      }),
      this.prisma.sharedSet.update({
        where: { id },
        data: { version: set.version + 1, ...summarizeQuestions(questions) },
      }),
    ]);
    return this.detail(teacherId, id);
  }

  async remove(teacherId: string, id: string): Promise<void> {
    await this.findOwnedSet(teacherId, id);
    // Câu đã được người khác lấy về là bản sao độc lập (sharedSetId về null nhờ onDelete: SetNull)
    await this.prisma.sharedSet.delete({ where: { id } });
  }

  async mine(teacherId: string): Promise<SharedSetSummaryDto[]> {
    const sets = await this.prisma.sharedSet.findMany({
      where: { teacherId },
      include: { teacher: { select: authorSelect } },
      orderBy: { updatedAt: 'desc' },
    });
    const marks = await this.viewerMarks(
      teacherId,
      sets.map((s) => s.id),
    );
    return sets.map((s) => this.toSummary(s, teacherId, marks));
  }

  // ---------- Kho chung ----------

  async list(teacherId: string, query: CommunityListQuery): Promise<SharedSetListDto> {
    const where: Prisma.SharedSetWhereInput = {
      status: 'published',
      hiddenAt: null,
      ...(query.subject && { subject: query.subject }),
      ...(query.grade && { grade: query.grade }),
      ...(query.topic && { topic: { equals: query.topic, mode: 'insensitive' } }),
      ...(query.type && { questionTypes: { has: query.type } }),
      ...(query.difficulty && { difficulties: { has: query.difficulty } }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { topic: { contains: query.q, mode: 'insensitive' } },
          { teacher: { name: { contains: query.q, mode: 'insensitive' } } },
        ],
      }),
    };
    const orderBy: Prisma.SharedSetOrderByWithRelationInput[] =
      query.sort === 'liked'
        ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }]
        : query.sort === 'cloned'
          ? [{ cloneCount: 'desc' }, { publishedAt: 'desc' }]
          : [{ featuredAt: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }];
    const [total, sets] = await Promise.all([
      this.prisma.sharedSet.count({ where }),
      this.prisma.sharedSet.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { teacher: { select: authorSelect } },
      }),
    ]);
    const marks = await this.viewerMarks(
      teacherId,
      sets.map((s) => s.id),
    );
    return {
      items: sets.map((s) => this.toSummary(s, teacherId, marks)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Chủ đề đã có trong kho (để gợi ý lọc), theo môn/khối nếu truyền. */
  async facets(query: CommunityFacetsQuery): Promise<CommunityFacetsDto> {
    const rows = await this.prisma.sharedSet.findMany({
      where: {
        status: 'published',
        hiddenAt: null,
        topic: { not: null },
        ...(query.subject && { subject: query.subject }),
        ...(query.grade && { grade: query.grade }),
      },
      select: { topic: true },
      distinct: ['topic'],
      orderBy: { topic: 'asc' },
    });
    return { topics: rows.map((r) => r.topic).filter((t): t is string => t !== null) };
  }

  async detail(teacherId: string, id: string): Promise<SharedSetDetailDto> {
    const set = await this.findVisible(teacherId, id);
    const marks = await this.viewerMarks(teacherId, [id]);
    const reported = await this.prisma.sharedSetReport.count({ where: { setId: id, teacherId } });
    const isAuthor = set.teacherId === teacherId;
    return {
      ...this.toSummary(set, teacherId, marks),
      viewer: { ...this.toSummary(set, teacherId, marks).viewer, reported: reported > 0 },
      questions: set.questions
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((q) => ({
          index: q.sortOrder + 1,
          originQuestionId: q.originQuestionId,
          snapshot: q.snapshot as unknown as SharedQuestionSnapshot,
        })),
      usage: await this.usage(set),
      reportCount: isAuthor ? set.reportCount : 0,
    };
  }

  // ---------- Tương tác ----------

  /**
   * Lấy bộ đề về ngân hàng: mỗi câu thành một câu hỏi mới của người lấy (nguồn `community`,
   * gắn `sharedSetId` để thống kê mức dùng), tùy chọn tạo luôn đề. Có trần số lượt mỗi ngày.
   */
  async clone(teacherId: string, id: string, input: CloneSetInput): Promise<CloneSetResultDto> {
    const set = await this.findVisible(teacherId, id);
    if (set.questions.length === 0) throw new BadRequestException('Bộ đề chưa có câu hỏi');
    const max = await this.flags.get('community.max_clones_per_day', DEFAULTS.maxClonesPerDay);
    const recent = await this.prisma.sharedSetClone.count({
      where: { teacherId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    if (recent >= max) {
      throw new ForbiddenException({
        code: ErrorCodes.LIMIT_COMMUNITY_CLONES,
        message: `Gói miễn phí lấy về tối đa ${max} bộ đề mỗi ngày. Thử lại vào ngày mai.`,
      });
    }

    const snapshots = [...set.questions]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => q.snapshot as unknown as SharedQuestionSnapshot);
    const created = await this.prisma.$transaction(
      snapshots.map((s) =>
        this.prisma.question.create({
          data: {
            teacher: { connect: { id: teacherId } },
            type: s.type,
            stemMd: s.stemMd,
            explanationMd: s.explanationMd,
            imageKey: s.imageKey,
            subject: set.subject,
            grade: set.grade,
            topic: (s.topic ?? set.topic ?? set.title).slice(0, 80),
            difficulty: s.difficulty,
            source: 'community',
            sharedSet: { connect: { id: set.id } },
            acceptedAnswers: s.acceptedAnswers,
            options: {
              create: s.options.map((o, i) => ({
                label: o.label,
                contentMd: o.contentMd,
                imageKey: o.imageKey,
                isCorrect: o.isCorrect,
                sortOrder: i,
              })),
            },
          },
          select: { id: true },
        }),
      ),
    );
    const questionIds = created.map((c) => c.id);
    await this.prisma.$transaction([
      this.prisma.sharedSetClone.create({
        data: { setId: set.id, teacherId, version: set.version },
      }),
      this.prisma.sharedSet.update({
        where: { id: set.id },
        data: { cloneCount: { increment: 1 } },
      }),
    ]);

    let quizId: string | null = null;
    if (input.createQuiz) {
      const quiz = await this.quizzes.create(teacherId, {
        title: set.title.slice(0, 150),
        description: set.description,
        defaultTimeLimitSec: 30,
      });
      await this.quizzes.addItems(teacherId, quiz.id, questionIds);
      quizId = quiz.id;
    }
    await this.analytics.track(
      'community_clone',
      { setId: set.id, questions: questionIds.length, quiz: quizId !== null },
      teacherId,
    );
    return { added: questionIds.length, questionIds, quizId };
  }

  async setLike(teacherId: string, id: string, liked: boolean): Promise<LikeSetResultDto> {
    await this.findVisible(teacherId, id);
    if (liked) {
      await this.prisma.sharedSetLike.upsert({
        where: { setId_teacherId: { setId: id, teacherId } },
        create: { setId: id, teacherId },
        update: {},
      });
    } else {
      await this.prisma.sharedSetLike.deleteMany({ where: { setId: id, teacherId } });
    }
    const likeCount = await this.prisma.sharedSetLike.count({ where: { setId: id } });
    await this.prisma.sharedSet.update({ where: { id }, data: { likeCount } });
    return { liked, likeCount };
  }

  async comments(teacherId: string, id: string): Promise<SharedSetCommentDto[]> {
    const set = await this.findVisible(teacherId, id);
    const rows = await this.prisma.sharedSetComment.findMany({
      where: { setId: id, deletedAt: null },
      include: { teacher: { select: authorSelect } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((c) => this.toComment(c, teacherId, set.teacherId));
  }

  async addComment(
    teacherId: string,
    id: string,
    input: CreateCommentInput,
  ): Promise<SharedSetCommentDto> {
    await this.assertVerified(teacherId);
    const set = await this.findVisible(teacherId, id);
    if (input.questionIndex && input.questionIndex > set.questionCount) {
      throw new BadRequestException('Số câu không có trong bộ đề');
    }
    const row = await this.prisma.sharedSetComment.create({
      data: { setId: id, teacherId, body: input.body, questionIndex: input.questionIndex ?? null },
      include: { teacher: { select: authorSelect } },
    });
    await this.recountComments(id);
    return this.toComment(row, teacherId, set.teacherId);
  }

  /** Người viết hoặc tác giả bộ đề xóa bình luận (xóa mềm). */
  async deleteComment(teacherId: string, commentId: string): Promise<void> {
    const row = await this.prisma.sharedSetComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: { set: { select: { id: true, teacherId: true } } },
    });
    if (!row || (row.teacherId !== teacherId && row.set.teacherId !== teacherId)) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }
    await this.prisma.sharedSetComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    await this.recountComments(row.set.id);
  }

  /** Tác giả đánh dấu góp ý đã được sửa (bấm lại để bỏ dấu). */
  async toggleResolved(teacherId: string, commentId: string): Promise<SharedSetCommentDto> {
    const row = await this.prisma.sharedSetComment.findFirst({
      where: { id: commentId, deletedAt: null, set: { teacherId } },
      include: { teacher: { select: authorSelect } },
    });
    if (!row) throw new NotFoundException('Không tìm thấy bình luận');
    const updated = await this.prisma.sharedSetComment.update({
      where: { id: commentId },
      data: { resolvedAt: row.resolvedAt ? null : new Date() },
      include: { teacher: { select: authorSelect } },
    });
    return this.toComment(updated, teacherId, teacherId);
  }

  /** Báo cáo một lần cho mỗi giáo viên; đủ số báo cáo (flag) thì bài tự ẩn chờ quản trị xem. */
  async report(teacherId: string, id: string, input: ReportSetInput): Promise<ReportSetResultDto> {
    await this.assertVerified(teacherId);
    const set = await this.findVisible(teacherId, id);
    if (set.teacherId === teacherId)
      throw new BadRequestException('Không thể báo cáo bài của mình');
    await this.prisma.sharedSetReport.upsert({
      where: { setId_teacherId: { setId: id, teacherId } },
      create: { setId: id, teacherId, reason: input.reason, detail: input.detail ?? null },
      update: { reason: input.reason, detail: input.detail ?? null },
    });
    const reportCount = await this.prisma.sharedSetReport.count({ where: { setId: id } });
    const threshold = await this.flags.get('community.report_auto_hide', DEFAULTS.reportAutoHide);
    const hide = set.hiddenAt === null && reportCount >= threshold;
    await this.prisma.sharedSet.update({
      where: { id },
      data: { reportCount, ...(hide && { hiddenAt: new Date() }) },
    });
    await this.analytics.track(
      'community_report',
      { setId: id, reason: input.reason, hidden: hide || set.hiddenAt !== null },
      teacherId,
    );
    return { reason: input.reason, reportCount, hidden: hide || set.hiddenAt !== null };
  }

  // ---------- nội bộ ----------

  /** Đăng bài, bình luận, báo cáo cần email đã xác minh (tài khoản Google/Facebook đã xác minh sẵn). */
  private async assertVerified(teacherId: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { emailVerifiedAt: true },
    });
    if (!teacher?.emailVerifiedAt) {
      throw new ForbiddenException({
        code: ErrorCodes.EMAIL_NOT_VERIFIED,
        message: 'Xác minh email trước khi đăng bài, bình luận hoặc báo cáo',
      });
    }
  }

  /** Câu hỏi của chính tác giả, đúng thứ tự đã chọn (hoặc thứ tự trong đề). */
  private async loadOwnQuestions(
    teacherId: string,
    input: { questionIds?: string[]; quizId?: string },
  ): Promise<QuestionWithOptions[]> {
    if (input.quizId) {
      const quiz = await this.quizzes.findOwned(teacherId, input.quizId);
      const questions = [...quiz.questions]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.question)
        .filter((q) => q.deletedAt === null);
      if (questions.length === 0) throw new BadRequestException('Đề chưa có câu hỏi');
      return questions;
    }
    const ids = [...new Set(input.questionIds ?? [])];
    const rows = await this.prisma.question.findMany({
      where: { id: { in: ids }, teacherId, deletedAt: null },
      include: { options: true },
    });
    if (rows.length !== ids.length) {
      throw new BadRequestException('Có câu hỏi không tồn tại hoặc không thuộc về bạn');
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)!);
  }

  private async findOwnedSet(teacherId: string, id: string) {
    const set = await this.prisma.sharedSet.findFirst({ where: { id, teacherId } });
    if (!set) throw new NotFoundException('Không tìm thấy bộ đề');
    return set;
  }

  /** Tác giả luôn thấy; người khác chỉ thấy bài công khai / chỉ-ai-có-link chưa bị ẩn. */
  private async findVisible(teacherId: string, id: string): Promise<SetFull> {
    const set = await this.prisma.sharedSet.findUnique({
      where: { id },
      include: { teacher: { select: authorSelect }, questions: true },
    });
    const visible =
      set &&
      (set.teacherId === teacherId ||
        (set.hiddenAt === null && (set.status === 'published' || set.status === 'unlisted')));
    if (!set || !visible) throw new NotFoundException('Không tìm thấy bộ đề');
    return set;
  }

  private async viewerMarks(
    teacherId: string,
    setIds: string[],
  ): Promise<{ liked: Set<string>; cloned: Set<string> }> {
    if (setIds.length === 0) return { liked: new Set(), cloned: new Set() };
    const [likes, clones] = await Promise.all([
      this.prisma.sharedSetLike.findMany({
        where: { teacherId, setId: { in: setIds } },
        select: { setId: true },
      }),
      this.prisma.sharedSetClone.findMany({
        where: { teacherId, setId: { in: setIds } },
        select: { setId: true },
        distinct: ['setId'],
      }),
    ]);
    return {
      liked: new Set(likes.map((l) => l.setId)),
      cloned: new Set(clones.map((c) => c.setId)),
    };
  }

  private toSummary(
    set: SetWithAuthor,
    teacherId: string,
    marks: { liked: Set<string>; cloned: Set<string> },
  ): SharedSetSummaryDto {
    return {
      id: set.id,
      title: set.title,
      description: set.description,
      subject: set.subject,
      grade: set.grade,
      topic: set.topic,
      source: set.source,
      status: set.status as SharedSetStatus,
      hidden: set.hiddenAt !== null,
      featured: set.featuredAt !== null,
      version: set.version,
      questionCount: set.questionCount,
      questionTypes: set.questionTypes as QuestionType[],
      difficulties: set.difficulties as Difficulty[],
      likeCount: set.likeCount,
      cloneCount: set.cloneCount,
      commentCount: set.commentCount,
      author: set.teacher,
      publishedAt: set.publishedAt?.toISOString() ?? null,
      updatedAt: set.updatedAt.toISOString(),
      createdAt: set.createdAt.toISOString(),
      viewer: {
        isAuthor: set.teacherId === teacherId,
        liked: marks.liked.has(set.id),
        cloned: marks.cloned.has(set.id),
        reported: false,
      },
    };
  }

  private toComment(
    c: Prisma.SharedSetCommentGetPayload<{ include: { teacher: { select: typeof authorSelect } } }>,
    teacherId: string,
    setAuthorId: string,
  ): SharedSetCommentDto {
    return {
      id: c.id,
      setId: c.setId,
      author: c.teacher,
      body: c.body,
      questionIndex: c.questionIndex,
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      viewer: { isMine: c.teacherId === teacherId, canModerate: setAuthorId === teacherId },
    };
  }

  private async recountComments(setId: string): Promise<void> {
    const commentCount = await this.prisma.sharedSetComment.count({
      where: { setId, deletedAt: null },
    });
    await this.prisma.sharedSet.update({ where: { id: setId }, data: { commentCount } });
  }

  /** Mức dùng thật: lượt thi đã kết thúc có câu gốc của tác giả hoặc câu người khác lấy về từ bộ này. */
  private async usage(set: SetFull): Promise<SharedSetUsageDto> {
    const cloned = await this.prisma.question.findMany({
      where: { sharedSetId: set.id },
      select: { id: true },
    });
    const ids = [
      ...set.questions.map((q) => q.originQuestionId).filter((x): x is string => x !== null),
      ...cloned.map((c) => c.id),
    ];
    if (ids.length === 0) return { runs: 0, answers: 0, correctPercent: null };
    const inFinished = { run: { status: 'finished' }, runQuestion: { questionId: { in: ids } } };
    const [runs, answers, correct] = await Promise.all([
      this.prisma.quizRun.count({
        where: { status: 'finished', questions: { some: { questionId: { in: ids } } } },
      }),
      this.prisma.answer.count({ where: inFinished }),
      this.prisma.answer.count({ where: { ...inFinished, isCorrect: true } }),
    ]);
    return {
      runs,
      answers,
      correctPercent: answers > 0 ? Math.round((correct / answers) * 100) : null,
    };
  }
}
