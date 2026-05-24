import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import {
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Create a new order' })
  @ApiCreatedResponse({
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'One or more products were not found' })
  @ApiBadRequestResponse({ description: 'Validation failed or insufficient stock' })
  @ApiConflictResponse({
    description: 'Concurrent stock update conflict, please retry',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Unique client-generated UUID used to prevent duplicate order creation on retries',
    schema: { type: 'string', format: 'uuid' },
  })
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user.id, dto);
  }

  @ApiOperation({ summary: 'List orders with pagination and filters' })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    type: PaginatedOrdersResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid filter values' })
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orderService.listOrders(user.id, query);
  }
}
