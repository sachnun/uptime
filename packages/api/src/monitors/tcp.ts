import { connect } from 'cloudflare:sockets';
import type { MonitorCheckResult } from '../types';
import type { monitors } from '../db';

type Monitor = typeof monitors.$inferSelect;

export async function checkTcp(monitor: Monitor): Promise<MonitorCheckResult> {
  const hostname = monitor.hostname;
  const port = monitor.port;

  if (!hostname || !port) {
    return { status: false, responseTime: 0, message: 'Hostname and port are required' };
  }

  const startTime = Date.now();
  const timeout = (monitor.timeout || 30) * 1000;

  try {
    const socket = connect({ hostname, port });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout);
    });

    await Promise.race([
      socket.opened,
      timeoutPromise,
    ]);

    const responseTime = Date.now() - startTime;

    socket.close();

    return {
      status: true,
      responseTime,
      message: 'Connection successful',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      return { status: false, responseTime, message: error.message };
    }

    return { status: false, responseTime, message: 'Connection failed' };
  }
}
