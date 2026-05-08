-- CreateTable
CREATE TABLE "ServiceType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "serviceTypeId" INTEGER NOT NULL,

    CONSTRAINT "SubService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "initial" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "initial" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" SERIAL NOT NULL,
    "proposalName" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "serviceTypeId" INTEGER,
    "subServiceId" INTEGER,
    "phase" TEXT,
    "status" TEXT NOT NULL,
    "probability" TEXT,
    "harga" BIGINT,
    "revenueCf" BIGINT,
    "rrPercentage" DOUBLE PRECISION,
    "expectedDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "notes" TEXT,
    "micInitial" TEXT,
    "tm1Initial" TEXT,
    "tm2Initial" TEXT,
    "tm3Initial" TEXT,
    "tm4Initial" TEXT,
    "tm5Initial" TEXT,
    "tm6Initial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER,
    "proposalName" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectOwner" TEXT,
    "micInitial" TEXT,
    "tm1Initial" TEXT,
    "tm2Initial" TEXT,
    "tm3Initial" TEXT,
    "tm4Initial" TEXT,
    "tm5Initial" TEXT,
    "tm6Initial" TEXT,
    "startedDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "spk" TEXT,
    "pks" TEXT,
    "confirmedFee" BIGINT,
    "alokasiHours" DOUBLE PRECISION,
    "currentHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "terminNumber" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION,
    "fee" BIGINT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_initial_key" ON "Client"("initial");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_initial_key" ON "TeamMember"("initial");

-- CreateIndex
CREATE UNIQUE INDEX "Project_opportunityId_key" ON "Project"("opportunityId");

-- AddForeignKey
ALTER TABLE "SubService" ADD CONSTRAINT "SubService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "SubService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
