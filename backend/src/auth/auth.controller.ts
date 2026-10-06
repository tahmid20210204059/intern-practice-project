import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { isAllowedOrigin } from '../common/config/cors.config.js';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth';
const MINUTE = 60 * 1000;

const sessionExample = {
  success: true,
  data: {
    access_token: 'eyJhbGciOi...',
    user: { id: '65f1c2...', name: 'Jane Doe', email: 'jane@example.com', role: 'user' },
  },
};

const rateLimitExample = {
  success: false,
  statusCode: 429,
  message: 'Too many login attempts. Please try again later.',
  errors: [],
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  private cookieOptions(expiresAt?: Date) {
    const isProd = process.env.NODE_ENV === 'production';
    const secureOverride = process.env.COOKIE_SECURE?.trim().toLowerCase();
    const secure = secureOverride === 'true' ? true : secureOverride === 'false' ? false : isProd;
    const sameSiteOverride = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
    const sameSite = (['lax', 'strict', 'none'].includes(sameSiteOverride ?? '') ? sameSiteOverride : isProd ? 'none' : 'lax') as 'none' | 'lax' | 'strict';
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: REFRESH_COOKIE_PATH,
      ...(expiresAt ? { expires: expiresAt } : {}),
    };
  }

  private assertTrustedOrigin(req: Request) {
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      throw new ForbiddenException('Origin not allowed');
    }
  }

  @Post('signup')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth-signup', limit: 10, windowMs: 60 * MINUTE, message: 'Too many signup attempts. Please try again later.' })
  @ApiOperation({ summary: 'Create an account', description: 'Sets the httpOnly refresh_token cookie and returns a short-lived access token. Role is always forced to "user".' })
  @ApiBody({ type: SignupDto })
  @ApiCreatedResponse({ description: 'Account created', schema: { example: sessionExample } })
  @ApiConflictResponse({ description: 'Email already registered', schema: { example: { success: false, statusCode: 409, message: 'Email already registered', errors: [] } } })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (10 per hour per IP)', schema: { example: rateLimitExample } })
  async signup(@Body() body: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signup(body.name, body.email, body.password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken, user: result.user };
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth-login', limit: 10, windowMs: 15 * MINUTE, message: 'Too many login attempts. Please try again later.' })
  @ApiOperation({ summary: 'Log in', description: 'Sets the httpOnly refresh_token cookie and returns a short-lived access token.' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ description: 'Logged in', schema: { example: sessionExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials (same message for unknown email and wrong password)', schema: { example: { success: false, statusCode: 401, message: 'Invalid credentials', errors: [] } } })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (10 per 15 minutes per IP)', schema: { example: rateLimitExample } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth-refresh', limit: 60, windowMs: 15 * MINUTE, message: 'Too many session refresh attempts. Please try again later.' })
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Renew the access token', description: 'Reads the httpOnly refresh_token cookie, rotates it and returns a new access token. The old refresh token becomes invalid immediately. No request body.' })
  @ApiCreatedResponse({ description: 'New access token', schema: { example: { success: true, data: { access_token: 'eyJhbGciOi...' } } } })
  @ApiUnauthorizedResponse({ description: 'Refresh token missing, unknown, reused or expired', schema: { example: { success: false, statusCode: 401, message: 'Invalid refresh token', errors: [] } } })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (60 per 15 minutes per IP)', schema: { example: rateLimitExample } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await this.authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken };
  }

  @Post('logout')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'auth-logout', limit: 30, windowMs: 15 * MINUTE })
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Log out', description: 'Revokes the stored refresh token and clears the cookie. Always succeeds, even without a cookie.' })
  @ApiCreatedResponse({ description: 'Logged out', schema: { example: { success: true, data: { message: 'Logged out successfully' } } } })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded', schema: { example: rateLimitExample } })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertTrustedOrigin(req);
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Current identity from the access token' })
  @ApiOkResponse({ schema: { example: { success: true, data: { userId: '65f...', email: 'test@test.com', role: 'user' } } } })
  @ApiUnauthorizedResponse({ schema: { example: { success: false, statusCode: 401, message: 'Unauthorized', errors: [] } } })
  me(@Req() req: any) {
    return { userId: req.user.userId, email: req.user.email, role: req.user.role };
  }
}