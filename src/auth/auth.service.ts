import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return { id: user.id, email: user.email };
  }

  async register(dto: RegisterDto) {
    const user = await this.userService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  async login(user: AuthenticatedUser) {
    return this.issueTokensForUser(user.id);
  }

  async refresh(user: AuthenticatedUser) {
    return this.issueTokensForUser(user.id);
  }

  async logout(userId: number): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  async me(userId: number) {
    return this.userService.getPublicProfile(userId);
  }

  private async issueTokensForUser(userId: number) {
    const profile = await this.userService.getPublicProfile(userId);

    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(profile.id, profile.email);
    await this.userService.updateRefreshToken(profile.id, tokens.refreshToken);

    return {
      user: profile,
      ...tokens,
    };
  }

  private async generateTokens(userId: number, email: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email };
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m') as StringValue;
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d') as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
