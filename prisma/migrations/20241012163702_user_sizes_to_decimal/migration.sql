-- AlterTable
ALTER TABLE "User" ALTER COLUMN "totalStorage" SET DEFAULT 0,
ALTER COLUMN "totalStorage" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "usedStorage" SET DEFAULT 0,
ALTER COLUMN "usedStorage" SET DATA TYPE DECIMAL(65,30);