import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import type { Job } from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';
import smtpConfig from '../config/smtp.config';
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
   * Retrieves validated SMTP configuration from the app config namespace.
   */
  private getSmtpConfig(): ConfigType<typeof smtpConfig> {
    const smtp = this.configService.get<ConfigType<typeof smtpConfig>>('smtp');

    return {
      host: smtp?.host ?? '127.0.0.1',
      port: smtp?.port ?? 1025,
      user: smtp?.user ?? '',
      pass: smtp?.pass ?? '',
      from: smtp?.from ?? 'SkyGate Orders <no-reply@skygate.local>',
    };
  }

  /**
   * Retrieves the SMTP "from" address from config.
   * @returns {string} The SMTP "from" address.
   */
  private getSmtpFrom(): string {
    return this.getSmtpConfig().from;
  }

  /**
   * Creates a nodemailer transporter using SMTP configuration.
   * @returns {Transporter} The nodemailer transporter instance.
   */
  private createSmtpTransporter(): Transporter {
    const smtp = this.getSmtpConfig();

    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: false,
      auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
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
