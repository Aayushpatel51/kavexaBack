-- CreateTable
CREATE TABLE "ChatHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userMessage" INTEGER NOT NULL,
    "AiMessage" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatHistory_pkey" PRIMARY KEY ("id")
);
