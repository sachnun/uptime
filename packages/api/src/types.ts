export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  ASSETS: Fetcher;
};

export type MonitorType = 'http' | 'https' | 'tcp' | 'dns';

export type NotificationType = 'webhook' | 'discord' | 'telegram' | 'slack';

export type MonitorCheckResult = {
  status: boolean;
  statusCode?: number;
  responseTime: number;
  message?: string;
};

export type JWTPayload = {
  sub: number;
  username: string;
  exp: number;
  iat: number;
};
