import { eq, desc, and, inArray, lte, isNull, gte } from 'drizzle-orm';
import { createDb, monitors, heartbeats, monitorNotifications, notifications, incidents, hourlyStats, users } from '../db';
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
    const maintenanceStart = monitor.maintenanceStart?.getTime();
    const maintenanceEnd = monitor.maintenanceEnd?.getTime();
    if (maintenanceStart && maintenanceEnd && now >= maintenanceStart && now <= maintenanceEnd) {
      return false;
    }

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

      if (statusChanged) {
        if (!result.status) {
          await db.insert(incidents).values({
            monitorId: monitor.id,
            cause: result.message || 'Monitor is down',
          });
        } else {
          const openIncident = await db.query.incidents.findFirst({
            where: and(
              eq(incidents.monitorId, monitor.id),
              isNull(incidents.resolvedAt)
            ),
            orderBy: [desc(incidents.startedAt)],
          });

          if (openIncident && openIncident.startedAt) {
            const duration = Math.floor((now - openIncident.startedAt.getTime()) / 1000);
            await db.update(incidents)
              .set({
                resolvedAt: new Date(),
                duration,
              })
              .where(eq(incidents.id, openIncident.id));
          }
        }
      } else if (!result.status && !previousHeartbeat) {
        await db.insert(incidents).values({
          monitorId: monitor.id,
          cause: result.message || 'Monitor is down',
        });
      }

      if (statusChanged || (!result.status && !previousHeartbeat)) {
        const maintenanceStart = monitor.maintenanceStart?.getTime();
        const maintenanceEnd = monitor.maintenanceEnd?.getTime();
        const inMaintenance = maintenanceStart && maintenanceEnd && now >= maintenanceStart && now <= maintenanceEnd;

        if (!inMaintenance) {
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
                  const user = await db.query.users.findFirst({
                    where: eq(users.id, notif.userId),
                  });
                  await sendNotification(notif, {
                    monitorName: monitor.name,
                    status: result.status,
                    message: result.message || (result.status ? 'Monitor is up' : 'Monitor is down'),
                    responseTime: result.responseTime,
                    url: monitor.url || undefined,
                  }, { env, userEmail: user?.email });
                } catch (error) {
                  console.error(`Failed to send notification ${notif.id}:`, error);
                }
              })
            );
          }
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

  await aggregateHourlyStats(db, monitorIds, now);
}

async function aggregateHourlyStats(db: ReturnType<typeof createDb>, monitorIds: number[], now: number): Promise<void> {
  const currentHour = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
  const previousHour = currentHour - 60 * 60 * 1000;
  const hourStart = new Date(previousHour);
  const hourEnd = new Date(currentHour);

  const hourlyHeartbeats = await db.query.heartbeats.findMany({
    where: and(
      inArray(heartbeats.monitorId, monitorIds),
      gte(heartbeats.createdAt, hourStart),
      lte(heartbeats.createdAt, hourEnd)
    ),
  });

  const statsByMonitor = new Map<number, { responseTimes: number[]; upCount: number; downCount: number }>();
  for (const hb of hourlyHeartbeats) {
    const existing = statsByMonitor.get(hb.monitorId) || { responseTimes: [], upCount: 0, downCount: 0 };
    if (hb.responseTime) {
      existing.responseTimes.push(hb.responseTime);
    }
    if (hb.status) {
      existing.upCount++;
    } else {
      existing.downCount++;
    }
    statsByMonitor.set(hb.monitorId, existing);
  }

  for (const [monitorId, stats] of statsByMonitor) {
    const checkCount = stats.upCount + stats.downCount;
    if (checkCount === 0) continue;

    const avgResponseTime = stats.responseTimes.length > 0
      ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
      : null;
    const minResponseTime = stats.responseTimes.length > 0
      ? Math.min(...stats.responseTimes)
      : null;
    const maxResponseTime = stats.responseTimes.length > 0
      ? Math.max(...stats.responseTimes)
      : null;
    const uptimePercentage = Math.round((stats.upCount / checkCount) * 100);

    await db.insert(hourlyStats).values({
      monitorId,
      hour: previousHour,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      uptimePercentage,
      checkCount,
      upCount: stats.upCount,
      downCount: stats.downCount,
    }).onConflictDoUpdate({
      target: [hourlyStats.monitorId, hourlyStats.hour],
      set: {
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
        uptimePercentage,
        checkCount,
        upCount: stats.upCount,
        downCount: stats.downCount,
      },
    }).catch((error) => {
      console.error(`Failed to aggregate hourly stats for monitor ${monitorId}:`, error);
    });
  }
}
