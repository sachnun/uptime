<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/utils'

const authStore = useAuthStore()
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      <p class="text-slate-500 dark:text-slate-400 mt-1">Manage your account settings</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Information</h2>
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span class="text-2xl font-bold text-slate-600 dark:text-slate-300">
                {{ authStore.user?.username?.charAt(0).toUpperCase() }}
              </span>
            </div>
            <div>
              <p class="text-lg font-medium text-slate-900 dark:text-white">{{ authStore.user?.username }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">User ID: {{ authStore.user?.id }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Application</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-slate-600 dark:text-slate-400">Version</span>
            <span class="text-slate-900 dark:text-white font-medium">1.0.0</span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-slate-200 dark:border-slate-700">
            <span class="text-slate-600 dark:text-slate-400">Theme</span>
            <span class="text-slate-900 dark:text-white font-medium">System</span>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Coming Soon</h2>
        <ul class="space-y-2 text-slate-600 dark:text-slate-400">
          <li class="flex items-center gap-2">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Password change
          </li>
          <li class="flex items-center gap-2">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Two-factor authentication
          </li>
          <li class="flex items-center gap-2">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            API keys management
          </li>
          <li class="flex items-center gap-2">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Data export
          </li>
        </ul>
      </div>

      <div class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h2>
        <p class="text-sm text-red-600 dark:text-red-400 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>
        <button
          disabled
          class="px-4 py-2 rounded-lg bg-red-500 text-white font-medium opacity-50 cursor-not-allowed"
        >
          Delete Account
        </button>
      </div>
    </div>
  </div>
</template>
