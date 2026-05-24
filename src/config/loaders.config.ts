import corsConfig from './cors.config';
import jwtConfig from './jwt.config';
import redisConfig from './redis.config';
import smtpConfig from './smtp.config';

export const appConfigLoaders = [corsConfig, jwtConfig, redisConfig, smtpConfig];
