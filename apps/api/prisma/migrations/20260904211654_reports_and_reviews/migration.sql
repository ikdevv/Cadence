-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION', 'APPROVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DEVELOPMENT', 'TESTING', 'MEETINGS', 'DOCUMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewActionType" AS ENUM ('APPROVE', 'REQUEST_CHANGES');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVersion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "notes" TEXT,
    "links" TEXT,
    "nextWeekPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "plannedPct" INTEGER NOT NULL DEFAULT 0,
    "actualPct" INTEGER NOT NULL DEFAULT 0,
    "hoursPlanned" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hoursSpent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "deliverable" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocker" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isKeyIssue" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Blocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isKeyHighlight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoursEntry" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "HoursEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" "ReviewActionType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Report_currentVersionId_key" ON "Report"("currentVersionId");

-- CreateIndex
CREATE INDEX "Report_status_weekStart_idx" ON "Report"("status", "weekStart");

-- CreateIndex
CREATE INDEX "Report_projectId_weekStart_idx" ON "Report"("projectId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_weekStart_key" ON "Report"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "ReportVersion_reportId_submittedAt_idx" ON "ReportVersion"("reportId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportVersion_reportId_versionNumber_key" ON "ReportVersion"("reportId", "versionNumber");

-- CreateIndex
CREATE INDEX "Task_versionId_idx" ON "Task"("versionId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Blocker_versionId_idx" ON "Blocker"("versionId");

-- CreateIndex
CREATE INDEX "Achievement_versionId_idx" ON "Achievement"("versionId");

-- CreateIndex
CREATE INDEX "HoursEntry_versionId_idx" ON "HoursEntry"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "HoursEntry_versionId_taskType_key" ON "HoursEntry"("versionId", "taskType");

-- CreateIndex
CREATE INDEX "ReviewAction_reportId_createdAt_idx" ON "ReviewAction"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAction_reviewerId_createdAt_idx" ON "ReviewAction"("reviewerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ReportVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocker" ADD CONSTRAINT "Blocker_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoursEntry" ADD CONSTRAINT "HoursEntry_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
