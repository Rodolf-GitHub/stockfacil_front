<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-vue-next'
import {
  plantillastockApiActualizarPlantilla,
  plantillastockApiCrearPlantilla,
  plantillastockApiEliminarPlantilla,
  plantillastockApiListarPlantillas,
} from '@/apps/plantillas_stock/api'
import type { PlantillaStockSchema } from '@/apps/plantillas_stock/api/schemas'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import { productoApiListarProductos } from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()

const esAdmin = localStorage.getItem('es_admin') === 'true'

const LIMIT = 100

const plantillas = ref<PlantillaStockSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const localFiltro = ref<number | null>(null)
const cargando = ref(false)

const locales = ref<LocalSchema[]>([])
const productos = ref<ProductoSchema[]>([])

const showFormModal = ref(false)
const modoEditar = ref(false)
const seleccion = ref<PlantillaStockSchema | null>(null)
const pasoCrear = ref(1)
const productoBusquedaModal = ref('')
const form = ref({
  local_id: null as number | null,
  producto_id: null as number | null,
  cantidad: '',
})
const guardando = ref(false)

const showDeleteModal = ref(false)
const aEliminar = ref<PlantillaStockSchema | null>(null)
const eliminando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await plantillastockApiListarPlantillas(
      {
        busqueda: busqueda.value || undefined,
        local_id: localFiltro.value ?? undefined,
        limit: LIMIT,
        offset: offset.value,
      },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      plantillas.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar las plantillas')
  } finally {
    cargando.value = false
  }
}

