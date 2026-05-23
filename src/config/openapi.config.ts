import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

const DEFAULT_OPENAPI_TITLE = 'SkyGate Orders Management API';
const DEFAULT_OPENAPI_DESCRIPTION = 'REST API documentation for SkyGate Orders Management';
const DEFAULT_OPENAPI_VERSION = '1.0.0';
const OPENAPI_PATH = 'docs';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const configService = app.get(ConfigService);

  const title = configService.get<string>('OPENAPI_TITLE', DEFAULT_OPENAPI_TITLE);
  const description = configService.get<string>(
    'OPENAPI_DESCRIPTION',
    DEFAULT_OPENAPI_DESCRIPTION,
  );
  const version = configService.get<string>('OPENAPI_VERSION', DEFAULT_OPENAPI_VERSION);

  const swaggerConfig = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

export function setupOpenApi(app: INestApplication): OpenAPIObject {
  const document = buildOpenApiDocument(app);

  SwaggerModule.setup(OPENAPI_PATH, app, document, {
    customSiteTitle: 'SkyGate API Docs',
    jsonDocumentUrl: `${OPENAPI_PATH}-json`,
  });

  return document;
}
