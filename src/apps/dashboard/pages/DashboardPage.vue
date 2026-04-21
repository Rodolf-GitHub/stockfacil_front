<script setup lang="ts">
import { LayoutDashboard } from 'lucide-vue-next'

const userEmail = localStorage.getItem('user_email') || 'Usuario'
const esAdmin = localStorage.getItem('es_admin') === 'true'
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-100)]/15">
        <LayoutDashboard :size="26" class="text-[var(--primary-100)]" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-100)]">Dashboard</h1>
        <p class="text-sm text-[var(--text-200)]">Resumen general del sistema</p>
      </div>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-6 shadow-sm">
      <p class="text-lg font-semibold text-[var(--text-100)]">Bienvenido, {{ userEmail }} 👋</p>
      <p class="mt-1 text-sm text-[var(--text-200)]">
        {{ esAdmin ? 'Tenés acceso de administrador.' : 'Sesión iniciada correctamente.' }}
        Usá el menú lateral para navegar por las secciones.
      </p>
    </div>
  </div>
</template>
