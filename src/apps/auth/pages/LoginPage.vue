<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    // TODO: conectar con authApiLogin de @/apps/auth/api
    router.push('/app')
  } catch (e) {
    error.value = 'Credenciales incorrectas'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-100)]">
    <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
      <h1 class="mb-6 text-center text-2xl font-bold text-[var(--primary-100)]">Iniciar sesión</h1>
      <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
        <BaseInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="usuario@ejemplo.com"
          required
        />
        <BaseInput
          v-model="password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          required
        />
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        <BaseButton type="submit" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </BaseButton>
      </form>
    </div>
  </div>
</template>
