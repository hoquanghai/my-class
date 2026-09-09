-- Tự làm: học sinh nộp bài một lần; lượt tự kết thúc khi hết giờ
ALTER TABLE "QuizRunResult" ADD COLUMN "submittedAt" TIMESTAMP(3);

CREATE INDEX "QuizRun_status_deadlineAt_idx" ON "QuizRun"("status", "deadlineAt");
