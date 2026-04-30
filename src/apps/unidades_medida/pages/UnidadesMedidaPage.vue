<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Pencil, Plus, Ruler, Search, Trash2 } from 'lucide-vue-next'
import {
  unidadMedidaApiActualizarUnidad,
  unidadMedidaApiCrearUnidad,
  unidadMedidaApiEliminarUnidad,
  unidadMedidaApiListarUnidades,
} from '@/apps/unidades_medida/api'
import type { UnidadMedidaSchema } from '@/apps/unidades_medida/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()
const esAdmin = localStorage.getItem('es_admin') === 'true'

const LIMIT = 100

const unidades = ref<UnidadMedidaSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const cargando = ref(false)

const showFormModal = ref(false)
const modoEditar = ref(false)
const unidadSeleccionada = ref<UnidadMedidaSchema | null>(null)
const nombreForm = ref('')
const guardando = ref(false)

const showDeleteModal = ref(false)
const unidadAEliminar = ref<UnidadMedidaSchema | null>(null)
const eliminando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await unidadMedidaApiListarUnidades(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      unidades.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar las unidades de medida')
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
  unidadSeleccionada.value = null
  nombreForm.value = ''
  showFormModal.value = true
}

const abrirEditar = (u: UnidadMedidaSchema) => {
  modoEditar.value = true
  unidadSeleccionada.value = u
  nombreForm.value = u.nombre
  showFormModal.value = true
}

const abrirEliminar = (u: UnidadMedidaSchema) => {
  unidadAEliminar.value = u
  showDeleteModal.value = true
}

const guardar = async () => {
  if (!nombreForm.value.trim()) return
  guardando.value = true
  try {
    if (modoEditar.value && unidadSeleccionada.value?.id) {
      const res = await unidadMedidaApiActualizarUnidad(
        unidadSeleccionada.value.id,
        { nombre: nombreForm.value.trim() },
        { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
      )
      if (res.status >= 200 && res.status < 300) {
        success('Unidad de medida actualizada correctamente')
        showFormModal.value = false
        await cargar()
      }
    } else {
      const res = await unidadMedidaApiCrearUnidad({ nombre: nombreForm.value.trim() }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit)
      if (res.status >= 200 && res.status < 300) {
        success('Unidad de medida creada correctamente')
        showFormModal.value = false
        await cargar()
      }
    }
  } catch {
    notifyError('Error al guardar la unidad de medida')
  } finally {
    guardando.value = false
  }
}

const confirmarEliminar = async () => {
  if (!unidadAEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await unidadMedidaApiEliminarUnidad(unidadAEliminar.value.id, {
      ...authOptions(),
      fetch: fetchWithBaseUrl,
    } as RequestInit)
    if (res.status >= 200 && res.status < 300) {
      success('Unidad de medida eliminada correctamente')
      showDeleteModal.value = false
      unidadAEliminar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al eliminar la unidad de medida')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Ruler :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Unidades de medida</h1>
          <p class="text-sm text-white/90">
            {{ total }} unidad{{ total !== 1 ? 'es' : '' }} registrada{{ total !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
      <button
        v-if="esAdmin"
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-600 shadow-sm transition-all hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Plus :size="18" />
        Nueva unidad
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
            placeholder="Buscar unidades por nombre..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      <div v-if="cargando" class="divide-y divide-[var(--bg-200)]">
        <div v-for="n in 6" :key="`sk-${n}`" class="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div class="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[var(--bg-200)]"></div>
          <div class="h-5 w-1/2 animate-pulse rounded bg-[var(--bg-200)]"></div>
          <div class="ml-auto h-8 w-16 animate-pulse rounded bg-[var(--bg-200)]"></div>
        </div>
      </div>

      <div v-else-if="unidades.length === 0" class="px-4 py-12 text-center">
        <Ruler :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">No hay unidades de medida</p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          {{
            busqueda
              ? 'Ninguna unidad coincide con la búsqueda.'
              : 'Aún no hay unidades de medida registradas.'
          }}
        </p>
      </div>

      <ul v-else class="divide-y divide-[var(--bg-200)]/70">
        <li
          v-for="u in unidades"
          :key="u.id ?? u.nombre"
          class="group relative flex items-center gap-3 px-4 py-3 transition-all hover:bg-amber-50/40 sm:gap-4 sm:px-6 sm:py-3.5"
        >
          <span
            class="absolute left-0 top-0 h-full w-1 origin-top scale-y-0 bg-amber-500 transition-transform group-hover:scale-y-100"
            aria-hidden="true"
          ></span>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 ring-1 ring-amber-500/15 transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
          >
            <Ruler :size="20" />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-semibold capitalize text-[var(--text-100)] sm:text-base"
            >
              {{ u.nombre }}
            </p>
          </div>
          <div v-if="esAdmin" class="flex shrink-0 gap-1.5">
            <button
              type="button"
              @click="abrirEditar(u)"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm transition-colors hover:bg-amber-600 sm:h-10 sm:w-10"
              title="Editar"
            >
              <Pencil :size="16" />
            </button>
            <button
              type="button"
              @click="abrirEliminar(u)"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 sm:h-10 sm:w-10"
              title="Eliminar"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </li>
      </ul>

      <div
        v-if="!cargando && unidades.length > 0"
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
    :title="modoEditar ? 'Editar unidad de medida' : 'Nueva unidad de medida'"
    size="sm"
    @close="showFormModal = false"
  >
    <form class="space-y-4" @submit.prevent="guardar">
      <BaseInput v-model="nombreForm" label="Nombre" placeholder="Nombre de la unidad" required />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showFormModal = false">Cancelar</BaseButton>
      <BaseButton :loading="guardando" :disabled="!nombreForm.trim()" @click="guardar">
        {{ modoEditar ? 'Guardar cambios' : 'Crear unidad' }}
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showDeleteModal"
    title="Eliminar unidad de medida"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Estás seguro que querés eliminar
      <span class="font-semibold">{{ unidadAEliminar?.nombre }}</span
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
