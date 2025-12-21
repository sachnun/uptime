<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface MonitorStatus {
  id: number
  name: string
  status: boolean | null
  uptime: number
  heartbeats: Array<{
    id: number
    status: boolean
    createdAt: string
  }>
}

interface StatusPageData {
  title: string
  description?: string
  theme: 'light' | 'dark' | 'auto'
  monitors: MonitorStatus[]
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const loading = ref(true)
const error = ref('')
const data = ref<StatusPageData | null>(null)

const overallStatus = computed(() => {
  if (!data.value?.monitors.length) return null
  const allUp = data.value.monitors.every(m => m.status === true)
  const someDown = data.value.monitors.some(m => m.status === false)
  if (allUp) return 'operational'
  if (someDown) return 'degraded'
  return 'unknown'
})

const statusConfig: Record<string, { text: string; color: string; bg: string }> = {
  operational: { text: 'All Systems Operational', color: 'text-green-600', bg: 'bg-green-500' },
  degraded: { text: 'Partial System Outage', color: 'text-red-600', bg: 'bg-red-500' },
  unknown: { text: 'Status Unknown', color: 'text-gray-600', bg: 'bg-gray-400' },
}

const effectiveTheme = computed(() => {
  if (!data.value) return 'light'
  if (data.value.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return data.value.theme
})

async function fetchStatus() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/public/status/${slug.value}`)
    if (!response.ok) {
      if (response.status === 404) {
        error.value = 'Status page not found'
      } else {
        error.value = 'Failed to load status page'
      }
      return
    }
    data.value = await response.json()
  } catch (e) {
    error.value = 'Failed to load status page'
  } finally {
    loading.value = false
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

onMounted(fetchStatus)
</script>

<template>
  <div :class="['min-h-screen transition-colors', effectiveTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50']">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
    </div>

    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <svg :class="['mx-auto h-16 w-16', effectiveTheme === 'dark' ? 'text-slate-600' : 'text-slate-400']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 :class="['text-2xl font-bold mt-4', effectiveTheme === 'dark' ? 'text-white' : 'text-slate-900']">{{ error }}</h1>
      </div>
    </div>

    <div v-else-if="data" class="max-w-4xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <h1 :class="['text-3xl font-bold', effectiveTheme === 'dark' ? 'text-white' : 'text-slate-900']">
          {{ data.title }}
        </h1>
        <p v-if="data.description" :class="['mt-2', effectiveTheme === 'dark' ? 'text-slate-400' : 'text-slate-600']">
          {{ data.description }}
        </p>
      </div>

      <div
        v-if="overallStatus"
        :class="[
          'rounded-xl p-6 mb-8 text-center',
          effectiveTheme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
        ]"
      >
        <div class="flex items-center justify-center gap-3">
          <div :class="['h-4 w-4 rounded-full', statusConfig[overallStatus].bg]"></div>
          <span :class="['text-xl font-semibold', statusConfig[overallStatus].color]">
            {{ statusConfig[overallStatus].text }}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="monitor in data.monitors"
          :key="monitor.id"
          :class="[
            'rounded-xl p-5',
            effectiveTheme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
          ]"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'h-3 w-3 rounded-full',
                  monitor.status === true ? 'bg-green-500' : monitor.status === false ? 'bg-red-500' : 'bg-gray-400'
                ]"
              ></div>
              <span :class="['font-medium', effectiveTheme === 'dark' ? 'text-white' : 'text-slate-900']">
                {{ monitor.name }}
              </span>
            </div>
            <div class="flex items-center gap-4">
              <span :class="['text-sm', effectiveTheme === 'dark' ? 'text-slate-400' : 'text-slate-600']">
                {{ monitor.uptime.toFixed(2) }}% uptime
              </span>
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full font-medium',
                  monitor.status === true
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : monitor.status === false
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                ]"
              >
                {{ monitor.status === true ? 'Operational' : monitor.status === false ? 'Down' : 'Unknown' }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-0.5 h-8">
            <div
              v-for="(hb, idx) in monitor.heartbeats.slice(0, 90)"
              :key="hb.id"
              :class="[
                'flex-1 h-full rounded-sm transition-all',
                hb.status ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
              ]"
              :title="`${hb.status ? 'Up' : 'Down'} - ${formatTime(hb.createdAt)}`"
            ></div>
            <div
              v-for="i in Math.max(0, 90 - monitor.heartbeats.length)"
              :key="`empty-${i}`"
              :class="[
                'flex-1 h-full rounded-sm',
                effectiveTheme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              ]"
            ></div>
          </div>
          <div class="flex justify-between mt-2">
            <span :class="['text-xs', effectiveTheme === 'dark' ? 'text-slate-500' : 'text-slate-400']">90 days ago</span>
            <span :class="['text-xs', effectiveTheme === 'dark' ? 'text-slate-500' : 'text-slate-400']">Today</span>
          </div>
        </div>
      </div>

      <div :class="['text-center mt-12 text-sm', effectiveTheme === 'dark' ? 'text-slate-500' : 'text-slate-400']">
        <p>Powered by Uptime</p>
      </div>
    </div>
  </div>
</template>
