<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode, type Theme } from '@/lib/darkMode'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Clock, Key, Download, Trash2, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const { theme, setTheme } = useDarkMode()

const deleteDialogOpen = ref(false)
const confirmText = ref('')
const deleting = ref(false)

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
              <Key class="h-4 w-4" />
              <span>API keys management</span>
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
