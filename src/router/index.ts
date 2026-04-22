import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/apps/auth/pages/LoginPage.vue'
import DashboardPage from '@/apps/dashboard/pages/DashboardPage.vue'
import ProductosPage from '@/apps/productos/pages/ProductosPage.vue'
import LocalesPage from '@/apps/locales/pages/LocalesPage.vue'
import AsignacionesPage from '@/apps/locales/pages/AsignacionesPage.vue'
import UsuariosPage from '@/apps/usuarios/pages/UsuariosPage.vue'
import PlantillasStockPage from '@/apps/plantillas_stock/pages/PlantillasStockPage.vue'
import ConteosStockPage from '@/apps/conteos_stock/pages/ConteosStockPage.vue'
import ListaCompraPage from '@/apps/conteos_stock/pages/ListaCompraPage.vue'
import ListaCompraCompletaPage from '@/apps/conteos_stock/pages/ListaCompraCompletaPage.vue'
import AyudaPage from '@/apps/ayuda/pages/AyudaPage.vue'

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
        {
          path: '/asignaciones',
          name: 'asignaciones',
          component: AsignacionesPage,
        },
        {
          path: '/plantillas',
          name: 'plantillas',
          component: PlantillasStockPage,
        },
        {
          path: '/conteos',
          name: 'conteos',
          component: ConteosStockPage,
        },
        {
          path: '/compras',
          name: 'compras',
          component: ListaCompraPage,
        },
        {
          path: '/compras-completa',
          name: 'compras-completa',
          component: ListaCompraCompletaPage,
        },
        {
          path: '/ayuda',
          name: 'ayuda',
          component: AyudaPage,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')

  if (to.name === 'login' && token) {
    return { name: 'dashboard' }
  }

  if (to.name !== 'login' && !token) {
    return { name: 'login' }
  }
})

export default router
