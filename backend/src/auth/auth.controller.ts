import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  private cookieOptions(expiresAt?: Date) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: REFRESH_COOKIE_PATH,
      ...(expiresAt ? { expires: expiresAt } : {}),
    };
  }

  @Post('signup')
  async signup(@Body() body: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signup(body.name, body.email, body.password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken, refresh_token: result.refreshToken, user: result.user };
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken, refresh_token: result.refreshToken, user: result.user };
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;
    const result = await this.authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions(result.refreshTokenExpiresAt));
    return { access_token: result.accessToken, refresh_token: result.refreshToken };
  }

  @Post('logout')
  async logout(@Body() body: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;
    await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ schema: { example: { success: true, data: { userId: '65f...', email: 'test@test.com', role: 'user' } } } })
  @ApiUnauthorizedResponse({ schema: { example: { success: false, statusCode: 401, message: 'Unauthorized', errors: [] } } })
  me(@Req() req: any) {
    return { userId: req.user.userId, email: req.user.email, role: req.user.role };
  }
}