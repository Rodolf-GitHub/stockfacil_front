<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Clipboard, ShoppingCart } from 'lucide-vue-next'
import { conteostockApiResumenPorFecha } from '@/apps/conteos_stock/api'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const router = useRouter()
const { success, error: notifyError } = useNotification()

type ItemNarrado = {
  producto_id: number
  producto_nombre: string
  unidad_medida: string
  cantidad_a_comprar: number
}

const locales = ref<LocalSchema[]>([])
const localSeleccionado = ref<number | null>(null)
const fechaSeleccionada = ref('')
const items = ref<ItemNarrado[]>([])
const cargando = ref(false)
const marcados = ref<Set<number>>(new Set())
// IDs en transición (marcados pero todavía visibles en pendientes durante 3s)
const animando = ref<Set<number>>(new Set())
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const lsKey = () =>
  `lista_compras_marcados_${fechaSeleccionada.value}_${localSeleccionado.value ?? 'todos'}`

const LS_PREFIX = 'lista_compras_marcados_'
const MAX_LS_ENTRIES = 5

const guardarMarcados = () => {
  if (!fechaSeleccionada.value) return
  const key = lsKey()
  localStorage.setItem(key, JSON.stringify([...marcados.value]))
  // Mantener solo las últimas MAX_LS_ENTRIES entradas
  const allKeys = Object.keys(localStorage)
    .filter((k) => k.startsWith(LS_PREFIX))
    .sort() // las claves contienen fecha YYYY-MM-DD → orden cronológico
  if (allKeys.length > MAX_LS_ENTRIES) {
    allKeys.slice(0, allKeys.length - MAX_LS_ENTRIES).forEach((k) => localStorage.removeItem(k))
  }
}

const restaurarMarcados = () => {
  try {
    const raw = localStorage.getItem(lsKey())
    marcados.value = raw ? new Set(JSON.parse(raw) as number[]) : new Set()
  } catch {
    marcados.value = new Set()
  }
}

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

const cargarLista = async () => {
  if (!fechaSeleccionada.value) return
  // Cancelar timers pendientes al cambiar filtros
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  animando.value = new Set()
  cargando.value = true
  try {
    const res = await conteostockApiResumenPorFecha(
      { fecha: fechaSeleccionada.value, local_id: localSeleccionado.value ?? undefined },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      const data = res.data as any
      const localesData: any[] = Array.isArray(data) ? data : (data.locales ?? [])
      const itemsMap = new Map<number, ItemNarrado>()
      for (const loc of localesData) {
        for (const it of loc.items ?? []) {
          const comprar = Number(it.cantidad_a_comprar) || 0
          if (comprar <= 0) continue
          const existing = itemsMap.get(it.producto_id)
          if (existing) {
            existing.cantidad_a_comprar += comprar
          } else {
            itemsMap.set(it.producto_id, {
              producto_id: it.producto_id,
              producto_nombre: it.producto_nombre ?? `#${it.producto_id}`,
              unidad_medida: it.unidad_medida ?? '',
              cantidad_a_comprar: comprar,
            })
          }
        }
      }
      items.value = [...itemsMap.values()]
      restaurarMarcados()
    }
  } catch {
    notifyError('Error al cargar la lista')
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  await cargarLocales()
  try {
    const raw = sessionStorage.getItem('compras_lista_snapshot')
    if (raw) {
      const parsed = JSON.parse(raw) as any
      fechaSeleccionada.value = parsed.fecha ?? ''
      localSeleccionado.value = parsed.localId ?? null
      items.value = (parsed.items ?? []).filter(
        (it: any) => (Number(it.cantidad_a_comprar) || 0) > 0,
      )
      restaurarMarcados()
      return
    }
  } catch {
    /* */
  }
  const d = new Date()
  fechaSeleccionada.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await cargarLista()
})

onUnmounted(() => {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
})

watch([localSeleccionado, fechaSeleccionada], cargarLista)
watch(marcados, guardarMarcados, { deep: true })

const itemsOrdenados = computed(() =>
  [...items.value].sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre, 'es')),
)

// Pendientes: ni marcados ni animando (animando sigue mostrándose en la lista con visual especial)
const pendientes = computed(() =>
  itemsOrdenados.value.filter((it) => !marcados.value.has(it.producto_id)),
)
const comprados = computed(() =>
  itemsOrdenados.value.filter((it) => marcados.value.has(it.producto_id)),
)
const porComprar = computed(
  () => pendientes.value.filter((it) => !animando.value.has(it.producto_id)).length,
)

