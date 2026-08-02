-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('WIZARD', 'FOR_YOU');

-- CreateEnum
CREATE TYPE "Signal" AS ENUM ('LOVED', 'SEEN', 'NOT_FOR_ME', 'SAVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "RecSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "SessionType" NOT NULL DEFAULT 'WIZARD',
    "answers" JSONB,
    "pathHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "posterPath" TEXT,
    "overview" TEXT,
    "rating" DOUBLE PRECISION,
    "runtime" INTEGER,
    "genres" JSONB,
    "raw" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieFeedback" (
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "signal" "Signal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieFeedback_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "SavedMovie" (
    "userId" TEXT NOT NULL,
    "movieId" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMovie_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "TasteProfile" (
    "userId" TEXT NOT NULL,
    "genreWeights" JSONB NOT NULL,
    "tasteSummary" TEXT NOT NULL DEFAULT '',
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasteProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "RecSession_pathHash_createdAt_idx" ON "RecSession"("pathHash", "createdAt");

-- CreateIndex
CREATE INDEX "RecSession_userId_type_createdAt_idx" ON "RecSession"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_movieId_idx" ON "Recommendation"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_sessionId_rank_key" ON "Recommendation"("sessionId", "rank");

-- CreateIndex
CREATE INDEX "MovieFeedback_userId_signal_idx" ON "MovieFeedback"("userId", "signal");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecSession" ADD CONSTRAINT "RecSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RecSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFeedback" ADD CONSTRAINT "MovieFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFeedback" ADD CONSTRAINT "MovieFeedback_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMovie" ADD CONSTRAINT "SavedMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMovie" ADD CONSTRAINT "SavedMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasteProfile" ADD CONSTRAINT "TasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
