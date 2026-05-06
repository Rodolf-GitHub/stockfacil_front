<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Lock,
  RotateCcw,
  Save,
  ZapOff,
} from 'lucide-vue-next'
import {
  conteostockApiActualizarItem,
  conteostockApiCrearItem,
  conteostockApiFinalizarConteo,
  conteostockApiListarItems,
  conteostockApiObtenerConteo,
  conteostockApiReabrirConteo,
} from '@/apps/conteos_stock/api'
import type { ConteoStockSchema, ItemConteoStockSchema } from '@/apps/conteos_stock/api/schemas'
import { plantillastockApiListarPlantillas } from '@/apps/plantillas_stock/api'
import type { PlantillaStockSchema } from '@/apps/plantillas_stock/api/schemas'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import { productoApiListarProductos } from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import ConteoAsistidoModal from '@/apps/conteos_stock/components/ConteoAsistidoModal.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const route = useRoute()
const router = useRouter()
const { success, error: notifyError } = useNotification()

const conteoId = computed(() => Number(route.params.id))

const conteo = ref<ConteoStockSchema | null>(null)
const plantillaItems = ref<PlantillaStockSchema[]>([])
const itemsExistentes = ref<ItemConteoStockSchema[]>([])
const locales = ref<LocalSchema[]>([])
const productos = ref<ProductoSchema[]>([])

const cargando = ref(true)
const guardando = ref<Set<number>>(new Set())
const finalizando = ref(false)
const reabriendo = ref(false)
const rellenando = ref(false)

const cantidades = ref<Record<number, string>>({})
const productoFocusado = ref<number | null>(null)
let blurTimer: ReturnType<typeof setTimeout> | null = null

// Visual Viewport — para posicionar el panel encima del teclado en móvil
const footerBottom = ref(0)
const onViewportResize = () => {
  const vv = window.visualViewport
  if (!vv) return
  footerBottom.value = window.innerHeight - vv.height - vv.offsetTop
}

const showWizard = ref(false)
const soloFaltantes = ref(false)

const itemsFiltrados = computed(() =>
  soloFaltantes.value
    ? plantillaItems.value.filter((p) => !yaContado(p.producto_id))
    : plantillaItems.value,
)

const QUICK_VALUES = [0, 0.5, 1, 2, 5, 10]

const mostrarFooter = computed(
  () => productoFocusado.value != null || todosContados.value || esSoloLectura.value,
)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const esSoloLectura = computed(() => conteo.value?.estado === 'finalizado')

const localNombre = computed(() => {
  if (!conteo.value) return ''
  return locales.value.find((l) => l.id === conteo.value!.local)?.nombre ?? `#${conteo.value.local}`
})

const productoNombre = (id: number) => productos.value.find((p) => p.id === id)?.nombre ?? `#${id}`
const productoUnidad = (id: number) => productos.value.find((p) => p.id === id)?.unidad_medida ?? ''

const itemParaProducto = (productoId: number): ItemConteoStockSchema | undefined =>
  itemsExistentes.value.find((it) => it.producto === productoId)

const yaContado = (productoId: number): boolean => {
  const item = itemParaProducto(productoId)
  return item != null && item.cantidad_conteada != null && item.cantidad_conteada !== ''
}

const itemsContados = computed(
  () => plantillaItems.value.filter((p) => yaContado(p.producto_id)).length,
)
const totalSteps = computed(() => plantillaItems.value.length)
const progresoPct = computed(() =>
  totalSteps.value === 0 ? 0 : Math.round((itemsContados.value / totalSteps.value) * 100),
)
const todosContados = computed(
  () => totalSteps.value > 0 && itemsContados.value >= totalSteps.value,
)
const faltantes = computed(
  () => plantillaItems.value.filter((p) => !yaContado(p.producto_id)).length,
)

const formatFecha = (f?: string) => {
  if (!f) return '-'
  const m = f.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return f
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-AR')
}

const estadoClass = (estado?: string) => {
  if (estado === 'finalizado') return 'bg-emerald-100 text-emerald-700'
  return 'bg-amber-100 text-amber-700'
}

const unidadLabel = (p: PlantillaStockSchema) =>
  p.producto_unidad_medida || productoUnidad(p.producto_id) || ''

