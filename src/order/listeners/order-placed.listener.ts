import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { OrderPlacedEvent } from '../events/order-placed.event';

@Injectable()
export class OrderPlacedListener {
  private readonly logger = new Logger(OrderPlacedListener.name);

  constructor(@InjectQueue('orders') private readonly ordersQueue: Queue) {}

  @OnEvent(OrderPlacedEvent.eventName, { async: true })
  async handle(event: OrderPlacedEvent): Promise<void> {
    try {
      await this.ordersQueue.add(
        'send-order-confirmation-email',
        {
          orderId: event.orderId,
          userId: event.userId,
        }
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue send-order-confirmation-email job for order ${event.orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
