<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import {
  productoApiActualizarProducto,
  productoApiCrearProducto,
  productoApiEliminarProducto,
  productoApiListarProductos,
} from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'
import { UNIDADES_MEDIDA } from '@/utils/unidadesMedida'

const { success, error: notifyError } = useNotification()

const LIMIT = 12

const productos = ref<ProductoSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const cargando = ref(false)

const showFormModal = ref(false)
const modoEditar = ref(false)
const productoSeleccionado = ref<ProductoSchema | null>(null)
const nombreForm = ref('')
const precioForm = ref('')
const unidadMedidaForm = ref<string>('unidades')
const guardando = ref(false)

const showDeleteModal = ref(false)
const productoAEliminar = ref<ProductoSchema | null>(null)
const eliminando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await productoApiListarProductos(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      productos.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar los productos')
  } finally {
    cargando.value = false
  }
}

watch(busqueda, () => {
  offset.value = 0
  cargar()
})
watch(offset, cargar)
onMounted(cargar)

const abrirCrear = () => {
  modoEditar.value = false
  productoSeleccionado.value = null
  nombreForm.value = ''
  precioForm.value = ''
  unidadMedidaForm.value = 'unidades'
  showFormModal.value = true
}

const abrirEditar = (p: ProductoSchema) => {
  modoEditar.value = true
  productoSeleccionado.value = p
  nombreForm.value = p.nombre
  precioForm.value = p.precio
  unidadMedidaForm.value = p.unidad_medida || 'unidades'
  showFormModal.value = true
}

const abrirEliminar = (p: ProductoSchema) => {
  productoAEliminar.value = p
  showDeleteModal.value = true
}

const guardar = async () => {
  if (!nombreForm.value.trim()) return
  const precioNum = Number(precioForm.value)
  if (Number.isNaN(precioNum) || precioNum < 0) {
    notifyError('Precio inválido')
    return
  }
  guardando.value = true
  try {
    if (modoEditar.value && productoSeleccionado.value?.id) {
      const payload = {
        nombre: nombreForm.value.trim(),
        precio: precioNum,
        unidad_medida: unidadMedidaForm.value,
      } as unknown as Parameters<typeof productoApiActualizarProducto>[1]
      const res = await productoApiActualizarProducto(
        productoSeleccionado.value.id,
        payload as never,
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        success('Producto actualizado correctamente')
        showFormModal.value = false
        await cargar()
      }
    } else {
      const payload = {
        nombre: nombreForm.value.trim(),
        precio: precioNum,
        unidad_medida: unidadMedidaForm.value,
      } as unknown as Parameters<typeof productoApiCrearProducto>[0]
      const res = await productoApiCrearProducto(payload as never, authOptions())
      if (res.status >= 200 && res.status < 300) {
        success('Producto creado correctamente')
        showFormModal.value = false
        await cargar()
      }
    }
  } catch {
    notifyError('Error al guardar el producto')
  } finally {
    guardando.value = false
  }
}

const confirmarEliminar = async () => {
  if (!productoAEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await productoApiEliminarProducto(productoAEliminar.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Producto eliminado correctamente')
      showDeleteModal.value = false
      productoAEliminar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al eliminar el producto')
  } finally {
    eliminando.value = false
  }
}

const formatPrecio = (precio: string) => {
  const n = Number(precio)
  if (Number.isNaN(n)) return precio
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Package :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Productos</h1>
          <p class="text-sm text-white/90">
            {{ total }} producto{{ total !== 1 ? 's' : '' }} en catálogo
          </p>
        </div>
      </div>
      <button
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-600 shadow-sm transition-all hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Plus :size="18" />
        Nuevo producto
      </button>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <div class="border-b border-[var(--bg-200)] p-4">
        <div class="relative">
          <Search
            :size="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-200)]"
          />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar productos por nombre..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      <!-- Lista de productos: tarjetas compactas (mobile-first) -->
      <div class="divide-y divide-[var(--bg-200)]">
        <template v-if="cargando">
          <div v-for="n in 5" :key="`sk-${n}`" class="px-3 py-3 sm:px-4">
            <div class="h-6 w-2/3 animate-pulse rounded bg-[var(--bg-200)]"></div>
          </div>
        </template>

        <div v-else-if="productos.length === 0" class="px-4 py-12 text-center">
          <Package :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
          <p class="font-semibold text-[var(--text-100)]">No hay productos</p>
          <p class="mt-1 text-sm text-[var(--text-200)]">
            {{
              busqueda
                ? 'Ningún producto coincide con la búsqueda.'
                : 'Aún no hay productos en el catálogo.'
            }}
          </p>
        </div>

        <div
          v-else
          v-for="p in productos"
          :key="p.id ?? p.nombre"
          class="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--bg-100)]/40 sm:px-4 sm:py-3"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 sm:h-10 sm:w-10"
            >
              <Package :size="16" class="text-amber-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-[var(--text-100)]">{{ p.nombre }}</p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span
                  class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                >
                  {{ p.unidad_medida || 'unidades' }}
                </span>
                <span class="font-semibold text-[var(--text-100)]">
                  $ {{ formatPrecio(p.precio) }}
                </span>
              </p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
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
        </div>
      </div>

      <div
        v-if="!cargando && productos.length > 0"
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
    :title="modoEditar ? 'Editar producto' : 'Nuevo producto'"
    size="sm"
    @close="showFormModal = false"
  >
    <form class="space-y-4" @submit.prevent="guardar">
      <BaseInput v-model="nombreForm" label="Nombre" placeholder="Nombre del producto" required />
      <div class="w-full">
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">
          Unidad de medida <span class="text-red-500">*</span>
        </label>
        <select
          v-model="unidadMedidaForm"
          required
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option v-for="u in UNIDADES_MEDIDA" :key="u.value" :value="u.value">
            {{ u.label }}
          </option>
        </select>
      </div>
      <div class="w-full">
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">
          Precio <span class="text-red-500">*</span>
        </label>
        <input
          v-model="precioForm"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          required
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showFormModal = false">Cancelar</BaseButton>
      <BaseButton :loading="guardando" :disabled="!nombreForm.trim()" @click="guardar">
        {{ modoEditar ? 'Guardar cambios' : 'Crear producto' }}
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showDeleteModal"
    title="Eliminar producto"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Estás seguro que querés eliminar
      <span class="font-semibold">{{ productoAEliminar?.nombre }}</span
      >? Esta acción no se puede deshacer.
    </p>
    <template #footer>
      <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :loading="eliminando" @click="confirmarEliminar">
        Eliminar
      </BaseButton>
    </template>
  </BaseModal>
</template>
