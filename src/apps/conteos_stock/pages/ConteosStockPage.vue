<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-vue-next'
import {
  conteostockApiActualizarConteo,
  conteostockApiActualizarItem,
  conteostockApiCrearConteo,
  conteostockApiCrearItem,
  conteostockApiEliminarConteo,
  conteostockApiFinalizarConteo,
  conteostockApiListarConteos,
  conteostockApiListarItems,
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
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()

const LIMIT = 100

const conteos = ref<ConteoStockSchema[]>([])
const total = ref(0)
const offset = ref(0)
const localFiltro = ref<number | null>(null)
const fechaFiltro = ref<string>('')
const cargando = ref(false)

const locales = ref<LocalSchema[]>([])
const productos = ref<ProductoSchema[]>([])

// Crear conteo
const showCrearModal = ref(false)
const crearForm = ref({ local_id: null as number | null, fecha: '' })
const creando = ref(false)

// Editar fecha
const showEditarModal = ref(false)
const conteoEditar = ref<ConteoStockSchema | null>(null)
const fechaEditar = ref('')
const editando = ref(false)

// Eliminar conteo
const showDeleteModal = ref(false)
const aEliminar = ref<ConteoStockSchema | null>(null)
const eliminando = ref(false)

// Wizard
const showWizard = ref(false)
const conteoDetalle = ref<ConteoStockSchema | null>(null)
const plantillaItems = ref<PlantillaStockSchema[]>([])
const itemsExistentes = ref<ItemConteoStockSchema[]>([])
const cargandoWizard = ref(false)
const stepIdx = ref(0)
const cantidadActual = ref<string | number>('')
const guardandoPaso = ref(false)

const esCantidadVacia = (v: string | number) =>
  v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
const finalizando = ref(false)
const reabriendo = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await conteostockApiListarConteos(
      {
        local_id: localFiltro.value ?? undefined,
        fecha: fechaFiltro.value || undefined,
        limit: LIMIT,
        offset: offset.value,
      },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      conteos.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar los conteos')
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
    if (res.status >= 200 && res.status < 300) locales.value = res.data.items
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

watch([localFiltro, fechaFiltro], () => {
  offset.value = 0
  cargar()
})
watch(offset, cargar)

onMounted(() => {
  cargar()
  cargarLocales()
  cargarProductos()
})

const localNombre = (id: number) => locales.value.find((l) => l.id === id)?.nombre ?? `#${id}`
const productoNombre = (id: number) => productos.value.find((p) => p.id === id)?.nombre ?? `#${id}`
const productoUnidad = (id: number) => productos.value.find((p) => p.id === id)?.unidad_medida ?? ''

const unidadPlural = (unidad: string | null | undefined) => {
  const u = (unidad || '').trim().toLowerCase()
  if (!u || u === 'otros') return ''
  const map: Record<string, string> = {
    kg: 'kilogramos',
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

const fechaHoyLocal = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

const abrirCrear = () => {
  crearForm.value = {
    local_id: localFiltro.value,
    fecha: fechaHoyLocal(),
  }
  showCrearModal.value = true
}

const crearConteo = async () => {
  if (crearForm.value.local_id == null) {
    notifyError('Seleccioná un local')
    return
  }
  creando.value = true
  try {
    const res = await conteostockApiCrearConteo(
      { local_id: crearForm.value.local_id, fecha: crearForm.value.fecha || undefined },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Conteo creado')
      showCrearModal.value = false
      await cargar()
      const nuevo = res.data
      if (nuevo?.id) {
        await abrirWizard(nuevo)
      }
    }
  } catch {
    notifyError('Error al crear el conteo')
  } finally {
    creando.value = false
  }
}

const abrirEditar = (c: ConteoStockSchema) => {
  conteoEditar.value = c
  fechaEditar.value = c.fecha?.slice(0, 10) ?? ''
  showEditarModal.value = true
}

const editarFecha = async () => {
  if (!conteoEditar.value?.id) return
  editando.value = true
  try {
    const res = await conteostockApiActualizarConteo(
      conteoEditar.value.id,
      { fecha: fechaEditar.value || undefined },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Conteo actualizado')
      showEditarModal.value = false
      await cargar()
    }
  } catch {
    notifyError('Error al actualizar el conteo')
  } finally {
    editando.value = false
  }
}

const abrirEliminar = (c: ConteoStockSchema) => {
  aEliminar.value = c
  showDeleteModal.value = true
}

const confirmarEliminar = async () => {
  if (!aEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await conteostockApiEliminarConteo(aEliminar.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo eliminado')
      showDeleteModal.value = false
      aEliminar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al eliminar el conteo')
  } finally {
    eliminando.value = false
  }
}

// --- Wizard guiado ---
const abrirWizard = async (c: ConteoStockSchema) => {
  conteoDetalle.value = c
  stepIdx.value = 0
  plantillaItems.value = []
  itemsExistentes.value = []
  cantidadActual.value = ''
  showWizard.value = true
  cargandoWizard.value = true
  try {
    const [resPlant, resItems] = await Promise.all([
      plantillastockApiListarPlantillas({ local_id: c.local, limit: 1000, offset: 0 }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
      c.id
        ? conteostockApiListarItems(c.id, {
            ...authOptions(),
            fetch: fetchWithBaseUrl,
          } as RequestInit)
        : Promise.resolve(null),
    ])
    if (resPlant.status >= 200 && resPlant.status < 300) {
      plantillaItems.value = resPlant.data.items
    }
    if (resItems && resItems.status >= 200 && resItems.status < 300) {
      itemsExistentes.value = resItems.data
    }
    const primerSinContar = plantillaItems.value.findIndex(
      (p) => !itemsExistentes.value.some((it) => it.producto === p.producto_id),
    )
    stepIdx.value = primerSinContar >= 0 ? primerSinContar : 0
    sincronizarInput()
  } catch {
    notifyError('Error al cargar la plantilla del local')
  } finally {
    cargandoWizard.value = false
  }
}

const stepActual = computed<PlantillaStockSchema | null>(
  () => plantillaItems.value[stepIdx.value] ?? null,
)
const totalSteps = computed(() => plantillaItems.value.length)
const itemActual = computed<ItemConteoStockSchema | null>(() => {
  if (!stepActual.value) return null
  return itemsExistentes.value.find((it) => it.producto === stepActual.value!.producto_id) ?? null
})
const itemsContados = computed(() => itemsExistentes.value.length)
const progresoPct = computed(() => {
  if (totalSteps.value === 0) return 0
  return Math.round((itemsContados.value / totalSteps.value) * 100)
})
const todosContados = computed(
  () => totalSteps.value > 0 && itemsContados.value >= totalSteps.value,
)
const esSoloLectura = computed(() => conteoDetalle.value?.estado === 'finalizado')

const sincronizarInput = () => {
  const v = itemActual.value?.cantidad_conteada
  cantidadActual.value = v != null && v !== '' ? Number(v) : ''
}

const cantidadVacia = computed(() => esCantidadVacia(cantidadActual.value))

watch(stepIdx, sincronizarInput)

const guardarPaso = async (): Promise<boolean> => {
  if (!conteoDetalle.value?.id || !stepActual.value || esSoloLectura.value) return true
  if (cantidadVacia.value) {
    notifyError('Ingresá una cantidad')
    return false
  }
  const cant = Number(cantidadActual.value)
  if (Number.isNaN(cant) || cant < 0) {
    notifyError('Cantidad inválida')
    return false
  }
  const existente = itemActual.value
  if (existente && Number(existente.cantidad_conteada) === cant) {
    return true
  }
  guardandoPaso.value = true
  try {
    if (existente?.id) {
      const res = await conteostockApiActualizarItem(
        existente.id,
        { cantidad_conteada: cant },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        existente.cantidad_conteada = String(cant)
        return true
      }
    } else {
      const res = await conteostockApiCrearItem(
        {
          conteo_stock_id: conteoDetalle.value.id,
          producto_id: stepActual.value.producto_id,
          cantidad_conteada: cant,
        },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        itemsExistentes.value.push(res.data)
        return true
      }
    }
    notifyError('No se pudo guardar')
    return false
  } catch {
    notifyError('Error al guardar')
    return false
  } finally {
    guardandoPaso.value = false
  }
}

const irSiguiente = async () => {
  const ok = await guardarPaso()
  if (!ok) return
  if (stepIdx.value < totalSteps.value - 1) {
    stepIdx.value++
  }
}

const irAnterior = async () => {
  if (!cantidadVacia.value && !esSoloLectura.value) {
    await guardarPaso()
  }
  if (stepIdx.value > 0) {
    stepIdx.value--
  }
}

const irAlPaso = async (idx: number) => {
  if (idx === stepIdx.value) return
  if (!cantidadVacia.value && !esSoloLectura.value) {
    await guardarPaso()
  }
  stepIdx.value = idx
}

const finalizarConteo = async () => {
  if (!conteoDetalle.value?.id) return
  if (!cantidadVacia.value && !esSoloLectura.value) {
    const ok = await guardarPaso()
    if (!ok) return
  }
  if (!todosContados.value) {
    notifyError('Faltan productos por contar')
    return
  }
  finalizando.value = true
  try {
    const res = await conteostockApiFinalizarConteo(conteoDetalle.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo finalizado')
      conteoDetalle.value.estado = 'finalizado'
      showWizard.value = false
      await cargar()
    }
  } catch {
    notifyError('Error al finalizar el conteo')
  } finally {
    finalizando.value = false
  }
}

const cerrarWizard = async () => {
  if (!cantidadVacia.value && !esSoloLectura.value && stepActual.value) {
    await guardarPaso()
  }
  showWizard.value = false
}

const reabrirConteo = async (c: ConteoStockSchema) => {
  if (!c.id) return
  reabriendo.value = true
  try {
    const res = await conteostockApiReabrirConteo(c.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo reabierto')
      if (conteoDetalle.value && conteoDetalle.value.id === c.id) {
        conteoDetalle.value.estado = res.data?.estado ?? 'borrador'
      }
      await cargar()
    }
  } catch {
    notifyError('Error al reabrir el conteo')
  } finally {
    reabriendo.value = false
  }
}

const productoYaContado = (productoId: number) =>
  itemsExistentes.value.some((it) => it.producto === productoId)

const formatFecha = (f?: string) => {
  if (!f) return '-'
  const d = new Date(f)
  if (Number.isNaN(d.getTime())) return f
  return d.toLocaleDateString('es-AR')
}

const parseFechaLocal = (f: string) => {
  const soloFecha = f.slice(0, 10)
  const m = soloFecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) {
    const d = new Date(f)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const formatFechaTabla = (f?: string) => {
  if (!f) return '-'

  const fecha = parseFechaLocal(f)
  if (!fecha) return f

  const hoy = inicioDelDia(new Date())
  const diaFecha = inicioDelDia(fecha)
  const msPorDia = 24 * 60 * 60 * 1000
  const diferenciaDias = Math.round((hoy.getTime() - diaFecha.getTime()) / msPorDia)

  if (diferenciaDias === 0) return 'Hoy'
  if (diferenciaDias === 1) return 'Ayer'
  if (diferenciaDias === 2) return 'Antier'

  return fecha.toLocaleDateString('es-AR')
}

const estadoClass = (estado?: string) => {
  if (estado === 'finalizado') return 'bg-emerald-100 text-emerald-700'
  return 'bg-amber-100 text-amber-700'
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <ListChecks :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Conteos de Stock</h1>
          <p class="text-sm text-white/90">Registrá el stock real de cada local</p>
        </div>
      </div>
      <button
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-600 shadow-sm transition-all hover:bg-white/90"
      >
        <Plus :size="18" />
        Nuevo conteo
      </button>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <div class="grid gap-3 border-b border-[var(--bg-200)] p-3 sm:grid-cols-[1fr_180px] sm:p-4">
        <select
          v-model="localFiltro"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option :value="null">Todos los locales</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">
            {{ l.nombre }}
          </option>
        </select>
        <input
          v-model="fechaFiltro"
          type="date"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </div>

      <!-- Tabla de conteos -->
      <table class="w-full">
        <thead>
          <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
            <th
              class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Local
            </th>
            <th
              class="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Fecha
            </th>
            <th
              class="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Estado
            </th>
            <th
              class="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="cargando">
            <tr v-for="n in 5" :key="`sk-${n}`" class="border-b border-[var(--bg-200)]">
              <td class="px-3 py-3 sm:px-4">
                <div class="h-5 w-2/3 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-2 py-3 sm:px-4">
                <div class="h-5 w-20 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-2 py-3 sm:px-4">
                <div class="h-5 w-16 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-3 py-3 sm:px-4">
                <div class="ml-auto h-8 w-24 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>
          </template>

          <tr v-else-if="conteos.length === 0">
            <td colspan="4" class="px-4 py-12 text-center">
              <ListChecks :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
              <p class="font-semibold text-[var(--text-100)]">No hay conteos</p>
              <p class="mt-1 text-sm text-[var(--text-200)]">
                Iniciá un nuevo conteo con el botón de arriba.
              </p>
            </td>
          </tr>

          <tr
            v-else
            v-for="c in conteos"
            :key="c.id ?? `${c.local}-${c.fecha}`"
            class="border-b border-[var(--bg-200)] last:border-0 transition-colors hover:bg-[var(--bg-100)]/40"
          >
            <td
              class="w-full max-w-0 px-3 py-2.5 text-sm font-semibold text-[var(--text-100)] sm:px-4 sm:py-3"
            >
              <span class="block truncate">{{ localNombre(c.local) }}</span>
            </td>
            <td
              class="whitespace-nowrap px-2 py-2.5 text-xs text-[var(--text-200)] sm:px-4 sm:py-3 sm:text-sm"
            >
              {{ formatFechaTabla(c.fecha) }}
            </td>
            <td class="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                :class="estadoClass(c.estado)"
              >
                {{ c.estado || 'abierto' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2.5 sm:px-4 sm:py-3">
              <div class="flex justify-end gap-1.5">
                <button
                  type="button"
                  @click="abrirWizard(c)"
                  class="inline-flex h-9 items-center gap-1 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 sm:h-10 sm:gap-1.5 sm:px-3 sm:text-sm"
                  :title="c.estado === 'finalizado' ? 'Ver conteo' : 'Continuar conteo'"
                >
                  <ListChecks :size="16" />
                  <span class="hidden sm:inline">{{
                    c.estado === 'finalizado' ? 'Ver' : 'Contar'
                  }}</span>
                </button>
                <button
                  v-if="c.estado !== 'finalizado'"
                  type="button"
                  @click="abrirEditar(c)"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 sm:h-10 sm:w-10"
                  title="Editar fecha"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  v-if="c.estado === 'finalizado'"
                  type="button"
                  @click="reabrirConteo(c)"
                  :disabled="reabriendo"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-50 sm:h-10 sm:w-10"
                  title="Reabrir conteo"
                >
                  <RotateCcw :size="16" />
                </button>
                <button
                  type="button"
                  @click="abrirEliminar(c)"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 sm:h-10 sm:w-10"
                  title="Eliminar"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="!cargando && conteos.length > 0"
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

  <!-- Modal crear -->
  <BaseModal :show="showCrearModal" title="Nuevo conteo" size="sm" @close="showCrearModal = false">
    <form class="space-y-4" @submit.prevent="crearConteo">
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]"
          >Local <span class="text-red-500">*</span></label
        >
        <select
          v-model="crearForm.local_id"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option :value="null" disabled>Seleccioná un local...</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">{{ l.nombre }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">Fecha</label>
        <input
          v-model="crearForm.fecha"
          type="date"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </div>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showCrearModal = false">Cancelar</BaseButton>
      <BaseButton :loading="creando" :disabled="crearForm.local_id == null" @click="crearConteo"
        >Crear y empezar</BaseButton
      >
    </template>
  </BaseModal>

  <!-- Modal editar fecha -->
  <BaseModal
    :show="showEditarModal"
    title="Editar conteo"
    size="sm"
    @close="showEditarModal = false"
  >
    <form class="space-y-4" @submit.prevent="editarFecha">
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">Fecha</label>
        <input
          v-model="fechaEditar"
          type="date"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </div>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showEditarModal = false">Cancelar</BaseButton>
      <BaseButton :loading="editando" @click="editarFecha">Guardar</BaseButton>
    </template>
  </BaseModal>

  <!-- Modal eliminar -->
  <BaseModal
    :show="showDeleteModal"
    title="Eliminar conteo"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Eliminar el conteo de
      <span class="font-semibold">{{ aEliminar ? localNombre(aEliminar.local) : '' }}</span>
      del <span class="font-semibold">{{ formatFecha(aEliminar?.fecha) }}</span
      >? Esta acción no se puede deshacer.
    </p>
    <template #footer>
      <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :loading="eliminando" @click="confirmarEliminar"
        >Eliminar</BaseButton
      >
    </template>
  </BaseModal>

  <!-- Wizard guiado -->
  <BaseModal
    :show="showWizard"
    :title="esSoloLectura ? 'Detalle del conteo' : 'Conteo guiado'"
    size="lg"
    @close="cerrarWizard"
  >
    <div v-if="conteoDetalle" class="space-y-4 sm:space-y-5">
      <div
        class="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--bg-100)] p-2.5 text-xs sm:gap-3 sm:p-3 sm:text-sm"
      >
        <span class="font-semibold text-[var(--text-100)]">{{
          localNombre(conteoDetalle.local)
        }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span class="text-[var(--text-200)]">{{ formatFecha(conteoDetalle.fecha) }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
          :class="estadoClass(conteoDetalle.estado)"
        >
          {{ conteoDetalle.estado || 'abierto' }}
        </span>
      </div>

      <div v-if="cargandoWizard" class="py-12 text-center text-sm text-[var(--text-200)]">
        Cargando plantilla...
      </div>

      <div
        v-else-if="totalSteps === 0"
        class="rounded-xl border border-dashed border-[var(--bg-300)] p-8 text-center"
      >
        <ListChecks :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">
          Este local no tiene plantilla configurada
        </p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          Agregá productos a la plantilla del local para poder hacer conteos.
        </p>
      </div>

      <template v-else>
        <div>
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-[var(--text-100)]"
              >Producto {{ stepIdx + 1 }} de {{ totalSteps }}</span
            >
            <span class="text-[var(--text-200)]"
              >{{ itemsContados }} / {{ totalSteps }} contados ({{ progresoPct }}%)</span
            >
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-200)]">
            <div
              class="h-full bg-teal-500 transition-all"
              :style="{ width: `${progresoPct}%` }"
            ></div>
          </div>
        </div>

        <div
          v-if="stepActual"
          class="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 sm:p-6"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-teal-600 sm:text-xs">
            Pregunta
          </p>
          <h3 class="mt-1 text-lg font-bold leading-snug text-[var(--text-100)] sm:text-2xl">
            ¿Cuántos
            <span class="text-teal-700">
              {{
                unidadPlural(
                  stepActual.producto_unidad_medida || productoUnidad(stepActual.producto_id),
                ) || 'unidades'
              }}
            </span>
            de
            <span class="text-teal-700">
              {{
                (stepActual.producto_nombre || productoNombre(stepActual.producto_id)).toLowerCase()
              }}
            </span>
            tienes actualmente en el local
            <span class="text-teal-700">{{ localNombre(conteoDetalle.local) }}</span
            >?
          </h3>

          <div class="mt-4 sm:mt-5">
            <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">
              Tu respuesta <span v-if="!esSoloLectura" class="text-red-500">*</span>
            </label>
            <div class="flex items-stretch gap-2">
              <input
                v-model="cantidadActual"
                type="number"
                step="0.01"
                min="0"
                :disabled="esSoloLectura"
                placeholder="0"
                class="min-w-0 flex-1 rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2.5 text-base font-semibold text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-[var(--bg-100)] sm:px-4 sm:py-3 sm:text-lg"
                @keyup.enter="irSiguiente"
              />
              <span
                class="inline-flex shrink-0 max-w-[40%] items-center justify-center truncate rounded-lg bg-[var(--bg-100)] px-2.5 text-xs font-medium text-[var(--text-200)] sm:max-w-none sm:px-4 sm:text-sm"
              >
                {{
                  unidadPlural(
                    stepActual.producto_unidad_medida || productoUnidad(stepActual.producto_id),
                  ) ||
                  stepActual.producto_unidad_medida ||
                  productoUnidad(stepActual.producto_id) ||
                  '—'
                }}
              </span>
            </div>
            <p v-if="itemActual" class="mt-2 text-xs text-emerald-600">
              ✓ Ya contado anteriormente: {{ itemActual.cantidad_conteada }}
            </p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Saltar a producto
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(p, idx) in plantillaItems"
              :key="p.id ?? idx"
              type="button"
              @click="irAlPaso(idx)"
              :title="p.producto_nombre || productoNombre(p.producto_id)"
              :class="[
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                idx === stepIdx
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : productoYaContado(p.producto_id)
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'border-[var(--bg-300)] bg-white text-[var(--text-200)] hover:bg-[var(--bg-100)]',
              ]"
            >
              {{ idx + 1 }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div
        class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3"
      >
        <BaseButton variant="secondary" class="w-full sm:w-auto" @click="cerrarWizard">
          {{ esSoloLectura ? 'Cerrar' : 'Guardar y cerrar' }}
        </BaseButton>

        <template v-if="totalSteps > 0 && !esSoloLectura">
          <div class="grid grid-cols-2 gap-2 sm:contents">
            <BaseButton
              variant="secondary"
              class="w-full sm:w-auto"
              :disabled="stepIdx === 0"
              @click="irAnterior"
            >
              <ArrowLeft :size="16" />
              Anterior
            </BaseButton>

            <BaseButton
              v-if="stepIdx < totalSteps - 1"
              class="w-full sm:w-auto"
              :loading="guardandoPaso"
              :disabled="cantidadVacia"
              @click="irSiguiente"
            >
              Siguiente
              <ArrowRight :size="16" />
            </BaseButton>
          </div>

          <BaseButton
            v-if="todosContados || stepIdx === totalSteps - 1"
            variant="success"
            class="w-full sm:w-auto"
            :loading="finalizando || guardandoPaso"
            @click="finalizarConteo"
          >
            <CheckCircle2 :size="16" />
            Finalizar conteo
          </BaseButton>
        </template>

        <span
          v-else-if="esSoloLectura && conteoDetalle"
          class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center"
        >
          <span
            class="inline-flex items-center justify-center gap-1 text-sm text-[var(--text-200)]"
          >
            <Lock :size="14" /> Conteo finalizado
          </span>
          <BaseButton
            variant="secondary"
            class="w-full sm:w-auto"
            :loading="reabriendo"
            @click="reabrirConteo(conteoDetalle)"
          >
            <RotateCcw :size="16" />
            Reabrir
          </BaseButton>
        </span>
      </div>
    </template>
  </BaseModal>
</template>
