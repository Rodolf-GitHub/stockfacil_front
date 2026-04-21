<script setup lang="ts">
import { Users } from 'lucide-vue-next'
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-100)]/15">
        <Users :size="26" class="text-[var(--primary-100)]" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-100)]">Usuarios</h1>
        <p class="text-sm text-[var(--text-200)]">Gestión de cuentas y accesos</p>
      </div>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/40 bg-white p-6 shadow-sm">
      <p class="text-sm text-[var(--text-200)]">Esta sección está en construcción.</p>
    </div>
  </div>
</template>
