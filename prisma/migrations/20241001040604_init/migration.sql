-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "totalStorage" INTEGER NOT NULL DEFAULT 0,
    "usedStorage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
