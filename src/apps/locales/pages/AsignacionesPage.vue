<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Link2, MapPin, Plus, Search, Users, X } from 'lucide-vue-next'
import {
  localApiListarLocales,
  localUsuarioLocalApiAsignarLocalAUsuario,
  localUsuarioLocalApiDesasignarLocalAUsuario,
  localUsuarioLocalApiListarUsuariosConLocales,
} from '@/apps/locales/api'
import type {
  LocalAsignadoSchema,
  LocalSchema,
  UsuarioConLocalesSchema,
} from '@/apps/locales/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()

const LIMIT = 10

const usuarios = ref<UsuarioConLocalesSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const cargando = ref(false)

const localesDisponibles = ref<LocalSchema[]>([])

const showAsignarModal = ref(false)
const usuarioAsignar = ref<UsuarioConLocalesSchema | null>(null)
const localIdSeleccionado = ref<number | null>(null)
const asignando = ref(false)

const showDesasignarModal = ref(false)
const usuarioDesasignar = ref<UsuarioConLocalesSchema | null>(null)
const localDesasignar = ref<LocalAsignadoSchema | null>(null)
const desasignando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await localUsuarioLocalApiListarUsuariosConLocales(
      { limit: LIMIT, offset: offset.value },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      usuarios.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar las asignaciones')
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
      localesDisponibles.value = res.data.items
    }
  } catch {
    /* silencioso */
  }
}

watch(offset, cargar)

onMounted(() => {
  cargar()
  cargarLocales()
})

const usuariosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return usuarios.value
  return usuarios.value.filter((u) => u.email.toLowerCase().includes(q))
})

const localesNoAsignados = computed(() => {
  if (!usuarioAsignar.value) return [] as LocalSchema[]
  const ids = new Set(usuarioAsignar.value.locales.map((l) => l.id))
  return localesDisponibles.value.filter((l) => l.id !== undefined && !ids.has(l.id))
})

const abrirAsignar = (u: UsuarioConLocalesSchema) => {
  usuarioAsignar.value = u
  localIdSeleccionado.value = null
  showAsignarModal.value = true
}

const abrirDesasignar = (u: UsuarioConLocalesSchema, l: LocalAsignadoSchema) => {
  usuarioDesasignar.value = u
  localDesasignar.value = l
  showDesasignarModal.value = true
}

const asignar = async () => {
  if (!usuarioAsignar.value || localIdSeleccionado.value == null) return
  asignando.value = true
  try {
    const res = await localUsuarioLocalApiAsignarLocalAUsuario(
      usuarioAsignar.value.usuario_id,
      { local_id: localIdSeleccionado.value },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Local asignado correctamente')
      showAsignarModal.value = false
      await cargar()
    }
  } catch {
    notifyError('Error al asignar el local')
  } finally {
    asignando.value = false
  }
}

const desasignar = async () => {
  if (!usuarioDesasignar.value || !localDesasignar.value) return
  desasignando.value = true
  try {
    const res = await localUsuarioLocalApiDesasignarLocalAUsuario(
      usuarioDesasignar.value.usuario_id,
      { local_id: localDesasignar.value.id },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Local desasignado correctamente')
      showDesasignarModal.value = false
      usuarioDesasignar.value = null
      localDesasignar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al desasignar el local')
  } finally {
    desasignando.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Link2 :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Asignaciones</h1>
          <p class="text-sm text-white/90">Gestionar locales asignados a cada usuario</p>
        </div>
      </div>
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
            placeholder="Filtrar por email..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="cargando" class="space-y-3 p-4">
        <div v-for="n in 4" :key="n" class="h-20 animate-pulse rounded-xl bg-[var(--bg-200)]"></div>
      </div>

      <!-- Vacío -->
      <div v-else-if="usuariosFiltrados.length === 0" class="px-6 py-16 text-center">
        <Users :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">No hay usuarios</p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          {{
            busqueda
              ? 'Ningún usuario coincide con la búsqueda.'
              : 'Aún no hay usuarios registrados.'
          }}
        </p>
      </div>

      <!-- Lista de usuarios con sus locales -->
      <div v-else class="divide-y divide-[var(--bg-200)]">
        <div
          v-for="u in usuariosFiltrados"
          :key="u.usuario_id"
          class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100"
            >
              <Users :size="18" class="text-emerald-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-[var(--text-100)]">{{ u.email }}</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-if="u.es_admin"
                  class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                >
                  Admin · todos los locales
                </span>
                <span
                  v-else-if="u.locales.length === 0"
                  class="inline-flex items-center rounded-full bg-[var(--bg-200)] px-2 py-0.5 text-xs font-semibold text-[var(--text-200)]"
                >
                  Sin locales asignados
                </span>
                <span
                  v-for="l in u.locales"
                  :key="l.id"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                >
                  <MapPin :size="11" />
                  {{ l.nombre }}
                  <button
                    v-if="!u.es_admin"
                    type="button"
                    class="ml-0.5 rounded-full p-0.5 text-emerald-700 hover:bg-emerald-200"
                    title="Desasignar"
                    @click="abrirDesasignar(u, l)"
                  >
                    <X :size="11" />
                  </button>
                </span>
              </div>
            </div>
          </div>
          <button
            v-if="!u.es_admin"
            type="button"
            @click="abrirAsignar(u)"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-white px-3 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 sm:self-center"
          >
            <Plus :size="16" />
            Asignar local
          </button>
        </div>
      </div>

      <div
        v-if="!cargando && total > LIMIT"
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
          usuarios
        </p>
        <BasePagination
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
    :show="showAsignarModal"
    title="Asignar local"
    size="sm"
    @close="showAsignarModal = false"
  >
    <div class="space-y-4">
      <p class="text-sm text-[var(--text-200)]">
        Seleccionar un local para asignar a
        <span class="font-semibold text-[var(--text-100)]">{{ usuarioAsignar?.email }}</span>
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">
          Local <span class="text-red-500">*</span>
        </label>
        <select
          v-model="localIdSeleccionado"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option :value="null" disabled>Seleccioná un local...</option>
          <option v-for="l in localesNoAsignados" :key="l.id" :value="l.id">{{ l.nombre }}</option>
        </select>
        <p v-if="localesNoAsignados.length === 0" class="mt-2 text-xs text-[var(--text-200)]">
          Este usuario ya tiene todos los locales asignados.
        </p>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showAsignarModal = false">Cancelar</BaseButton>
      <BaseButton :loading="asignando" :disabled="localIdSeleccionado == null" @click="asignar">
        Asignar
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showDesasignarModal"
    title="Desasignar local"
    size="sm"
    @close="showDesasignarModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Quitar el local
      <span class="font-semibold">{{ localDesasignar?.nombre }}</span>
      del usuario
      <span class="font-semibold">{{ usuarioDesasignar?.email }}</span
      >?
    </p>
    <template #footer>
      <BaseButton variant="secondary" @click="showDesasignarModal = false">Cancelar</BaseButton>
      <BaseButton variant="danger" :loading="desasignando" @click="desasignar">
        Desasignar
      </BaseButton>
    </template>
  </BaseModal>
</template>
