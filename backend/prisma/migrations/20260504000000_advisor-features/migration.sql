-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('core', 'elective');

-- CreateTable
CREATE TABLE "degree_requirements" (
    "id" TEXT NOT NULL,
    "major_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "requirement_type" "RequirementType" NOT NULL,
    "recommended_semester" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "degree_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_plans" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT,
    "semester_plans" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "student_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_runs" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "intervention_type" TEXT NOT NULL,
    "notes" TEXT,
    "intervention_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_outcomes" (
    "id" TEXT NOT NULL,
    "intervention_id" TEXT NOT NULL,
    "drift_score_before" DOUBLE PRECISION NOT NULL,
    "drift_score_after" DOUBLE PRECISION,
    "effectiveness_score" DOUBLE PRECISION,
    "measured_at" TIMESTAMP(3),

    CONSTRAINT "intervention_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "degree_requirements_major_id_idx" ON "degree_requirements"("major_id");

-- CreateIndex
CREATE INDEX "student_plans_student_id_idx" ON "student_plans"("student_id");

-- CreateIndex
CREATE INDEX "triage_runs_advisor_id_idx" ON "triage_runs"("advisor_id");

-- CreateIndex
CREATE INDEX "interventions_student_id_idx" ON "interventions"("student_id");

-- CreateIndex
CREATE INDEX "interventions_advisor_id_idx" ON "interventions"("advisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "intervention_outcomes_intervention_id_key" ON "intervention_outcomes"("intervention_id");

-- AddForeignKey
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_plans" ADD CONSTRAINT "student_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_plans" ADD CONSTRAINT "student_plans_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_runs" ADD CONSTRAINT "triage_runs_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_outcomes" ADD CONSTRAINT "intervention_outcomes_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
