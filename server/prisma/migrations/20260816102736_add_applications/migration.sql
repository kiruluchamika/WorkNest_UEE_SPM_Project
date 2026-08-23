-- CreateEnum
CREATE TYPE "ApplicationMode" AS ENUM ('QUICK_APPLY', 'STANDARD', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'COMPLETED');

-- CreateTable
CREATE TABLE "ApplicationSettings" (
    "id" TEXT NOT NULL,
    "gigPostId" TEXT NOT NULL,
    "applicationMode" "ApplicationMode" NOT NULL DEFAULT 'STANDARD',
    "requireCV" BOOLEAN NOT NULL DEFAULT false,
    "requireCoverLetter" BOOLEAN NOT NULL DEFAULT false,
    "requireExperience" BOOLEAN NOT NULL DEFAULT true,
    "requireAvailability" BOOLEAN NOT NULL DEFAULT true,
    "requireTransportation" BOOLEAN NOT NULL DEFAULT false,
    "requirePortfolio" BOOLEAN NOT NULL DEFAULT false,
    "requireExpectedSalary" BOOLEAN NOT NULL DEFAULT true,
    "requireShortMessage" BOOLEAN NOT NULL DEFAULT true,
    "customQuestions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "gigPostId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "applicationMode" "ApplicationMode" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "experience" TEXT,
    "availability" TEXT,
    "transportation" BOOLEAN,
    "shortMessage" TEXT,
    "cvUrl" TEXT,
    "coverLetter" TEXT,
    "portfolioUrl" TEXT,
    "expectedSalary" DECIMAL(65,30),
    "answers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSettings_gigPostId_key" ON "ApplicationSettings"("gigPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_gigPostId_applicantId_key" ON "Application"("gigPostId", "applicantId");

-- AddForeignKey
ALTER TABLE "ApplicationSettings" ADD CONSTRAINT "ApplicationSettings_gigPostId_fkey" FOREIGN KEY ("gigPostId") REFERENCES "GigPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_gigPostId_fkey" FOREIGN KEY ("gigPostId") REFERENCES "GigPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
