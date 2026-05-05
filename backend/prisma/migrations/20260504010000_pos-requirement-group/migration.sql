-- AlterTable
ALTER TABLE "degree_requirements" ADD COLUMN "requirement_group" TEXT NOT NULL DEFAULT 'Department Requirements';

-- CreateIndex
CREATE INDEX "degree_requirements_major_id_requirement_group_idx" ON "degree_requirements"("major_id", "requirement_group");
