-- DropForeignKey
ALTER TABLE "advisors" DROP CONSTRAINT "advisors_major_id_fkey";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "password_hash" TEXT;

-- AddForeignKey
ALTER TABLE "advisors" ADD CONSTRAINT "advisors_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("major_id") ON DELETE SET NULL ON UPDATE CASCADE;
