<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useMonitorsStore, type Monitor, type TestMonitorResult } from '@/stores/monitors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { ArrowLeft, Loader2, PlayCircle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const monitorsStore = useMonitorsStore()

const isEdit = computed(() => !!route.params.id)
const monitorId = computed(() => parseInt(route.params.id as string))

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const error = ref('')
const testResult = ref<TestMonitorResult | null>(null)

const form = ref({
  name: '',
  type: 'http' as Monitor['type'],
  url: '',
  hostname: '',
  port: 80,
  method: 'GET',
  expectedStatus: 200,
  expectedBody: '',
  headers: [] as { key: string; value: string }[],
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

function addHeader() {
  form.value.headers.push({ key: '', value: '' })
}

function removeHeader(index: number) {
  form.value.headers.splice(index, 1)
}

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
      expectedBody: monitor.expectedBody || '',
      headers: monitor.headers ? Object.entries(monitor.headers).map(([key, value]) => ({ key, value })) : [],
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
    if (form.value.expectedBody) {
      data.expectedBody = form.value.expectedBody
    }
    if (form.value.headers.length > 0) {
      const headersObj: Record<string, string> = {}
      for (const h of form.value.headers) {
        if (h.key.trim()) {
          headersObj[h.key.trim()] = h.value
        }
      }
      if (Object.keys(headersObj).length > 0) {
        data.headers = headersObj
      }
    }
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

async function handleTest() {
  if (showUrl.value && !form.value.url) {
    error.value = 'URL is required to test'
    return
  }
  if (showHostname.value && !form.value.hostname) {
    error.value = 'Hostname is required to test'
    return
  }

  testing.value = true
  error.value = ''
  testResult.value = null

  const data: Partial<Monitor> = {
    type: form.value.type,
    timeout: Math.min(form.value.timeout, 30),
  }

  if (showUrl.value) {
    data.url = form.value.url
    data.method = form.value.method
    data.expectedStatus = form.value.expectedStatus
    if (form.value.expectedBody) {
      data.expectedBody = form.value.expectedBody
    }
    if (form.value.headers.length > 0) {
      const headersObj: Record<string, string> = {}
      for (const h of form.value.headers) {
        if (h.key.trim()) {
          headersObj[h.key.trim()] = h.value
        }
      }
      if (Object.keys(headersObj).length > 0) {
        data.headers = headersObj
      }
    }
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
    testResult.value = await monitorsStore.testMonitor(data)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to test monitor'
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" as-child>
        <RouterLink to="/">
          <ArrowLeft class="h-4 w-4" />
        </RouterLink>
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ isEdit ? 'Edit Monitor' : 'Create Monitor' }}
        </h1>
        <p class="text-muted-foreground">
          {{ isEdit ? 'Update monitor configuration' : 'Set up a new monitor to track your service' }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="max-w-2xl space-y-6">
      <div v-if="error" class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        {{ error }}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Configure the basic settings for your monitor</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="name">Name</Label>
            <Input id="name" v-model="form.name" placeholder="My Website" />
          </div>

          <div class="space-y-2">
            <Label>Monitor Type</Label>
            <Select v-model="form.type">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in monitorTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="showUrl" class="space-y-2">
            <Label for="url">URL</Label>
            <Input id="url" v-model="form.url" type="url" placeholder="https://example.com" />
          </div>

          <div v-if="showHostname" class="space-y-2">
            <Label for="hostname">Hostname</Label>
            <Input id="hostname" v-model="form.hostname" placeholder="example.com" />
          </div>

          <div v-if="showPort" class="space-y-2">
            <Label for="port">Port</Label>
            <Input id="port" v-model.number="form.port" type="number" min="1" max="65535" />
          </div>

          <div v-if="showHttpOptions" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Method</Label>
              <Select v-model="form.method">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="m in httpMethods" :key="m" :value="m">{{ m }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="expectedStatus">Expected Status</Label>
              <Input id="expectedStatus" v-model.number="form.expectedStatus" type="number" min="100" max="599" />
            </div>
          </div>

          <div v-if="showHttpOptions" class="space-y-2">
            <Label for="expectedBody">Expected Body (optional)</Label>
            <Input id="expectedBody" v-model="form.expectedBody" placeholder="Text that response must contain" />
            <p class="text-xs text-muted-foreground">Response body must contain this text to be considered successful</p>
          </div>

          <div v-if="showHttpOptions" class="space-y-3">
            <div class="flex items-center justify-between">
              <Label>Custom Headers (optional)</Label>
              <Button type="button" variant="outline" size="sm" @click="addHeader">
                <Plus class="h-3 w-3 mr-1" />
                Add Header
              </Button>
            </div>
            <div v-if="form.headers.length === 0" class="text-sm text-muted-foreground">
              No custom headers configured
            </div>
            <div v-for="(header, index) in form.headers" :key="index" class="flex items-center gap-2">
              <Input v-model="header.key" placeholder="Header name" class="flex-1" />
              <Input v-model="header.value" placeholder="Value" class="flex-1" />
              <Button type="button" variant="ghost" size="icon" class="shrink-0" @click="removeHeader(index)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div v-if="showDnsOptions" class="space-y-2">
            <Label>DNS Record Type</Label>
            <Select v-model="form.dnsRecordType">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in dnsRecordTypes" :key="r" :value="r">{{ r }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check Settings</CardTitle>
          <CardDescription>Configure how often and how the monitor checks your service</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="interval">Interval (seconds)</Label>
              <Input id="interval" v-model.number="form.interval" type="number" min="60" />
            </div>
            <div class="space-y-2">
              <Label for="timeout">Timeout (seconds)</Label>
              <Input id="timeout" v-model.number="form.timeout" type="number" min="1" />
            </div>
            <div class="space-y-2">
              <Label for="retries">Retries</Label>
              <Input id="retries" v-model.number="form.retries" type="number" min="0" max="10" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Connection</CardTitle>
          <CardDescription>Test your monitor configuration before saving</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4">
            <Button type="button" variant="outline" :disabled="testing" @click="handleTest">
              <Loader2 v-if="testing" class="mr-2 h-4 w-4 animate-spin" />
              <PlayCircle v-else class="mr-2 h-4 w-4" />
              {{ testing ? 'Testing...' : 'Test Monitor' }}
            </Button>

            <div v-if="testResult" :class="[
              'p-4 rounded-lg border',
              testResult.success ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
            ]">
              <div class="flex items-center gap-2 mb-2">
                <CheckCircle v-if="testResult.success" class="h-5 w-5 text-success" />
                <XCircle v-else class="h-5 w-5 text-destructive" />
                <span class="font-medium">{{ testResult.success ? 'Success' : 'Failed' }}</span>
              </div>
              <div class="text-sm text-muted-foreground space-y-1">
                <p v-if="testResult.statusCode">Status: {{ testResult.statusCode }}</p>
                <p v-if="testResult.responseTime">Response Time: {{ testResult.responseTime }}ms</p>
                <p v-if="testResult.message">{{ testResult.message }}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" as-child>
          <RouterLink to="/">Cancel</RouterLink>
        </Button>
        <Button type="submit" :disabled="saving">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? 'Saving...' : (isEdit ? 'Update Monitor' : 'Create Monitor') }}
        </Button>
      </div>
    </form>
  </div>
</template>
