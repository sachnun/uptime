import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/Dashboard.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/Dashboard.vue'),
        },
        {
          path: 'monitors/:id',
          name: 'monitor-detail',
          component: () => import('@/pages/MonitorDetail.vue'),
        },
        {
          path: 'monitors/new',
          name: 'monitor-new',
          component: () => import('@/pages/MonitorForm.vue'),
        },
        {
          path: 'monitors/:id/edit',
          name: 'monitor-edit',
          component: () => import('@/pages/MonitorForm.vue'),
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/pages/Notifications.vue'),
        },
        {
          path: 'status-pages',
          name: 'status-pages',
          component: () => import('@/pages/StatusPages.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/Settings.vue'),
        },
        {
          path: 'docs',
          name: 'docs',
          component: () => import('@/pages/ApiDocs.vue'),
        },
      ],
    },
    {
      path: '/status/:slug',
      name: 'public-status',
      component: () => import('@/pages/PublicStatus.vue'),
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    await authStore.checkAuth()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