const cargarLocales = async () => {
  try {
    const res = await localApiListarLocales({ limit: 1000, offset: 0 }, {
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) {
      locales.value = res.data.items
      const primerLocal = locales.value[0]
      if (localFiltro.value == null && primerLocal?.id != null) {
        localFiltro.value = primerLocal.id
      }
    }
  } catch {
    /* */
  }
}

const cargarProductos = async () => {
  try {
    const res = await productoApiListarProductos({ limit: 1000, offset: 0 }, {
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) productos.value = res.data.items
  } catch {
    /* */
  }
}

watch([busqueda, localFiltro], () => {
  offset.value = 0
  cargar()
})
watch(offset, cargar)

onMounted(() => {
  cargarLocales()
  cargarProductos()
})

const localNombre = (id: number) => locales.value.find((l) => l.id === id)?.nombre ?? `#${id}`
const productoNombre = (id: number) => productos.value.find((p) => p.id === id)?.nombre ?? `#${id}`

const productoUnidad = (id: number) => productos.value.find((p) => p.id === id)?.unidad_medida ?? ''

const formatearCantidad = (n: number | string | null | undefined) => {
  const num = Number(n ?? 0)
  if (Number.isNaN(num)) return String(n ?? '')
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '')
}

const unidadLegible = (unidad: string | null | undefined, cantidad: number | string) => {
  const u = (unidad || '').trim().toLowerCase()
  if (!u || u === 'otros') return ''
  const num = Number(cantidad ?? 0)
  const singular = Math.abs(num) === 1
  const map: Record<string, [string, string]> = {
    kg: ['kg', 'kg'],
    unidades: ['unidad', 'unidades'],
    litros: ['litro', 'litros'],
    atados: ['atado', 'atados'],
    cajas: ['caja', 'cajas'],
    sacos: ['saco', 'sacos'],
    bandejas: ['bandeja', 'bandejas'],
    planchas: ['plancha', 'planchas'],
  }
  const par = map[u]
  if (!par) return u
  return singular ? par[0] : par[1]
}

const unidadPlural = (unidad: string | null | undefined) => {
  const u = (unidad || '').trim().toLowerCase()
  if (!u || u === 'otros') return ''
  const map: Record<string, string> = {
    kg: 'kg',
    unidades: 'unidades',
    litros: 'litros',
    atados: 'atados',
    cajas: 'cajas',
    sacos: 'sacos',
    bandejas: 'bandejas',
    planchas: 'planchas',
  }
  return map[u] ?? u
}

const unidadConector = (unidad: string | null | undefined) => {
  const u = unidadPlural(unidad)
  return u ? `en ${u}` : ''
}

const preguntaPasoTres = computed(() => {
  const u = unidadPlural(productoUnidad(form.value.producto_id ?? 0))
  const producto = productoNombre(form.value.producto_id ?? 0).toLowerCase()
  const local = localNombre(form.value.local_id ?? 0)
  if (!u) return `¿Cuánto de ${producto} debe tener ${local} cada día?`
  return `¿Cuántas ${u} de ${producto} debe tener ${local} cada día?`
})

const productosFiltradosModal = computed(() => {
  const q = productoBusquedaModal.value.trim().toLowerCase()
  if (!q) return productos.value
  return productos.value.filter((p) => p.nombre.toLowerCase().includes(q))
})

const seleccionarProductoModal = (productoId: number | null | undefined) => {
  if (productoId == null || modoEditar.value) return
  form.value.producto_id = productoId
}

const puedeSeguirPaso = computed(() => {
  if (pasoCrear.value === 1) return form.value.local_id != null
  if (pasoCrear.value === 2) return form.value.producto_id != null
  return form.value.cantidad !== ''
})

const progresoCrear = computed(() => (pasoCrear.value / 3) * 100)

const pasoTitulo = computed(() => {
  if (pasoCrear.value === 1) return 'Paso 1 de 3 - Elegí el local'
  if (pasoCrear.value === 2) return 'Paso 2 de 3 - Elegí el producto'
  return 'Paso 3 de 3 - Definí la cantidad'
})

const irPasoSiguiente = () => {
  if (!puedeSeguirPaso.value || pasoCrear.value >= 3) return
  pasoCrear.value += 1
}

const irPasoAnterior = () => {
  if (pasoCrear.value <= 1) return
  pasoCrear.value -= 1
}

const cerrarFormModal = () => {
  showFormModal.value = false
  pasoCrear.value = 1
  productoBusquedaModal.value = ''
}

const abrirCrear = () => {
  modoEditar.value = false
  seleccion.value = null
  pasoCrear.value = 1
  productoBusquedaModal.value = ''
  form.value = { local_id: localFiltro.value, producto_id: null, cantidad: '' }
  showFormModal.value = true
}

const abrirEditar = (p: PlantillaStockSchema) => {
  modoEditar.value = true
  seleccion.value = p
  pasoCrear.value = 1
  productoBusquedaModal.value = ''
  form.value = {
    local_id: p.local_id,
    producto_id: p.producto_id,
    cantidad: String(p.cantidad_objetivo),
  }
  showFormModal.value = true
}

const abrirEliminar = (p: PlantillaStockSchema) => {
  aEliminar.value = p
  showDeleteModal.value = true
}

const guardar = async () => {
  const cant = Number(form.value.cantidad)
  if (Number.isNaN(cant) || cant < 0) {
    notifyError('Cantidad inválida')
    return
  }
  guardando.value = true
  try {
    if (modoEditar.value && seleccion.value?.id) {
      const res = await plantillastockApiActualizarPlantilla(
        seleccion.value.id,
        { cantidad_objetivo: cant },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        success('Plantilla actualizada')
        showFormModal.value = false
        await cargar()
      }
    } else {
      if (form.value.local_id == null || form.value.producto_id == null) {
        notifyError('Seleccioná local y producto')
        guardando.value = false
        return
      }
      const res = await plantillastockApiCrearPlantilla(
        {
          local_id: form.value.local_id,
          producto_id: form.value.producto_id,
          cantidad_objetivo: cant,
        },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        success('Plantilla creada')
        showFormModal.value = false
        await cargar()
      }
    }
  } catch {
    notifyError('Error al guardar la plantilla')
  } finally {
    guardando.value = false
  }
}

const confirmarEliminar = async () => {
  if (!aEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await plantillastockApiEliminarPlantilla(aEliminar.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Plantilla eliminada')
      showDeleteModal.value = false
      aEliminar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al eliminar la plantilla')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <ClipboardList :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Plantillas de Stock</h1>
          <p class="text-sm text-white/90">Cantidad objetivo de cada producto por local</p>
        </div>
      </div>
      <button
        v-if="esAdmin"
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-600 shadow-sm transition-all hover:bg-white/90"
      >
        <Plus :size="18" />
        Nueva plantilla
      </button>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <div class="grid gap-3 border-b border-[var(--bg-200)] p-4 sm:grid-cols-[1fr_220px]">
        <div class="relative">
          <Search
            :size="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-200)]"
          />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por producto..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
        <select
          v-model="localFiltro"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">
            {{ l.nombre }}
          </option>
        </select>
      </div>

      <!-- Encabezado con nombre del local seleccionado -->
      <div
        v-if="localFiltro != null"
        class="flex flex-wrap items-start gap-3 border-b border-[var(--bg-200)] bg-gradient-to-r from-cyan-50 to-white px-5 py-4 sm:flex-nowrap sm:items-center sm:px-6"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/20"
        >
          <MapPin :size="18" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-cyan-600">
            Plantilla diaria
          </p>
          <h2 class="text-sm font-bold leading-snug text-[var(--text-100)] sm:text-lg">
            Productos que debe tener
            <span class="text-cyan-600">{{ localNombre(localFiltro) }}</span>
            diariamente
          </h2>
        </div>
        <span
          v-if="!cargando"
          class="ml-auto shrink-0 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700"
        >
          {{ total }} {{ total === 1 ? 'producto' : 'productos' }}
        </span>
      </div>

      <!-- Lista de plantillas en lenguaje natural -->
      <div v-if="cargando" class="divide-y divide-[var(--bg-200)]">
        <div v-for="n in 6" :key="`sk-${n}`" class="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div class="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[var(--bg-200)]"></div>
          <div class="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-200)]"></div>
          <div class="ml-auto h-8 w-16 animate-pulse rounded bg-[var(--bg-200)]"></div>
        </div>
      </div>

      <div v-else-if="plantillas.length === 0" class="px-4 py-12 text-center">
        <ClipboardList :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">No hay plantillas</p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          Creá la primera plantilla con el botón de arriba.
        </p>
      </div>

      <ul v-else class="divide-y divide-[var(--bg-200)]/70">
        <li
          v-for="(p, idx) in plantillas"
          :key="p.id ?? `idx-${idx}`"
          class="group relative flex items-center gap-3 px-4 py-3 transition-all hover:bg-cyan-50/40 sm:gap-4 sm:px-6 sm:py-3.5"
        >
          <span
            class="absolute left-0 top-0 h-full w-1 origin-top scale-y-0 bg-cyan-500 transition-transform group-hover:scale-y-100"
            aria-hidden="true"
          ></span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-600 ring-1 ring-cyan-500/15 transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
          >
            <Package :size="20" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-[var(--text-100)] sm:text-base">
              {{ p.producto_nombre }}
            </p>
            <p class="mt-0.5 text-xs text-[var(--text-200)] sm:text-sm">
              Necesita
              <span class="font-semibold text-cyan-700">
                {{ formatearCantidad(p.cantidad_objetivo) }}
                {{ unidadLegible(p.producto_unidad_medida, p.cantidad_objetivo) }}
              </span>
              por día
            </p>
          </div>
          <span
            class="hidden shrink-0 items-center gap-1 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 ring-1 ring-cyan-500/20 sm:inline-flex"
          >
            {{ formatearCantidad(p.cantidad_objetivo) }}
            <span class="font-medium text-cyan-600/80">
              {{ unidadLegible(p.producto_unidad_medida, p.cantidad_objetivo) }}
            </span>
          </span>
          <div v-if="esAdmin" class="flex shrink-0 gap-1.5">
            <button
              type="button"
              @click="abrirEditar(p)"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 sm:h-10 sm:w-10"
              title="Editar"
            >
              <Pencil :size="16" />
            </button>
            <button
              type="button"
              @click="abrirEliminar(p)"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 sm:h-10 sm:w-10"
              title="Eliminar"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </li>
      </ul>

      <div
        v-if="!cargando && plantillas.length > 0"
        class="flex flex-col gap-3 border-t border-[var(--bg-200)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-[var(--text-200)]">
          Mostrando
          <span class="font-semibold text-[var(--text-100)]">{{ offset + 1 }}</span>
          -
          <span class="font-semibold text-[var(--text-100)]">{{
            Math.min(offset + LIMIT, total)
          }}</span>
          de
          <span class="font-semibold text-[var(--text-100)]">{{ total }}</span>
          registros
        </p>
        <BasePagination
          v-if="total > LIMIT"
          :total="total"
          :limit="LIMIT"
          :offset="offset"
          class="!border-0 !bg-transparent !p-0"
          @update:offset="offset = $event"
        />
      </div>
    </div>
  </div>

  <BaseModal
    :show="showFormModal"
    :title="modoEditar ? 'Editar plantilla' : 'Nueva plantilla'"
    size="md"
    @close="cerrarFormModal"
  >
    <form class="space-y-4" @submit.prevent="guardar">
      <template v-if="!modoEditar">
        <div class="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-semibold text-cyan-700">{{ pasoTitulo }}</p>
            <p class="text-xs font-semibold text-cyan-700">{{ pasoCrear }}/3</p>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-cyan-100">
            <div
              class="h-full bg-cyan-500 transition-all"
              :style="{ width: `${progresoCrear}%` }"
            ></div>
          </div>
        </div>

        <div v-if="pasoCrear === 1">
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            ¿Para qué local querés definir productos?
          </label>
          <div
            class="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[var(--bg-300)] bg-white p-2"
          >
            <button
              v-for="l in locales"
              :key="l.id ?? l.nombre"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
              :class="
                form.local_id === l.id
                  ? 'border-cyan-300 bg-cyan-100 text-cyan-800'
                  : 'border-[var(--bg-300)] hover:bg-[var(--bg-100)] text-[var(--text-100)]'
              "
              @click="form.local_id = l.id ?? null"
            >
              <MapPin :size="15" />
              <span class="text-sm font-medium">{{ l.nombre }}</span>
            </button>
          </div>
        </div>

        <div v-if="pasoCrear === 2">
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            ¿Qué producto querés agregar? <span class="text-red-500">*</span>
          </label>
          <div class="relative mb-3">
            <Search
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-200)]"
            />
            <input
              v-model="productoBusquedaModal"
              type="text"
              placeholder="Buscar producto..."
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
          <div class="rounded-xl border border-[var(--bg-300)] bg-white">
            <div class="max-h-72 space-y-1.5 overflow-y-auto p-2">
              <button
                v-for="p in productosFiltradosModal"
                :key="p.id ?? p.nombre"
                type="button"
                class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all"
                :class="
                  form.producto_id === p.id
                    ? 'border-cyan-400 bg-gradient-to-r from-cyan-50 to-white shadow-sm ring-2 ring-cyan-400/30'
                    : 'border-transparent hover:border-cyan-200 hover:bg-cyan-50/40'
                "
                @click="seleccionarProductoModal(p.id)"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-600 ring-1 ring-cyan-500/15"
                >
                  <Package :size="20" />
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-base font-bold capitalize text-[var(--text-100)] sm:text-lg"
                  >
                    {{ p.nombre }}
                  </p>
                  <p
                    v-if="unidadConector(p.unidad_medida)"
                    class="mt-0.5 text-sm font-medium text-cyan-700"
                  >
                    {{ unidadConector(p.unidad_medida) }}
                  </p>
                </div>
                <span
                  v-if="form.producto_id === p.id"
                  class="shrink-0 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  Elegido
                </span>
              </button>
              <p
                v-if="productosFiltradosModal.length === 0"
                class="px-2 py-4 text-center text-xs text-[var(--text-200)]"
              >
                No hay productos que coincidan con la búsqueda.
              </p>
            </div>
          </div>
          <div class="mt-2 text-xs text-[var(--text-200)]">
            {{ productosFiltradosModal.length }} resultado{{
              productosFiltradosModal.length !== 1 ? 's' : ''
            }}
          </div>
        </div>

        <div v-if="pasoCrear === 3" class="space-y-4">
          <div
            class="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-cyan-600">Pregunta</p>
            <p class="mt-1 text-base font-bold leading-snug text-[var(--text-100)] sm:text-lg">
              {{ preguntaPasoTres }}
            </p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-[var(--text-100)]">
              Tu respuesta <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="form.cantidad"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                class="w-full rounded-xl border border-[var(--bg-300)] bg-white px-4 py-3 pr-24 text-2xl font-bold text-[var(--text-100)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
              <span
                v-if="unidadPlural(productoUnidad(form.producto_id ?? 0))"
                class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-cyan-600"
              >
                {{ unidadPlural(productoUnidad(form.producto_id ?? 0)) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">Producto</label>
          <input
            :value="productoNombre(form.producto_id ?? 0)"
            disabled
            class="w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--text-100)]"
            >Cantidad objetivo <span class="text-red-500">*</span></label
          >
          <input
            v-model="form.cantidad"
            type="number"
            step="0.01"
            min="0"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
      </template>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="cerrarFormModal">Cancelar</BaseButton>
      <template v-if="!modoEditar">
        <BaseButton variant="secondary" :disabled="pasoCrear === 1" @click="irPasoAnterior">
          <span class="inline-flex items-center gap-1">
            <ChevronLeft :size="16" />
            Anterior
          </span>
        </BaseButton>
        <BaseButton v-if="pasoCrear < 3" :disabled="!puedeSeguirPaso" @click="irPasoSiguiente">
          <span class="inline-flex items-center gap-1">
            Siguiente
            <ChevronRight :size="16" />
          </span>
        </BaseButton>
        <BaseButton v-else :loading="guardando" :disabled="!puedeSeguirPaso" @click="guardar">
          Crear plantilla
        </BaseButton>
      </template>
      <BaseButton v-else :loading="guardando" :disabled="!form.cantidad" @click="guardar">
        Guardar cambios
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showDeleteModal"
    title="Eliminar plantilla"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Eliminar la plantilla de
      <span class="font-semibold">{{ aEliminar ? aEliminar.producto_nombre : '' }}</span>
      en <span class="font-semibold">{{ aEliminar ? localNombre(aEliminar.local_id) : '' }}</span
      >?
    </p>
    <template #footer>
      <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :loading="eliminando" @click="confirmarEliminar"
        >Eliminar</BaseButton
      >
    </template>
  </BaseModal>
</template>
