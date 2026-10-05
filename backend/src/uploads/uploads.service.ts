import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadsService {
  private configured = false;

  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL')?.trim();
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim();

    const hasUrlConfig = Boolean(cloudinaryUrl);
    const hasExplicitCredentials = Boolean(cloudName && apiKey && apiSecret);

    if (hasUrlConfig || hasExplicitCredentials) {
      cloudinary.config({
        secure: true,
        ...(cloudinaryUrl ? { cloudinary_url: cloudinaryUrl } : {}),
        ...(cloudName ? { cloud_name: cloudName } : {}),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(apiSecret ? { api_secret: apiSecret } : {}),
      });
      this.configured = true;
    } else {
      console.warn(
        'Cloudinary not configured: missing CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env',
      );
    }
  }

  async uploadImage(buffer: Buffer, folder: string, mimetype: string): Promise<string> {
    if (!this.configured) {
      throw new InternalServerErrorException(
        'Image upload is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend .env file.',
      );
    }

    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64}`;

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (err) {
      const error = err as UploadApiErrorResponse;
      console.error('Cloudinary upload error:', error?.http_code ?? 'unknown');
      throw new BadRequestException(
        error?.message || `Cloudinary upload failed with status ${error?.http_code || 'unknown'}`,
      );
    }
  }
}