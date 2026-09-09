import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client.js';

loadDotenv({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const DEMO_EMAIL = 'demo@lophoc.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_CLASS_CODE = 'DEM268';

const FEATURE_FLAGS: Record<string, unknown> = {
  'free.max_classes': 2,
  'free.max_students_per_class': 50,
  'free.ai_pages_per_month': 20,
  'free.history_days': 30,
  'free.export_enabled': false,
  'ai_extraction.enabled': true,
};

const STUDENT_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Châu',
  'Phạm Quốc Dũng',
  'Hoàng Thu Hà',
  'Vũ Đức Huy',
  'Đặng Ngọc Lan',
  'Bùi Hải Nam',
  'Đỗ Phương Nhi',
  'Ngô Thanh Phong',
  'Dương Bảo Quyên',
  'Lý Hoài Sơn',
];

type SeedQuestion = {
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';
  stemMd: string;
  topic: string;
  difficulty: 'nhan_biet' | 'thong_hieu' | 'van_dung';
  options?: { label: string; contentMd: string; isCorrect: boolean }[];
  acceptedAnswers?: string[];
  explanationMd?: string;
};

const QUESTIONS: SeedQuestion[] = [
  {
    type: 'single_choice',
    stemMd: 'Nghiệm của phương trình $2x + 3 = 11$ là:',
    topic: 'Phương trình bậc nhất',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$x = 3$', isCorrect: false },
      { label: 'B', contentMd: '$x = 4$', isCorrect: true },
      { label: 'C', contentMd: '$x = 5$', isCorrect: false },
      { label: 'D', contentMd: '$x = 7$', isCorrect: false },
    ],
    explanationMd: '$2x = 8 \\Rightarrow x = 4$.',
  },
  {
    type: 'single_choice',
    stemMd: 'Căn bậc hai số học của 49 là:',
    topic: 'Căn bậc hai',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$-7$', isCorrect: false },
      { label: 'B', contentMd: '$7$', isCorrect: true },
      { label: 'C', contentMd: '$\\pm 7$', isCorrect: false },
      { label: 'D', contentMd: '$49$', isCorrect: false },
    ],
  },
  {
    type: 'single_choice',
    stemMd: 'Giá trị của biểu thức $\\sqrt{16} + \\sqrt{9}$ bằng:',
    topic: 'Căn bậc hai',
    difficulty: 'thong_hieu',
    options: [
      { label: 'A', contentMd: '$5$', isCorrect: false },
      { label: 'B', contentMd: '$7$', isCorrect: true },
      { label: 'C', contentMd: '$25$', isCorrect: false },
      { label: 'D', contentMd: '$\\sqrt{25}$', isCorrect: false },
    ],
  },
  {
    type: 'multiple_choice',
    stemMd: 'Chọn các số là nghiệm của phương trình $x^2 - 5x + 6 = 0$:',
    topic: 'Phương trình bậc hai',
    difficulty: 'thong_hieu',
    options: [
      { label: 'A', contentMd: '$1$', isCorrect: false },
      { label: 'B', contentMd: '$2$', isCorrect: true },
      { label: 'C', contentMd: '$3$', isCorrect: true },
      { label: 'D', contentMd: '$6$', isCorrect: false },
    ],
  },
  {
    type: 'true_false',
    stemMd: 'Tổng ba góc trong một tam giác bằng $180^\\circ$.',
    topic: 'Tam giác',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: 'Đúng', isCorrect: true },
      { label: 'B', contentMd: 'Sai', isCorrect: false },
    ],
  },
  {
    type: 'true_false',
    stemMd: 'Số $0$ là số nguyên dương.',
    topic: 'Số nguyên',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: 'Đúng', isCorrect: false },
      { label: 'B', contentMd: 'Sai', isCorrect: true },
    ],
  },
  {
    type: 'short_text',
    stemMd: 'Tính $15 \\times 4$.',
    topic: 'Số học',
    difficulty: 'nhan_biet',
    acceptedAnswers: ['60'],
  },
  {
    type: 'short_text',
    stemMd: 'Hình có bốn cạnh bằng nhau và bốn góc vuông gọi là hình gì?',
    topic: 'Tứ giác',
    difficulty: 'nhan_biet',
    acceptedAnswers: ['hình vuông', 'hinh vuong'],
  },
  {
    type: 'single_choice',
    stemMd: 'Một hình chữ nhật có chiều dài 8 cm, chiều rộng 5 cm. Diện tích là:',
    topic: 'Tứ giác',
    difficulty: 'van_dung',
    options: [
      { label: 'A', contentMd: '$13\\ \\text{cm}^2$', isCorrect: false },
      { label: 'B', contentMd: '$26\\ \\text{cm}^2$', isCorrect: false },
      { label: 'C', contentMd: '$40\\ \\text{cm}^2$', isCorrect: true },
      { label: 'D', contentMd: '$80\\ \\text{cm}^2$', isCorrect: false },
    ],
  },
  {
    type: 'single_choice',
    stemMd: 'Hệ số góc của đường thẳng $y = -3x + 2$ là:',
    topic: 'Hàm số bậc nhất',
    difficulty: 'nhan_biet',
    options: [
      { label: 'A', contentMd: '$2$', isCorrect: false },
      { label: 'B', contentMd: '$-3$', isCorrect: true },
      { label: 'C', contentMd: '$3$', isCorrect: false },
      { label: 'D', contentMd: '$-2$', isCorrect: false },
    ],
  },
];

