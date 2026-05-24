import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';
import { UserService } from '../user/user.service';
import {
  SEND_ORDER_CONFIRMATION_EMAIL_JOB,
  type SendOrderConfirmationEmailJobData,
} from './jobs/send-order-confirmation-email.job';

@Injectable()
@Processor('orders')
export class OrderEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEmailProcessor.name);
  private readonly transporter: Transporter;
  private readonly smtpFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super();

    this.smtpFrom = this.getSmtpFrom();
    this.transporter = this.createSmtpTransporter();
  }

  /**
   * Retrieves the SMTP "from" address from environment variables.
   * @returns {string} The SMTP "from" address.
   */
  private getSmtpFrom(): string {
    return this.configService.get<string>(
      'SMTP_FROM',
      'SkyGate Orders <no-reply@skygate.local>',
    );
  }

  /**
   * Creates a nodemailer transporter using SMTP configuration from environment variables.
   * @returns {Transporter} The nodemailer transporter instance.
   */
  private createSmtpTransporter(): Transporter {
    const smtpHost = this.configService.get<string>('SMTP_HOST', '127.0.0.1');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 1025);
    const smtpUser = this.configService.get<string>('SMTP_USER', '');
    const smtpPass = this.configService.get<string>('SMTP_PASS', '');

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });
  }

  async process(job: Job<SendOrderConfirmationEmailJobData>): Promise<void> {
    if (job.name === SEND_ORDER_CONFIRMATION_EMAIL_JOB) {
      await this.handleSendOrderConfirmationEmail(job);
      return;
    }

    this.logger.warn(`Unhandled job ${job.name} for order ${job.data.orderId}`);
  }

  private async handleSendOrderConfirmationEmail(
    job: Job<SendOrderConfirmationEmailJobData>,
  ): Promise<void> {
    const user = await this.userService.findById(job.data.userId);

    if (!user?.email) {
      this.logger.warn(
        `Skipping confirmation email for order ${job.data.orderId}: user ${job.data.userId} has no email`,
      );
      return;
    }

    const recipientName = user.name ?? 'Customer';

    await this.transporter.sendMail({
      from: this.smtpFrom,
      to: user.email,
      subject: `Order ${job.data.orderId} confirmation`,
      text: [
        `Hi ${recipientName},`,
        '',
        `Your order (${job.data.orderId}) has been placed successfully.`,
        'Thank you for shopping with SkyGate.',
      ].join('\n'),
    });

    this.logger.log(`Order confirmation email sent for order ${job.data.orderId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SendOrderConfirmationEmailJobData>): void {
    this.logger.log(
      `Completed job ${job.name} for order ${job.data.orderId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SendOrderConfirmationEmailJobData> | undefined, error: Error): void {
    const orderId = job?.data?.orderId ?? 'unknown';
    this.logger.error(
      `Order job failed for order ${orderId}`,
      error.stack,
    );
  }
}
