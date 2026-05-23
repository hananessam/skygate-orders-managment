import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const authorizationHeader = request.get('authorization');
    const refreshToken = authorizationHeader?.split(' ')[1];

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const isRefreshTokenValid = await this.userService.isRefreshTokenValid(
      payload.sub,
      refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { id: payload.sub, email: payload.email };
  }
}
