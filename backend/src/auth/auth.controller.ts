import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'Test User' },
        email: { type: 'string', example: 'test@test.com' },
        password: { type: 'string', example: 'test1234' },
      },
    },
  })
  async signup(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.signup(body.name, body.email, body.password);
  }

  @Post('login')
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'test@test.com' },
        password: { type: 'string', example: 'test1234' },
      },
    },
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}