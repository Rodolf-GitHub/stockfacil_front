<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Package,
  Share2,
  Sparkles,
  TriangleAlert,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { authApiLogin } from '@/apps/auth/api'
import type { LoginSchema } from '@/apps/auth/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'

const router = useRouter()
const LOGIN_TIMEOUT_MS = 12000

const email = ref('')
const password = ref('')
const mostrarPassword = ref(false)
const loading = ref(false)
const emailError = ref('')
const passwordError = ref('')
const showErrorModal = ref(false)
const errorModalTitle = ref('')
const errorModalMessage = ref('')
const errorModalHint = ref('')
const errorModalReason = ref('')
const errorModalSteps = ref<string[]>([])

const emailNormalizado = computed(() => email.value.trim().toLowerCase())
const puedeEnviar = computed(
  () => emailNormalizado.value.length > 0 && password.value.length > 0 && !loading.value,
)

const validarCampos = () => {
  emailError.value = ''
  passwordError.value = ''
  let valido = true

  if (!emailNormalizado.value) {
    emailError.value = 'Ingresa tu email.'
    valido = false
  }

  if (!password.value) {
    passwordError.value = 'Ingresa tu contraseña.'
    valido = false
  }

  return valido
}

const openErrorModal = (
  title: string,
  message: string,
  hint = '',
  reason = '',
  steps: string[] = [],
) => {
  errorModalTitle.value = title
  errorModalMessage.value = message
  errorModalHint.value = hint
  errorModalReason.value = reason
  errorModalSteps.value = steps
  showErrorModal.value = true
}

const closeErrorModal = () => {
  showErrorModal.value = false
}

const handleShare = async () => {
  const url = window.location.origin
  try {
    if (navigator.share) {
      await navigator.share({ title: 'StockFácil', text: 'Accede a la aplicacion', url })
      return
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return
    }
    window.open(url, '_blank')
  } catch (shareError) {
    console.error('Error al compartir:', shareError)
  }
}

const handleStatusError = (status: number) => {
  if (status === 401 || status === 403) {
    openErrorModal(
      'Credenciales incorrectas',
      'El email o la contraseña no coinciden.',
      'Verifica tus datos e intenta nuevamente.',
      'Los datos ingresados no coinciden con ninguna cuenta registrada. Puede ser un error de tipeo o que la contraseña fue cambiada.',
      [
        'Revisa que el email este escrito correctamente.',
        'Usa el icono del ojo para verificar la contraseña.',
        'Si olvidaste tu contraseña, contacta al administrador.',
      ],
    )
    return
  }

  if (status >= 500) {
    openErrorModal(
      'Problema del servidor',
      'El servidor tuvo un error al procesar el inicio de sesion.',
      'No depende de tus datos. Intenta nuevamente en unos minutos.',
      'Este error ocurre del lado del sistema, no por algo que hayas hecho mal.',
      [
        'Espera un momento.',
        'Intenta iniciar sesion de nuevo.',
        'Si persiste, contacta al administrador del sistema.',
      ],
    )
    return
  }

  openErrorModal(
    'No se pudo iniciar sesion',
    `Ocurrio un error inesperado (codigo ${status}).`,
    'Si el problema continua, comparte este codigo con el administrador.',
    'Aparecio un error poco comun. Lo mejor es intentar de nuevo.',
    ['Cierra este mensaje.', 'Intenta iniciar sesion otra vez.', 'Si persiste, contacta soporte.'],
  )
}

const handleLogin = async () => {
  if (!validarCampos()) return

  loading.value = true
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

  try {
    const loginData: LoginSchema = {
      email: emailNormalizado.value,
      password: password.value,
    }

    const response = await authApiLogin(loginData, { signal: controller.signal })
    const status = Number(response.status)

    if (status === 200 && response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user_email', response.data.email)
      localStorage.setItem('user_id', String(response.data.usuario_id))
      localStorage.setItem('es_admin', String(response.data.es_admin))
      await router.push('/app')
      return
    }

    handleStatusError(status)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      openErrorModal(
        'Tiempo de espera agotado',
        'La conexion tardo demasiado y se cancelo automaticamente.',
        'Revisa tu internet e intenta nuevamente.',
        'Suele pasar cuando la señal de internet esta lenta o inestable.',
        [
          'Revisa si tienes internet activo.',
          'Acercate al router o cambia de red.',
          'Vuelve a intentar iniciar sesion.',
        ],
      )
      return
    }

    if (err instanceof TypeError) {
      openErrorModal(
        'Sin conexion con el servidor',
        'No se pudo conectar con el servidor.',
        'Confirma tu conexion a internet.',
        'Puede ser por internet cortado o el servidor momentaneamente fuera de linea.',
        [
          'Verifica que tienes internet.',
          'Recarga la pagina e intenta nuevamente.',
          'Si el problema persiste, contacta al administrador.',
        ],
      )
      return
    }

    openErrorModal(
      'Error inesperado',
      'Ocurrio un error no previsto al intentar ingresar.',
      'Vuelve a intentar. Si persiste, contacta soporte.',
      'La app recibio una respuesta que no esperaba. No es un error tuyo.',
      ['Cierra este mensaje e intenta otra vez.', 'Si persiste, contacta al administrador.'],
    )
  } finally {
    window.clearTimeout(timeoutId)
    loading.value = false
  }
}
</script>

