<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Download, ShoppingCart } from 'lucide-vue-next'
import { conteostockApiResumenPorFecha } from '@/apps/conteos_stock/api'
import type { LocalSinConteoSchema, ResumenConteoSchema } from '@/apps/conteos_stock/api/schemas'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { error: notifyError } = useNotification()

// localId === null  -> Todos los locales
// localId === number -> ese local
const localId = ref<number | null>(null)
const fecha = ref<string>('')

const locales = ref<LocalSchema[]>([])
const localesResumen = ref<ResumenConteoSchema[]>([])
const localesSinConteo = ref<LocalSinConteoSchema[]>([])
const fechaResp = ref<string>('')
const expandidos = ref<Set<number>>(new Set())
const cargando = ref(false)
const consultado = ref(false)

const esTotal = computed(() => localId.value === null)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargarLocales = async () => {
  try {
    const res = await localApiListarLocales({ limit: 1000, offset: 0 }, {
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) locales.value = res.data.items
  } catch {
    /* */
  }
}

onMounted(async () => {
  fecha.value = new Date().toISOString().slice(0, 10)
  await cargarLocales()
  await consultar()
})

const consultar = async () => {
  cargando.value = true
  consultado.value = true
  try {
    const res = await conteostockApiResumenPorFecha(
      {
        fecha: fecha.value,
        local_id: localId.value ?? undefined,
      },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      localesResumen.value = res.data.locales ?? []
      localesSinConteo.value = res.data.locales_sin_conteo_finalizado ?? []
      fechaResp.value = res.data.fecha
      // Expandir automáticamente si hay un solo local
      expandidos.value = new Set()
      if (localesResumen.value.length === 1 && localesResumen.value[0].conteo_id) {
        expandidos.value.add(localesResumen.value[0].conteo_id)
      }
    }
  } catch {
    notifyError('Error al obtener el resumen de compras')
  } finally {
    cargando.value = false
  }
}

const toggle = (id: number) => {
  if (expandidos.value.has(id)) expandidos.value.delete(id)
  else expandidos.value.add(id)
  expandidos.value = new Set(expandidos.value)
}

const totalLocal = (l: ResumenConteoSchema) =>
  l.items.reduce((acc, it) => acc + (Number(it.cantidad_a_comprar) || 0), 0)

// Total agregado por producto (sólo cuando es total)
const itemsTotalAgregado = computed(() => {
  if (!esTotal.value) return []
  const map = new Map<
    number,
    { producto_id: number; producto_nombre: string; cantidad_a_comprar: number }
  >()
  for (const loc of localesResumen.value) {
    for (const it of loc.items) {
      const cur = map.get(it.producto_id)
      const cant = Number(it.cantidad_a_comprar) || 0
      if (cur) cur.cantidad_a_comprar += cant
      else
        map.set(it.producto_id, {
          producto_id: it.producto_id,
          producto_nombre: it.producto_nombre,
          cantidad_a_comprar: cant,
        })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre))
})

const hayDatos = computed(
  () => localesResumen.value.some((l) => l.items.length > 0) || itemsTotalAgregado.value.length > 0,
)

const exportarCSV = () => {
  const rows: string[][] = [['Local', 'Producto', 'Objetivo', 'Actual', 'A comprar']]
  for (const loc of localesResumen.value) {
    for (const it of loc.items) {
      rows.push([
        loc.local_nombre,
        it.producto_nombre,
        String(it.cantidad_objetivo),
        String(it.cantidad_actual),
        String(it.cantidad_a_comprar),
      ])
    }
  }
  if (esTotal.value && itemsTotalAgregado.value.length > 0) {
    rows.push([])
    rows.push(['TOTAL AGREGADO', '', '', '', ''])
    rows.push(['', 'Producto', '', '', 'A comprar'])
    for (const it of itemsTotalAgregado.value) {
      rows.push(['', it.producto_nombre, '', '', String(it.cantidad_a_comprar)])
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lista-compras-${esTotal.value ? 'total' : 'local'}-${fecha.value || 'hoy'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const formatNum = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '-'
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(num)) return String(n)
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 sm:h-11 sm:w-11"
        >
          <ShoppingCart :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-white sm:text-2xl">Lista de Compras</h1>
          <p class="text-xs text-white/90 sm:text-sm">
            Productos a comprar según conteo vs. plantilla
          </p>
        </div>
      </div>
      <button
        v-if="consultado && hayDatos"
        type="button"
        @click="exportarCSV"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-white/90"
      >
        <Download :size="16" />
        Exportar CSV
      </button>
    </div>

    <!-- Filtros -->
    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white p-3 shadow-sm sm:p-4">
      <div class="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <select
          v-model="localId"
          class="rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        >
          <option :value="null">Todos los locales</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">{{ l.nombre }}</option>
        </select>
        <input
          v-model="fecha"
          type="date"
          class="rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        />
        <BaseButton :loading="cargando" @click="consultar">Consultar</BaseButton>
      </div>
    </div>

    <!-- Aviso locales sin conteo finalizado -->
    <div
      v-if="consultado && localesSinConteo.length > 0"
      class="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <span class="text-base">⚠️</span>
      <div>
        <p class="font-semibold">Locales sin conteo finalizado</p>
        <p class="mt-0.5 text-xs text-amber-800">
          {{ localesSinConteo.map((l) => l.local_nombre).join(', ') }}
        </p>
      </div>
    </div>

    <!-- Resultados: tarjetas por local -->
    <div v-if="consultado && localesResumen.length > 0" class="space-y-3">
      <div
        v-for="loc in localesResumen"
        :key="loc.conteo_id"
        class="overflow-hidden rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-[var(--bg-100)]/40 sm:p-4"
          @click="toggle(loc.conteo_id)"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            >
              {{ loc.local_nombre }}
            </span>
            <span class="truncate text-xs text-[var(--text-200)]">
              {{ loc.items.length }} ítem{{ loc.items.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span
              class="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700"
            >
              Σ {{ formatNum(totalLocal(loc)) }}
            </span>
            <ChevronDown
              :size="18"
              class="text-[var(--text-200)] transition-transform"
              :class="{ 'rotate-180': expandidos.has(loc.conteo_id) }"
            />
          </div>
        </button>

        <div v-if="expandidos.has(loc.conteo_id)" class="border-t border-[var(--bg-200)]">
          <table v-if="loc.items.length > 0" class="w-full">
            <thead>
              <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
                <th
                  class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
                >
                  Producto
                </th>
                <th
                  class="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-3 sm:text-xs"
                >
                  Obj.
                </th>
                <th
                  class="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-3 sm:text-xs"
                >
                  Act.
                </th>
                <th
                  class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
                >
                  Comprar
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(it, idx) in loc.items"
                :key="`${it.producto_id}-${idx}`"
                class="border-b border-[var(--bg-200)] last:border-0"
              >
                <td class="px-3 py-2 text-sm font-medium text-[var(--text-100)] sm:px-4">
                  {{ it.producto_nombre }}
                </td>
                <td class="px-2 py-2 text-right text-xs text-[var(--text-200)] sm:px-3 sm:text-sm">
                  {{ formatNum(it.cantidad_objetivo) }}
                </td>
                <td class="px-2 py-2 text-right text-xs text-[var(--text-200)] sm:px-3 sm:text-sm">
                  {{ formatNum(it.cantidad_actual) }}
                </td>
                <td class="px-3 py-2 text-right sm:px-4">
                  <span
                    class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 sm:px-2.5 sm:py-1 sm:text-sm"
                  >
                    {{ formatNum(it.cantidad_a_comprar) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-center text-sm text-[var(--text-200)]">
            No hay productos para comprar en este local.
          </p>
        </div>
      </div>

      <!-- Total agregado (solo cuando se piden todos los locales y hay >1) -->
      <div
        v-if="esTotal && itemsTotalAgregado.length > 0 && localesResumen.length > 1"
        class="overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-sm"
      >
        <div class="border-b border-rose-200 bg-rose-50 px-3 py-3 sm:px-4">
          <p class="text-sm font-bold text-rose-700">Σ Total agregado de todos los locales</p>
        </div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
              >
                Producto
              </th>
              <th
                class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
              >
                A comprar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(it, idx) in itemsTotalAgregado"
              :key="`agg-${it.producto_id}-${idx}`"
              class="border-b border-[var(--bg-200)] last:border-0"
            >
              <td class="px-3 py-2 text-sm font-medium text-[var(--text-100)] sm:px-4">
                {{ it.producto_nombre }}
              </td>
              <td class="px-3 py-2 text-right sm:px-4">
                <span
                  class="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-sm font-bold text-rose-700"
                >
                  {{ formatNum(it.cantidad_a_comprar) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sin resultados -->
    <div
      v-else-if="consultado && !cargando"
      class="rounded-2xl border border-dashed border-[var(--bg-300)] bg-white p-8 text-center"
    >
      <ShoppingCart :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
      <p class="font-semibold text-[var(--text-100)]">No hay datos para esta fecha</p>
      <p class="mt-1 text-sm text-[var(--text-200)]">
        No se encontraron conteos finalizados para los criterios seleccionados.
      </p>
    </div>

    <!-- Estado inicial -->
    <div
      v-if="!consultado"
      class="rounded-2xl border border-dashed border-[var(--bg-300)] bg-white p-8 text-center"
    >
      <ShoppingCart :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
      <p class="font-semibold text-[var(--text-100)]">Generá una lista de compras</p>
      <p class="mt-1 text-sm text-[var(--text-200)]">
        Elegí el local (o todos) y la fecha, y pulsá Consultar.
      </p>
    </div>
  </div>
</template>
