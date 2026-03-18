-- Add DiagnosisRecord model for OPC business collaboration diagnosis feature
CREATE TABLE IF NOT EXISTS "DiagnosisRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corp_id" TEXT NOT NULL,
    "business_input" TEXT NOT NULL,
    "diagnosis_text" TEXT NOT NULL DEFAULT '',
    "result_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosisRecord_corp_id_fkey" FOREIGN KEY ("corp_id") REFERENCES "CorpProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DiagnosisRecord_corp_id_idx" ON "DiagnosisRecord"("corp_id");
