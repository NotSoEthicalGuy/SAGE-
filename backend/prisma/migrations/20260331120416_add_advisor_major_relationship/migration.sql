-- AlterTable
ALTER TABLE "advisors" ADD COLUMN     "major_id" TEXT;

-- AddForeignKey
ALTER TABLE "advisors" ADD CONSTRAINT "advisors_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("major_id") ON DELETE RESTRICT ON UPDATE CASCADE;
