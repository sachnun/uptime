<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Monitor } from '@/stores/monitors'
import { formatMs } from '@/lib/utils'

const props = defineProps<{
  monitor: Monitor
}>()

const status = computed(() => {
  if (!props.monitor.active) return 'paused'
  if (props.monitor.latestHeartbeat?.status === true) return 'up'
  if (props.monitor.latestHeartbeat?.status === false) return 'down'
  return 'pending'
})

const statusConfig = computed(() => {
  const configs = {
    up: { bg: 'bg-green-500', text: 'Up', textColor: 'text-green-600 dark:text-green-400' },
    down: { bg: 'bg-red-500', text: 'Down', textColor: 'text-red-600 dark:text-red-400' },
    paused: { bg: 'bg-yellow-500', text: 'Paused', textColor: 'text-yellow-600 dark:text-yellow-400' },
    pending: { bg: 'bg-gray-400', text: 'Pending', textColor: 'text-gray-600 dark:text-gray-400' },
  }
  return configs[status.value]
})

const monitorTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    http: 'HTTP',
    https: 'HTTPS',
    tcp: 'TCP',
    dns: 'DNS',
  }
  return labels[props.monitor.type] || props.monitor.type.toUpperCase()
})
</script>

<template>
  <RouterLink
    :to="`/monitors/${monitor.id}`"
    class="block bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 transition"
  >
    <div class="flex items-center gap-4">
      <div :class="['h-3 w-3 rounded-full', statusConfig.bg]"></div>
      
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-medium text-slate-900 dark:text-white truncate">{{ monitor.name }}</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {{ monitorTypeLabel }}
          </span>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
          {{ monitor.url || monitor.hostname }}
          <span v-if="monitor.port">:{{ monitor.port }}</span>
        </p>
      </div>

      <div class="flex items-center gap-6 text-sm">
        <div class="text-right">
          <p class="text-slate-500 dark:text-slate-400">Response</p>
          <p class="font-medium text-slate-900 dark:text-white">{{ formatMs(monitor.avgResponseTime) }}</p>
        </div>
        <div class="text-right">
          <p class="text-slate-500 dark:text-slate-400">Uptime</p>
          <p :class="['font-medium', monitor.uptime >= 99 ? 'text-green-600 dark:text-green-400' : monitor.uptime >= 95 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400']">
            {{ monitor.uptime.toFixed(2) }}%
          </p>
        </div>
        <div :class="['font-medium text-sm', statusConfig.textColor]">
          {{ statusConfig.text }}
        </div>
      </div>
    </div>
  </RouterLink>
</template>
