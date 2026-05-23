import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account' })
  @ApiOkResponse({
    description: 'User registered successfully with access and refresh tokens',
    type: AuthResponseDto,
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login using email and password' })
  @ApiOkResponse({
    description: 'User authenticated successfully with access and refresh tokens',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Tokens refreshed successfully', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid refresh token' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  refresh(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.refresh(user);
  }

  @ApiOperation({ summary: 'Logout current user session' })
  @ApiBearerAuth('access-token')
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(user.id);
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Current user profile', type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
