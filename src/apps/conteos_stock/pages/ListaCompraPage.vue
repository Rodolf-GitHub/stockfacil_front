<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Download, ShoppingCart } from 'lucide-vue-next'
import {
  conteostockApiListaComprasLocal,
  conteostockApiListaComprasTotal,
} from '@/apps/conteos_stock/api'
import type {
  ItemListaCompraSchema,
  ItemListaCompraTotalSchema,
} from '@/apps/conteos_stock/api/schemas'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { error: notifyError } = useNotification()

type Modo = 'local' | 'total'
const modo = ref<Modo>('local')
const localId = ref<number | null>(null)
const fecha = ref<string>('')

const locales = ref<LocalSchema[]>([])
const itemsLocal = ref<ItemListaCompraSchema[]>([])
const itemsTotal = ref<ItemListaCompraTotalSchema[]>([])
const localNombre = ref<string>('')
const fechaResp = ref<string>('')
const cargando = ref(false)
const consultado = ref(false)

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

onMounted(cargarLocales)

const consultar = async () => {
  cargando.value = true
  consultado.value = true
  try {
    if (modo.value === 'local') {
      if (localId.value == null) {
        notifyError('Seleccioná un local')
        cargando.value = false
        return
      }
      const res = await conteostockApiListaComprasLocal(
        { local_id: localId.value, fecha: fecha.value || undefined },
        { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
      )
      if (res.status >= 200 && res.status < 300) {
        itemsLocal.value = res.data.items
        localNombre.value = res.data.local_nombre
        fechaResp.value = res.data.fecha
        itemsTotal.value = []
      }
    } else {
      const res = await conteostockApiListaComprasTotal({ fecha: fecha.value || undefined }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit)
      if (res.status >= 200 && res.status < 300) {
        itemsTotal.value = res.data
        itemsLocal.value = []
      }
    }
  } catch {
    notifyError('Error al obtener la lista de compras')
  } finally {
    cargando.value = false
  }
}

const exportarCSV = () => {
  let rows: string[][] = []
  if (modo.value === 'local') {
    rows = [['Producto', 'Objetivo', 'Actual', 'A comprar']]
    itemsLocal.value.forEach((i) =>
      rows.push([
        i.producto_nombre,
        String(i.cantidad_objetivo),
        String(i.cantidad_actual),
        String(i.cantidad_a_comprar),
      ]),
    )
  } else {
    rows = [['Producto', 'A comprar']]
    itemsTotal.value.forEach((i) => rows.push([i.producto_nombre, String(i.cantidad_a_comprar)]))
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lista-compras-${modo.value}-${fecha.value || 'hoy'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const formatNum = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <ShoppingCart :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Lista de Compras</h1>
          <p class="text-sm text-white/90">
            Productos a comprar según el último conteo vs. la plantilla
          </p>
        </div>
      </div>
      <button
        v-if="consultado && (itemsLocal.length > 0 || itemsTotal.length > 0)"
        type="button"
        @click="exportarCSV"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-white/90"
      >
        <Download :size="18" />
        Exportar CSV
      </button>
    </div>

    <!-- Filtros -->
    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white p-4 shadow-sm">
      <div class="grid gap-3 sm:grid-cols-[200px_1fr_180px_auto]">
        <select
          v-model="modo"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        >
          <option value="local">Por local</option>
          <option value="total">Total (todos los locales)</option>
        </select>
        <select
          v-model="localId"
          :disabled="modo === 'total'"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:bg-[var(--bg-100)]"
        >
          <option :value="null" disabled>Seleccioná un local...</option>
          <option v-for="l in locales" :key="l.id" :value="l.id">{{ l.nombre }}</option>
        </select>
        <input
          v-model="fecha"
          type="date"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        />
        <BaseButton :loading="cargando" @click="consultar">Consultar</BaseButton>
      </div>
    </div>

    <!-- Resultados por local -->
    <div
      v-if="consultado && modo === 'local'"
      class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm"
    >
      <div class="border-b border-[var(--bg-200)] p-4">
        <p class="text-sm text-[var(--text-200)]">
          <span class="font-semibold text-[var(--text-100)]">{{ localNombre || '-' }}</span>
          · Fecha referencia:
          <span class="font-semibold text-[var(--text-100)]">{{ fechaResp || '-' }}</span>
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Producto
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Objetivo
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Actual
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                A comprar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="itemsLocal.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-sm text-[var(--text-200)]">
                No hay productos para comprar.
              </td>
            </tr>
            <tr
              v-else
              v-for="(it, idx) in itemsLocal"
              :key="`${it.producto_id}-${idx}`"
              class="border-b border-[var(--bg-200)] hover:bg-[var(--bg-100)]/50"
            >
              <td class="px-6 py-3 text-sm font-medium text-[var(--text-100)]">
                {{ it.producto_nombre }}
              </td>
              <td class="px-6 py-3 text-right text-sm text-[var(--text-200)]">
                {{ formatNum(it.cantidad_objetivo) }}
              </td>
              <td class="px-6 py-3 text-right text-sm text-[var(--text-200)]">
                {{ formatNum(it.cantidad_actual) }}
              </td>
              <td class="px-6 py-3 text-right">
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

    <!-- Resultados total -->
    <div
      v-if="consultado && modo === 'total'"
      class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm"
    >
      <div class="border-b border-[var(--bg-200)] p-4">
        <p class="text-sm text-[var(--text-200)]">
          <span class="font-semibold text-[var(--text-100)]"
            >Total agregado de todos los locales</span
          >
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Producto
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                A comprar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="itemsTotal.length === 0">
              <td colspan="2" class="px-6 py-12 text-center text-sm text-[var(--text-200)]">
                No hay productos para comprar.
              </td>
            </tr>
            <tr
              v-else
              v-for="(it, idx) in itemsTotal"
              :key="`${it.producto_id}-${idx}`"
              class="border-b border-[var(--bg-200)] hover:bg-[var(--bg-100)]/50"
            >
              <td class="px-6 py-3 text-sm font-medium text-[var(--text-100)]">
                {{ it.producto_nombre }}
              </td>
              <td class="px-6 py-3 text-right">
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

    <!-- Estado inicial -->
    <div
      v-if="!consultado"
      class="rounded-2xl border border-dashed border-[var(--bg-300)] bg-white p-12 text-center"
    >
      <ShoppingCart :size="40" class="mx-auto mb-3 text-[var(--bg-300)]" />
      <p class="font-semibold text-[var(--text-100)]">Generá una lista de compras</p>
      <p class="mt-1 text-sm text-[var(--text-200)]">
        Elegí el modo, el local (o total) y la fecha, y pulsá Consultar.
      </p>
    </div>
  </div>
</template>
