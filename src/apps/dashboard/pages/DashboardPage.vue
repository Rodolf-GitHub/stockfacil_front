<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  Package,
  Store,
  ClipboardList,
  CheckCircle2,
  ShoppingCart,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-vue-next'
import { dashboardApiObtenerEstadisticas } from '@/apps/dashboard/api'
import type { DashboardSchema } from '@/apps/dashboard/api/schemas'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { error: notifyError } = useNotification()

const userEmail = localStorage.getItem('user_email') || 'Usuario'
const esAdmin = localStorage.getItem('es_admin') === 'true'

const cargando = ref(false)
const data = ref<DashboardSchema | null>(null)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await dashboardApiObtenerEstadisticas({
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) {
      data.value = res.data
    }
  } catch {
    notifyError('Error al cargar las estadísticas')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const formatFecha = (fecha?: string | null) => {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

const estadoClass = (estado?: string | null) => {
  switch (estado) {
    case 'finalizado':
      return 'bg-emerald-100 text-emerald-700'
    case 'borrador':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-[var(--bg-200)] text-[var(--text-200)]'
  }
}

const totalAComprar = computed(() => data.value?.productos_a_comprar_hoy ?? 0)
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- Hero -->
    <div
      class="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary-100)] to-[var(--primary-200)] p-4 text-white shadow-lg sm:p-6"
    >
      <div class="flex items-start gap-3 sm:gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-14 sm:w-14"
        >
          <LayoutDashboard :size="26" class="text-white" />
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold sm:text-2xl">
            {{ data?.cuenta_nombre || 'Dashboard' }}
          </h1>
          <p class="mt-1 text-sm text-white/90">
            Bienvenido, <span class="font-semibold">{{ userEmail }}</span>
            <span v-if="esAdmin" class="ml-1">· Admin</span>
          </p>
        </div>
      </div>
    </div>

    <!-- KPIs principales -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-3 shadow-sm sm:p-4">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <Package :size="16" class="text-amber-600" />
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Productos
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-[var(--text-100)]">
          <span
            v-if="cargando"
            class="inline-block h-6 w-12 animate-pulse rounded bg-[var(--bg-200)]"
          ></span>
          <span v-else>{{ data?.total_productos ?? 0 }}</span>
        </p>
      </div>

      <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-3 shadow-sm sm:p-4">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
            <Store :size="16" class="text-indigo-600" />
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Locales
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-[var(--text-100)]">
          <span
            v-if="cargando"
            class="inline-block h-6 w-12 animate-pulse rounded bg-[var(--bg-200)]"
          ></span>
          <span v-else>{{ data?.total_locales_accesibles ?? 0 }}</span>
        </p>
      </div>

      <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-3 shadow-sm sm:p-4">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <ClipboardList :size="16" class="text-amber-600" />
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Borradores
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-[var(--text-100)]">
          <span
            v-if="cargando"
            class="inline-block h-6 w-12 animate-pulse rounded bg-[var(--bg-200)]"
          ></span>
          <span v-else>{{ data?.total_conteos_borrador ?? 0 }}</span>
        </p>
      </div>

      <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-3 shadow-sm sm:p-4">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
            <CheckCircle2 :size="16" class="text-emerald-600" />
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Finalizados
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-[var(--text-100)]">
          <span
            v-if="cargando"
            class="inline-block h-6 w-12 animate-pulse rounded bg-[var(--bg-200)]"
          ></span>
          <span v-else>{{ data?.total_conteos_finalizados ?? 0 }}</span>
        </p>
      </div>

      <div
        class="col-span-2 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-3 shadow-sm sm:col-span-1 sm:p-4"
      >
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
            <ShoppingCart :size="16" class="text-rose-600" />
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wider text-rose-600">
            A comprar hoy
          </span>
        </div>
        <p class="mt-2 text-2xl font-bold text-rose-700">
          <span
            v-if="cargando"
            class="inline-block h-6 w-12 animate-pulse rounded bg-rose-100"
          ></span>
          <span v-else>{{ totalAComprar }}</span>
        </p>
        <RouterLink
          to="/compras"
          class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
        >
          Ver lista
          <TrendingUp :size="12" />
        </RouterLink>
      </div>
    </div>

    <!-- Locales -->
    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <div class="flex items-center gap-2 border-b border-[var(--bg-200)] px-4 py-3 sm:px-5">
        <Store :size="18" class="text-[var(--primary-100)]" />
        <h2 class="text-base font-semibold text-[var(--text-100)] sm:text-lg">Locales</h2>
      </div>

      <table class="w-full">
        <thead>
          <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
            <th
              class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Local
            </th>
            <th
              class="whitespace-nowrap px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Plantilla
            </th>
            <th
              class="whitespace-nowrap px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Conteos
            </th>
            <th
              class="hidden whitespace-nowrap px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:table-cell sm:px-4 sm:text-xs"
            >
              Último conteo
            </th>
            <th
              class="whitespace-nowrap px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              A comprar
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="cargando">
            <tr v-for="n in 3" :key="`sk-${n}`" class="border-b border-[var(--bg-200)]">
              <td class="px-3 py-3 sm:px-4">
                <div class="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-2 py-3 sm:px-4">
                <div class="ml-auto h-5 w-10 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-2 py-3 sm:px-4">
                <div class="ml-auto h-5 w-10 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="hidden px-2 py-3 sm:table-cell sm:px-4">
                <div class="h-5 w-24 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-3 py-3 sm:px-4">
                <div class="ml-auto h-5 w-10 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>
          </template>

          <tr v-else-if="!data?.locales?.length">
            <td colspan="5" class="px-4 py-12 text-center">
              <AlertCircle :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
              <p class="font-semibold text-[var(--text-100)]">Sin locales accesibles</p>
              <p class="mt-1 text-sm text-[var(--text-200)]">
                Pedí al administrador que te dé acceso a un local.
              </p>
            </td>
          </tr>

          <tr
            v-else
            v-for="loc in data.locales"
            :key="loc.local_id"
            class="border-b border-[var(--bg-200)] last:border-0 transition-colors hover:bg-[var(--bg-100)]/40"
          >
            <td
              class="w-full max-w-0 px-3 py-2.5 text-sm font-semibold text-[var(--text-100)] sm:px-4 sm:py-3"
            >
              <span class="block truncate">{{ loc.local_nombre }}</span>
              <span class="mt-0.5 block text-xs font-normal text-[var(--text-200)] sm:hidden">
                <Calendar :size="10" class="inline-block" />
                {{ formatFecha(loc.ultimo_conteo_fecha) }}
                <span
                  v-if="loc.ultimo_conteo_estado"
                  class="ml-1 inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-semibold capitalize"
                  :class="estadoClass(loc.ultimo_conteo_estado)"
                >
                  {{ loc.ultimo_conteo_estado }}
                </span>
              </span>
            </td>
            <td
              class="whitespace-nowrap px-2 py-2.5 text-right text-sm text-[var(--text-100)] sm:px-4 sm:py-3"
            >
              {{ loc.productos_en_plantilla }}
            </td>
            <td
              class="whitespace-nowrap px-2 py-2.5 text-right text-sm text-[var(--text-100)] sm:px-4 sm:py-3"
            >
              {{ loc.total_conteos }}
            </td>
            <td class="hidden whitespace-nowrap px-2 py-2.5 sm:table-cell sm:px-4 sm:py-3">
              <div class="flex items-center gap-2">
                <span class="text-sm text-[var(--text-200)]">
                  {{ formatFecha(loc.ultimo_conteo_fecha) }}
                </span>
                <span
                  v-if="loc.ultimo_conteo_estado"
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                  :class="estadoClass(loc.ultimo_conteo_estado)"
                >
                  {{ loc.ultimo_conteo_estado }}
                </span>
              </div>
            </td>
            <td class="whitespace-nowrap px-3 py-2.5 text-right sm:px-4 sm:py-3">
              <span
                v-if="loc.productos_a_comprar_hoy > 0"
                class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700"
              >
                {{ loc.productos_a_comprar_hoy }}
              </span>
              <span v-else class="text-sm text-[var(--text-200)]">0</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
