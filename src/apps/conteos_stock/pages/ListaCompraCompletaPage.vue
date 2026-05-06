<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Clipboard, ExternalLink, ShoppingCart } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import { useNotification } from '@/composables/useNotification'

const router = useRouter()
const { success, error: notifyError } = useNotification()

type ItemNarrado = {
  producto_id: number
  producto_nombre: string
  unidad_medida: string
  cantidad_a_comprar: number
  cantidad_actual?: number
  cantidad_objetivo?: number
}

type ListaSnapshot = {
  fecha: string
  localId: number | null
  localNombre: string
  items: ItemNarrado[]
  localesSinConteo: string[]
}

const snapshot = ref<ListaSnapshot | null>(null)
const cargando = ref(false)
const ordenUrgente = ref(false)

onMounted(async () => {
  cargando.value = true
  try {
    const raw = sessionStorage.getItem('compras_lista_snapshot')
    if (!raw) {
      notifyError('No hay datos para mostrar. Volvé a la pantalla de compras.')
      return
    }
    snapshot.value = JSON.parse(raw) as ListaSnapshot
  } catch {
    notifyError('No se pudo leer la lista de compras')
  } finally {
    cargando.value = false
  }
})

const itemsNarrados = computed(() => snapshot.value?.items ?? [])

const tieneDetalle = computed(() => itemsNarrados.value.some((it) => it.cantidad_objetivo != null))

const urgenciaPct = (it: ItemNarrado) => {
  const actual = Number(it.cantidad_actual) || 0
  const objetivo = Number(it.cantidad_objetivo) || 0
  return objetivo > 0 ? actual / objetivo : 0
}

const itemsOrdenados = computed(() => {
  const sorted = [...itemsNarrados.value]
  if (ordenUrgente.value) {
    if (tieneDetalle.value) {
      sorted.sort((a, b) => urgenciaPct(a) - urgenciaPct(b))
    } else {
      sorted.sort(
        (a, b) => (Number(b.cantidad_a_comprar) || 0) - (Number(a.cantidad_a_comprar) || 0),
      )
    }
  }
  return sorted
})

const totalAComprar = computed(
  () => itemsNarrados.value.filter((it) => (Number(it.cantidad_a_comprar) || 0) > 0).length,
)

const colorBadge = (it: ItemNarrado) => {
  const comprar = Number(it.cantidad_a_comprar) || 0
  if (comprar <= 0) return 'bg-emerald-100 text-emerald-700'
  if (!tieneDetalle.value) return 'bg-rose-100 text-rose-700'
  const pct = urgenciaPct(it)
  if (pct >= 0.75) return 'bg-yellow-100 text-yellow-800'
  if (pct >= 0.3) return 'bg-orange-200 text-orange-800'
  return 'bg-red-200 text-red-800'
}

