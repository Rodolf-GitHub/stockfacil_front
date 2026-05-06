<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardList, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import {
  conteostockApiActualizarConteo,
  conteostockApiCrearConteo,
  conteostockApiEliminarConteo,
  conteostockApiListarConteos,
  conteostockApiReabrirConteo,
} from '@/apps/conteos_stock/api'
import type { ConteoStockSchema } from '@/apps/conteos_stock/api/schemas'
import { localApiListarLocales } from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'
import ConteoAsistidoModal from '@/apps/conteos_stock/components/ConteoAsistidoModal.vue'

const router = useRouter()
const { success, error: notifyError } = useNotification()

const LIMIT = 100

const fechaHoyLocal = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

const fechaOffset = (dias: number) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

const FILTROS_FECHA = [
  { label: 'Hoy', value: () => fechaOffset(0) },
  { label: 'Ayer', value: () => fechaOffset(1) },
  { label: 'Antier', value: () => fechaOffset(2) },
]

const conteos = ref<ConteoStockSchema[]>([])
const total = ref(0)
const offset = ref(0)
const localFiltro = ref<number | null>(null)
const fechaFiltro = ref<string>(fechaHoyLocal())
const cargando = ref(false)

const locales = ref<LocalSchema[]>([])

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

watch([localFiltro, fechaFiltro], () => {
  offset.value = 0
  cargar()
})
watch(offset, cargar)

onMounted(() => {
  cargar()
  cargarLocales()
})

const localNombre = (id: number) => locales.value.find((l) => l.id === id)?.nombre ?? `#${id}`

const abrirCrear = () => {
  crearForm.value = {
    local_id: locales.value.length === 1 ? (locales.value[0]?.id ?? null) : localFiltro.value,
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
      const nuevo = res.data
      if (nuevo?.id) {
        router.push({ name: 'conteo-detalle', params: { id: nuevo.id } })
      } else {
        await cargar()
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

const abrirWizard = (c: ConteoStockSchema) => {
  conteoDetalle.value = c
  showWizard.value = true
}

const onWizardFinalizado = async (conteo: ConteoStockSchema) => {
  if (conteoDetalle.value?.id === conteo.id && conteoDetalle.value)
    conteoDetalle.value.estado = conteo.estado
  showWizard.value = false
  await cargar()
}

const onWizardReabierto = async (conteo: ConteoStockSchema) => {
  if (conteoDetalle.value?.id === conteo.id && conteoDetalle.value)
    conteoDetalle.value.estado = conteo.estado
  await cargar()
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
      <div
        class="flex flex-col gap-3 border-b border-[var(--bg-200)] p-3 sm:flex-row sm:items-center sm:p-4"
      >
        <select
          v-model="localFiltro"
          class="flex-1 rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option :value="null">Todos los locales</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">
            {{ l.nombre }}
          </option>
        </select>
        <div class="flex shrink-0 flex-wrap gap-1">
          <button
            v-for="f in FILTROS_FECHA"
            :key="f.label"
            type="button"
            @click="fechaFiltro = f.value()"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
            :class="
              fechaFiltro === f.value()
                ? 'border-teal-500 bg-teal-500 text-white'
                : 'border-[var(--bg-300)] bg-white text-[var(--text-100)] hover:border-teal-400 hover:bg-teal-50'
            "
          >
            {{ f.label }}
          </button>
          <input
            v-model="fechaFiltro"
            type="date"
            class="rounded-lg border px-2 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            :class="
              FILTROS_FECHA.every((f) => fechaFiltro !== f.value())
                ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold'
                : 'border-[var(--bg-300)] bg-white text-[var(--text-100)]'
            "
          />
        </div>
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
                <div class="h-5 w-16 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-3 py-3 sm:px-4">
                <div class="ml-auto h-8 w-24 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>
          </template>

          <tr v-else-if="conteos.length === 0">
            <td colspan="3" class="px-4 py-12 text-center">
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
            <td class="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                :class="estadoClass(c.estado)"
              >
                {{ c.estado || 'abierto' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2.5 sm:px-4 sm:py-3">
              <div class="flex justify-end gap-1">
                <!-- Contar / Ver -->
                <button
                  type="button"
                  @click="router.push({ name: 'conteo-detalle', params: { id: c.id } })"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm transition-colors hover:bg-teal-700 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
                  :title="c.estado === 'finalizado' ? 'Ver conteo' : 'Ir a contar'"
                >
                  <ClipboardList :size="15" />
                  <span class="hidden text-xs font-semibold sm:inline">{{
                    c.estado === 'finalizado' ? 'Ver' : 'Contar'
                  }}</span>
                </button>
                <!-- Asistido -->
                <button
                  type="button"
                  @click="abrirWizard(c)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm transition-colors hover:bg-indigo-600 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
                  title="Conteo asistido (paso a paso)"
                >
                  <ListChecks :size="15" />
                  <span class="hidden text-xs font-semibold sm:inline">Asistido</span>
                </button>
                <!-- Editar fecha -->
                <button
                  v-if="c.estado !== 'finalizado'"
                  type="button"
                  @click="abrirEditar(c)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 sm:h-9 sm:w-9"
                  title="Editar fecha"
                >
                  <Pencil :size="14" />
                </button>
                <!-- Reabrir -->
                <button
                  v-if="c.estado === 'finalizado'"
                  type="button"
                  @click="reabrirConteo(c)"
                  :disabled="reabriendo"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-50 sm:h-9 sm:w-9"
                  title="Reabrir conteo"
                >
                  <RotateCcw :size="14" />
                </button>
                <!-- Eliminar -->
                <button
                  type="button"
                  @click="abrirEliminar(c)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 sm:h-9 sm:w-9"
                  title="Eliminar"
                >
                  <Trash2 :size="14" />
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
  <BaseModal
    :show="showCrearModal"
    :title="locales.length === 1 ? `Nuevo conteo · ${locales[0]?.nombre ?? ''}` : 'Nuevo conteo'"
    size="sm"
    @close="showCrearModal = false"
  >
    <form class="space-y-4" @submit.prevent="crearConteo">
      <div v-if="locales.length !== 1">
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
        <div class="mb-1 flex items-baseline justify-between">
          <label class="text-sm font-medium text-[var(--text-100)]">Fecha</label>
          <span v-if="crearForm.fecha === fechaHoyLocal()" class="text-xs font-medium text-teal-600"
            >Hoy</span
          >
        </div>
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

  <!-- Wizard asistido -->
  <ConteoAsistidoModal
    v-if="conteoDetalle"
    :show="showWizard"
    :conteo="conteoDetalle"
    :local-nombre="localNombre(conteoDetalle.local)"
    @close="showWizard = false"
    @finalizado="onWizardFinalizado"
    @reabierto="onWizardReabierto"
  />
</template>
