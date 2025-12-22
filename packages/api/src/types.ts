export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
};

export type MonitorType = 'http' | 'https' | 'tcp' | 'dns';

export type NotificationType = 'email' | 'webhook';

export type MonitorCheckResult = {
  status: boolean;
  statusCode?: number;
  responseTime: number;
  message?: string;
};

export type JWTPayload = {
  sub: number;
  email: string;
  exp: number;
  iat: number;
};
