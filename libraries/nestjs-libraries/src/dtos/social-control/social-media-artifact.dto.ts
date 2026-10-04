import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SocialMediaArtifactDto {
  @IsUUID()
  asset_id: string;

  @IsIn(['video', 'image', 'audio', 'document', 'other'])
  media_type: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  content_type: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  storage_reference: string;

  @Matches(/^[0-9a-fA-F]{64}$/)
  checksum_sha256: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
