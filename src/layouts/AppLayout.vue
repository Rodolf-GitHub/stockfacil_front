<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CircleHelp,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  Package,
  Ruler,
  ShoppingCart,
  User,
  Users,
} from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import { usuarioApiCambiarMiContrasena } from '@/apps/usuarios/api'
import { useNotification } from '@/composables/useNotification'

const router = useRouter()
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)

const userEmail = ref(localStorage.getItem('user_email') || 'Usuario')
const esAdmin = ref(localStorage.getItem('es_admin') === 'true')

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}

const closeSidebarOnMobile = () => {
  if (window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
}

const handleLogout = () => {
  localStorage.clear()
  router.push('/')
}

// --- Cambiar mi contraseña ---
const { success, error: notifyError } = useNotification()
const showPasswordModal = ref(false)
const passwordActual = ref('')
const nuevaPassword = ref('')
const cambiandoPassword = ref(false)

const abrirCambiarPassword = () => {
  passwordActual.value = ''
  nuevaPassword.value = ''
  userMenuOpen.value = false
  showPasswordModal.value = true
}

const cambiarPassword = async () => {
  if (!passwordActual.value || !nuevaPassword.value) return
  cambiandoPassword.value = true
  try {
    const res = await usuarioApiCambiarMiContrasena(
      { password_actual: passwordActual.value, nueva_password: nuevaPassword.value },
      { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } },
    )
    if (res.status >= 200 && res.status < 300) {
      success('Contraseña actualizada correctamente')
      showPasswordModal.value = false
    } else {
      notifyError('Contraseña actual incorrecta')
    }
  } catch {
    notifyError('Error al cambiar la contraseña')
  } finally {
    cambiandoPassword.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-100)]">
    <!-- Navbar -->
    <nav
      class="fixed top-0 z-50 w-full border-b border-[var(--bg-300)] bg-gradient-to-r from-[var(--primary-100)] to-[var(--primary-200)] shadow-md"
    >
      <div class="px-2 py-3 sm:px-3 lg:px-5 lg:pl-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center justify-start rtl:justify-end">
            <button
              @click="toggleSidebar"
              type="button"
              class="inline-flex items-center rounded-lg p-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 lg:hidden"
            >
              <span class="sr-only">Open sidebar</span>
              <Menu :size="24" />
            </button>
            <RouterLink to="/dashboard" class="ms-2 flex md:me-24">
              <span
                class="self-center whitespace-nowrap text-lg sm:text-xl font-bold text-white md:text-2xl"
                >📦 StockFácil</span
              >
            </RouterLink>
          </div>
          <div class="flex items-center gap-1">
            <!-- Ayuda (icono en navbar) -->
            <RouterLink
              to="/ayuda"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-all hover:bg-white/35 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/40"
              title="Ayuda"
            >
              <CircleHelp :size="20" />
            </RouterLink>
            <div class="ms-1 flex items-center relative">
              <div>
                <button
                  @click="toggleUserMenu"
                  type="button"
                  class="flex rounded-full bg-white/20 p-1 text-sm hover:bg-white/30 focus:ring-4 focus:ring-white/30 transition-all"
                  aria-expanded="false"
                >
                  <span class="sr-only">Open user menu</span>
                  <div
                    class="h-8 w-8 rounded-full bg-white text-[var(--primary-100)] flex items-center justify-center font-semibold"
                  >
                    <User :size="20" />
                  </div>
                </button>

                <!-- Dropdown menu -->
                <div
                  v-if="userMenuOpen"
                  class="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                >
                  <div class="py-1">
                    <div class="px-4 py-3 border-b border-[var(--bg-300)]">
                      <p class="text-sm font-semibold text-[var(--text-100)]">{{ userEmail }}</p>
                      <p class="text-xs text-[var(--text-200)]">
                        {{ esAdmin ? 'Administrador' : 'Usuario' }}
                      </p>
                    </div>
                    <button
                      type="button"
                      @click="abrirCambiarPassword"
                      class="flex w-full items-center px-4 py-2 text-sm text-[var(--text-100)] hover:bg-[var(--bg-200)] transition-colors"
                    >
                      <KeyRound class="mr-3 h-5 w-5 text-[var(--text-200)]" :stroke-width="2" />
                      Cambiar contraseña
                    </button>
                    <hr class="my-1 border-[var(--bg-300)]" />
                    <button
                      @click="handleLogout"
                      class="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut class="mr-3 h-5 w-5" :stroke-width="2" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed left-0 top-0 z-40 h-screen w-64 border-r border-[var(--bg-300)] bg-white pt-20 transition-transform shadow-lg',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <div class="h-full overflow-y-auto bg-gradient-to-b from-white to-[var(--bg-100)] px-3 pb-4">
        <ul class="space-y-1.5 font-medium">
          <!-- Dashboard -->
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/dashboard"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-indigo-100 text-indigo-600">
                <LayoutDashboard class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Dashboard</span>
                <span class="text-xs text-[var(--text-200)]">Resumen general</span>
              </span>
            </RouterLink>
          </li>

          <!-- Productos + submenu -->
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/productos"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-amber-100 text-amber-600">
                <Package class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Productos</span>
                <span class="text-xs text-[var(--text-200)]">Catálogo y stock</span>
              </span>
            </RouterLink>
            <ul v-if="esAdmin" class="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--bg-300)] pl-3">
              <li>
                <RouterLink
                  @click="closeSidebarOnMobile"
                  to="/unidades-medida"
                  class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-200)] transition-colors hover:bg-amber-50 hover:text-amber-700"
                  active-class="bg-amber-50 font-semibold text-amber-700"
                >
                  <Ruler class="h-4 w-4 shrink-0" :stroke-width="2" />
                  Unidades de medida
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Locales (solo admin) -->
          <li v-if="esAdmin">
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/locales"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-emerald-100 text-emerald-600">
                <MapPin class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Locales</span>
                <span class="text-xs text-[var(--text-200)]">Gestión de sucursales</span>
              </span>
            </RouterLink>
          </li>

          <!-- Usuarios + submenu (solo admin) -->
          <li v-if="esAdmin">
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/usuarios"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-violet-100 text-violet-600">
                <Users class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Usuarios</span>
                <span class="text-xs text-[var(--text-200)]">Gestión de cuentas</span>
              </span>
            </RouterLink>
            <ul class="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--bg-300)] pl-3">
              <li>
                <RouterLink
                  @click="closeSidebarOnMobile"
                  to="/asignaciones"
                  class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-200)] transition-colors hover:bg-violet-50 hover:text-violet-700"
                  active-class="bg-violet-50 font-semibold text-violet-700"
                >
                  <Link2 class="h-4 w-4 shrink-0" :stroke-width="2" />
                  Asignaciones
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Plantillas -->
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/plantillas"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-cyan-100 text-cyan-600">
                <ClipboardList class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Plantillas</span>
                <span class="text-xs text-[var(--text-200)]">Objetivos de stock</span>
              </span>
            </RouterLink>
          </li>

          <!-- Conteos -->
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/conteos"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-teal-100 text-teal-600">
                <ListChecks class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Conteos</span>
                <span class="text-xs text-[var(--text-200)]">Conteos de stock</span>
              </span>
            </RouterLink>
          </li>

          <!-- Lista de compras -->
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/compras"
              class="nav-link"
              active-class="nav-link-active"
            >
              <span class="nav-icon bg-orange-100 text-orange-600">
                <ShoppingCart class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Compras</span>
                <span class="text-xs text-[var(--text-200)]">Lista de compras</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="p-1 sm:p-2 lg:p-4 lg:ml-64 mt-14">
      <div class="rounded-lg p-1 sm:p-2 lg:p-4">
        <RouterView />
      </div>
    </div>

    <!-- Backdrop for mobile -->
    <div
      v-if="sidebarOpen"
      @click="toggleSidebar"
      class="fixed inset-0 z-30 bg-gray-900/50 lg:hidden"
    ></div>

    <!-- Backdrop for user menu -->
    <div v-if="userMenuOpen" @click="toggleUserMenu" class="fixed inset-0 z-40"></div>

    <!-- Modal cambiar contraseña -->
    <BaseModal
      :show="showPasswordModal"
      title="Cambiar mi contraseña"
      size="sm"
      @close="showPasswordModal = false"
    >
      <form class="space-y-4" @submit.prevent="cambiarPassword">
        <BaseInput
          v-model="passwordActual"
          type="password"
          label="Contraseña actual"
          placeholder="Tu contraseña actual"
          required
        />
        <BaseInput
          v-model="nuevaPassword"
          type="password"
          label="Nueva contraseña"
          placeholder="Nueva contraseña"
          required
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showPasswordModal = false">Cancelar</BaseButton>
        <BaseButton
          :loading="cambiandoPassword"
          :disabled="!passwordActual || !nuevaPassword"
          @click="cambiarPassword"
        >
          Actualizar contraseña
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  color: var(--text-100);
  transition: all 0.15s ease;
  position: relative;
}

.nav-link:hover {
  background-color: var(--bg-200);
}

.nav-link-active {
  background-color: color-mix(in srgb, var(--primary-100) 12%, white) !important;
  color: var(--primary-100) !important;
  font-weight: 600;
}

.nav-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background-color: var(--primary-100);
}

.nav-link-active :deep(.text-\[var\(--text-200\)\]) {
  color: color-mix(in srgb, var(--primary-100) 70%, var(--text-200));
}

.nav-icon {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
}
</style>
