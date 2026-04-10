-- CreateTable
CREATE TABLE "TestReport" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "totalTest" INTEGER NOT NULL,
    "passedTest" INTEGER NOT NULL,
    "failedTest" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,

    CONSTRAINT "TestReport_pkey" PRIMARY KEY ("id")
);
