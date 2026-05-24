import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { SmtpModule } from './common/smtp/smtp.module';
import { appConfigLoaders } from './config/loaders.config';
import { envValidationSchema } from './config/env.validation';
import redisConfig from './config/redis.config';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: appConfigLoaders,
      validationSchema: envValidationSchema,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<ConfigType<typeof redisConfig>>('redis');

        return {
          connection: {
            host: redis?.host ?? '127.0.0.1',
            port: redis?.port ?? 6379,
          },
        };
      },
    }),
    EventEmitterModule.forRoot(),
    RedisModule,
    SmtpModule,
    PrismaModule,
    UserModule,
    ProductModule,
    OrderModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
