import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
}
