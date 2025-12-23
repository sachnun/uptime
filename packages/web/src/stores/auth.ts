import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

interface User {
  id: number
  email: string
  name: string | null
  avatar: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)

  async function checkAuth() {
    try {
      const response = await api.get<{ user: User }>('/api/auth/me')
      user.value = response.user
      return true
    } catch {
      await logout()
      return false
    }
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {}
    user.value = null
  }

  async function deleteAccount() {
    await api.delete('/api/auth/me')
    user.value = null
  }

  return {
    user,
    isAuthenticated,
    checkAuth,
    logout,
    deleteAccount,
  }
})