<template>
  <div
    class="login-shell flex min-h-screen items-center justify-center bg-[var(--bg-100)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8"
  >
    <div class="login-orb login-orb--left" aria-hidden="true"></div>
    <div class="login-orb login-orb--right" aria-hidden="true"></div>

    <div class="w-full max-w-md space-y-5">
      <header class="space-y-2 text-center">
        <div class="mx-auto flex items-center justify-center gap-2">
          <Package :size="36" class="text-[var(--primary-100)]" />
        </div>
        <div
          class="mx-auto inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[var(--primary-100)] shadow-sm ring-1 ring-[var(--primary-100)]/20"
        >
          <Sparkles :size="14" />
          StockFácil
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--text-100)]">Iniciar sesion</h1>
        <p class="text-sm text-[var(--text-200)]">Ingresa con tu email y contraseña.</p>
      </header>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div
          class="rounded-2xl border border-[var(--bg-300)]/40 bg-white/95 px-5 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-7 sm:py-7"
        >
          <div class="space-y-4">
            <!-- Email -->
            <div>
              <label
                for="email"
                class="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-100)]"
              >
                <Mail :size="15" class="text-[var(--primary-100)]" />
                Email
              </label>
              <input
                id="email"
                v-model="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                :aria-invalid="Boolean(emailError)"
                class="block w-full rounded-xl border border-[var(--bg-300)] bg-white/90 px-3 py-2 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
                placeholder="usuario@empresa.com"
                @input="emailError = ''"
              />
              <p v-if="emailError" class="mt-1 text-sm text-red-600">{{ emailError }}</p>
            </div>

            <!-- Contraseña -->
            <div>
              <label
                for="password"
                class="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-100)]"
              >
                <LockKeyhole :size="15" class="text-[var(--primary-100)]" />
                Contraseña
              </label>
              <div class="relative mt-1">
                <input
                  id="password"
                  v-model="password"
                  name="password"
                  :type="mostrarPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  :aria-invalid="Boolean(passwordError)"
                  class="block w-full rounded-xl border border-[var(--bg-300)] bg-white/90 px-3 py-2 pr-10 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
                  placeholder="••••••••"
                  @input="passwordError = ''"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-200)] hover:text-[var(--text-100)]"
                  :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="mostrarPassword = !mostrarPassword"
                >
                  <EyeOff v-if="mostrarPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
              <p v-if="passwordError" class="mt-1 text-sm text-red-600">{{ passwordError }}</p>
            </div>

            <!-- Botón -->
            <BaseButton
              type="submit"
              class="w-full rounded-xl shadow-sm"
              :loading="loading"
              :disabled="!puedeEnviar"
            >
              {{ loading ? 'Ingresando...' : 'Iniciar sesion' }}
            </BaseButton>

            <div class="flex flex-wrap justify-center gap-3 border-t border-[var(--bg-200)] pt-4">
              <BaseButton variant="secondary" size="sm" class="gap-2" @click="handleShare">
                <Share2 :size="16" />
                Compartir
              </BaseButton>
            </div>
          </div>
        </div>
      </form>

      <p class="text-center text-[10px] text-[var(--text-200)]">
        Powered by
        <a
          href="https://groerosoftware.com"
          target="_blank"
          rel="noreferrer"
          class="font-semibold text-[var(--primary-100)] underline hover:text-[var(--primary-200)]"
        >
          groerosoftware.com
        </a>
      </p>
    </div>

    <BaseModal :show="showErrorModal" :title="errorModalTitle" size="md" @close="closeErrorModal">
      <div class="space-y-3 text-sm text-[var(--text-100)]">
        <p class="flex items-start gap-2 font-semibold text-red-700">
          <TriangleAlert :size="18" class="mt-0.5 shrink-0" />
          {{ errorModalMessage }}
        </p>
        <div v-if="errorModalReason" class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]">
            Por qué pasa
          </p>
          <p class="rounded-lg bg-[var(--bg-100)] p-3 text-sm text-[var(--text-100)]">
            {{ errorModalReason }}
          </p>
        </div>
        <div v-if="errorModalSteps.length" class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]">
            Qué hacer
          </p>
          <ol class="list-decimal space-y-1 pl-5 text-sm text-[var(--text-100)]">
            <li v-for="(step, index) in errorModalSteps" :key="`step-${index}`">
              {{ step }}
            </li>
          </ol>
        </div>
        <p
          v-if="errorModalHint"
          class="rounded-lg bg-[var(--bg-100)] p-3 text-xs text-[var(--text-200)]"
        >
          {{ errorModalHint }}
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="closeErrorModal">Cerrar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.login-shell {
  position: relative;
  overflow: hidden;
}

.login-orb {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  filter: blur(2px);
}

.login-orb--left {
  width: 230px;
  height: 230px;
  left: -60px;
  top: -35px;
  background: radial-gradient(circle, rgba(63, 81, 181, 0.2), rgba(63, 81, 181, 0));
}

.login-orb--right {
  width: 220px;
  height: 220px;
  right: -70px;
  bottom: -70px;
  background: radial-gradient(circle, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0));
}

@media (max-width: 640px) {
  .login-orb--left {
    width: 170px;
    height: 170px;
    top: -40px;
  }

  .login-orb--right {
    width: 160px;
    height: 160px;
    bottom: -50px;
  }
}
</style>
