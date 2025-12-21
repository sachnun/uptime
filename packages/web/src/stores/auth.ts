import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'

interface User {
  id: number
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(username: string, password: string) {
    const response = await api.post<{ token: string; user: User }>('/api/auth/login', { username, password })
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
  }

  async function register(username: string, password: string) {
    const response = await api.post<{ token: string; user: User }>('/api/auth/register', { username, password })
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
  }

  async function checkAuth() {
    if (!token.value) return false

    try {
      const response = await api.get<{ user: User }>('/api/auth/me')
      user.value = response.user
      return true
    } catch {
      logout()
      return false
    }
  }

  async function checkSetup(): Promise<boolean> {
    try {
      const response = await api.get<{ needsSetup: boolean }>('/api/auth/setup')
      return response.needsSetup
    } catch {
      return false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    checkAuth,
    checkSetup,
    logout,
  }
})
