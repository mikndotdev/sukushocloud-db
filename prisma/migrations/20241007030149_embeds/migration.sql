-- AlterTable
ALTER TABLE "File" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "embedColor" TEXT NOT NULL DEFAULT '#FF0000',
ADD COLUMN     "embedFooter" TEXT NOT NULL DEFAULT 'Powered by sukushocloud',
ADD COLUMN     "embedHeader" TEXT NOT NULL DEFAULT 'Screenshot';