const toggleMarcado = (id: number) => {
  // Si ya está en comprados → desmarcar directamente
  if (marcados.value.has(id)) {
    const next = new Set(marcados.value)
    next.delete(id)
    marcados.value = next
    return
  }
  // Si está animando → cancelar y desmarcar
  if (animando.value.has(id)) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    const next = new Set(animando.value)
    next.delete(id)
    animando.value = next
    return
  }
  // Iniciar animación de 3s
  const a = new Set(animando.value)
  a.add(id)
  animando.value = a
  const timer = setTimeout(() => {
    const a2 = new Set(animando.value)
    a2.delete(id)
    animando.value = a2
    const m = new Set(marcados.value)
    m.add(id)
    marcados.value = m
    timers.delete(id)
  }, 3000)
  timers.set(id, timer)
}

const formatNum = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '-'
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(num)) return String(n)
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const fechaTitulo = computed(() => {
  if (!fechaSeleccionada.value) return '-'
  const d = new Date(`${fechaSeleccionada.value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return fechaSeleccionada.value
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

const nombreLocal = computed(() =>
  localSeleccionado.value
    ? (locales.value.find((l) => l.id === localSeleccionado.value)?.nombre ?? '')
    : 'todos los negocios',
)

const textoParaCopiar = computed(() => {
  const lineas = itemsOrdenados.value.map(
    (it) =>
      `- ${formatNum(it.cantidad_a_comprar)} ${it.unidad_medida || 'u.'} de ${it.producto_nombre}`,
  )
  return `Compras para ${nombreLocal.value} — ${fechaTitulo.value}:\n\n${lineas.join('\n')}`
})

const copiarLista = async () => {
  try {
    await navigator.clipboard.writeText(textoParaCopiar.value)
    success('Lista copiada al portapapeles')
  } catch {
    notifyError('No se pudo copiar la lista')
  }
}

const volver = () => router.push({ name: 'compras' })

// ── Fechas rápidas ──────────────────────────────────────────
const isoDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const fechaConOffset = (dias: number) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return isoDate(d)
}
const setFechaRapida = (dias: number) => {
  fechaSeleccionada.value = fechaConOffset(dias)
}
const esFechaRapida = (dias: number) => fechaSeleccionada.value === fechaConOffset(dias)
</script>

<template>
  <div class="space-y-4 px-2 pb-10 sm:px-4">
    <!-- Encabezado estilo app -->
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
          <h1 class="text-lg font-bold text-white sm:text-2xl">Lista de compras</h1>
          <p class="text-xs text-white/80 sm:text-sm">{{ nombreLocal }} — {{ fechaTitulo }}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="volver"
          class="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-white/20"
        >
          <ArrowLeft :size="15" /> Volver
        </button>
        <button
          type="button"
          @click="copiarLista"
          class="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-white/20"
        >
          <Clipboard :size="15" /> Copiar lista
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div
      class="flex flex-wrap items-end gap-4 rounded-2xl border border-[var(--bg-300)]/50 bg-white px-4 py-3 shadow-sm sm:px-6"
    >
      <label class="flex items-center gap-2">
        <span class="text-sm font-medium text-[var(--text-200)]">Negocio:</span>
        <select
          v-model="localSeleccionado"
          class="rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-2.5 py-1.5 text-sm font-semibold text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <option :value="null">Todos los negocios</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">
            {{ l.nombre }}
          </option>
        </select>
      </label>
      <label class="flex items-center gap-2">
        <span class="text-sm font-medium text-[var(--text-200)]">Fecha:</span>
        <input
          v-model="fechaSeleccionada"
          type="date"
          class="rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-2.5 py-1.5 text-sm font-semibold text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </label>
      <!-- Botones fecha rápida -->
      <div class="flex gap-2">
        <button
          v-for="[label, dias] in [
            ['Hoy', 0],
            ['Ayer', -1],
            ['Antier', -2],
          ] as [string, number][]"
          :key="label"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="
            esFechaRapida(dias)
              ? 'border-rose-300 bg-rose-100 text-rose-700'
              : 'border-[var(--bg-300)] bg-white text-[var(--text-100)] hover:bg-[var(--bg-100)]'
          "
          @click="setFechaRapida(dias)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <!-- Lista de compras -->
    <div
      class="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm"
    >
      <!-- Encabezado "Por comprar" dentro de la tarjeta -->
      <div
        v-if="!cargando && itemsOrdenados.length > 0"
        class="flex items-center justify-between border-b border-dashed border-amber-200 px-5 py-2"
      >
        <span class="text-[10px] font-bold uppercase tracking-widest text-amber-500"
          >Por comprar</span
        >
        <span class="text-xs font-bold text-rose-600">{{ porComprar }}</span>
      </div>

      <!-- Skeleton -->
      <div v-if="cargando" class="space-y-3 px-5 py-5">
        <div v-for="n in 5" :key="n" class="h-5 w-full animate-pulse rounded bg-amber-200/70"></div>
      </div>

      <!-- Vacío -->
      <div
        v-else-if="itemsOrdenados.length === 0"
        class="px-5 py-10 text-center text-sm text-amber-600"
      >
        ✅ No hay nada que comprar para esta fecha y negocio.
      </div>

      <!-- Pendientes -->
      <ul v-else class="px-5 py-3">
        <li
          v-for="it in pendientes"
          :key="`p-${it.producto_id}`"
          class="relative flex cursor-pointer items-start gap-3 border-b border-amber-100 py-2.5 last:border-0"
          :class="animando.has(it.producto_id) ? 'opacity-60' : 'hover:bg-amber-100/50'"
          @click="toggleMarcado(it.producto_id)"
        >
          <!-- Checkbox -->
          <div
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
            :class="
              animando.has(it.producto_id)
                ? 'border-emerald-400 bg-emerald-100 text-emerald-600'
                : 'border-amber-400 bg-white'
            "
          >
            <svg
              v-if="animando.has(it.producto_id)"
              width="11"
              height="9"
              viewBox="0 0 11 9"
              fill="none"
            >
              <path
                d="M1 4.5L4 7.5L10 1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <span
            class="text-[15px] leading-snug transition-all"
            :class="
              animando.has(it.producto_id)
                ? 'text-amber-700 line-through decoration-amber-400'
                : 'text-amber-950'
            "
          >
            <span class="font-bold">{{ formatNum(it.cantidad_a_comprar) }}</span>
            <span
              class="mx-1 text-sm"
              :class="animando.has(it.producto_id) ? '' : 'text-amber-600'"
              >{{ it.unidad_medida || 'u.' }}</span
            >
            de {{ it.producto_nombre }}
          </span>
          <!-- Barra de progreso (solo cuando anima) -->
          <div
            v-if="animando.has(it.producto_id)"
            class="absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded bg-emerald-400"
            style="animation: shrink-bar 3s linear forwards"
          ></div>
        </li>
      </ul>

      <!-- Separador comprados -->
      <div
        v-if="comprados.length > 0"
        class="mx-5 border-t border-dashed border-amber-300 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-500"
      >
        Ya comprado
      </div>

      <!-- Comprados (tachados) -->
      <ul v-if="comprados.length > 0" class="px-5 pb-2">
        <li
          v-for="it in comprados"
          :key="`c-${it.producto_id}`"
          class="flex cursor-pointer items-start gap-3 border-b border-amber-100 py-2 last:border-0 opacity-50 hover:opacity-70"
          @click="toggleMarcado(it.producto_id)"
        >
          <!-- Checkbox marcado -->
          <div
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-emerald-400 bg-emerald-100 text-emerald-600"
          >
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path
                d="M1 4.5L4 7.5L10 1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <span class="text-[15px] leading-snug text-amber-700 line-through decoration-amber-400">
            <span class="font-bold">{{ formatNum(it.cantidad_a_comprar) }}</span>
            <span class="mx-1 text-sm">{{ it.unidad_medida || 'u.' }}</span>
            de {{ it.producto_nombre }}
          </span>
        </li>
      </ul>

      <!-- Pie -->
      <div class="border-t border-amber-200 px-5 py-2.5 text-right text-xs text-amber-500">
        {{ comprados.length }} de {{ itemsOrdenados.length }} comprados
      </div>
    </div>

    <!-- Aviso referencia temporal -->
    <p class="mx-auto max-w-xl text-center text-xs text-[var(--text-200)]">
      ✏️ Los tachados son solo una referencia visual para ayudarte durante la compra. Se guardan
      solo en este dispositivo y no afectan ningún registro del sistema.
    </p>
  </div>
</template>

<style scoped>
@keyframes shrink-bar {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
