-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'advisor');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "advisor_id" TEXT;

-- CreateTable
CREATE TABLE "advisors" (
    "advisor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'advisor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisors_pkey" PRIMARY KEY ("advisor_id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "session_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "attendance_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "course_materials" (
    "material_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "extracted_text" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_materials_pkey" PRIMARY KEY ("material_id")
);

-- CreateTable
CREATE TABLE "course_skills" (
    "skill_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_skills_pkey" PRIMARY KEY ("skill_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advisors_email_key" ON "advisors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_session_id_student_id_key" ON "attendance"("session_id", "student_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_skills" ADD CONSTRAINT "course_skills_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;
