import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { SMTP_FROM, SMTP_TRANSPORTER } from '../common/smtp/smtp.constants';
import { UserService } from '../user/user.service';
import {
  SEND_ORDER_CONFIRMATION_EMAIL_JOB,
  type SendOrderConfirmationEmailJobData,
} from './jobs/send-order-confirmation-email.job';

@Injectable()
@Processor('orders')
export class OrderEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEmailProcessor.name);

  constructor(
    private readonly userService: UserService,
    @Inject(SMTP_TRANSPORTER)
    private readonly transporter: Transporter,
    @Inject(SMTP_FROM)
    private readonly smtpFrom: string,
  ) {
    super();
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
