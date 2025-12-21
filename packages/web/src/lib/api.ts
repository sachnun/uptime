import { useAuthStore } from '@/stores/auth'

const BASE_URL = ''

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const authStore = useAuthStore()
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    return headers
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }))
      if (data.error?.issues) {
        const messages = data.error.issues.map((i: { path: string[]; message: string }) => 
          `${i.path.join('.')}: ${i.message}`
        ).join(', ')
        throw new Error(messages)
      }
      throw new Error(data.error || 'Request failed')
    }

    return response.json()
  }

  get<T>(path: string): Promise<T> {
    return this.request('GET', path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request('POST', path, body)
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request('PUT', path, body)
  }

  delete<T>(path: string): Promise<T> {
    return this.request('DELETE', path)
  }
}

export const api = new ApiClient()
