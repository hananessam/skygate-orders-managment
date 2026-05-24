import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { OrderPlacedEvent } from '../events/order-placed.event';
import {
  SEND_ORDER_CONFIRMATION_EMAIL_JOB,
} from '../jobs/send-order-confirmation-email.job';

@Injectable()
export class OrderPlacedListener {
  private readonly logger = new Logger(OrderPlacedListener.name);

  constructor(@InjectQueue('orders') private readonly ordersQueue: Queue) {}

  @OnEvent(OrderPlacedEvent.eventName, { async: true })
  async handle(event: OrderPlacedEvent): Promise<void> {
    try {
      await this.ordersQueue.add(
        SEND_ORDER_CONFIRMATION_EMAIL_JOB,
        {
          orderId: event.orderId,
          userId: event.userId,
        },
        {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue confirmation email job for order ${event.orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
