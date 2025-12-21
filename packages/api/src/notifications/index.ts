import type { notifications } from '../db';

type Notification = typeof notifications.$inferSelect;

type NotificationPayload = {
  monitorName: string;
  status: boolean;
  message: string;
  responseTime?: number;
  url?: string;
};

export async function sendNotification(notification: Notification, payload: NotificationPayload): Promise<void> {
  if (!notification.active) return;
  if (!notification.config) {
    throw new Error('Notification config is missing');
  }

  switch (notification.type) {
    case 'webhook':
      await sendWebhook(notification.config, payload);
      break;
    case 'discord':
      await sendDiscord(notification.config, payload);
      break;
    case 'telegram':
      await sendTelegram(notification.config, payload);
      break;
    case 'slack':
      await sendSlack(notification.config, payload);
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

async function sendDiscord(config: Record<string, string>, payload: NotificationPayload): Promise<void> {
  const webhookUrl = config.webhookUrl;
  if (!webhookUrl) throw new Error('Discord webhook URL is required');

  const color = payload.status ? 0x00ff00 : 0xff0000;
  const statusText = payload.status ? 'UP' : 'DOWN';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `[${statusText}] ${payload.monitorName}`,
        description: payload.message,
        color,
        fields: [
          ...(payload.responseTime ? [{ name: 'Response Time', value: `${payload.responseTime}ms`, inline: true }] : []),
          ...(payload.url ? [{ name: 'URL', value: payload.url, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Uptime Monitor' },
      }],
    }),
  });
}

async function sendTelegram(config: Record<string, string>, payload: NotificationPayload): Promise<void> {
  const botToken = config.botToken;
  const chatId = config.chatId;
  if (!botToken || !chatId) throw new Error('Telegram bot token and chat ID are required');

  const statusEmoji = payload.status ? '✅' : '🔴';
  const statusText = payload.status ? 'UP' : 'DOWN';

  const text = [
    `${statusEmoji} <b>[${statusText}] ${payload.monitorName}</b>`,
    '',
    payload.message,
    ...(payload.responseTime ? [`Response Time: ${payload.responseTime}ms`] : []),
    ...(payload.url ? [`URL: ${payload.url}`] : []),
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

async function sendSlack(config: Record<string, string>, payload: NotificationPayload): Promise<void> {
  const webhookUrl = config.webhookUrl;
  if (!webhookUrl) throw new Error('Slack webhook URL is required');

  const statusEmoji = payload.status ? ':white_check_mark:' : ':red_circle:';
  const statusText = payload.status ? 'UP' : 'DOWN';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} *[${statusText}] ${payload.monitorName}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: payload.message,
          },
        },
        ...(payload.responseTime || payload.url ? [{
          type: 'context',
          elements: [
            ...(payload.responseTime ? [{ type: 'mrkdwn', text: `*Response Time:* ${payload.responseTime}ms` }] : []),
            ...(payload.url ? [{ type: 'mrkdwn', text: `*URL:* ${payload.url}` }] : []),
          ],
        }] : []),
      ],
    }),
  });
}
