CREATE TABLE "SocialMediaArtifact" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "registeredBy" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "storageReference" TEXT NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialMediaArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialMediaArtifact_tenantId_idempotencyKey_key"
  ON "SocialMediaArtifact"("tenantId", "idempotencyKey");
CREATE INDEX "SocialMediaArtifact_tenantId_createdAt_idx"
  ON "SocialMediaArtifact"("tenantId", "createdAt");
CREATE INDEX "SocialMediaArtifact_checksumSha256_idx"
  ON "SocialMediaArtifact"("checksumSha256");

ALTER TABLE "SocialMediaArtifact"
  ADD CONSTRAINT "SocialMediaArtifact_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