const formatNum = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '-'
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(num)) return String(n)
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const fechaTitulo = computed(() => {
  if (!snapshot.value?.fecha) return '-'
  const d = new Date(`${snapshot.value.fecha}T00:00:00`)
  if (Number.isNaN(d.getTime())) return snapshot.value.fecha
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${d.getDate()} de ${meses[d.getMonth()]}`
})

const textoParaCopiar = computed(() => {
  const encabezado = `${fechaTitulo.value}, esto es lo que debes comprar:`
  const alcance = `Negocio(s): ${snapshot.value?.localNombre ?? 'Todos los negocios'}`
  const items = itemsNarrados.value.filter((it) => (Number(it.cantidad_a_comprar) || 0) > 0)
  if (items.length === 0) return `${encabezado}\n${alcance}\n\nNo hay productos para comprar.`
  const lineas = items.map(
    (it) =>
      `- ${formatNum(it.cantidad_a_comprar)} ${it.unidad_medida || 'unidades'} de ${it.producto_nombre}`,
  )
  return `${encabezado}\n${alcance}\n\n${lineas.join('\n')}`
})

const volver = () => router.push({ name: 'compras' })

const irAComprasNegocio = () => router.push({ name: 'compras' })

const copiarLista = async () => {
  try {
    await navigator.clipboard.writeText(textoParaCopiar.value)
    success('Lista copiada al portapapeles')
  } catch {
    notifyError('No se pudo copiar la lista')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
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
          <h1 class="text-lg font-bold text-white sm:text-2xl">Lista de compra completa</h1>
          <p class="text-xs text-white/90 sm:text-sm">{{ fechaTitulo }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" class="!bg-white !text-rose-700" @click="volver">
          <span class="inline-flex items-center gap-2"><ArrowLeft :size="16" />Volver</span>
        </BaseButton>
        <BaseButton variant="secondary" class="!bg-white !text-rose-700" @click="copiarLista">
          <span class="inline-flex items-center gap-2"><Clipboard :size="16" />Copiar lista</span>
        </BaseButton>
      </div>
    </div>

    <!-- Tabla -->
    <div class="overflow-hidden rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <!-- Cabecera de la tarjeta -->
      <div
        class="flex items-center justify-between gap-2 border-b border-[var(--bg-200)] px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-2.5 py-1 text-xs font-semibold text-[var(--text-100)] transition-colors hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            title="Ver en pantalla de compras"
            @click="irAComprasNegocio"
          >
            <ExternalLink :size="12" />
            {{ snapshot?.localNombre || 'Todos los negocios' }}
          </button>
          <span class="text-xs text-[var(--text-200)]">
            {{ totalAComprar }} ítem{{ totalAComprar !== 1 ? 's' : '' }} a comprar
          </span>
        </div>
        <span class="text-xs text-[var(--text-200)]">{{ fechaTitulo }}</span>
      </div>

      <!-- Subheader urgente -->
      <div
        class="flex items-center justify-between border-b border-[var(--bg-200)] bg-[var(--bg-100)]/60 px-4 py-2"
      >
        <span class="text-[11px] text-[var(--text-200)]"
          >{{ itemsNarrados.length }} ítem{{ itemsNarrados.length !== 1 ? 's' : '' }} en total</span
        >
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors"
          :class="
            ordenUrgente
              ? 'border-red-300 bg-red-600 text-white'
              : 'border-[var(--bg-300)] bg-white text-[var(--text-200)] hover:bg-red-50 hover:text-red-700'
          "
          @click="ordenUrgente = !ordenUrgente"
        >
          ⚠️ {{ ordenUrgente ? 'Orden: urgentes primero' : 'Ver urgentes primero' }}
        </button>
      </div>

      <!-- Skeleton -->
      <div v-if="cargando" class="space-y-2 p-4">
        <div
          v-for="n in 5"
          :key="`sk-${n}`"
          class="h-5 w-full animate-pulse rounded bg-[var(--bg-200)]"
        ></div>
      </div>

      <!-- Vacío -->
      <div
        v-else-if="itemsNarrados.length === 0"
        class="px-4 py-8 text-center text-sm text-[var(--text-200)]"
      >
        No hay productos para esta lista.
      </div>

      <!-- Tabla -->
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
            <th
              class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Producto
            </th>
            <template v-if="tieneDetalle">
              <th
                class="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-3 sm:text-xs"
                title="Cantidad objetivo según plantilla"
              >
                Necesitás
              </th>
              <th
                class="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-3 sm:text-xs"
                title="Cantidad actual en stock según conteo"
              >
                Tenés
              </th>
            </template>
            <th
              class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Comprá
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="it in itemsOrdenados"
            :key="`item-${it.producto_id}`"
            class="border-b border-[var(--bg-200)] last:border-0 transition-colors"
            :class="(Number(it.cantidad_a_comprar) || 0) <= 0 ? 'bg-emerald-50/60 opacity-60' : ''"
          >
            <td
              class="px-3 py-2 sm:px-4"
              :class="
                (Number(it.cantidad_a_comprar) || 0) <= 0
                  ? 'text-emerald-700'
                  : 'text-[var(--text-100)]'
              "
            >
              <span
                class="block text-sm font-medium"
                :class="
                  (Number(it.cantidad_a_comprar) || 0) <= 0
                    ? 'line-through decoration-emerald-400/70'
                    : ''
                "
                >{{ it.producto_nombre }}</span
              >
              <span
                class="block text-[11px]"
                :class="
                  (Number(it.cantidad_a_comprar) || 0) <= 0
                    ? 'text-emerald-500'
                    : 'text-[var(--text-200)]'
                "
              >
                {{ it.unidad_medida || '-' }}
              </span>
            </td>
            <template v-if="tieneDetalle">
              <td
                class="px-2 py-2 text-right text-xs sm:px-3 sm:text-sm"
                :class="
                  (Number(it.cantidad_a_comprar) || 0) <= 0
                    ? 'text-emerald-600'
                    : 'text-[var(--text-200)]'
                "
              >
                {{ formatNum(it.cantidad_objetivo) }}
              </td>
              <td
                class="px-2 py-2 text-right text-xs sm:px-3 sm:text-sm"
                :class="
                  (Number(it.cantidad_a_comprar) || 0) <= 0
                    ? 'text-emerald-600'
                    : 'text-[var(--text-200)]'
                "
              >
                {{ formatNum(it.cantidad_actual) }}
              </td>
            </template>
            <td class="px-3 py-2 text-right sm:px-4">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold sm:px-2.5 sm:py-1 sm:text-sm"
                :class="colorBadge(it)"
              >
                {{
                  (Number(it.cantidad_a_comprar) || 0) <= 0 ? '✓' : formatNum(it.cantidad_a_comprar)
                }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
