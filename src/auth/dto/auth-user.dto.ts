import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Admin', nullable: true, type: String })
  name?: string | null;

  @ApiProperty({ example: '2026-05-23T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-23T12:00:00.000Z' })
  updatedAt: Date;
}
