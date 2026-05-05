-- CreateTable
CREATE TABLE "dna_results" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "predicted_outcome" TEXT NOT NULL,
    "interventions" TEXT[],
    "skill_grades" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dna_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_dna_reports" (
    "id" TEXT NOT NULL,
    "dna_result_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "advisor_note" TEXT,
    "original_grades" JSONB NOT NULL,
    "advisor_edited_grades" JSONB,
    "final_grades" JSONB NOT NULL,
    "chat_messages" JSONB NOT NULL DEFAULT '[]',
    "chat_message_count" INTEGER NOT NULL DEFAULT 0,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_dna_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "student_id" TEXT,
    "report_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dna_results_student_id_idx" ON "dna_results"("student_id");

-- CreateIndex
CREATE INDEX "shared_dna_reports_student_id_idx" ON "shared_dna_reports"("student_id");

-- CreateIndex
CREATE INDEX "notifications_advisor_id_idx" ON "notifications"("advisor_id");

-- AddForeignKey
ALTER TABLE "dna_results" ADD CONSTRAINT "dna_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dna_results" ADD CONSTRAINT "dna_results_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_dna_reports" ADD CONSTRAINT "shared_dna_reports_dna_result_id_fkey" FOREIGN KEY ("dna_result_id") REFERENCES "dna_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_dna_reports" ADD CONSTRAINT "shared_dna_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_dna_reports" ADD CONSTRAINT "shared_dna_reports_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;
