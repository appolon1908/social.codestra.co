import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ServiceAuthContext } from '@gitroom/nestjs-libraries/security/service-auth/service-auth.types';
import { SocialMediaArtifactDto } from '@gitroom/nestjs-libraries/dtos/social-control/social-media-artifact.dto';

@Injectable()
export class SocialMediaArtifactService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    auth: ServiceAuthContext,
    idempotencyKey: string | undefined,
    input: SocialMediaArtifactDto
  ) {
    if (
      !idempotencyKey ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 200
    ) {
      throw new BadRequestException('valid_idempotency_key_required');
    }

    const payloadHash = this.payloadHash(input);
    const existing = await this.prisma.socialMediaArtifact.findFirst({
      where: {
        tenantId: auth.tenantId,
        OR: [{ id: input.asset_id }, { idempotencyKey }],
      },
    });
    if (existing) {
      if (
        existing.id !== input.asset_id ||
        existing.idempotencyKey !== idempotencyKey ||
        existing.payloadHash !== payloadHash
      ) {
        throw new ConflictException('idempotency_payload_conflict');
      }
      return this.response(existing, true);
    }

    try {
      const created = await this.prisma.socialMediaArtifact.create({
        data: {
          id: input.asset_id,
          tenantId: auth.tenantId,
          idempotencyKey,
          payloadHash,
          correlationId: auth.correlationId,
          registeredBy: auth.clientId,
          mediaType: input.media_type,
          contentType: input.content_type,
          storageReference: input.storage_reference,
          checksumSha256: input.checksum_sha256.toLowerCase(),
          metadata: (input.metadata || {}) as Prisma.InputJsonObject,
        },
      });
      return this.response(created, false);
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const raced = await this.prisma.socialMediaArtifact.findFirst({
        where: {
          tenantId: auth.tenantId,
          OR: [{ id: input.asset_id }, { idempotencyKey }],
        },
      });
      if (!raced || raced.payloadHash !== payloadHash) {
        throw new ConflictException('idempotency_payload_conflict');
      }
      return this.response(raced, true);
    }
  }

  async get(auth: ServiceAuthContext, assetId: string) {
    const asset = await this.prisma.socialMediaArtifact.findFirst({
      where: { id: assetId, tenantId: auth.tenantId },
    });
    if (!asset) throw new NotFoundException('social_media_artifact_not_found');
    return this.response(asset, false);
  }

  private response(
    asset: {
      id: string;
      tenantId: string;
      mediaType: string;
      contentType: string;
      storageReference: string;
      checksumSha256: string;
      metadata: unknown;
      correlationId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    replayed: boolean
  ) {
    return {
      asset_id: asset.id,
      tenant_id: asset.tenantId,
      media_type: asset.mediaType,
      content_type: asset.contentType,
      storage_reference: asset.storageReference,
      checksum_sha256: asset.checksumSha256,
      metadata: asset.metadata,
      correlation_id: asset.correlationId,
      idempotency_replayed: replayed,
      provider_delivery: 'disabled',
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
    };
  }

  private payloadHash(input: SocialMediaArtifactDto) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(this.canonical(input)))
      .digest('hex');
  }

  private canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.canonical(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.canonical(item)])
      );
    }
    return value;
  }
}
