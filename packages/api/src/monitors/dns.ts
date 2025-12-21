import type { MonitorCheckResult } from '../types';
import type { monitors } from '../db';

type Monitor = typeof monitors.$inferSelect;

export async function checkDns(monitor: Monitor): Promise<MonitorCheckResult> {
  const hostname = monitor.hostname;
  const recordType = monitor.dnsRecordType || 'A';

  if (!hostname) {
    return { status: false, responseTime: 0, message: 'Hostname is required' };
  }

  const startTime = Date.now();

  try {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${recordType}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (monitor.timeout || 30) * 1000);

    const response = await fetch(dohUrl, {
      headers: {
        'Accept': 'application/dns-json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return { status: false, responseTime, message: `DNS query failed: ${response.status}` };
    }

    const data = await response.json() as { Status: number; Answer?: Array<{ data: string }> };

    if (data.Status !== 0) {
      const statusMessages: Record<number, string> = {
        1: 'Format error',
        2: 'Server failure',
        3: 'Non-existent domain (NXDOMAIN)',
        4: 'Not implemented',
        5: 'Query refused',
      };
      return {
        status: false,
        responseTime,
        message: statusMessages[data.Status] || `DNS error: ${data.Status}`,
      };
    }

    if (!data.Answer || data.Answer.length === 0) {
      return {
        status: false,
        responseTime,
        message: `No ${recordType} records found`,
      };
    }

    return {
      status: true,
      responseTime,
      message: `Found ${data.Answer.length} ${recordType} record(s): ${data.Answer.map(a => a.data).join(', ')}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { status: false, responseTime, message: 'DNS query timeout' };
      }
      return { status: false, responseTime, message: error.message };
    }

    return { status: false, responseTime, message: 'DNS query failed' };
  }
}
