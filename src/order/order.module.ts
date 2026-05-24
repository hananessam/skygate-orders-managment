import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
})
export class OrderModule {}
