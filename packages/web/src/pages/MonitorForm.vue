<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useMonitorsStore, type Monitor } from '@/stores/monitors'

const route = useRoute()
const router = useRouter()
const monitorsStore = useMonitorsStore()

const isEdit = computed(() => !!route.params.id)
const monitorId = computed(() => parseInt(route.params.id as string))

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  name: '',
  type: 'http' as Monitor['type'],
  url: '',
  hostname: '',
  port: 80,
  method: 'GET',
  expectedStatus: 200,
  dnsRecordType: 'A',
  interval: 60,
  timeout: 30,
  retries: 3,
})

const monitorTypes = [
  { value: 'http', label: 'HTTP(S)' },
  { value: 'https', label: 'HTTPS' },
  { value: 'tcp', label: 'TCP Port' },
  { value: 'dns', label: 'DNS' },
]

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const dnsRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV']

const showUrl = computed(() => form.value.type === 'http' || form.value.type === 'https')
const showHostname = computed(() => form.value.type === 'tcp' || form.value.type === 'dns')
const showPort = computed(() => form.value.type === 'tcp')
const showHttpOptions = computed(() => form.value.type === 'http' || form.value.type === 'https')
const showDnsOptions = computed(() => form.value.type === 'dns')

async function loadMonitor() {
  if (!isEdit.value) return
  
  loading.value = true
  await monitorsStore.fetchMonitors()
  const monitor = monitorsStore.monitors.find(m => m.id === monitorId.value)
  
  if (monitor) {
    form.value = {
      name: monitor.name,
      type: monitor.type,
      url: monitor.url || '',
      hostname: monitor.hostname || '',
      port: monitor.port || 80,
      method: monitor.method || 'GET',
      expectedStatus: monitor.expectedStatus || 200,
      dnsRecordType: monitor.dnsRecordType || 'A',
      interval: monitor.interval,
      timeout: monitor.timeout,
      retries: monitor.retries,
    }
  }
  loading.value = false
}

async function handleSubmit() {
  if (!form.value.name) {
    error.value = 'Name is required'
    return
  }

  if (showUrl.value && !form.value.url) {
    error.value = 'URL is required'
    return
  }

  if (showHostname.value && !form.value.hostname) {
    error.value = 'Hostname is required'
    return
  }

  saving.value = true
  error.value = ''

  const data: Partial<Monitor> = {
    name: form.value.name,
    type: form.value.type,
    interval: form.value.interval,
    timeout: form.value.timeout,
    retries: form.value.retries,
  }

  if (showUrl.value) {
    data.url = form.value.url
    data.method = form.value.method
    data.expectedStatus = form.value.expectedStatus
  }

  if (showHostname.value) {
    data.hostname = form.value.hostname
  }

  if (showPort.value) {
    data.port = form.value.port
  }

  if (showDnsOptions.value) {
    data.dnsRecordType = form.value.dnsRecordType
  }

  try {
    if (isEdit.value) {
      await monitorsStore.updateMonitor(monitorId.value, data)
      router.push(`/monitors/${monitorId.value}`)
    } else {
      const monitor = await monitorsStore.createMonitor(data)
      router.push(`/monitors/${(monitor as Monitor).id}`)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save monitor'
  } finally {
    saving.value = false
  }
}

onMounted(loadMonitor)
watch(() => route.params.id, loadMonitor)
</script>

<template>
  <div>
    <div class="flex items-center gap-4 mb-8">
      <RouterLink to="/" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <svg class="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          {{ isEdit ? 'Edit Monitor' : 'Create Monitor' }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          {{ isEdit ? 'Update monitor configuration' : 'Set up a new monitor to track your service' }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="max-w-2xl">
      <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        {{ error }}
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            placeholder="My Website"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Monitor Type</label>
          <select
            v-model="form.type"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
          >
            <option v-for="t in monitorTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div v-if="showUrl">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">URL</label>
          <input
            v-model="form.url"
            type="url"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            placeholder="https://example.com"
          />
        </div>

        <div v-if="showHostname">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Hostname</label>
          <input
            v-model="form.hostname"
            type="text"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            placeholder="example.com"
          />
        </div>

        <div v-if="showPort">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Port</label>
          <input
            v-model.number="form.port"
            type="number"
            min="1"
            max="65535"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
          />
        </div>

        <div v-if="showHttpOptions" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Method</label>
            <select
              v-model="form.method"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            >
              <option v-for="m in httpMethods" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Expected Status</label>
            <input
              v-model.number="form.expectedStatus"
              type="number"
              min="100"
              max="599"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            />
          </div>
        </div>

        <div v-if="showDnsOptions">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">DNS Record Type</label>
          <select
            v-model="form.dnsRecordType"
            class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
          >
            <option v-for="r in dnsRecordTypes" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Check Settings</h3>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-slate-600 dark:text-slate-400 mb-2">Interval (seconds)</label>
              <input
                v-model.number="form.interval"
                type="number"
                min="60"
                class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm text-slate-600 dark:text-slate-400 mb-2">Timeout (seconds)</label>
              <input
                v-model.number="form.timeout"
                type="number"
                min="1"
                class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm text-slate-600 dark:text-slate-400 mb-2">Retries</label>
              <input
                v-model.number="form.retries"
                type="number"
                min="0"
                max="10"
                class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 mt-6">
        <RouterLink
          to="/"
          class="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Cancel
        </RouterLink>
        <button
          type="submit"
          :disabled="saving"
          class="px-6 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Saving...' : (isEdit ? 'Update Monitor' : 'Create Monitor') }}
        </button>
      </div>
    </form>
  </div>
</template>
