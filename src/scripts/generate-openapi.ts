import { NestFactory } from '@nestjs/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from '../config/openapi.config';

async function generateOpenApiSpec(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const document = buildOpenApiDocument(app);
    const outputPath = resolve(process.cwd(), 'openapi.json');

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

    console.log(`OpenAPI spec generated at ${outputPath}`);
  } finally {
    await app.close();
  }
}

generateOpenApiSpec().catch((error) => {
  console.error('Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
