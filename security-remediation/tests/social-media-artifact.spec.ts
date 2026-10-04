import { SocialMediaArtifactService } from '@gitroom/nestjs-libraries/database/prisma/social-control/social-media-artifact.service';

describe('Codestra social media artifact registry', () => {
  const auth = {
    tenantId: 'tenant-a',
    clientId: 'middleware-service',
    correlationId: '11111111-1111-4111-8111-111111111111',
  } as any;
  const input = {
    asset_id: '22222222-2222-4222-8222-222222222222',
    media_type: 'video',
    content_type: 'video/mp4',
    storage_reference: 'codestra-video://exports/demo.mp4',
    checksum_sha256: 'a'.repeat(64),
    metadata: { source: 'codestra-video-controller' },
  };

  it('registers without provider delivery', async () => {
    const prisma: any = {
      socialMediaArtifact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => ({
          ...data,
          createdAt: new Date('2026-10-03T00:00:00Z'),
          updatedAt: new Date('2026-10-03T00:00:00Z'),
        })),
      },
    };
    const service = new SocialMediaArtifactService(prisma);
    const result = await service.register(
      auth,
      'video-social-media-0001',
      input
    );
    expect(result.provider_delivery).toBe('disabled');
    expect(result.idempotency_replayed).toBe(false);
    expect(prisma.socialMediaArtifact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: input.asset_id,
        tenantId: auth.tenantId,
        checksumSha256: input.checksum_sha256,
      }),
    });
  });

  it('replays identical registration and rejects changed payloads', async () => {
    const seed: any = {
      id: input.asset_id,
      tenantId: auth.tenantId,
      idempotencyKey: 'video-social-media-0001',
      payloadHash: '',
      correlationId: auth.correlationId,
      registeredBy: auth.clientId,
      mediaType: input.media_type,
      contentType: input.content_type,
      storageReference: input.storage_reference,
      checksumSha256: input.checksum_sha256,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const hashProbe: any = {
      socialMediaArtifact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => ({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    };
    const probe = new SocialMediaArtifactService(hashProbe);
    await probe.register(auth, seed.idempotencyKey, input);
    seed.payloadHash = hashProbe.socialMediaArtifact.create.mock.calls[0][0].data.payloadHash;

    const prisma: any = {
      socialMediaArtifact: { findFirst: jest.fn().mockResolvedValue(seed) },
    };
    const service = new SocialMediaArtifactService(prisma);
    const replay = await service.register(auth, seed.idempotencyKey, input);
    expect(replay.idempotency_replayed).toBe(true);

    await expect(
      service.register(auth, seed.idempotencyKey, {
        ...input,
        storage_reference: 'codestra-video://exports/changed.mp4',
      })
    ).rejects.toThrow('idempotency_payload_conflict');
  });

  it('reads only inside the authenticated tenant', async () => {
    const prisma: any = {
      socialMediaArtifact: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new SocialMediaArtifactService(prisma);
    await expect(service.get(auth, input.asset_id)).rejects.toThrow(
      'social_media_artifact_not_found'
    );
    expect(prisma.socialMediaArtifact.findFirst).toHaveBeenCalledWith({
      where: { id: input.asset_id, tenantId: auth.tenantId },
    });
  });
});