const cargar = async () => {
  cargando.value = true
  try {
    const [resConteo, resLocales, resProductos] = await Promise.all([
      conteostockApiObtenerConteo(conteoId.value, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
      localApiListarLocales({ limit: 1000, offset: 0 }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
      productoApiListarProductos({ limit: 1000, offset: 0 }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
    ])

    if (resConteo.status >= 200 && resConteo.status < 300) {
      conteo.value = resConteo.data
    } else {
      notifyError('No se encontró el conteo')
      router.push({ name: 'conteos' })
      return
    }

    if (resLocales.status >= 200 && resLocales.status < 300) locales.value = resLocales.data.items
    if (resProductos.status >= 200 && resProductos.status < 300)
      productos.value = resProductos.data.items

    const [resPlant, resItems] = await Promise.all([
      plantillastockApiListarPlantillas({ local_id: conteo.value!.local, limit: 1000, offset: 0 }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
      conteostockApiListarItems(conteoId.value, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
    ])

    if (resPlant.status >= 200 && resPlant.status < 300) plantillaItems.value = resPlant.data.items
    if (resItems.status >= 200 && resItems.status < 300) itemsExistentes.value = resItems.data

    const nuevasCantidades: Record<number, string> = {}
    for (const item of itemsExistentes.value) {
      if (item.producto != null && item.cantidad_conteada != null) {
        nuevasCantidades[item.producto] = String(parseFloat(String(item.cantidad_conteada)))
      }
    }
    cantidades.value = nuevasCantidades
  } catch {
    notifyError('Error al cargar el conteo')
  } finally {
    cargando.value = false
  }
}

const guardarItem = async (productoId: number): Promise<void> => {
  if (!conteo.value?.id || esSoloLectura.value) return
  if (guardando.value.has(productoId)) return

  const valorStr = cantidades.value[productoId]
  if (valorStr === '' || valorStr == null) return

  const cant = Number(valorStr)
  if (Number.isNaN(cant) || cant < 0) {
    notifyError('Cantidad inválida')
    return
  }

  const existente = itemParaProducto(productoId)
  if (existente && Number(existente.cantidad_conteada) === cant) return

  guardando.value = new Set([...guardando.value, productoId])
  try {
    if (existente?.id) {
      const res = await conteostockApiActualizarItem(
        existente.id,
        { cantidad_conteada: cant },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        existente.cantidad_conteada = String(cant)
      }
    } else {
      const res = await conteostockApiCrearItem(
        { conteo_stock_id: conteo.value.id, producto_id: productoId, cantidad_conteada: cant },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        itemsExistentes.value.push(res.data)
      }
    }
  } catch {
    notifyError('Error al guardar')
  } finally {
    const next = new Set(guardando.value)
    next.delete(productoId)
    guardando.value = next
  }
}

const footerInputActivo = ref(false)
const footerInputRef = ref<HTMLInputElement | null>(null)

const seleccionarProducto = (productoId: number) => {
  if (esSoloLectura.value) return
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  productoFocusado.value = productoId
  nextTick(() => {
    footerInputRef.value?.focus()
    footerInputRef.value?.select()
    scrollToProducto(productoId)
  })
}

const onFooterInputFocus = () => {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  footerInputActivo.value = true
  // El panel es fixed; el visual viewport listener actualiza footerBottom automáticamente.
}

const onFooterInputBlur = () => {
  footerInputActivo.value = false
  if (productoFocusado.value != null) guardarItem(productoFocusado.value)
  blurTimer = setTimeout(() => {
    productoFocusado.value = null
    blurTimer = null
  }, 200)
}

onUnmounted(() => {
  if (blurTimer) clearTimeout(blurTimer)
  window.visualViewport?.removeEventListener('resize', onViewportResize)
  window.visualViewport?.removeEventListener('scroll', onViewportResize)
})

const scrollToProducto = (productoId: number) => {
  nextTick(() => {
    const el = document.getElementById(`row-producto-${productoId}`)
    if (!el) return
    const vv = window.visualViewport
    // Altura visible real (sin el teclado)
    const visibleHeight = vv ? vv.height : window.innerHeight
    const rect = el.getBoundingClientRect()
    // Centro del área visible encima del teclado
    const targetCenter = visibleHeight / 2
    const elCenter = rect.top + rect.height / 2
    const diff = elCenter - targetCenter
    if (Math.abs(diff) > 10) {
      window.scrollBy({ top: diff, behavior: 'smooth' })
    }
  })
}

const aplicarQuick = (val: number) => {
  if (productoFocusado.value == null || esSoloLectura.value) return
  const id = productoFocusado.value
  cantidades.value[id] = String(val)
  guardarItem(id)
  scrollToProducto(id)
  const idx = itemsFiltrados.value.findIndex((p) => p.producto_id === id)
  const siguiente = itemsFiltrados.value.slice(idx + 1).find((p) => !yaContado(p.producto_id))
  if (siguiente) {
    seleccionarProducto(siguiente.producto_id)
  }
}

const irAlSiguiente = () => {
  if (productoFocusado.value == null) return
  guardarItem(productoFocusado.value)
  const idx = itemsFiltrados.value.findIndex((p) => p.producto_id === productoFocusado.value)
  const siguiente = itemsFiltrados.value.slice(idx + 1).find((p) => !yaContado(p.producto_id))
  if (siguiente) {
    seleccionarProducto(siguiente.producto_id)
  }
}

const rellenarConCero = async () => {
  if (esSoloLectura.value) return
  const cant = faltantes.value
  rellenando.value = true
  try {
    for (const p of plantillaItems.value) {
      if (!yaContado(p.producto_id)) {
        cantidades.value[p.producto_id] = '0'
        await guardarItem(p.producto_id)
      }
    }
    success(`${cant} producto${cant !== 1 ? 's' : ''} marcado${cant !== 1 ? 's' : ''} con 0`)
  } finally {
    rellenando.value = false
  }
}

const finalizarConteo = async () => {
  if (!conteo.value?.id) return
  if (!todosContados.value) {
    notifyError('Faltan productos por contar')
    return
  }
  finalizando.value = true
  try {
    const res = await conteostockApiFinalizarConteo(conteo.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo finalizado')
      conteo.value.estado = 'finalizado'
    }
  } catch {
    notifyError('Error al finalizar el conteo')
  } finally {
    finalizando.value = false
  }
}

const reabrirConteo = async () => {
  if (!conteo.value?.id) return
  reabriendo.value = true
  try {
    const res = await conteostockApiReabrirConteo(conteo.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo reabierto')
      conteo.value.estado = res.data?.estado ?? 'borrador'
    }
  } catch {
    notifyError('Error al reabrir el conteo')
  } finally {
    reabriendo.value = false
  }
}

const labelQuick = (v: number) => (v === 0.5 ? '½' : String(v))

onMounted(() => {
  cargar()
  onViewportResize()
  window.visualViewport?.addEventListener('resize', onViewportResize)
  window.visualViewport?.addEventListener('scroll', onViewportResize)
})
</script>

<template>
  <div class="flex flex-col gap-4 pb-40">
    <!-- Header -->
    <div
      class="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push({ name: 'conteos' })"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white transition-colors hover:bg-white/30"
          title="Volver a conteos"
        >
          <ArrowLeft :size="18" />
        </button>
        <div>
          <h1 class="text-lg font-bold leading-tight text-white sm:text-xl">
            <template v-if="conteo">
              {{ localNombre }}
              <span class="font-normal opacity-75">· {{ formatFecha(conteo.fecha) }}</span>
            </template>
            <template v-else>Cargando...</template>
          </h1>
          <p class="text-xs text-white/75">Registrá las cantidades de cada producto</p>
        </div>
      </div>
      <div v-if="conteo" class="flex shrink-0 items-center gap-2">
        <button
          v-if="totalSteps > 0 || esSoloLectura"
          type="button"
          @click="showWizard = true"
          class="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/30"
        >
          <ListChecks :size="14" />
          Asistido
        </button>
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
          :class="estadoClass(conteo.estado)"
        >
          {{ conteo.estado || 'abierto' }}
        </span>
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="space-y-2">
      <div class="h-3 w-full animate-pulse rounded-full bg-[var(--bg-200)]"></div>
      <div
        v-for="n in 8"
        :key="n"
        class="h-12 w-full animate-pulse rounded-xl bg-[var(--bg-200)]"
      ></div>
    </div>

    <template v-else-if="conteo">
      <!-- Barra de progreso + botón rellenar -->
      <div
        class="flex flex-col gap-3 rounded-2xl border border-[var(--bg-300)]/50 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div class="flex-1">
          <div class="mb-1.5 flex items-center justify-between text-xs">
            <span class="font-semibold text-[var(--text-100)]">
              <span class="font-bold text-teal-600">{{ itemsContados }}</span>
              / {{ totalSteps }} contados
            </span>
            <span class="text-[var(--text-200)]">{{ progresoPct }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-200)]">
            <div
              class="h-full rounded-full bg-teal-500 transition-all duration-500"
              :style="{ width: `${progresoPct}%` }"
            ></div>
          </div>
          <p
            v-if="todosContados && !esSoloLectura"
            class="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600"
          >
            <CheckCircle2 :size="13" /> ¡Todos contados! Ya podés finalizar.
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            v-if="faltantes > 0"
            type="button"
            @click="soloFaltantes = !soloFaltantes"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            :class="
              soloFaltantes
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-[var(--bg-300)] bg-white text-[var(--text-100)] hover:bg-[var(--bg-100)]'
            "
          >
            Solo faltantes ({{ faltantes }})
          </button>
          <button
            v-if="!esSoloLectura && faltantes > 0"
            type="button"
            :disabled="rellenando"
            @click="rellenarConCero"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--bg-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-100)] shadow-sm transition-colors hover:bg-[var(--bg-100)] disabled:opacity-50"
          >
            <ZapOff :size="13" class="text-amber-500" />
            Poner {{ faltantes }} en 0
          </button>
        </div>
      </div>

      <!-- Sin plantilla -->
      <div
        v-if="totalSteps === 0"
        class="rounded-2xl border border-dashed border-[var(--bg-300)] p-10 text-center"
      >
        <ListChecks :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">
          Este local no tiene plantilla configurada
        </p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          Agregá productos a la plantilla del local para poder hacer conteos.
        </p>
      </div>

      <!-- Lista de productos -->
      <div
        v-else
        class="overflow-hidden rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm"
      >
        <!-- Cabecera -->
        <div
          class="flex items-center gap-2 border-b border-[var(--bg-200)] bg-[var(--bg-100)]/60 px-3 py-1.5"
        >
          <span class="w-6 shrink-0"></span>
          <span
            class="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]"
            >Producto</span
          >
          <span
            class="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]"
            >Cuánto hay</span
          >
        </div>
        <div
          v-for="(p, idx) in itemsFiltrados"
          :key="p.id ?? p.producto_id"
          :id="`row-producto-${p.producto_id}`"
          class="flex items-center gap-2 border-b border-[var(--bg-200)] px-3 py-2.5 last:border-0 transition-colors select-none"
          :class="[
            yaContado(p.producto_id) ? 'bg-emerald-50/60' : 'bg-white',
            productoFocusado === p.producto_id && !esSoloLectura
              ? 'ring-2 ring-inset ring-teal-400/60'
              : '',
            !esSoloLectura
              ? 'cursor-pointer hover:bg-[var(--bg-100)]/60 active:bg-[var(--bg-200)]/40'
              : '',
          ]"
          @click="seleccionarProducto(p.producto_id)"
        >
          <!-- Indicador -->
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            :class="
              yaContado(p.producto_id)
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--bg-200)] text-[var(--text-200)]'
            "
          >
            <CheckCircle2 v-if="yaContado(p.producto_id)" :size="13" />
            <span v-else>{{ idx + 1 }}</span>
          </span>

          <!-- Nombre + unidad -->
          <div class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold leading-tight text-[var(--text-100)]">
              {{ p.producto_nombre || productoNombre(p.producto_id) }}
            </span>
            <span
              v-if="unidadLabel(p)"
              class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-200)]"
            >
              {{ unidadLabel(p) }}
            </span>
          </div>

          <!-- Valor actual -->
          <div class="relative flex shrink-0 items-center gap-1">
            <span
              class="min-w-[3rem] rounded-lg border px-2.5 py-1.5 text-right text-sm font-bold"
              :class="
                yaContado(p.producto_id)
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-[var(--bg-300)] bg-[var(--bg-100)] text-[var(--text-200)]'
              "
            >
              {{ cantidades[p.producto_id] ?? '—' }}
            </span>
            <span v-if="guardando.has(p.producto_id)" class="flex items-center">
              <Save :size="11" class="animate-pulse text-teal-500" />
            </span>
          </div>
        </div>
      </div>

      <!-- Footer fijo: visible solo con foco, al 100%, o finalizado -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="mostrarFooter"
          class="fixed right-0 left-0 z-30 border-t border-[var(--bg-300)]/60 bg-white/98 px-4 py-3 shadow-2xl backdrop-blur"
          :style="{ bottom: `${footerBottom}px` }"
        >
          <!-- Quick values: solo cuando hay un input enfocado -->
          <div
            v-if="productoFocusado != null && !esSoloLectura"
            class="mb-3 border-b border-[var(--bg-200)] pb-3"
          >
            <p
              class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)]"
            >
              Cantidad rápida
              <span class="ml-1 font-normal normal-case text-teal-600">
                ·
                {{
                  plantillaItems.find((p) => p.producto_id === productoFocusado)?.producto_nombre ||
                  productoNombre(productoFocusado)
                }}
              </span>
            </p>
            <div class="flex gap-1.5">
              <button
                v-for="val in QUICK_VALUES"
                :key="val"
                type="button"
                @mousedown.prevent="aplicarQuick(val)"
                class="flex-1 rounded-lg border py-2 text-sm font-bold transition-colors"
                :class="
                  String(cantidades[productoFocusado]) === String(val)
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-[var(--bg-300)] bg-[var(--bg-100)] text-[var(--text-100)] hover:border-teal-400 hover:bg-teal-50'
                "
              >
                {{ labelQuick(val) }}
              </button>
            </div>
            <!-- Input manual + siguiente -->
            <div class="mt-2 flex gap-1.5">
              <input
                v-model="cantidades[productoFocusado]"
                type="number"
                step="0.01"
                min="0"
                placeholder="Otro valor…"
                class="flex-1 rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm font-bold text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                ref="footerInputRef"
                @focus="onFooterInputFocus"
                @blur="onFooterInputBlur"
                @keyup.enter="irAlSiguiente"
              />
              <button
                type="button"
                @mousedown.prevent="irAlSiguiente"
                class="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600"
              >
                <ArrowRight :size="16" />
              </button>
            </div>
          </div>

          <!-- Finalizar / Reabrir: solo cuando corresponde -->
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 text-xs text-[var(--text-200)]">
              <span v-if="esSoloLectura" class="flex items-center gap-1">
                <Lock :size="12" /> Conteo finalizado
              </span>
              <span
                v-else-if="todosContados"
                class="flex items-center gap-1 font-medium text-emerald-600"
              >
                <CheckCircle2 :size="13" /> ¡Todos los productos contados!
              </span>
            </div>

            <BaseButton
              v-if="esSoloLectura"
              variant="secondary"
              :loading="reabriendo"
              @click="reabrirConteo"
            >
              <RotateCcw :size="14" />
              Reabrir
            </BaseButton>

            <BaseButton
              v-else-if="todosContados"
              variant="success"
              :loading="finalizando"
              @click="finalizarConteo"
            >
              <CheckCircle2 :size="14" />
              Finalizar conteo
            </BaseButton>
          </div>
        </div>
      </Transition>
    </template>
  </div>

  <ConteoAsistidoModal
    v-if="conteo"
    :show="showWizard"
    :conteo="conteo"
    :local-nombre="localNombre"
    :plantilla-items-inicial="plantillaItems"
    :items-existentes-inicial="itemsExistentes"
    @close="showWizard = false"
    @finalizado="
      (c) => {
        conteo!.estado = c.estado
        showWizard = false
      }
    "
    @reabierto="
      (c) => {
        conteo!.estado = c.estado
      }
    "
    @item-guardado="
      (item) => {
        const idx = itemsExistentes.findIndex((i) => i.id === item.id)
        if (idx >= 0) itemsExistentes[idx] = item
        else itemsExistentes.push(item)
        cantidades[item.producto!] = String(item.cantidad_conteada)
      }
    "
  />
</template>
