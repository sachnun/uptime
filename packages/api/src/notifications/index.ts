import type { notifications } from '../db';
import type { Env } from '../types';

type Notification = typeof notifications.$inferSelect;

type NotificationPayload = {
  monitorName: string;
  status: boolean;
  message: string;
  responseTime?: number;
  url?: string;
};

type SendOptions = {
  env?: Env;
  userEmail?: string;
};

export async function sendNotification(
  notification: Notification,
  payload: NotificationPayload,
  options?: SendOptions
): Promise<void> {
  if (!notification.active) return;

  switch (notification.type) {
    case 'webhook':
      if (!notification.config) throw new Error('Webhook config is missing');
      await sendWebhook(notification.config, payload);
      break;
    case 'email':
      await sendEmail(payload, options);
      break;
    default:
      throw new Error(`Unknown notification type: ${notification.type}`);
  }
}

async function sendWebhook(config: Record<string, string>, payload: NotificationPayload): Promise<void> {
  const url = config.url;
  if (!url) throw new Error('Webhook URL is required');

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      monitor: payload.monitorName,
      status: payload.status ? 'up' : 'down',
      message: payload.message,
      responseTime: payload.responseTime,
      timestamp: new Date().toISOString(),
    }),
  });
}

async function sendEmail(
  payload: NotificationPayload,
  options?: SendOptions
): Promise<void> {
  const to = options?.userEmail;
  const from = options?.env?.EMAIL_FROM;
  const apiKey = options?.env?.RESEND_API_KEY;

  if (!to) throw new Error('User email is required');
  if (!from) throw new Error('EMAIL_FROM env variable is required');
  if (!apiKey) throw new Error('RESEND_API_KEY env variable is required');

  const statusText = payload.status ? 'UP' : 'DOWN';
  const statusEmoji = payload.status ? '✅' : '🔴';

  const text = [
    `${statusEmoji} Monitor: ${payload.monitorName}`,
    `Status: ${statusText}`,
    `Message: ${payload.message}`,
    ...(payload.responseTime ? [`Response Time: ${payload.responseTime}ms`] : []),
    ...(payload.url ? [`URL: ${payload.url}`] : []),
    '',
    `Time: ${new Date().toISOString()}`,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[${statusText}] ${payload.monitorName}`,
      text,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}
