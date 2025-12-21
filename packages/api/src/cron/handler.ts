import { eq, desc, and, inArray } from 'drizzle-orm';
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

  const checksToRun = await Promise.all(
    activeMonitors.map(async (monitor) => {
      const lastHeartbeat = await db.query.heartbeats.findFirst({
        where: eq(heartbeats.monitorId, monitor.id),
        orderBy: [desc(heartbeats.createdAt)],
      });

      const intervalMs = (monitor.interval || 60) * 1000;
      const lastCheckTime = lastHeartbeat?.createdAt?.getTime() || 0;

      if (now - lastCheckTime >= intervalMs) {
        return monitor;
      }
      return null;
    })
  );

  const monitorsToCheck = checksToRun.filter((m): m is NonNullable<typeof m> => m !== null);

  await Promise.all(
    monitorsToCheck.map(async (monitor) => {
      const result = await runMonitorCheck(monitor);

      const previousHeartbeat = await db.query.heartbeats.findFirst({
        where: eq(heartbeats.monitorId, monitor.id),
        orderBy: [desc(heartbeats.createdAt)],
      });

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
    and(
      eq(heartbeats.createdAt, thirtyDaysAgo)
    )
  ).catch(() => {});
}
