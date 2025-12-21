import { eq, desc, and, inArray, lte } from 'drizzle-orm';
import { createDb, monitors, heartbeats, monitorNotifications, notifications } from '../db';
import { runMonitorCheck } from '../monitors';
import { sendNotification } from '../notifications';
import type { Env } from '../types';

export async function handleScheduled(env: Env): Promise<void> {
  const db = createDb(env.DB);

  const activeMonitors = await db.query.monitors.findMany({
    where: eq(monitors.active, true),
  });

  if (activeMonitors.length === 0) {
    return;
  }

  const now = Date.now();
  const monitorIds = activeMonitors.map(m => m.id);

  const allLastHeartbeats = await db.query.heartbeats.findMany({
    where: inArray(heartbeats.monitorId, monitorIds),
    orderBy: [desc(heartbeats.createdAt)],
  });

  const lastHeartbeatByMonitor = new Map<number, typeof allLastHeartbeats[0]>();
  for (const hb of allLastHeartbeats) {
    if (!lastHeartbeatByMonitor.has(hb.monitorId)) {
      lastHeartbeatByMonitor.set(hb.monitorId, hb);
    }
  }

  const monitorsToCheck = activeMonitors.filter((monitor) => {
    const lastHeartbeat = lastHeartbeatByMonitor.get(monitor.id);
    const intervalMs = (monitor.interval || 60) * 1000;
    const lastCheckTime = lastHeartbeat?.createdAt?.getTime() || 0;
    return now - lastCheckTime >= intervalMs;
  });

  await Promise.all(
    monitorsToCheck.map(async (monitor) => {
      const result = await runMonitorCheck(monitor);
      const previousHeartbeat = lastHeartbeatByMonitor.get(monitor.id);

      await db.insert(heartbeats).values({
        monitorId: monitor.id,
        status: result.status,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        message: result.message,
      });

      const statusChanged = previousHeartbeat && previousHeartbeat.status !== result.status;

      if (statusChanged || (!result.status && !previousHeartbeat)) {
        const monitorNotifs = await db.query.monitorNotifications.findMany({
          where: eq(monitorNotifications.monitorId, monitor.id),
        });

        if (monitorNotifs.length > 0) {
          const notifIds = monitorNotifs.map(mn => mn.notificationId);
          const notifList = await db.query.notifications.findMany({
            where: and(
              inArray(notifications.id, notifIds),
              eq(notifications.active, true)
            ),
          });

          await Promise.all(
            notifList.map(async (notif) => {
              try {
                await sendNotification(notif, {
                  monitorName: monitor.name,
                  status: result.status,
                  message: result.message || (result.status ? 'Monitor is up' : 'Monitor is down'),
                  responseTime: result.responseTime,
                  url: monitor.url || undefined,
                });
              } catch (error) {
                console.error(`Failed to send notification ${notif.id}:`, error);
              }
            })
          );
        }
      }
    })
  );

  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  await db.delete(heartbeats).where(
    lte(heartbeats.createdAt, thirtyDaysAgo)
  ).catch((error) => {
    console.error('Failed to cleanup old heartbeats:', error);
  });
}
