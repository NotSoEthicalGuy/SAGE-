-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "student_flags" (
    "flag_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "is_visible_to_student" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_flags_pkey" PRIMARY KEY ("flag_id")
);

-- CreateTable
CREATE TABLE "appointment_requests" (
    "appointment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "advisor_id" TEXT,
    "topic" TEXT NOT NULL,
    "requested_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "advisor_response" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_requests_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateIndex
CREATE INDEX "student_flags_student_id_idx" ON "student_flags"("student_id");

-- CreateIndex
CREATE INDEX "student_flags_advisor_id_idx" ON "student_flags"("advisor_id");

-- CreateIndex
CREATE INDEX "appointment_requests_student_id_idx" ON "appointment_requests"("student_id");

-- CreateIndex
CREATE INDEX "appointment_requests_advisor_id_idx" ON "appointment_requests"("advisor_id");

-- AddForeignKey
ALTER TABLE "student_flags" ADD CONSTRAINT "student_flags_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_flags" ADD CONSTRAINT "student_flags_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("advisor_id") ON DELETE SET NULL ON UPDATE CASCADE;
