<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Clipboard, ShoppingCart } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import { useNotification } from '@/composables/useNotification'

const router = useRouter()
const { success, error: notifyError } = useNotification()

type ItemNarrado = {
  producto_id: number
  producto_nombre: string
  unidad_medida: string
  cantidad_a_comprar: number
}

type ListaSnapshot = {
  fecha: string
  localId: number | null
  localNombre: string
  items: ItemNarrado[]
  localesSinConteo: string[]
}

const snapshot = ref<ListaSnapshot | null>(null)
const cargando = ref(false)
const comprados = ref<Set<number>>(new Set())

onMounted(async () => {
  cargando.value = true
  try {
    const raw = sessionStorage.getItem('compras_lista_snapshot')
    if (!raw) {
      notifyError('No hay datos para mostrar. Volvé a la pantalla de compras.')
      return
    }
    snapshot.value = JSON.parse(raw) as ListaSnapshot
  } catch {
    notifyError('No se pudo leer la lista de compras')
  } finally {
    cargando.value = false
  }
})

const itemsNarrados = computed(() => snapshot.value?.items ?? [])
const totalComprados = computed(
  () => itemsNarrados.value.filter((it) => comprados.value.has(it.producto_id)).length,
)

const formatCantidad = (n: number) => {
  if (Number.isInteger(n)) return String(n)
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const fechaTitulo = computed(() => {
  if (!snapshot.value?.fecha) return '-'
  const d = new Date(`${snapshot.value.fecha}T00:00:00`)
  if (Number.isNaN(d.getTime())) return snapshot.value.fecha

  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${d.getDate()} de ${meses[d.getMonth()]}`
})

const textoParaCopiar = computed(() => {
  const encabezado = `${fechaTitulo.value}, esto es lo que debes comprar:`
  const alcance = `Negocio(s): ${snapshot.value?.localNombre ?? 'Todos los negocios'}`

  if (itemsNarrados.value.length === 0) {
    return `${encabezado}\n${alcance}\n\nNo hay productos para comprar.`
  }

  const lineas = itemsNarrados.value.map(
    (it) =>
      `- ${formatCantidad(it.cantidad_a_comprar)} ${it.unidad_medida || 'unidades'} de ${it.producto_nombre}`,
  )
  return `${encabezado}\n${alcance}\n\n${lineas.join('\n')}`
})

const volver = () => {
  router.push({ name: 'compras' })
}

const toggleComprado = (productoId: number) => {
  const next = new Set(comprados.value)
  if (next.has(productoId)) next.delete(productoId)
  else next.add(productoId)
  comprados.value = next
}

const copiarLista = async () => {
  try {
    await navigator.clipboard.writeText(textoParaCopiar.value)
    success('Lista copiada al portapapeles')
  } catch {
    notifyError('No se pudo copiar la lista')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 sm:h-11 sm:w-11"
        >
          <ShoppingCart :size="20" class="text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-white sm:text-2xl">Lista de compra completa</h1>
          <p class="text-xs text-white/90 sm:text-sm">Formato natural para compartir o copiar</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" class="!bg-white !text-rose-700" @click="volver">
          <span class="inline-flex items-center gap-2">
            <ArrowLeft :size="16" />
            Volver
          </span>
        </BaseButton>
        <BaseButton variant="secondary" class="!bg-white !text-rose-700" @click="copiarLista">
          <span class="inline-flex items-center gap-2">
            <Clipboard :size="16" />
            Copiar lista
          </span>
        </BaseButton>
      </div>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)]/50 bg-white p-5 shadow-sm sm:p-6">
      <p class="text-lg font-bold text-[var(--text-100)] sm:text-xl">{{ fechaTitulo }}</p>
      <p class="mt-1 text-sm text-[var(--text-200)]">
        Esto es lo que debes comprar para
        <span class="font-semibold text-[var(--text-100)]">{{
          snapshot?.localNombre || 'todos los negocios'
        }}</span
        >:
      </p>

      <div
        v-if="cargando"
        class="mt-4 space-y-2 rounded-2xl border border-[var(--bg-300)] bg-white p-4"
      >
        <div
          v-for="n in 5"
          :key="`sk-${n}`"
          class="h-5 w-full animate-pulse rounded bg-[var(--bg-200)]"
        ></div>
      </div>

      <div
        v-else-if="itemsNarrados.length === 0"
        class="mt-4 rounded-xl bg-[var(--bg-100)] p-4 text-sm text-[var(--text-200)]"
      >
        No hay productos para comprar con los filtros seleccionados.
      </div>

      <div
        v-else
        class="mt-4 rounded-2xl border border-[#ddd3bf] bg-[#fffdf6] p-4 shadow-sm sm:p-5 libreta-bg"
      >
        <div
          class="mb-3 flex flex-wrap items-center justify-end gap-2 border-b border-dashed border-[#d6ccb7] pb-2"
        >
          <p class="text-xs font-medium text-[#7b725f]">
            Marcados: {{ totalComprados }} / {{ itemsNarrados.length }}
          </p>
        </div>

        <ul class="space-y-1.5">
          <li
            v-for="it in itemsNarrados"
            :key="`item-${it.producto_id}`"
            class="flex items-start gap-2 rounded-md px-1.5 py-1 checklist-line"
          >
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
              :checked="comprados.has(it.producto_id)"
              @change="toggleComprado(it.producto_id)"
            />
            <p
              class="text-sm leading-relaxed text-[#3f3a2f] sm:text-base"
              :class="{ 'line-through opacity-60': comprados.has(it.producto_id) }"
            >
              {{ formatCantidad(it.cantidad_a_comprar) }} {{ it.unidad_medida || 'unidades' }} de
              <span class="font-semibold">{{ it.producto_nombre }}</span>
            </p>
          </li>
        </ul>

        <p class="mt-3 text-[11px] text-[#8a7f68]">
          Las marcas de comprado son temporales y no se guardan.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.libreta-bg {
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(89, 75, 55, 0.08) 0,
    rgba(89, 75, 55, 0.08) 1px,
    transparent 1px,
    transparent 34px
  );
}

.checklist-line {
  background-color: rgba(255, 255, 255, 0.56);
}
</style>
