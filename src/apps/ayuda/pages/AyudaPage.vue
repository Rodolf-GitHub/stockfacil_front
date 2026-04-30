<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  ListChecks,
  Mail,
  MapPin,
  Package,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-vue-next'

const esAdmin = computed(() => localStorage.getItem('es_admin') === 'true')

type AyudaSeccion = {
  titulo: string
  descripcion: string
  to: string
}

const seccionesBase: AyudaSeccion[] = [
  {
    titulo: 'Dashboard',
    descripcion: 'Ver resumen general, estado de conteos y métricas principales.',
    to: '/dashboard',
  },
  {
    titulo: 'Productos',
    descripcion: 'Consultar catálogo y editar información básica de cada producto.',
    to: '/productos',
  },
  {
    titulo: 'Plantillas',
    descripcion: 'Definir cantidades objetivo por local para preparar conteos y compras.',
    to: '/plantillas',
  },
  {
    titulo: 'Conteos',
    descripcion: 'Registrar conteos de stock, continuar borradores y finalizar inventarios.',
    to: '/conteos',
  },
  {
    titulo: 'Compras',
    descripcion: 'Generar la lista de compras por fecha y local según los conteos finalizados.',
    to: '/compras',
  },
]

const seccionesAdmin: AyudaSeccion[] = [
  {
    titulo: 'Locales',
    descripcion: 'Crear y administrar sucursales disponibles en el sistema.',
    to: '/locales',
  },
  {
    titulo: 'Usuarios',
    descripcion: 'Gestionar cuentas y permisos de acceso para el equipo.',
    to: '/usuarios',
  },
  {
    titulo: 'Asignaciones',
    descripcion: 'Relacionar usuarios con locales para delimitar su operación.',
    to: '/asignaciones',
  },
  {
    titulo: 'Unidades de medida',
    descripcion:
      'Configurar las unidades con las que se miden los productos (kg, cajas, unidades, etc.).',
    to: '/unidades-medida',
  },
]

const seccionesUsuario: AyudaSeccion[] = [
  {
    titulo: 'Acceso y permisos',
    descripcion:
      'Tu navegación depende de los permisos asignados. Si falta una sección, pedila a un administrador.',
    to: '/dashboard',
  },
]

const secciones = computed(() => {
  if (esAdmin.value) return [...seccionesBase, ...seccionesAdmin]
  return [...seccionesBase, ...seccionesUsuario]
})

const iconoPorSeccion = (titulo: string) => {
  const key = titulo.toLowerCase()
  if (key === 'dashboard') return LayoutDashboard
  if (key === 'productos') return Package
  if (key === 'plantillas') return ClipboardList
  if (key === 'conteos') return ListChecks
  if (key === 'compras') return ShoppingCart
  if (key === 'locales') return MapPin
  if (key === 'usuarios') return Users
  if (key === 'asignaciones') return Link2
  if (key === 'unidades de medida') return Ruler
  if (key === 'acceso y permisos') return ShieldCheck
  return CircleHelp
}

const colorIconoPorSeccion = (titulo: string) => {
  const key = titulo.toLowerCase()
  if (key === 'dashboard') return 'bg-indigo-100 text-indigo-600'
  if (key === 'productos') return 'bg-amber-100 text-amber-600'
  if (key === 'plantillas') return 'bg-cyan-100 text-cyan-600'
  if (key === 'conteos') return 'bg-teal-100 text-teal-600'
  if (key === 'compras') return 'bg-orange-100 text-orange-600'
  if (key === 'locales') return 'bg-emerald-100 text-emerald-600'
  if (key === 'usuarios') return 'bg-violet-100 text-violet-600'
  if (key === 'asignaciones') return 'bg-rose-100 text-rose-600'
  if (key === 'unidades de medida') return 'bg-amber-100 text-amber-700'
  if (key === 'acceso y permisos') return 'bg-slate-100 text-slate-700'
  return 'bg-sky-100 text-sky-600'
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 sm:h-11 sm:w-11"
        >
          <CircleHelp :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-white sm:text-2xl">Ayuda</h1>
          <p class="text-xs text-white/90 sm:text-sm">
            Guía rápida de funcionalidades para {{ esAdmin ? 'administradores' : 'usuarios' }}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white p-4 shadow-sm sm:p-5">
      <h2 class="text-sm font-semibold text-[var(--text-100)] sm:text-base">¿Qué podés hacer?</h2>
      <p class="mt-1 text-xs text-[var(--text-200)] sm:text-sm">
        Entrá a cada sección para gestionar tus tareas diarias.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <RouterLink
          v-for="sec in secciones"
          :key="sec.titulo"
          :to="sec.to"
          class="group rounded-xl border border-[var(--bg-300)] bg-gradient-to-br from-white to-[var(--bg-100)]/60 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-2.5">
              <span
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                :class="colorIconoPorSeccion(sec.titulo)"
              >
                <component :is="iconoPorSeccion(sec.titulo)" :size="16" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[var(--text-100)]">{{ sec.titulo }}</p>
                <p class="mt-1 text-xs text-[var(--text-200)] sm:text-sm">{{ sec.descripcion }}</p>
              </div>
            </div>
            <ArrowRight
              :size="16"
              class="mt-0.5 shrink-0 text-[var(--text-200)] transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </RouterLink>
      </div>
    </div>

    <div
      class="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm sm:p-5"
    >
      <div class="flex items-center gap-2">
        <LifeBuoy :size="18" class="text-sky-600" />
        <h2 class="text-sm font-semibold text-[var(--text-100)] sm:text-base">Soporte</h2>
      </div>
      <p class="mt-2 text-xs text-[var(--text-200)] sm:text-sm">
        Si necesitás ayuda adicional, escribinos a
        <a
          href="mailto:rodolfogroero2@gmail.com"
          class="font-semibold text-sky-700 underline underline-offset-2"
        >
          rodolfogroero2@gmail.com
        </a>
      </p>
      <div class="mt-4 flex items-center gap-2 text-xs text-[var(--text-200)] sm:text-sm">
        <Mail :size="14" />
        <span>
          Powered by
          <a
            href="https://groerosoftware.com"
            target="_blank"
            rel="noreferrer"
            class="font-semibold text-sky-700 underline underline-offset-2"
          >
            groerosoftware.com
          </a>
        </span>
      </div>
    </div>
  </div>
</template>
