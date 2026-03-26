-- CreateTable
CREATE TABLE "EmailVerification" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
