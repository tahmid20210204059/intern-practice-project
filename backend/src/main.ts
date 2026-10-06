import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { isAllowedOrigin } from './common/config/cors.config.js';
import { requestLogger, securityHeaders } from './common/middleware/security.middleware.js';
import { setupSwagger } from './common/swagger/swagger.setup.js';

const BODY_LIMIT = '100kb';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: isProd ? ['log', 'warn', 'error'] : ['log', 'warn', 'error', 'debug'],
  });

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) {
    const value = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isFinite(value) ? value : process.env.TRUST_PROXY);
  }

  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: false, limit: BODY_LIMIT }));
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ success: false, statusCode: 413, message: 'Request payload too large', errors: [] });
      return;
    }
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      res.status(400).json({ success: false, statusCode: 400, message: 'Malformed request body', errors: [] });
      return;
    }
    next(err);
  });
  app.use(cookieParser());

  if (!isProd) {
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Private-Network', 'true');
      next();
    });
  }

  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Retry-After'],
    maxAge: 600,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();