import type { MonitorCheckResult } from '../types';
import type { monitors } from '../db';

type Monitor = typeof monitors.$inferSelect;

export async function checkHttp(monitor: Monitor): Promise<MonitorCheckResult> {
  const url = monitor.url;
  if (!url) {
    return { status: false, responseTime: 0, message: 'URL is required' };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), (monitor.timeout || 30) * 1000);

  try {
    const response = await fetch(url, {
      method: monitor.method || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Uptime-Monitor/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const expectedStatus = monitor.expectedStatus || 200;
    const statusOk = response.status === expectedStatus;

    return {
      status: statusOk,
      statusCode: response.status,
      responseTime,
      message: statusOk ? 'OK' : `Expected ${expectedStatus}, got ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { status: false, responseTime, message: 'Request timeout' };
      }
      return { status: false, responseTime, message: error.message };
    }

    return { status: false, responseTime, message: 'Unknown error' };
  }
}
