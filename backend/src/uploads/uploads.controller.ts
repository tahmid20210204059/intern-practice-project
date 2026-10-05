import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UploadsService } from './uploads.service.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const fileBody = { schema: { type: 'object' as const, properties: { file: { type: 'string' as const, format: 'binary' } }, required: ['file'] } };

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('avatar')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'uploads-avatar', limit: 20, windowMs: 60 * 1000, by: 'user', message: 'Too many uploads. Please wait a moment.' })
  @ApiOperation({ summary: 'Upload an avatar image (max 2MB, images only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @ApiOkResponse({ schema: { example: { success: true, data: { url: 'https://res.cloudinary.com/.../avatar123.jpg' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.uploadsService.uploadImage(file.buffer, 'devcommunity/avatars', file.mimetype);
    return { url };
  }

  @Post('post-image')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'uploads-post-image', limit: 20, windowMs: 60 * 1000, by: 'user', message: 'Too many uploads. Please wait a moment.' })
  @ApiOperation({ summary: 'Upload a post image (max 5MB, images only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @ApiOkResponse({ schema: { example: { success: true, data: { url: 'https://res.cloudinary.com/.../post123.jpg' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_POST_IMAGE_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPostImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.uploadsService.uploadImage(file.buffer, 'devcommunity/posts', file.mimetype);
    return { url };
  }
}