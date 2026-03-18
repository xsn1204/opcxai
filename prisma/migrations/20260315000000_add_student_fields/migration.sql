-- AlterTable
ALTER TABLE "TalentProfile" ADD COLUMN "is_student" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TalentProfile" ADD COLUMN "edu_email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TalentProfile" ADD COLUMN "student_metadata" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "TalentProfile" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
