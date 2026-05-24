import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductService } from './product.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Get all available products' })
  @ApiOkResponse({
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @ApiOperation({ summary: 'Get a product by id' })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productService.findOne(id);
  }

  @ApiOperation({ summary: 'Update product' })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'At least one updatable field is required or values are invalid',
  })
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Product soft deleted successfully',
  })
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.productService.softDelete(id);
  }
}
