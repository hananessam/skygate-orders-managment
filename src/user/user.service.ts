import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getPublicProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const refreshTokenHash = refreshToken
      ? await bcrypt.hash(refreshToken, BCRYPT_ROUNDS)
      : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });
  }

  async isRefreshTokenValid(userId: number, refreshToken: string): Promise<boolean> {
    const user = await this.findById(userId);

    if (!user?.refreshToken) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.refreshToken);
  }
}
