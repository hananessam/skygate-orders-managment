import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { registerAs } from '@nestjs/config';

const parseCorsOrigins = (origins?: string): CorsOptions['origin'] => {
  if (!origins || origins.trim() === '*') {
    return true;
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const parseBoolean = (value?: string): boolean => value?.toLowerCase() === 'true';

export default registerAs('cors', (): CorsOptions => ({
  origin: parseCorsOrigins(process.env.CORS_ORIGIN),
  credentials: parseBoolean(process.env.CORS_CREDENTIALS),
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
}));
