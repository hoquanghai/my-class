-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "sharedSetId" TEXT;

-- CreateTable
CREATE TABLE "SharedSet" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "topic" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "hiddenAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "questionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "cloneCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSetQuestion" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "originQuestionId" TEXT,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "SharedSetQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSetLike" (
    "setId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedSetLike_pkey" PRIMARY KEY ("setId","teacherId")
);

-- CreateTable
CREATE TABLE "SharedSetComment" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "questionIndex" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SharedSetComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSetReport" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedSetReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedSetClone" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedSetClone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedSet_status_subject_grade_publishedAt_idx" ON "SharedSet"("status", "subject", "grade", "publishedAt");

-- CreateIndex
CREATE INDEX "SharedSet_teacherId_idx" ON "SharedSet"("teacherId");

-- CreateIndex
CREATE INDEX "SharedSetQuestion_originQuestionId_idx" ON "SharedSetQuestion"("originQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedSetQuestion_setId_sortOrder_key" ON "SharedSetQuestion"("setId", "sortOrder");

-- CreateIndex
CREATE INDEX "SharedSetLike_teacherId_idx" ON "SharedSetLike"("teacherId");

-- CreateIndex
CREATE INDEX "SharedSetComment_setId_createdAt_idx" ON "SharedSetComment"("setId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharedSetReport_setId_teacherId_key" ON "SharedSetReport"("setId", "teacherId");

-- CreateIndex
CREATE INDEX "SharedSetClone_setId_idx" ON "SharedSetClone"("setId");

-- CreateIndex
CREATE INDEX "SharedSetClone_teacherId_createdAt_idx" ON "SharedSetClone"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "Question_sharedSetId_idx" ON "Question"("sharedSetId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sharedSetId_fkey" FOREIGN KEY ("sharedSetId") REFERENCES "SharedSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSet" ADD CONSTRAINT "SharedSet_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetQuestion" ADD CONSTRAINT "SharedSetQuestion_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SharedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetQuestion" ADD CONSTRAINT "SharedSetQuestion_originQuestionId_fkey" FOREIGN KEY ("originQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetLike" ADD CONSTRAINT "SharedSetLike_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SharedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetLike" ADD CONSTRAINT "SharedSetLike_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetComment" ADD CONSTRAINT "SharedSetComment_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SharedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetComment" ADD CONSTRAINT "SharedSetComment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetReport" ADD CONSTRAINT "SharedSetReport_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SharedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetReport" ADD CONSTRAINT "SharedSetReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetClone" ADD CONSTRAINT "SharedSetClone_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SharedSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedSetClone" ADD CONSTRAINT "SharedSetClone_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
