<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useMonitorsStore, type Heartbeat } from '@/stores/monitors'
import { formatMs, formatDate, getStatusColor } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const monitorsStore = useMonitorsStore()

const loading = ref(true)
const heartbeats = ref<Heartbeat[]>([])
const stats = ref<any>(null)

const monitorId = computed(() => parseInt(route.params.id as string))
const monitor = computed(() => monitorsStore.monitors.find(m => m.id === monitorId.value))

const status = computed(() => {
  if (!monitor.value?.active) return { text: 'Paused', color: 'bg-yellow-500', textColor: 'text-yellow-600' }
  if (monitor.value?.latestHeartbeat?.status === true) return { text: 'Up', color: 'bg-green-500', textColor: 'text-green-600' }
  if (monitor.value?.latestHeartbeat?.status === false) return { text: 'Down', color: 'bg-red-500', textColor: 'text-red-600' }
  return { text: 'Pending', color: 'bg-gray-400', textColor: 'text-gray-600' }
})

async function loadData() {
  loading.value = true
  await monitorsStore.fetchMonitors()
  
  if (monitor.value) {
    heartbeats.value = await monitorsStore.getHeartbeats(monitorId.value, 24)
  }
  loading.value = false
}

async function handlePause() {
  if (monitor.value?.active) {
    await monitorsStore.pauseMonitor(monitorId.value)
  } else {
    await monitorsStore.resumeMonitor(monitorId.value)
  }
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this monitor?')) {
    await monitorsStore.deleteMonitor(monitorId.value)
    router.push('/')
  }
}

onMounted(loadData)
watch(() => route.params.id, loadData)
</script>

<template>
  <div v-if="loading" class="text-center py-12">
    <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
  </div>

  <div v-else-if="!monitor" class="text-center py-12">
    <p class="text-slate-500 dark:text-slate-400">Monitor not found</p>
    <RouterLink to="/" class="text-green-500 hover:underline mt-2 inline-block">Back to Dashboard</RouterLink>
  </div>

  <div v-else>
    <div class="flex items-start justify-between mb-8">
      <div class="flex items-center gap-4">
        <RouterLink to="/" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <svg class="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <div>
          <div class="flex items-center gap-3">
            <div :class="['h-3 w-3 rounded-full', status.color]"></div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ monitor.name }}</h1>
          </div>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            {{ monitor.url || monitor.hostname }}
            <span v-if="monitor.port">:{{ monitor.port }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="handlePause"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
        >
          {{ monitor.active ? 'Pause' : 'Resume' }}
        </button>
        <RouterLink
          :to="`/monitors/${monitor.id}/edit`"
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
        >
          Edit
        </RouterLink>
        <button
          @click="handleDelete"
          class="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">Status</p>
        <p :class="['text-xl font-bold', status.textColor]">{{ status.text }}</p>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">Uptime (24h)</p>
        <p class="text-xl font-bold text-slate-900 dark:text-white">{{ monitor.uptime.toFixed(2) }}%</p>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">Avg Response</p>
        <p class="text-xl font-bold text-slate-900 dark:text-white">{{ formatMs(monitor.avgResponseTime) }}</p>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">Check Interval</p>
        <p class="text-xl font-bold text-slate-900 dark:text-white">{{ monitor.interval }}s</p>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Response Time (Last 24h)</h2>
      <div class="flex items-end gap-0.5 h-24">
        <div
          v-for="(hb, index) in heartbeats.slice().reverse().slice(0, 90)"
          :key="hb.id"
          :class="[
            'flex-1 min-w-[3px] max-w-2 rounded-sm transition-all cursor-pointer',
            hb.status ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
          ]"
          :style="{ height: `${Math.min(100, Math.max(10, (hb.responseTime || 0) / 10))}%` }"
          :title="`${formatMs(hb.responseTime || 0)} - ${formatDate(hb.createdAt)}`"
        ></div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white p-6 border-b border-slate-200 dark:border-slate-700">Recent Events</h2>
      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <div
          v-for="hb in heartbeats.slice(0, 20)"
          :key="hb.id"
          class="flex items-center gap-4 px-6 py-4"
        >
          <div :class="['h-2.5 w-2.5 rounded-full', hb.status ? 'bg-green-500' : 'bg-red-500']"></div>
          <div class="flex-1">
            <p class="text-sm font-medium text-slate-900 dark:text-white">
              {{ hb.status ? 'Up' : 'Down' }}
              <span v-if="hb.statusCode" class="text-slate-500 dark:text-slate-400">({{ hb.statusCode }})</span>
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ hb.message }}</p>
          </div>
          <div class="text-right text-sm">
            <p class="text-slate-900 dark:text-white">{{ formatMs(hb.responseTime || 0) }}</p>
            <p class="text-slate-500 dark:text-slate-400">{{ formatDate(hb.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
