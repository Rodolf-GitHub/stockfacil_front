<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ClipboardList, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
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

const LIMIT = 12

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
      if (localFiltro.value == null && locales.value.length > 0 && locales.value[0].id != null) {
        localFiltro.value = locales.value[0].id
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

const productosMap = computed(() => {
  const m = new Map<number, ProductoSchema>()
  productos.value.forEach((p) => p.id != null && m.set(p.id, p))
  return m
})

const abrirCrear = () => {
  modoEditar.value = false
  seleccion.value = null
  form.value = { local_id: localFiltro.value, producto_id: null, cantidad: '' }
  showFormModal.value = true
}

const abrirEditar = (p: PlantillaStockSchema) => {
  modoEditar.value = true
  seleccion.value = p
  form.value = { local_id: p.local, producto_id: p.producto, cantidad: p.cantidad_objetivo }
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

      <!-- Lista de plantillas: tarjetas compactas -->
      <div class="divide-y divide-[var(--bg-200)]">
        <template v-if="cargando">
          <div v-for="n in 5" :key="`sk-${n}`" class="px-3 py-3 sm:px-4">
            <div class="h-6 w-2/3 animate-pulse rounded bg-[var(--bg-200)]"></div>
          </div>
        </template>

        <div v-else-if="plantillas.length === 0" class="px-4 py-12 text-center">
          <ClipboardList :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
          <p class="font-semibold text-[var(--text-100)]">No hay plantillas</p>
          <p class="mt-1 text-sm text-[var(--text-200)]">
            Creá la primera plantilla con el botón de arriba.
          </p>
        </div>

        <div
          v-else
          v-for="(p, idx) in plantillas"
          :key="p.id ?? `idx-${idx}`"
          class="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--bg-100)]/40 sm:px-4 sm:py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--text-100)]">
              {{ productoNombre(p.producto) }}
            </p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span
                class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              >
                {{ localNombre(p.local) }}
              </span>
              <span class="text-[var(--text-200)]">
                Objetivo:
                <span class="font-semibold text-[var(--text-100)]">{{ p.cantidad_objetivo }}</span>
              </span>
            </p>
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
    size="sm"
    @close="showFormModal = false"
  >
    <form class="space-y-4" @submit.prevent="guardar">
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]"
          >Local <span class="text-red-500">*</span></label
        >
        <select
          v-model="form.local_id"
          :disabled="modoEditar"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:bg-[var(--bg-100)]"
        >
          <option :value="null" disabled>Seleccioná un local...</option>
          <option v-for="l in locales" :key="l.id ?? l.nombre" :value="l.id">{{ l.nombre }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]"
          >Producto <span class="text-red-500">*</span></label
        >
        <select
          v-model="form.producto_id"
          :disabled="modoEditar"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:bg-[var(--bg-100)]"
        >
          <option :value="null" disabled>Seleccioná un producto...</option>
          <option v-for="p in productos" :key="p.id ?? p.nombre" :value="p.id">
            {{ p.nombre }}
          </option>
        </select>
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
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showFormModal = false">Cancelar</BaseButton>
      <BaseButton :loading="guardando" :disabled="!form.cantidad" @click="guardar">
        {{ modoEditar ? 'Guardar cambios' : 'Crear plantilla' }}
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
      <span class="font-semibold">{{ aEliminar ? productoNombre(aEliminar.producto) : '' }}</span>
      en <span class="font-semibold">{{ aEliminar ? localNombre(aEliminar.local) : '' }}</span
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
