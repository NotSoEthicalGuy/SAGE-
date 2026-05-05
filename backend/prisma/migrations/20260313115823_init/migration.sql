-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('completed', 'in_progress', 'withdrawn', 'failed');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('midterm', 'final', 'quiz', 'project');

-- CreateEnum
CREATE TYPE "DriftLevel" AS ENUM ('on_track', 'early_warning', 'drifting', 'critical');

-- CreateTable
CREATE TABLE "majors" (
    "major_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "total_credits" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("major_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "course_id" TEXT NOT NULL,
    "major_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "semester_offered" INTEGER,
    "difficulty_level" INTEGER,
    "syllabus_text" TEXT,
    "topics_covered" TEXT[],
    "prerequisites" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "students" (
    "student_id" TEXT NOT NULL,
    "major_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enrollment_year" INTEGER NOT NULL,
    "current_semester" INTEGER NOT NULL DEFAULT 1,
    "cumulative_gpa" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "enrollment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "final_grade" DOUBLE PRECISION,
    "letter_grade" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "exams" (
    "exam_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "exam_type" "ExamType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "exam_date" TIMESTAMP(3),
    "pdf_path" TEXT,
    "pdf_text" TEXT,
    "ai_analysis" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("exam_id")
);

-- CreateTable
CREATE TABLE "ai_reports" (
    "report_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drift_score" DOUBLE PRECISION NOT NULL,
    "drift_level" "DriftLevel" NOT NULL,
    "trajectory_summary" TEXT,
    "drift_signals" JSONB,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "recommendation" JSONB,
    "prompt_version" TEXT,
    "advisor_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "majors_name_key" ON "majors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("enrollment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;
