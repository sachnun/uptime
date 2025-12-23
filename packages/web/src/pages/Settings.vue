<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode, type Theme } from '@/lib/darkMode'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Clock, Key, Download, Trash2, Loader2, Plus, Copy, Check } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

type ApiKey = {
  id: number
  name: string
  prefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type NewApiKey = ApiKey & { key: string }

const router = useRouter()
const authStore = useAuthStore()
const { theme, setTheme } = useDarkMode()
const { toast } = useToast()

const deleteDialogOpen = ref(false)
const confirmText = ref('')
const deleting = ref(false)

const apiKeys = ref<ApiKey[]>([])
const loadingKeys = ref(false)
const createKeyDialogOpen = ref(false)
const newKeyName = ref('')
const creatingKey = ref(false)
const newlyCreatedKey = ref<NewApiKey | null>(null)
const copiedKey = ref(false)
const deletingKeyId = ref<number | null>(null)

const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function handleThemeChange(value: unknown) {
  if (typeof value === 'string') {
    setTheme(value as Theme)
  }
}

async function fetchApiKeys() {
  loadingKeys.value = true
  try {
    apiKeys.value = await api.get<ApiKey[]>('/api/keys')
  } finally {
    loadingKeys.value = false
  }
}

async function handleCreateKey() {
  if (!newKeyName.value.trim()) return
  creatingKey.value = true
  try {
    const created = await api.post<NewApiKey>('/api/keys', { name: newKeyName.value })
    newlyCreatedKey.value = created
    apiKeys.value.push({
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      lastUsedAt: null,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    })
    newKeyName.value = ''
    toast({ title: 'API key created', variant: 'success' })
  } catch (e) {
    toast({ title: 'Failed to create API key', variant: 'destructive' })
  } finally {
    creatingKey.value = false
  }
}

async function handleDeleteKey(id: number) {
  deletingKeyId.value = id
  try {
    await api.delete(`/api/keys/${id}`)
    apiKeys.value = apiKeys.value.filter(k => k.id !== id)
    toast({ title: 'API key deleted', variant: 'success' })
  } catch (e) {
    toast({ title: 'Failed to delete API key', variant: 'destructive' })
  } finally {
    deletingKeyId.value = null
  }
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
  copiedKey.value = true
  toast({ title: 'Copied to clipboard', variant: 'success' })
  setTimeout(() => { copiedKey.value = false }, 2000)
}

function closeCreateDialog() {
  createKeyDialogOpen.value = false
  newlyCreatedKey.value = null
  newKeyName.value = ''
}

function formatDate(date: string | null) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString()
}

async function handleDeleteAccount() {
  if (confirmText.value !== 'DELETE') return
  deleting.value = true
  try {
    await authStore.deleteAccount()
    router.push('/login')
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
  }
}

onMounted(() => {
  fetchApiKeys()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
      <p class="text-muted-foreground text-sm sm:text-base">Manage your account settings</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16">
              <AvatarFallback class="text-lg">
              {{ (authStore.user?.name || authStore.user?.email || '').charAt(0).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div>
              <p class="text-lg font-medium">{{ authStore.user?.name || authStore.user?.email }}</p>
              <p class="text-sm text-muted-foreground">User ID: {{ authStore.user?.id }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-medium">Theme</p>
              <p class="text-sm text-muted-foreground">Select your preferred color scheme</p>
            </div>
            <Select :model-value="theme" @update:model-value="handleThemeChange">
              <SelectTrigger class="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in themes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage API keys for programmatic access</CardDescription>
          </div>
          <Dialog v-model:open="createKeyDialogOpen" @update:open="(v) => !v && closeCreateDialog()">
            <DialogTrigger as-child>
              <Button size="sm">
                <Plus class="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{{ newlyCreatedKey ? 'API Key Created' : 'Create API Key' }}</DialogTitle>
                <DialogDescription>
                  {{ newlyCreatedKey ? 'Copy your API key now. You won\'t be able to see it again!' : 'Give your API key a name to identify it later.' }}
                </DialogDescription>
              </DialogHeader>
              <div v-if="!newlyCreatedKey" class="py-4">
                <Label>Name</Label>
                <Input v-model="newKeyName" placeholder="My API Key" class="mt-2" />
              </div>
              <div v-else class="py-4 space-y-4">
                <div>
                  <Label>API Key</Label>
                  <div class="flex items-center gap-2 mt-2">
                    <Input :model-value="newlyCreatedKey.key" readonly class="font-mono text-sm" />
                    <Button variant="outline" size="icon" @click="copyToClipboard(newlyCreatedKey.key)">
                      <Check v-if="copiedKey" class="h-4 w-4 text-green-500" />
                      <Copy v-else class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground">Store this key securely. It won't be shown again.</p>
              </div>
              <DialogFooter>
                <DialogClose as-child>
                  <Button v-if="newlyCreatedKey" variant="default">Done</Button>
                </DialogClose>
                <template v-if="!newlyCreatedKey">
                  <DialogClose as-child>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button :disabled="!newKeyName.trim() || creatingKey" @click="handleCreateKey">
                    <Loader2 v-if="creatingKey" class="h-4 w-4 mr-2 animate-spin" />
                    Create
                  </Button>
                </template>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div v-if="loadingKeys" class="flex items-center justify-center py-8">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="apiKeys.length === 0" class="text-center py-8 text-muted-foreground">
            <Key class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API keys yet</p>
            <p class="text-sm">Create an API key to access the API programmatically</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="key in apiKeys"
              :key="key.id"
              class="flex items-center justify-between p-3 border rounded-lg"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <p class="font-medium">{{ key.name }}</p>
                  <code class="text-xs bg-muted px-1.5 py-0.5 rounded">{{ key.prefix }}...</code>
                </div>
                <p class="text-xs text-muted-foreground">
                  Created {{ formatDate(key.createdAt) }}
                  <span v-if="key.lastUsedAt"> · Last used {{ formatDate(key.lastUsedAt) }}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                :disabled="deletingKeyId === key.id"
                @click="handleDeleteKey(key.id)"
              >
                <Loader2 v-if="deletingKeyId === key.id" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>Features in development</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="space-y-3">
            <li class="flex items-center gap-3 text-muted-foreground">
              <Clock class="h-4 w-4" />
              <span>Two-factor authentication</span>
            </li>
            <li class="flex items-center gap-3 text-muted-foreground">
              <Download class="h-4 w-4" />
              <span>Data export</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card class="border-destructive/50">
        <CardHeader>
          <CardTitle class="text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog v-model:open="deleteDialogOpen">
            <DialogTrigger as-child>
              <Button variant="destructive">
                <Trash2 class="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all associated data including monitors, notifications, and status pages. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div class="py-4">
                <Label>Type <span class="font-mono font-bold">DELETE</span> to confirm</Label>
                <Input v-model="confirmText" placeholder="DELETE" class="mt-2" />
              </div>
              <DialogFooter>
                <DialogClose as-child>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button variant="destructive" :disabled="confirmText !== 'DELETE' || deleting" @click="handleDeleteAccount">
                  <Loader2 v-if="deleting" class="h-4 w-4 mr-2 animate-spin" />
                  Delete Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
