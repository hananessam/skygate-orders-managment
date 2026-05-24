import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import smtpConfig from '../../config/smtp.config';
import { SMTP_FROM, SMTP_TRANSPORTER } from './smtp.constants';

const DEFAULT_SMTP_FROM = 'SkyGate Orders <no-reply@skygate.local>';

@Global()
@Module({
  providers: [
    {
      provide: SMTP_TRANSPORTER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Transporter => {
        const smtp = configService.get<ConfigType<typeof smtpConfig>>('smtp');

        return nodemailer.createTransport({
          host: smtp?.host ?? '127.0.0.1',
          port: smtp?.port ?? 1025,
          secure: false,
          auth:
            smtp?.user && smtp?.pass
              ? {
                  user: smtp.user,
                  pass: smtp.pass,
                }
              : undefined,
        });
      },
    },
    {
      provide: SMTP_FROM,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): string => {
        const smtp = configService.get<ConfigType<typeof smtpConfig>>('smtp');
        return smtp?.from ?? DEFAULT_SMTP_FROM;
      },
    },
  ],
  exports: [SMTP_TRANSPORTER, SMTP_FROM],
})
export class SmtpModule {}
