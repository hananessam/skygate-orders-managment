import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderPlacedListener } from './listeners/order-placed.listener';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderPlacedListener],
})
export class OrderModule {}
