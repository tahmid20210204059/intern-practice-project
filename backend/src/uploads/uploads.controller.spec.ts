import { jest } from '@jest/globals';
import { UploadsController } from './uploads.controller.js';

describe('UploadsController', () => {
  it('should return the raw image URL object so the global transform interceptor wraps it once', async () => {
    const service = {
      uploadImage: jest.fn().mockResolvedValue('https://example.com/image.jpg'),
    } as any;

    const controller = new UploadsController(service);

    const result = await controller.uploadAvatar({
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
    } as any);

    expect(result).toEqual({ url: 'https://example.com/image.jpg' });
    expect(service.uploadImage).toHaveBeenCalledWith(Buffer.from('x'), 'devcommunity/avatars', 'image/png');
  });
});
