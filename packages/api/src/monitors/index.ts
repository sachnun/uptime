import type { MonitorCheckResult } from '../types';
import type { monitors } from '../db';
import { checkHttp } from './http';
import { checkTcp } from './tcp';
import { checkDns } from './dns';

type Monitor = typeof monitors.$inferSelect;

export async function runMonitorCheck(monitor: Monitor): Promise<MonitorCheckResult> {
  const retries = monitor.retries || 0;
  let lastResult: MonitorCheckResult = { status: false, responseTime: 0, message: 'No check performed' };

  for (let attempt = 0; attempt <= retries; attempt++) {
    switch (monitor.type) {
      case 'http':
      case 'https':
        lastResult = await checkHttp(monitor);
        break;
      case 'tcp':
        lastResult = await checkTcp(monitor);
        break;
      case 'dns':
        lastResult = await checkDns(monitor);
        break;
      default:
        return { status: false, responseTime: 0, message: `Unknown monitor type: ${monitor.type}` };
    }

    if (lastResult.status) {
      return lastResult;
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return lastResult;
}

export { checkHttp } from './http';
export { checkTcp } from './tcp';
export { checkDns } from './dns';
