import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/apps/auth/pages/LoginPage.vue'
import DashboardPage from '@/apps/dashboard/pages/DashboardPage.vue'
import ProductosPage from '@/apps/productos/pages/ProductosPage.vue'
import LocalesPage from '@/apps/locales/pages/LocalesPage.vue'
import UsuariosPage from '@/apps/usuarios/pages/UsuariosPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/app',
      component: AppLayout,
      children: [
        {
          path: '/dashboard',
          name: 'dashboard',
          component: DashboardPage,
        },
        {
          path: '/productos',
          name: 'productos',
          component: ProductosPage,
        },
        {
          path: '/locales',
          name: 'locales',
          component: LocalesPage,
        },
        {
          path: '/usuarios',
          name: 'usuarios',
          component: UsuariosPage,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')
  if (to.name !== 'login' && !token) {
    return { name: 'login' }
  }
})

export default router
