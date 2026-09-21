import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadsService } from './uploads.service.js';

describe('UploadsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should configure Cloudinary with explicit api_key and api_secret when env vars are available', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          CLOUDINARY_URL: 'cloudinary://123456:secret@demo',
          CLOUDINARY_CLOUD_NAME: 'demo',
          CLOUDINARY_API_KEY: '123456',
          CLOUDINARY_API_SECRET: 'secret',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const configSpy = jest.spyOn(cloudinary, 'config').mockImplementation(() => cloudinary);

    new UploadsService(configService);

    expect(configSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud_name: 'demo',
        api_key: '123456',
        api_secret: 'secret',
        secure: true,
      }),
    );
  });
});
