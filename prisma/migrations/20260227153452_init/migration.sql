-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TalentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT '',
    "capability_modules" TEXT NOT NULL DEFAULT '[]',
    "tool_stack" TEXT NOT NULL DEFAULT '[]',
    "delivery_pref" TEXT NOT NULL DEFAULT 'result_bet',
    "avg_score" REAL NOT NULL DEFAULT 0,
    "bio" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalentProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorpProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL DEFAULT '',
    "business_tracks" TEXT NOT NULL DEFAULT '[]',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorpProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corp_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent_desc" TEXT NOT NULL,
    "ai_tags" TEXT NOT NULL DEFAULT '[]',
    "business_stage" TEXT NOT NULL DEFAULT 'startup',
    "complexity" TEXT NOT NULL DEFAULT 'mid',
    "budget_min" REAL,
    "budget_max" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "deadline" DATETIME,
    "question_types" TEXT NOT NULL DEFAULT '[]',
    "capability_weights" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Requirement_corp_id_fkey" FOREIGN KEY ("corp_id") REFERENCES "CorpProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirement_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    CONSTRAINT "ExamQuestion_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirement_id" TEXT NOT NULL,
    "talent_id" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "conversation_log" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ai_total_score" REAL,
    "ai_score_breakdown" TEXT,
    "ai_diagnosis" TEXT,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "TalentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirement_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collaboration_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "Collaboration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TalentProfile_user_id_key" ON "TalentProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CorpProfile_user_id_key" ON "CorpProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Collaboration_submission_id_key" ON "Collaboration"("submission_id");
