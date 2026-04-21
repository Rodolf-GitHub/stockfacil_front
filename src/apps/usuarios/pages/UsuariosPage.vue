<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { KeyRound, Plus, Search, ShieldCheck, Trash2, User, Users } from 'lucide-vue-next'
import {
  usuarioApiCrearUsuario,
  usuarioApiEliminarUsuario,
  usuarioApiListarUsuarios,
  usuarioApiRestablecerContrasenaUsuario,
} from '@/apps/usuarios/api'
import type { UsuarioSchema } from '@/apps/usuarios/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const { success, error: notifyError } = useNotification()

const LIMIT = 12

const usuarios = ref<UsuarioSchema[]>([])
const total = ref(0)
const offset = ref(0)
const busqueda = ref('')
const cargando = ref(false)

const showCrearModal = ref(false)
const emailForm = ref('')
const passwordForm = ref('')
const guardando = ref(false)

const showResetModal = ref(false)
const usuarioReset = ref<UsuarioSchema | null>(null)
const nuevaPassword = ref('')
const reseteando = ref(false)

const showDeleteModal = ref(false)
const usuarioAEliminar = ref<UsuarioSchema | null>(null)
const eliminando = ref(false)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const cargar = async () => {
  cargando.value = true
  try {
    const res = await usuarioApiListarUsuarios(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      { ...authOptions(), fetch: fetchWithBaseUrl } as RequestInit,
    )
    if (res.status >= 200 && res.status < 300) {
      usuarios.value = res.data.items
      total.value = res.data.count
    }
  } catch {
    notifyError('Error al cargar los usuarios')
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
  emailForm.value = ''
  passwordForm.value = ''
  showCrearModal.value = true
}

const abrirReset = (u: UsuarioSchema) => {
  usuarioReset.value = u
  nuevaPassword.value = ''
  showResetModal.value = true
}

const abrirEliminar = (u: UsuarioSchema) => {
  usuarioAEliminar.value = u
  showDeleteModal.value = true
}

const crear = async () => {
  if (!emailForm.value.trim() || !passwordForm.value) return
  guardando.value = true
  try {
    const res = await usuarioApiCrearUsuario(
      { email: emailForm.value.trim(), password: passwordForm.value },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Usuario creado correctamente')
      showCrearModal.value = false
      await cargar()
    }
  } catch {
    notifyError('Error al crear el usuario')
  } finally {
    guardando.value = false
  }
}

const resetearPassword = async () => {
  if (!usuarioReset.value?.id || !nuevaPassword.value) return
  reseteando.value = true
  try {
    const res = await usuarioApiRestablecerContrasenaUsuario(
      usuarioReset.value.id,
      { nueva_password: nuevaPassword.value },
      authOptions(),
    )
    if (res.status >= 200 && res.status < 300) {
      success('Contraseña restablecida correctamente')
      showResetModal.value = false
      usuarioReset.value = null
    }
  } catch {
    notifyError('Error al restablecer la contraseña')
  } finally {
    reseteando.value = false
  }
}

const confirmarEliminar = async () => {
  if (!usuarioAEliminar.value?.id) return
  eliminando.value = true
  try {
    const res = await usuarioApiEliminarUsuario(usuarioAEliminar.value.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Usuario eliminado correctamente')
      showDeleteModal.value = false
      usuarioAEliminar.value = null
      await cargar()
    }
  } catch {
    notifyError('Error al eliminar el usuario')
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-5 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Users :size="22" class="text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white sm:text-2xl">Usuarios</h1>
          <p class="text-sm text-white/90">
            {{ total }} usuario{{ total !== 1 ? 's' : '' }} registrado{{ total !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
      <button
        type="button"
        @click="abrirCrear"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-600 shadow-sm transition-all hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <Plus :size="18" />
        Nuevo usuario
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
            placeholder="Buscar usuarios por email..."
            class="w-full rounded-xl border border-[var(--bg-300)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[var(--bg-200)] bg-[var(--bg-100)]/50">
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Email
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]"
              >
                Rol
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
                <div class="h-5 w-56 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-6 py-4">
                <div class="h-5 w-20 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
              <td class="px-6 py-4">
                <div class="ml-auto h-8 w-24 animate-pulse rounded bg-[var(--bg-200)]"></div>
              </td>
            </tr>

            <tr v-else-if="usuarios.length === 0">
              <td colspan="3" class="px-6 py-16 text-center">
                <Users :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
                <p class="font-semibold text-[var(--text-100)]">No hay usuarios</p>
                <p class="mt-1 text-sm text-[var(--text-200)]">
                  {{
                    busqueda
                      ? 'Ningún usuario coincide con la búsqueda.'
                      : 'Creá el primer usuario con el botón de arriba.'
                  }}
                </p>
              </td>
            </tr>

            <tr
              v-else
              v-for="u in usuarios"
              :key="u.id ?? u.email"
              class="border-b border-[var(--bg-200)] transition-colors hover:bg-[var(--bg-100)]/50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100"
                  >
                    <User :size="16" class="text-violet-600" />
                  </div>
                  <span class="font-medium text-[var(--text-100)]">{{ u.email }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="u.es_admin"
                  class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                >
                  <ShieldCheck :size="12" />
                  Administrador
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-[var(--bg-200)] px-2.5 py-1 text-xs font-semibold text-[var(--text-200)]"
                >
                  Usuario
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    @click="abrirReset(u)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-200)] transition-colors hover:bg-violet-50 hover:text-violet-600"
                    title="Restablecer contraseña"
                  >
                    <KeyRound :size="16" />
                  </button>
                  <button
                    type="button"
                    @click="abrirEliminar(u)"
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
        v-if="!cargando && usuarios.length > 0"
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

  <BaseModal :show="showCrearModal" title="Nuevo usuario" size="sm" @close="showCrearModal = false">
    <form class="space-y-4" @submit.prevent="crear">
      <BaseInput
        v-model="emailForm"
        type="email"
        label="Email"
        placeholder="usuario@dominio.com"
        required
      />
      <BaseInput
        v-model="passwordForm"
        type="password"
        label="Contraseña"
        placeholder="Mínimo 6 caracteres"
        required
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showCrearModal = false">Cancelar</BaseButton>
      <BaseButton
        :loading="guardando"
        :disabled="!emailForm.trim() || !passwordForm"
        @click="crear"
      >
        Crear usuario
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showResetModal"
    title="Restablecer contraseña"
    size="sm"
    @close="showResetModal = false"
  >
    <form class="space-y-4" @submit.prevent="resetearPassword">
      <p class="text-sm text-[var(--text-200)]">
        Asignar una nueva contraseña para
        <span class="font-semibold text-[var(--text-100)]">{{ usuarioReset?.email }}</span>
      </p>
      <BaseInput
        v-model="nuevaPassword"
        type="password"
        label="Nueva contraseña"
        placeholder="Nueva contraseña"
        required
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="showResetModal = false">Cancelar</BaseButton>
      <BaseButton :loading="reseteando" :disabled="!nuevaPassword" @click="resetearPassword">
        Restablecer
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showDeleteModal"
    title="Eliminar usuario"
    size="sm"
    @close="showDeleteModal = false"
  >
    <p class="text-sm text-[var(--text-100)]">
      ¿Estás seguro que querés eliminar a
      <span class="font-semibold">{{ usuarioAEliminar?.email }}</span
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
