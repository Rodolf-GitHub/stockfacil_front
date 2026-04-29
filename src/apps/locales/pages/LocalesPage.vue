<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import {
  localApiActualizarLocal,
  localApiCrearLocal,
  localApiEliminarLocal,
  localApiListarLocales,
} from '@/apps/locales/api'
import type { LocalSchema } from '@/apps/locales/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()

const LIMIT = 100

const locales = ref<LocalSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const cargando = ref(false)

// --- Modal crear/editar ---
const showFormModal = ref(false)
const modoEditar = ref(false)
const localSeleccionado = ref<LocalSchema | null>(null)
const nombreForm = ref('')
const guardando = ref(false)

// --- Modal eliminar ---
const showDeleteModal = ref(false)
const localAEliminar = ref<LocalSchema | null>(null)
const eliminando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargarLocales = async () => {
  cargando.value = true
  try {
    const res = await localApiListarLocales(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      locales.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar los locales')
  } finally {
    cargando.value = false
  }
}

// Resetear offset al buscar
watch(busqueda, () => {
  offset.value = 0
  cargarLocales()
})

watch(offset, cargarLocales)

onMounted(cargarLocales)

// --- Abrir modales ---
const abrirCrear = () => {
  modoEditar.value = false
  localSeleccionado.value = null
  nombreForm.value = ''
  showFormModal.value = true
}

const abrirEditar = (local: LocalSchema) => {
  modoEditar.value = true
  localSeleccionado.value = local
  nombreForm.value = local.nombre
  showFormModal.value = true
}

const abrirEliminar = (local: LocalSchema) => {
  localAEliminar.value = local
  showDeleteModal.value = true
}

// --- Guardar (crear o editar) ---
const guardar = async () => {
  if (!nombreForm.value.trim()) return
  guardando.value = true
  try {
    if (modoEditar.value && localSeleccionado.value?.id) {
      const res = await localApiActualizarLocal(
        localSeleccionado.value.id,
        { nombre: nombreForm.value.trim() },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        success('Local actualizado correctamente')
        showFormModal.value = false
        await cargarLocales()
      }
    } else {
      const res = await localApiCrearLocal({ nombre: nombreForm.value.trim() }, authOptions())
      if (res.status >= 200 && res.status < 300) {
        success('Local creado correctamente')
        showFormModal.value = false
        await cargarLocales()
      }
    }
  } catch {
    notifyError('Error al guardar el local')
  } finally {
    guardando.value = false
  }
}

// --- Eliminar ---
const confirmarEliminar = async () => {
  if (!localAEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await localApiEliminarLocal(localAEliminar.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Local eliminado correctamente')
      showDeleteModal.value = false
      localAEliminar.value = null
      await cargarLocales()
    }
  } catch {
    notifyError('Error al eliminar el local')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Franja header -->
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[var(--primary-100)] to-[var(--primary-200)] px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <MapPin :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Locales</h1>
          <p class="text-sm text-white/80">
            {{ total }} sucursal{{ total !== 1 ? 'es' : '' }} registrada{{ total !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
      <button
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--primary-100)] shadow-sm transition-all hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Plus :size="18" />
        Nuevo local
      </button>
    </div>

    <!-- Panel principal -->
    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white shadow-sm">
      <!-- Buscador -->
      <div class="border-b border-[var(--bg-200)] p-4">
        <div class="relative">
          <Search
            :size="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-200)]"
          />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar locales por nombre..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]/30"
          />
        </div>
      </div>

      <!-- Tabla de locales -->
      <table class="w-full">
        <thead>
          <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
            <th
              class="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-200)] sm:px-4 sm:text-xs"
            >
              Nombre
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
              <td class="px-3 py-3 sm:px-4">
                <div class="ml-auto h-8 w-20 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>
          </template>

          <tr v-else-if="locales.length === 0">
            <td colspan="2" class="px-4 py-12 text-center">
              <MapPin :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
              <p class="font-semibold text-[var(--text-100)]">No hay locales</p>
              <p class="mt-1 text-sm text-[var(--text-200)]">
                {{
                  busqueda
                    ? 'Ningún local coincide con la búsqueda.'
                    : 'Agregá el primer local con el botón de arriba.'
                }}
              </p>
            </td>
          </tr>

          <tr
            v-else
            v-for="local in locales"
            :key="local.id ?? local.nombre"
            class="border-b border-[var(--bg-200)] last:border-0 transition-colors hover:bg-[var(--bg-100)]/40"
          >
            <td
              class="w-full max-w-0 px-3 py-2.5 text-sm font-medium text-[var(--text-100)] sm:px-4 sm:py-3"
            >
              <span class="block truncate">{{ local.nombre }}</span>
            </td>
            <td class="whitespace-nowrap px-3 py-2.5 sm:px-4 sm:py-3">
              <div class="flex justify-end gap-1.5">
                <button
                  type="button"
                  @click="abrirEditar(local)"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 sm:h-10 sm:w-10"
                  title="Editar"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  type="button"
                  @click="abrirEliminar(local)"
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

      <!-- Paginación -->
      <div
        v-if="!cargando && locales.length > 0"
        class="flex flex-col gap-3 border-t border-[var(--bg-200)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-[var(--text-200)]">
          Mostrando
          <span class="font-semibold text-[var(--text-100)]">{{ offset + 1 }}</span>
          -
          <span class="font-semibold text-[var(--text-100)]">
            {{ Math.min(offset + LIMIT, total) }}
          </span>
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

  <!-- Modal crear / editar -->
  <BaseModal
    :show="showFormModal"
    :title="modoEditar ? 'Editar local' : 'Nuevo local'"
    size="sm"
    @close="showFormModal = false"
  >
    <form class="space-y-4" @submit.prevent="guardar">
      <BaseInput
        v-model="nombreForm"
        label="Nombre del local"
        placeholder="Ej: Sucursal Centro"
        required
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showFormModal = false">Cancelar</BaseButton>
      <BaseButton :loading="guardando" :disabled="!nombreForm.trim()" @click="guardar">
        {{ modoEditar ? 'Guardar cambios' : 'Crear local' }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- Modal confirmar eliminar -->
  <BaseModal
    :show="showDeleteModal"
    title="Eliminar local"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Estás seguro que querés eliminar
      <span class="font-semibold">{{ localAEliminar?.nombre }}</span
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
