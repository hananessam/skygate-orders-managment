import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { OrderController } from './order.controller';
import { OrderEmailProcessor } from './order-email.processor';
import { OrderPlacedListener } from './listeners/order-placed.listener';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [
    UserModule,
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderPlacedListener, OrderEmailProcessor],
})
export class OrderModule {}
