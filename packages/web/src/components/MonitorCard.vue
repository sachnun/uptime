<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Monitor } from '@/stores/monitors'
import { formatMs } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Globe, Server, Wifi } from 'lucide-vue-next'

const props = defineProps<{
  monitor: Monitor
}>()

const status = computed(() => {
  if (!props.monitor.active) return 'paused'
  if (props.monitor.latestHeartbeat?.status === true) return 'up'
  if (props.monitor.latestHeartbeat?.status === false) return 'down'
  return 'pending'
})

const statusConfig = {
  up: { bg: 'bg-green-500', text: 'Up', variant: 'success' as const },
  down: { bg: 'bg-red-500', text: 'Down', variant: 'destructive' as const },
  paused: { bg: 'bg-yellow-500', text: 'Paused', variant: 'warning' as const },
  pending: { bg: 'bg-gray-400', text: 'Pending', variant: 'secondary' as const },
}

const typeIcons = {
  http: Globe,
  https: Globe,
  tcp: Server,
  dns: Wifi,
}

const monitorTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    http: 'HTTP',
    https: 'HTTPS',
    tcp: 'TCP',
    dns: 'DNS',
  }
  return labels[props.monitor.type] || props.monitor.type.toUpperCase()
})

const uptimeColor = computed(() => {
  const uptime = props.monitor.uptime
  if (uptime >= 99) return 'text-green-600 dark:text-green-400'
  if (uptime >= 95) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
})
</script>

<template>
  <RouterLink :to="`/monitors/${monitor.id}`">
    <Card class="p-4 hover:border-primary/50 transition-colors cursor-pointer">
      <div class="flex items-center gap-4">
        <div :class="cn('h-2.5 w-2.5 rounded-full', statusConfig[status].bg)" />
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-medium truncate">{{ monitor.name }}</h3>
            <Badge variant="secondary" class="text-xs">
              <component :is="typeIcons[monitor.type] || Activity" class="h-3 w-3 mr-1" />
              {{ monitorTypeLabel }}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground truncate">
            {{ monitor.url || monitor.hostname }}
            <span v-if="monitor.port">:{{ monitor.port }}</span>
          </p>
        </div>

        <div class="flex items-center gap-6 text-sm">
          <div class="text-right hidden sm:block">
            <p class="text-muted-foreground text-xs">Response</p>
            <p class="font-medium">{{ formatMs(monitor.avgResponseTime) }}</p>
          </div>
          <div class="text-right hidden sm:block">
            <p class="text-muted-foreground text-xs">Uptime</p>
            <p :class="cn('font-medium', uptimeColor)">
              {{ monitor.uptime.toFixed(2) }}%
            </p>
          </div>
          <Badge :variant="statusConfig[status].variant">
            {{ statusConfig[status].text }}
          </Badge>
        </div>
      </div>
    </Card>
  </RouterLink>
</template>
