<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { CheckCircle2, ListChecks, Lock, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import {
  conteostockApiActualizarConteo,
  conteostockApiActualizarItem,
  conteostockApiCrearConteo,
  conteostockApiCrearItem,
  conteostockApiEliminarConteo,
  conteostockApiEliminarItem,
  conteostockApiFinalizarConteo,
  conteostockApiListarConteos,
  conteostockApiListarItems,
} from '@/apps/conteos_stock/api'
import type { ConteoStockSchema, ItemConteoStockSchema } from '@/apps/conteos_stock/api/schemas'
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

const LIMIT = 12

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

// Detalle (items)
const showDetalleModal = ref(false)
const conteoDetalle = ref<ConteoStockSchema | null>(null)
const items = ref<ItemConteoStockSchema[]>([])
const cargandoItems = ref(false)
const itemForm = ref({ producto_id: null as number | null, cantidad: '' })
const guardandoItem = ref(false)

// Finalizar
const finalizando = ref(false)

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

const abrirCrear = () => {
  crearForm.value = {
    local_id: localFiltro.value,
    fecha: new Date().toISOString().slice(0, 10),
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

// --- Detalle / items ---
const abrirDetalle = async (c: ConteoStockSchema) => {
  conteoDetalle.value = c
  itemForm.value = { producto_id: null, cantidad: '' }
  showDetalleModal.value = true
  await cargarItems()
}

const cargarItems = async () => {
  if (!conteoDetalle.value?.id) return
  cargandoItems.value = true
  try {
    const res = await conteostockApiListarItems(conteoDetalle.value.id, {
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) {
      items.value = res.data
    }
  } catch {
    notifyError('Error al cargar los ítems')
  } finally {
    cargandoItems.value = false
  }
}

const agregarItem = async () => {
  if (!conteoDetalle.value?.id || itemForm.value.producto_id == null) return
  const cant = Number(itemForm.value.cantidad)
  if (Number.isNaN(cant) || cant < 0) {
    notifyError('Cantidad inválida')
    return
  }
  guardandoItem.value = true
  try {
    const res = await conteostockApiCrearItem(
      {
        conteo_stock_id: conteoDetalle.value.id,
        producto_id: itemForm.value.producto_id,
        cantidad_conteada: cant,
      },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      itemForm.value = { producto_id: null, cantidad: '' }
      await cargarItems()
    }
  } catch {
    notifyError('Error al agregar el ítem')
  } finally {
    guardandoItem.value = false
  }
}

const actualizarCantidadItem = async (item: ItemConteoStockSchema, nueva: string) => {
  if (!item.id) return
  const cant = Number(nueva)
  if (Number.isNaN(cant) || cant < 0) return
  try {
    const res = await conteostockApiActualizarItem(
      item.id,
      { cantidad_conteada: cant },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      item.cantidad_conteada = String(cant)
    }
  } catch {
    notifyError('Error al actualizar el ítem')
  }
}

const eliminarItem = async (item: ItemConteoStockSchema) => {
  if (!item.id) return
  try {
    const res = await conteostockApiEliminarItem(item.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      items.value = items.value.filter((i) => i.id !== item.id)
    }
  } catch {
    notifyError('Error al eliminar el ítem')
  }
}

const finalizarConteo = async () => {
  if (!conteoDetalle.value?.id) return
  finalizando.value = true
  try {
    const res = await conteostockApiFinalizarConteo(conteoDetalle.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo finalizado')
      conteoDetalle.value.estado = 'finalizado'
      await cargar()
    }
  } catch {
    notifyError('Error al finalizar el conteo')
  } finally {
    finalizando.value = false
  }
}

const formatFecha = (f?: string) => {
  if (!f) return '-'
  const d = new Date(f)
  if (Number.isNaN(d.getTime())) return f
  return d.toLocaleDateString('es-AR')
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
      <div class="grid gap-3 border-b border-[var(--bg-200)] p-4 sm:grid-cols-[1fr_180px]">
        <select
          v-model="localFiltro"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option :value="null">Todos los locales</option>
          <option v-for="l in locales" :key="l.id" :value="l.id">{{ l.nombre }}</option>
        </select>
        <input
          v-model="fechaFiltro"
          type="date"
          class="rounded-xl border border-[var(--bg-300)] bg-white px-3 py-2.5 text-sm text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Local
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Fecha
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Estado
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="cargando"
              v-for="n in 5"
              :key="`sk-${n}`"
              class="border-b border-[var(--bg-200)]"
            >
              <td class="px-6 py-4">
                <div class="h-5 w-32 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-6 py-4">
                <div class="h-5 w-24 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-6 py-4">
                <div class="h-5 w-20 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-6 py-4">
                <div class="ml-auto h-8 w-32 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>

            <tr v-else-if="conteos.length === 0">
              <td colspan="4" class="px-6 py-16 text-center">
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
              class="border-b border-[var(--bg-200)] transition-colors hover:bg-[var(--bg-100)]/50"
            >
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                >
                  {{ localNombre(c.local) }}
                </span>
              </td>
              <td class="px-6 py-4 font-medium text-[var(--text-100)]">
                {{ formatFecha(c.fecha) }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                  :class="estadoClass(c.estado)"
                >
                  {{ c.estado || 'abierto' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    @click="abrirDetalle(c)"
                    class="inline-flex items-center gap-1 rounded-lg border border-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-50"
                    title="Ver ítems"
                  >
                    <ListChecks :size="14" />
                    Ítems
                  </button>
                  <button
                    v-if="c.estado !== 'finalizado'"
                    type="button"
                    @click="abrirEditar(c)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-200)] transition-colors hover:bg-teal-50 hover:text-teal-600"
                    title="Editar fecha"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    type="button"
                    @click="abrirEliminar(c)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-200)] transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
          <option v-for="l in locales" :key="l.id" :value="l.id">{{ l.nombre }}</option>
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
        >Crear conteo</BaseButton
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

  <!-- Modal detalle (items) -->
  <BaseModal
    :show="showDetalleModal"
    title="Ítems del conteo"
    size="lg"
    @close="showDetalleModal = false"
  >
    <div v-if="conteoDetalle" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--bg-100)] p-3 text-sm">
        <span class="font-semibold text-[var(--text-100)]">{{
          localNombre(conteoDetalle.local)
        }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span class="text-[var(--text-200)]">{{ formatFecha(conteoDetalle.fecha) }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
          :class="estadoClass(conteoDetalle.estado)"
        >
          {{ conteoDetalle.estado || 'abierto' }}
        </span>
      </div>

      <!-- Form agregar item -->
      <div
        v-if="conteoDetalle.estado !== 'finalizado'"
        class="grid gap-2 rounded-xl border border-[var(--bg-200)] p-3 sm:grid-cols-[1fr_140px_auto]"
      >
        <select
          v-model="itemForm.producto_id"
          class="rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option :value="null" disabled>Producto...</option>
          <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
        <input
          v-model="itemForm.cantidad"
          type="number"
          step="0.01"
          min="0"
          placeholder="Cantidad"
          class="rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <BaseButton
          :loading="guardandoItem"
          :disabled="itemForm.producto_id == null || !itemForm.cantidad"
          @click="agregarItem"
        >
          <Plus :size="16" /> Agregar
        </BaseButton>
      </div>

      <!-- Lista items -->
      <div class="overflow-x-auto rounded-xl border border-[var(--bg-200)]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Producto
              </th>
              <th
                class="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Cantidad
              </th>
              <th
                class="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              ></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargandoItems">
              <td colspan="3" class="px-4 py-6 text-center text-sm text-[var(--text-200)]">
                Cargando...
              </td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="3" class="px-4 py-6 text-center text-sm text-[var(--text-200)]">
                Sin ítems aún
              </td>
            </tr>
            <tr
              v-else
              v-for="it in items"
              :key="it.id"
              class="border-b border-[var(--bg-200)] last:border-0"
            >
              <td class="px-4 py-2 text-sm font-medium text-[var(--text-100)]">
                {{ productoNombre(it.producto) }}
              </td>
              <td class="px-4 py-2 text-right">
                <input
                  :value="it.cantidad_conteada"
                  type="number"
                  step="0.01"
                  min="0"
                  :disabled="conteoDetalle.estado === 'finalizado'"
                  @change="(e) => actualizarCantidadItem(it, (e.target as HTMLInputElement).value)"
                  class="w-24 rounded border border-[var(--bg-300)] bg-white px-2 py-1 text-right text-sm focus:border-teal-500 focus:outline-none disabled:bg-[var(--bg-100)]"
                />
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  v-if="conteoDetalle.estado !== 'finalizado'"
                  type="button"
                  @click="eliminarItem(it)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-200)] hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showDetalleModal = false">Cerrar</BaseButton>
      <BaseButton
        v-if="conteoDetalle && conteoDetalle.estado !== 'finalizado'"
        variant="success"
        :loading="finalizando"
        @click="finalizarConteo"
      >
        <CheckCircle2 :size="16" />
        Finalizar conteo
      </BaseButton>
      <span
        v-else-if="conteoDetalle"
        class="inline-flex items-center gap-1 text-sm text-[var(--text-200)]"
      >
        <Lock :size="14" /> Conteo finalizado
      </span>
    </template>
  </BaseModal>
</template>
