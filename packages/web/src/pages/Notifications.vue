<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'

interface Notification {
  id: number
  name: string
  type: 'webhook' | 'discord' | 'telegram' | 'slack'
  config: Record<string, string>
  enabled: boolean
  createdAt: string
}

const notifications = ref<Notification[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<Notification | null>(null)
const saving = ref(false)
const testing = ref<number | null>(null)
const error = ref('')

const form = ref({
  name: '',
  type: 'webhook' as Notification['type'],
  enabled: true,
  webhookUrl: '',
  discordWebhook: '',
  telegramBotToken: '',
  telegramChatId: '',
  slackWebhook: '',
})

const notificationTypes = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'slack', label: 'Slack' },
]

async function fetchNotifications() {
  loading.value = true
  try {
    notifications.value = await api.get('/api/notifications')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch notifications'
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editing.value = null
  form.value = {
    name: '',
    type: 'webhook',
    enabled: true,
    webhookUrl: '',
    discordWebhook: '',
    telegramBotToken: '',
    telegramChatId: '',
    slackWebhook: '',
  }
  showModal.value = true
}

function openEditModal(notification: Notification) {
  editing.value = notification
  form.value = {
    name: notification.name,
    type: notification.type,
    enabled: notification.enabled,
    webhookUrl: notification.config.webhookUrl || '',
    discordWebhook: notification.config.discordWebhook || '',
    telegramBotToken: notification.config.telegramBotToken || '',
    telegramChatId: notification.config.telegramChatId || '',
    slackWebhook: notification.config.slackWebhook || '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  error.value = ''
}

function getConfig(): Record<string, string> {
  const configMap: Record<string, () => Record<string, string>> = {
    webhook: () => ({ webhookUrl: form.value.webhookUrl }),
    discord: () => ({ discordWebhook: form.value.discordWebhook }),
    telegram: () => ({ telegramBotToken: form.value.telegramBotToken, telegramChatId: form.value.telegramChatId }),
    slack: () => ({ slackWebhook: form.value.slackWebhook }),
  }
  return configMap[form.value.type]?.() || {}
}

async function handleSubmit() {
  if (!form.value.name) {
    error.value = 'Name is required'
    return
  }

  saving.value = true
  error.value = ''

  const data = {
    name: form.value.name,
    type: form.value.type,
    enabled: form.value.enabled,
    config: getConfig(),
  }

  try {
    if (editing.value) {
      const updated = await api.put<Notification>(`/api/notifications/${editing.value.id}`, data)
      const index = notifications.value.findIndex(n => n.id === editing.value!.id)
      if (index !== -1) notifications.value[index] = updated
    } else {
      const created = await api.post<Notification>('/api/notifications', data)
      notifications.value.unshift(created)
    }
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save notification'
  } finally {
    saving.value = false
  }
}

async function handleDelete(notification: Notification) {
  if (!confirm(`Delete notification "${notification.name}"?`)) return
  
  try {
    await api.delete(`/api/notifications/${notification.id}`)
    notifications.value = notifications.value.filter(n => n.id !== notification.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete notification'
  }
}

async function handleTest(notification: Notification) {
  testing.value = notification.id
  try {
    await api.post(`/api/notifications/${notification.id}/test`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Test failed'
  } finally {
    testing.value = null
  }
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    webhook: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    discord: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    telegram: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    slack: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
  }
  return icons[type] || icons.webhook
}

onMounted(fetchNotifications)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Manage notification channels for alerts</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Notification
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
    </div>

    <div v-else-if="notifications.length === 0" class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-white">No notifications configured</h3>
      <p class="mt-2 text-slate-500 dark:text-slate-400">Add a notification channel to receive alerts.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-4"
      >
        <div class="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <svg class="h-5 w-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTypeIcon(notification.type)" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-medium text-slate-900 dark:text-white truncate">{{ notification.name }}</h3>
            <span
              :class="[
                'px-2 py-0.5 text-xs rounded-full',
                notification.enabled
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              ]"
            >
              {{ notification.enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 capitalize">{{ notification.type }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="handleTest(notification)"
            :disabled="testing === notification.id"
            class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {{ testing === notification.id ? 'Testing...' : 'Test' }}
          </button>
          <button
            @click="openEditModal(notification)"
            class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Edit
          </button>
          <button
            @click="handleDelete(notification)"
            class="px-3 py-1.5 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
      <div class="relative bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">
          {{ editing ? 'Edit Notification' : 'New Notification' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {{ error }}
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="My Notification"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
            <select
              v-model="form.type"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
            >
              <option v-for="t in notificationTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div v-if="form.type === 'webhook'">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Webhook URL</label>
            <input
              v-model="form.webhookUrl"
              type="url"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="https://example.com/webhook"
            />
          </div>

          <div v-if="form.type === 'discord'">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Discord Webhook URL</label>
            <input
              v-model="form.discordWebhook"
              type="url"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          <div v-if="form.type === 'telegram'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bot Token</label>
              <input
                v-model="form.telegramBotToken"
                type="text"
                class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chat ID</label>
              <input
                v-model="form.telegramChatId"
                type="text"
                class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                placeholder="-1001234567890"
              />
            </div>
          </div>

          <div v-if="form.type === 'slack'">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slack Webhook URL</label>
            <input
              v-model="form.slackWebhook"
              type="url"
              class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              id="enabled"
              v-model="form.enabled"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-green-500 focus:ring-green-500"
            />
            <label for="enabled" class="text-sm text-slate-700 dark:text-slate-300">Enabled</label>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
