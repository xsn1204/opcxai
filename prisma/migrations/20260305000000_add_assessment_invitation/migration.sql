-- Add type column to Collaboration
ALTER TABLE "Collaboration" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'collaboration';

-- Make submission_id nullable: SQLite requires table recreation
-- Create new table
CREATE TABLE "Collaboration_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL DEFAULT 'collaboration',
  "requirement_id" TEXT NOT NULL,
  "submission_id" TEXT,
  "talent_id" TEXT NOT NULL,
  "corp_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "invitation_message" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Collaboration_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Collaboration_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Collaboration_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "TalentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Collaboration_corp_id_fkey" FOREIGN KEY ("corp_id") REFERENCES "CorpProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "Collaboration_new" SELECT "id", 'collaboration', "requirement_id", "submission_id", "talent_id", "corp_id", "status", "invitation_message", "created_at" FROM "Collaboration";

-- Drop old, rename new
DROP TABLE "Collaboration";
ALTER TABLE "Collaboration_new" RENAME TO "Collaboration";

-- Recreate unique index on submission_id
CREATE UNIQUE INDEX "Collaboration_submission_id_key" ON "Collaboration"("submission_id");
