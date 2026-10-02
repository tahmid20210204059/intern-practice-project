import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { HealthController } from '../src/health/health.controller.js';
import { PostsController } from '../src/posts/posts.controller.js';
import { PostsService } from '../src/posts/posts.service.js';
import { UsersService } from '../src/users/users.service.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

const mk = () => jest.fn<(...args: any[]) => any>();
const SECRET = 'integration-secret';

class FakeUsersService {
  users: any[] = [];
  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }
  async create(data: any) {
    const user = { _id: new Types.ObjectId().toString(), refreshTokenHash: null, refreshTokenExpiresAt: null, ...data };
    this.users.push(user);
    return user;
  }
  async findByRefreshTokenHash(hash: string) {
    return this.users.find((user) => user.refreshTokenHash === hash) ?? null;
  }
  async setRefreshToken(id: string, hash: string, expiresAt: Date) {
    const user = this.users.find((item) => item._id === id);
    if (user) {
      user.refreshTokenHash = hash;
      user.refreshTokenExpiresAt = expiresAt;
    }
  }
  async clearRefreshToken(id: string) {
    const user = this.users.find((item) => item._id === id);
    if (user) {
      user.refreshTokenHash = null;
      user.refreshTokenExpiresAt = null;
    }
  }
}

describe('auth flow with a protected action (integration)', () => {
  let app: INestApplication;
  let users: FakeUsersService;
  let postsMock: { create: ReturnType<typeof mk>; remove: ReturnType<typeof mk> };

  beforeEach(async () => {
    users = new FakeUsersService();
    postsMock = {
      create: mk().mockImplementation(async (userId: string, dto: any) => ({ _id: 'p1', authorId: userId, ...dto })),
      remove: mk().mockResolvedValue({ message: 'Post deleted successfully' }),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: SECRET, REFRESH_TOKEN_EXPIRES_IN_DAYS: '7' })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: SECRET, signOptions: { expiresIn: 900 } }),
      ],
      controllers: [AuthController, PostsController, HealthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: users },
        { provide: PostsService, useValue: postsMock },
        { provide: getConnectionToken(), useValue: { readyState: 1 } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const signup = (email = 'ada@example.com', password = 'Password1') => http().post('/auth/signup').send({ name: 'Ada', email, password });
  const cookieOf = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[]).map((cookie) => cookie.split(';')[0]).join('; ');

  it('signs up, returns tokens and sets an httpOnly refresh cookie', async () => {
    const res = await signup().expect(201);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.access_token).toBe('string');
    expect(res.body.data.user).toMatchObject({ name: 'Ada', email: 'ada@example.com', role: 'user' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
    expect(users.users[0].passwordHash).not.toBe('Password1');
  });

  it('ignores a client-supplied role during signup', async () => {
    const res = await http().post('/auth/signup').send({ name: 'Eve', email: 'eve@example.com', password: 'Password1', role: 'admin' }).expect(201);
    expect(res.body.data.user.role).toBe('user');
    const me = await http().get('/auth/me').set('Authorization', `Bearer ${res.body.data.access_token}`).expect(200);
    expect(me.body.data.role).toBe('user');
  });

  it('rejects a weak password with a validation error', async () => {
    const res = await signup('ada@example.com', 'password').expect(400);
    expect(res.body).toMatchObject({ success: false, statusCode: 400, message: 'Validation failed' });
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.stringContaining('Password must be at least 8 characters')]));
    expect(users.users).toHaveLength(0);
  });

  it('rejects a duplicate email with 409', async () => {
    await signup().expect(201);
    const res = await signup().expect(409);
    expect(res.body.message).toBe('Email already registered');
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await signup().expect(201);

    const ok = await http().post('/auth/login').send({ email: 'ada@example.com', password: 'Password1' }).expect(201);
    expect(ok.body.data.access_token).toBeDefined();

    const bad = await http().post('/auth/login').send({ email: 'ada@example.com', password: 'WrongPass1' }).expect(401);
    expect(bad.body).toMatchObject({ success: false, statusCode: 401, message: 'Invalid credentials' });
  });

  it('protects /auth/me and exposes the identity for a valid token', async () => {
    const res = await signup().expect(201);

    await http().get('/auth/me').expect(401);
    await http().get('/auth/me').set('Authorization', 'Bearer not-a-token').expect(401);
    const me = await http().get('/auth/me').set('Authorization', `Bearer ${res.body.data.access_token}`).expect(200);
    expect(me.body.data).toEqual({ userId: res.body.data.user.id, email: 'ada@example.com', role: 'user' });
  });

  it('blocks creating a post without a token and allows it with one', async () => {
    const auth = await signup().expect(201);

    const denied = await http().post('/posts').send({ title: 'T', body: 'B' }).expect(401);
    expect(denied.body.success).toBe(false);
    expect(postsMock.create).not.toHaveBeenCalled();

    const created = await http().post('/posts').set('Authorization', `Bearer ${auth.body.data.access_token}`).send({ title: 'Hello', body: 'World' }).expect(201);
    expect(postsMock.create).toHaveBeenCalledWith(auth.body.data.user.id, expect.objectContaining({ title: 'Hello', body: 'World' }));
    expect(created.body.data.authorId).toBe(auth.body.data.user.id);
  });

  it('validates the body of a protected action', async () => {
    const auth = await signup().expect(201);
    const res = await http().post('/posts').set('Authorization', `Bearer ${auth.body.data.access_token}`).send({ title: '', body: 'B' }).expect(400);
    expect(res.body.message).toBe('Validation failed');
    expect(postsMock.create).not.toHaveBeenCalled();
  });

  it('forwards the caller identity and role to post deletion', async () => {
    const auth = await signup().expect(201);
    await http().delete('/posts/p1').set('Authorization', `Bearer ${auth.body.data.access_token}`).expect(200);
    expect(postsMock.remove).toHaveBeenCalledWith('p1', auth.body.data.user.id, 'user');
  });

  it('enforces role-based access on an admin-only route', async () => {
    const user = await signup().expect(201);
    users.users.push({
      _id: new Types.ObjectId().toString(), name: 'Root', email: 'root@example.com', role: 'admin',
      passwordHash: await bcrypt.hash('AdminPass1', 4), refreshTokenHash: null, refreshTokenExpiresAt: null,
    });
    const admin = await http().post('/auth/login').send({ email: 'root@example.com', password: 'AdminPass1' }).expect(201);

    await http().get('/health/admin-only').expect(401);
    const forbidden = await http().get('/health/admin-only').set('Authorization', `Bearer ${user.body.data.access_token}`).expect(403);
    expect(forbidden.body).toMatchObject({ success: false, statusCode: 403, message: 'Forbidden resource' });
    const allowed = await http().get('/health/admin-only').set('Authorization', `Bearer ${admin.body.data.access_token}`).expect(200);
    expect(allowed.body.data.message).toBe('You are an admin');
  });

  it('rotates the refresh token and invalidates the old one', async () => {
    const first = await signup().expect(201);
    const oldCookie = cookieOf(first);

    const refreshed = await http().post('/auth/refresh').set('Cookie', oldCookie).expect(201);
    expect(refreshed.body.data.access_token).toBeDefined();
    expect(refreshed.body.data.refresh_token).not.toBe(first.body.data.refresh_token);

    const reused = await http().post('/auth/refresh').set('Cookie', oldCookie).expect(401);
    expect(reused.body.message).toBe('Invalid refresh token');
  });

  it('rejects refresh without a token and after logout', async () => {
    const first = await signup().expect(201);
    await http().post('/auth/refresh').expect(401);

    const cookie = cookieOf(first);
    await http().post('/auth/logout').set('Cookie', cookie).expect(201);
    await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
