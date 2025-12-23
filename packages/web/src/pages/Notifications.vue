<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

import { Plus, Loader2, Bell, Webhook, Mail, Pencil, Trash2, Play } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface Notification {
  id: number
  name: string
  type: 'email' | 'webhook'
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
const deleteTarget = ref<Notification | null>(null)
const deleting = ref(false)
const { toast } = useToast()

const form = ref({
  name: '',
  type: 'webhook' as Notification['type'],
  enabled: true,
  webhookUrl: '',
})

const notificationTypes = [
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'email', label: 'Email', icon: Mail },
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
  }
  showModal.value = true
}

function openEditModal(notification: Notification) {
  editing.value = notification
  form.value = {
    name: notification.name,
    type: notification.type,
    enabled: notification.enabled,
    webhookUrl: notification.config.url || '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  error.value = ''
}

function getConfig(): Record<string, string> {
  if (form.value.type === 'webhook') {
    return { url: form.value.webhookUrl }
  }
  return {}
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
      toast({ title: 'Notification updated', variant: 'success' })
    } else {
      const created = await api.post<Notification>('/api/notifications', data)
      notifications.value.unshift(created)
      toast({ title: 'Notification created', variant: 'success' })
    }
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save notification'
    toast({ title: 'Failed to save notification', variant: 'destructive' })
  } finally {
    saving.value = false
  }
}

async function handleDelete(notification: Notification) {
  deleting.value = true
  try {
    await api.delete(`/api/notifications/${notification.id}`)
    notifications.value = notifications.value.filter(n => n.id !== notification.id)
    toast({ title: 'Notification deleted', variant: 'success' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete notification'
    toast({ title: 'Failed to delete notification', variant: 'destructive' })
  } finally {
    deleting.value = false
    deleteTarget.value = null
  }
}

async function handleTest(notification: Notification) {
  testing.value = notification.id
  try {
    await api.post(`/api/notifications/${notification.id}/test`)
    toast({ title: 'Test sent successfully', variant: 'success' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Test failed'
    toast({ title: 'Test failed', variant: 'destructive' })
  } finally {
    testing.value = null
  }
}

function getTypeIcon(type: string) {
  const iconMap: Record<string, typeof Webhook> = {
    webhook: Webhook,
    email: Mail,
  }
  return iconMap[type] || Webhook
}

onMounted(fetchNotifications)
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
        <p class="text-muted-foreground text-sm sm:text-base">Manage notification channels for alerts</p>
      </div>
      <Button @click="openCreateModal" class="w-full sm:w-auto">
        <Plus class="h-4 w-4 mr-2" />
        Add Notification
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <Card v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-12">
      <Bell class="h-12 w-12 text-muted-foreground" />
      <h3 class="mt-4 text-lg font-medium">No notifications configured</h3>
      <p class="mt-2 text-muted-foreground">Add a notification channel to receive alerts.</p>
      <Button class="mt-4" @click="openCreateModal">
        <Plus class="h-4 w-4 mr-2" />
        Add Notification
      </Button>
    </Card>

    <div v-else class="space-y-3">
      <Card v-for="notification in notifications" :key="notification.id" class="p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div class="flex items-center gap-3 sm:gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <component :is="getTypeIcon(notification.type)" class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-medium truncate">{{ notification.name }}</h3>
                <Badge :variant="notification.enabled ? 'success' : 'secondary'">
                  {{ notification.enabled ? 'Enabled' : 'Disabled' }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground capitalize">{{ notification.type }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              :disabled="testing === notification.id"
              @click="handleTest(notification)"
            >
              <Loader2 v-if="testing === notification.id" class="h-4 w-4 sm:mr-2 animate-spin" />
              <Play v-else class="h-4 w-4 sm:mr-2" />
              <span class="hidden sm:inline">Test</span>
            </Button>
            <Button variant="outline" size="sm" @click="openEditModal(notification)">
              <Pencil class="h-4 w-4" />
            </Button>
            <AlertDialog :open="deleteTarget?.id === notification.id" @update:open="val => !val && (deleteTarget = null)">
              <AlertDialogTrigger as-child>
                <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="deleteTarget = notification">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{{ notification.name }}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" :disabled="deleting" @click="handleDelete(notification)">
                    <Loader2 v-if="deleting" class="h-4 w-4 mr-2 animate-spin" />
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </div>

    <Dialog :open="showModal" @update:open="val => !val && closeModal()">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Edit Notification' : 'New Notification' }}</DialogTitle>
          <DialogDescription>Configure your notification channel settings</DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {{ error }}
          </div>

          <div class="space-y-2">
            <Label for="name">Name</Label>
            <Input id="name" v-model="form.name" placeholder="My Notification" />
          </div>

          <div class="space-y-2">
            <Label>Type</Label>
            <Select v-model="form.type">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in notificationTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="form.type === 'webhook'" class="space-y-2">
            <Label for="webhookUrl">Webhook URL</Label>
            <Input id="webhookUrl" v-model="form.webhookUrl" type="url" placeholder="https://example.com/webhook" />
          </div>

          <p v-if="form.type === 'email'" class="text-sm text-muted-foreground">
            Email notifications will be sent to your account email address.
          </p>

          <div class="flex items-center space-x-2">
            <input
              id="enabled"
              v-model="form.enabled"
              type="checkbox"
              class="h-4 w-4 rounded border-input"
            />
            <Label for="enabled">Enabled</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
