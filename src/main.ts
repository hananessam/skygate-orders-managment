import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StandardErrorFilter } from './common/filters/standard-error.filter';
import { setupOpenApi } from './config/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOptions = configService.get<CorsOptions>('cors', {
    origin: true,
    credentials: false,
  });

  app.use(helmet());
  app.enableCors(corsOptions);
  app.setGlobalPrefix('api');
  setupOpenApi(app);
  app.useGlobalFilters(new StandardErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
}
bootstrap();
