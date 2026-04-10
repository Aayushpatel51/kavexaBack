/*
  Warnings:

  - Added the required column `userId` to the `TestReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TestReport" ADD COLUMN     "userId" INTEGER NOT NULL;
