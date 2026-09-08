-- Student name is unique within a class, counting only rows not soft-deleted
CREATE UNIQUE INDEX "Student_classId_name_active_key"
  ON "Student" ("classId", "name")
  WHERE "deletedAt" IS NULL;
