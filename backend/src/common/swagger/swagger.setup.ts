import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const ERROR_REF = { $ref: '#/components/schemas/ErrorResponse' };

const ERROR_DESCRIPTIONS: Record<string, string> = {
  '400': 'Validation failed or malformed request. `errors` lists the field messages.',
  '401': 'Missing, invalid or expired credentials.',
  '403': 'Authenticated but not allowed to perform this action.',
  '404': 'Resource not found.',
  '413': 'Request payload too large.',
  '429': 'Rate limit exceeded. The Retry-After header gives the seconds to wait.',
  '500': 'Internal server error. No internal details are returned.',
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export function setupSwagger(app: INestApplication) {
  const enabled = process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (!enabled) return;

  const config = new DocumentBuilder()
    .setTitle('Dev Community API')
    .setDescription(
      'Every successful response is wrapped as `{ success: true, data }`. Every error is `{ success: false, statusCode, message, errors }`. ' +
        'Authenticate with `Authorization: Bearer <access_token>`. Access tokens are short lived; renew them with POST /auth/refresh, which uses the httpOnly `refresh_token` cookie and rotates it on every call.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token', undefined, 'refresh_token')
    .build();

  const document: any = SwaggerModule.createDocument(app, config);
  document.components = document.components ?? {};
  document.components.schemas = {
    ...(document.components.schemas ?? {}),
    ErrorResponse: {
      type: 'object',
      required: ['success', 'statusCode', 'message', 'errors'],
      properties: {
        success: { type: 'boolean', example: false },
        statusCode: { type: 'integer', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        errors: { type: 'array', items: { type: 'string' }, example: ['Title is required'] },
      },
    },
  };

  for (const [path, item] of Object.entries<any>(document.paths ?? {})) {
    for (const method of METHODS) {
      const operation = item[method];
      if (!operation) continue;
      operation.responses = operation.responses ?? {};
      const secured = Array.isArray(operation.security) && operation.security.length > 0;
      const hasInput =
        !!operation.requestBody || (Array.isArray(operation.parameters) && operation.parameters.length > 0);
      const hasBody = !!operation.requestBody;
      const hasPathParam = path.includes('{');

      for (const [code, description] of Object.entries(ERROR_DESCRIPTIONS)) {
        if (operation.responses[code]) continue;
        if ((code === '401' || code === '403') && !secured) continue;
        if (code === '400' && !hasInput) continue;
        if (code === '413' && !hasBody) continue;
        if (code === '404' && !hasPathParam) continue;
        operation.responses[code] = {
          description,
          content: { 'application/json': { schema: ERROR_REF } },
        };
      }
    }
  }

  SwaggerModule.setup('api-docs', app, document);
}