async function seedFeatureFlags(): Promise<void> {
  for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, value: value as never },
      update: {},
    });
  }
  console.log(`Feature flags: ${Object.keys(FEATURE_FLAGS).length} khóa`);
}

async function seedDemo(): Promise<void> {
  const teacher = await prisma.teacher.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: 'Cô Demo',
      passwordHash: await hash(DEMO_PASSWORD),
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
    },
    update: {},
  });

  const existing = await prisma.class.findFirst({
    where: { teacherId: teacher.id, code: DEMO_CLASS_CODE },
  });
  if (existing) {
    console.log('Lớp demo đã tồn tại, bỏ qua.');
    return;
  }

  const klass = await prisma.class.create({
    data: {
      teacherId: teacher.id,
      name: 'Toán 12A1 (demo)',
      subject: 'Toán',
      grade: '12',
      code: DEMO_CLASS_CODE,
      schedule: [
        { weekday: 2, start: '18:00', end: '19:30' },
        { weekday: 5, start: '18:00', end: '19:30' },
      ],
      students: {
        create: STUDENT_NAMES.map((name, i) => ({ name, sortOrder: i })),
      },
    },
  });

  const createdQuestions = [];
  for (const q of QUESTIONS) {
    createdQuestions.push(
      await prisma.question.create({
        data: {
          teacherId: teacher.id,
          type: q.type,
          stemMd: q.stemMd,
          explanationMd: q.explanationMd,
          subject: 'Toán',
          grade: '12',
          topic: q.topic,
          difficulty: q.difficulty,
          source: 'manual',
          acceptedAnswers: q.acceptedAnswers ?? undefined,
          options: q.options
            ? {
                create: q.options.map((o, i) => ({
                  label: o.label,
                  contentMd: o.contentMd,
                  isCorrect: o.isCorrect,
                  sortOrder: i,
                })),
              }
            : undefined,
        },
      }),
    );
  }

  await prisma.quiz.create({
    data: {
      teacherId: teacher.id,
      title: 'Kiểm tra đầu giờ – Căn bậc hai & phương trình (demo)',
      defaultTimeLimitSec: 30,
      questions: {
        create: createdQuestions.slice(0, 5).map((q, i) => ({
          questionId: q.id,
          sortOrder: i,
          points: 1,
        })),
      },
    },
  });

  console.log(
    `Demo: giáo viên ${DEMO_EMAIL} / ${DEMO_PASSWORD}, lớp "${klass.name}" mã ${klass.code}, ${STUDENT_NAMES.length} học sinh, ${QUESTIONS.length} câu hỏi, 1 đề.`,
  );
}

async function main(): Promise<void> {
  await seedFeatureFlags();
  await seedDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
