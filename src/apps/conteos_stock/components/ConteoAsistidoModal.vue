<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks, Lock, RotateCcw } from 'lucide-vue-next'
import {
  conteostockApiActualizarItem,
  conteostockApiCrearItem,
  conteostockApiFinalizarConteo,
  conteostockApiListarItems,
  conteostockApiReabrirConteo,
} from '@/apps/conteos_stock/api'
import type { ConteoStockSchema, ItemConteoStockSchema } from '@/apps/conteos_stock/api/schemas'
import { plantillastockApiListarPlantillas } from '@/apps/plantillas_stock/api'
import type { PlantillaStockSchema } from '@/apps/plantillas_stock/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'

const props = defineProps<{
  show: boolean
  conteo: ConteoStockSchema
  localNombre: string
  plantillaItemsInicial?: PlantillaStockSchema[]
  itemsExistentesInicial?: ItemConteoStockSchema[]
}>()

const emit = defineEmits<{
  close: []
  finalizado: [conteo: ConteoStockSchema]
  reabierto: [conteo: ConteoStockSchema]
  itemGuardado: [item: ItemConteoStockSchema]
}>()

const { success, error: notifyError } = useNotification()

const plantillaItems = ref<PlantillaStockSchema[]>([])
const itemsExistentes = ref<ItemConteoStockSchema[]>([])
const cargando = ref(false)
const stepIdx = ref(0)
const cantidadActual = ref<string | number>('')
const guardandoPaso = ref(false)
const finalizando = ref(false)
const reabriendo = ref(false)

// Estado local mutable para reflejar cambios sin mutar el prop
const estadoLocal = ref(props.conteo.estado)
watch(
  () => props.conteo.estado,
  (v) => {
    estadoLocal.value = v
  },
)

const authOptions = (): RequestInit => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
})

const esSoloLectura = computed(() => estadoLocal.value === 'finalizado')

const esCantidadVacia = (v: string | number) =>
  v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))

const unidadPlural = (unidad: string | null | undefined) => {
  const u = (unidad || '').trim().toLowerCase()
  if (!u || u === 'otros') return ''
  const map: Record<string, string> = {
    kg: 'kilogramos',
    unidades: 'unidades',
    litros: 'litros',
    atados: 'atados',
    cajas: 'cajas',
    sacos: 'sacos',
    bandejas: 'bandejas',
    planchas: 'planchas',
  }
  return map[u] ?? u
}

const productoYaContado = (productoId: number) =>
  itemsExistentes.value.some((it) => it.producto === productoId)

const stepActual = computed<PlantillaStockSchema | null>(
  () => plantillaItems.value[stepIdx.value] ?? null,
)
const totalSteps = computed(() => plantillaItems.value.length)
const itemActual = computed<ItemConteoStockSchema | null>(() => {
  if (!stepActual.value) return null
  return itemsExistentes.value.find((it) => it.producto === stepActual.value!.producto_id) ?? null
})
const itemsContados = computed(
  () =>
    itemsExistentes.value.filter(
      (it) => it.cantidad_conteada != null && it.cantidad_conteada !== '',
    ).length,
)
const progresoPct = computed(() =>
  totalSteps.value === 0 ? 0 : Math.round((itemsContados.value / totalSteps.value) * 100),
)
const todosContados = computed(
  () => totalSteps.value > 0 && itemsContados.value >= totalSteps.value,
)
const cantidadVacia = computed(() => esCantidadVacia(cantidadActual.value))

const sincronizarInput = () => {
  const v = itemActual.value?.cantidad_conteada
  cantidadActual.value = v != null && v !== '' ? Number(v) : ''
}
watch(stepIdx, sincronizarInput)

const formatFecha = (f?: string) => {
  if (!f) return '-'
  const m = f.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return f
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-AR')
}

const estadoClass = (estado?: string) => {
  if (estado === 'finalizado') return 'bg-emerald-100 text-emerald-700'
  return 'bg-amber-100 text-amber-700'
}

const cargar = async () => {
  if (!props.conteo.id) return

  // Si ya tenemos datos precargados, usarlos directamente
  if (props.plantillaItemsInicial && props.itemsExistentesInicial) {
    plantillaItems.value = [...props.plantillaItemsInicial]
    itemsExistentes.value = [...props.itemsExistentesInicial]
    const primerSinContar = plantillaItems.value.findIndex(
      (p) => !itemsExistentes.value.some((it) => it.producto === p.producto_id),
    )
    stepIdx.value = primerSinContar >= 0 ? primerSinContar : 0
    sincronizarInput()
    return
  }

  cargando.value = true
  try {
    const [resPlant, resItems] = await Promise.all([
      plantillastockApiListarPlantillas({ local_id: props.conteo.local, limit: 1000, offset: 0 }, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
      conteostockApiListarItems(props.conteo.id, {
        ...authOptions(),
        fetch: fetchWithBaseUrl,
      } as RequestInit),
    ])
    if (resPlant.status >= 200 && resPlant.status < 300) plantillaItems.value = resPlant.data.items
    if (resItems.status >= 200 && resItems.status < 300) itemsExistentes.value = resItems.data

    const primerSinContar = plantillaItems.value.findIndex(
      (p) => !itemsExistentes.value.some((it) => it.producto === p.producto_id),
    )
    stepIdx.value = primerSinContar >= 0 ? primerSinContar : 0
    sincronizarInput()
  } catch {
    notifyError('Error al cargar la plantilla del local')
  } finally {
    cargando.value = false
  }
}

watch(
  () => [props.show, props.conteo.id] as const,
  ([show]) => {
    if (show) {
      estadoLocal.value = props.conteo.estado
      cargar()
    } else {
      plantillaItems.value = []
      itemsExistentes.value = []
      stepIdx.value = 0
      cantidadActual.value = ''
    }
  },
  { immediate: true },
)

const guardarPaso = async (): Promise<boolean> => {
  if (!props.conteo.id || !stepActual.value || esSoloLectura.value) return true
  if (cantidadVacia.value) {
    notifyError('Ingresá una cantidad')
    return false
  }
  const cant = Number(cantidadActual.value)
  if (Number.isNaN(cant) || cant < 0) {
    notifyError('Cantidad inválida')
    return false
  }
  const existente = itemActual.value
  if (existente && Number(existente.cantidad_conteada) === cant) return true
  guardandoPaso.value = true
  try {
    if (existente?.id) {
      const res = await conteostockApiActualizarItem(
        existente.id,
        { cantidad_conteada: cant },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        existente.cantidad_conteada = String(cant)
        emit('itemGuardado', existente)
        return true
      }
    } else {
      const res = await conteostockApiCrearItem(
        {
          conteo_stock_id: props.conteo.id,
          producto_id: stepActual.value.producto_id,
          cantidad_conteada: cant,
        },
        authOptions(),
      )
      if (res.status >= 200 && res.status < 300) {
        itemsExistentes.value.push(res.data)
        emit('itemGuardado', res.data)
        return true
      }
    }
    notifyError('No se pudo guardar')
    return false
  } catch {
    notifyError('Error al guardar')
    return false
  } finally {
    guardandoPaso.value = false
  }
}

const irSiguiente = async () => {
  const ok = await guardarPaso()
  if (!ok) return
  if (stepIdx.value < totalSteps.value - 1) stepIdx.value++
}

const irAnterior = async () => {
  if (!cantidadVacia.value && !esSoloLectura.value) await guardarPaso()
  if (stepIdx.value > 0) stepIdx.value--
}

const irAlPaso = async (idx: number) => {
  if (idx === stepIdx.value) return
  if (!cantidadVacia.value && !esSoloLectura.value) await guardarPaso()
  stepIdx.value = idx
}

const finalizarConteo = async () => {
  if (!props.conteo.id) return
  if (!cantidadVacia.value && !esSoloLectura.value) {
    const ok = await guardarPaso()
    if (!ok) return
  }
  if (!todosContados.value) {
    notifyError('Faltan productos por contar')
    return
  }
  finalizando.value = true
  try {
    const res = await conteostockApiFinalizarConteo(props.conteo.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo finalizado')
      estadoLocal.value = 'finalizado'
      emit('finalizado', { ...props.conteo, estado: 'finalizado' })
    }
  } catch {
    notifyError('Error al finalizar el conteo')
  } finally {
    finalizando.value = false
  }
}

const reabrirConteo = async () => {
  if (!props.conteo.id) return
  reabriendo.value = true
  try {
    const res = await conteostockApiReabrirConteo(props.conteo.id, authOptions())
    if (res.status >= 200 && res.status < 300) {
      success('Conteo reabierto')
      const nuevoEstado = res.data?.estado ?? 'borrador'
      estadoLocal.value = nuevoEstado
      emit('reabierto', { ...props.conteo, estado: nuevoEstado })
    }
  } catch {
    notifyError('Error al reabrir el conteo')
  } finally {
    reabriendo.value = false
  }
}

const cerrar = async () => {
  if (!cantidadVacia.value && !esSoloLectura.value && stepActual.value) {
    await guardarPaso()
  }
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="esSoloLectura ? 'Detalle del conteo' : 'Conteo asistido'"
    size="lg"
    @close="cerrar"
  >
    <div class="space-y-4 sm:space-y-5">
      <!-- Info del conteo -->
      <div
        class="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--bg-100)] p-2.5 text-xs sm:gap-3 sm:p-3 sm:text-sm"
      >
        <span class="font-semibold text-[var(--text-100)]">{{ localNombre }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span class="text-[var(--text-200)]">{{ formatFecha(conteo.fecha) }}</span>
        <span class="text-[var(--text-200)]">·</span>
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
          :class="estadoClass(estadoLocal)"
        >
          {{ estadoLocal || 'abierto' }}
        </span>
      </div>

      <!-- Cargando -->
      <div v-if="cargando" class="py-12 text-center text-sm text-[var(--text-200)]">
        Cargando plantilla...
      </div>

      <!-- Sin plantilla -->
      <div
        v-else-if="totalSteps === 0"
        class="rounded-xl border border-dashed border-[var(--bg-300)] p-8 text-center"
      >
        <ListChecks :size="36" class="mx-auto mb-3 text-[var(--bg-300)]" />
        <p class="font-semibold text-[var(--text-100)]">
          Este local no tiene plantilla configurada
        </p>
        <p class="mt-1 text-sm text-[var(--text-200)]">
          Agregá productos a la plantilla del local para poder hacer conteos.
        </p>
      </div>

      <template v-else>
        <!-- Progreso -->
        <div>
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-[var(--text-100)]">
              Producto {{ stepIdx + 1 }} de {{ totalSteps }}
            </span>
            <span class="text-[var(--text-200)]">
              {{ itemsContados }} / {{ totalSteps }} contados ({{ progresoPct }}%)
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-200)]">
            <div
              class="h-full bg-teal-500 transition-all"
              :style="{ width: `${progresoPct}%` }"
            ></div>
          </div>
        </div>

        <!-- Card pregunta -->
        <div
          v-if="stepActual"
          class="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 sm:p-6"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-teal-600 sm:text-xs">
            Pregunta
          </p>
          <h3 class="mt-1 text-lg font-bold leading-snug text-[var(--text-100)] sm:text-2xl">
            ¿Cuántos
            <span class="text-teal-700">
              {{ unidadPlural(stepActual.producto_unidad_medida) || 'unidades' }}
            </span>
            de
            <span class="text-teal-700">
              {{ (stepActual.producto_nombre ?? `#${stepActual.producto_id}`).toLowerCase() }}
            </span>
            hay en
            <span class="text-teal-700">{{ localNombre }}</span
            >?
          </h3>

          <div class="mt-4 sm:mt-5">
            <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">
              Tu respuesta <span v-if="!esSoloLectura" class="text-red-500">*</span>
            </label>
            <div class="flex items-stretch gap-2">
              <input
                v-model="cantidadActual"
                type="number"
                step="0.01"
                min="0"
                :disabled="esSoloLectura"
                placeholder="0"
                class="min-w-0 flex-1 rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2.5 text-base font-semibold text-[var(--text-100)] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-[var(--bg-100)] sm:px-4 sm:py-3 sm:text-lg"
                @keyup.enter="irSiguiente"
              />
              <span
                class="inline-flex shrink-0 max-w-[40%] items-center justify-center truncate rounded-lg bg-[var(--bg-100)] px-2.5 text-xs font-medium text-[var(--text-200)] sm:max-w-none sm:px-4 sm:text-sm"
              >
                {{
                  unidadPlural(stepActual.producto_unidad_medida) ||
                  stepActual.producto_unidad_medida ||
                  '—'
                }}
              </span>
            </div>
            <p v-if="itemActual" class="mt-2 text-xs text-emerald-600">
              ✓ Ya contado: {{ itemActual.cantidad_conteada }}
            </p>
          </div>
        </div>

        <!-- Navegación por número -->
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-200)]">
            Saltar a producto
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(p, idx) in plantillaItems"
              :key="p.id ?? idx"
              type="button"
              @click="irAlPaso(idx)"
              :title="p.producto_nombre ?? `#${p.producto_id}`"
              :class="[
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                idx === stepIdx
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : productoYaContado(p.producto_id)
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'border-[var(--bg-300)] bg-white text-[var(--text-200)] hover:bg-[var(--bg-100)]',
              ]"
            >
              {{ idx + 1 }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div
        class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3"
      >
        <BaseButton variant="secondary" class="w-full sm:w-auto" @click="cerrar">
          {{ esSoloLectura ? 'Cerrar' : 'Guardar y cerrar' }}
        </BaseButton>

        <template v-if="totalSteps > 0 && !esSoloLectura">
          <div class="grid grid-cols-2 gap-2 sm:contents">
            <BaseButton
              variant="secondary"
              class="w-full sm:w-auto"
              :disabled="stepIdx === 0"
              @click="irAnterior"
            >
              <ArrowLeft :size="16" />
              Anterior
            </BaseButton>
            <BaseButton
              v-if="stepIdx < totalSteps - 1"
              class="w-full sm:w-auto"
              :loading="guardandoPaso"
              :disabled="cantidadVacia"
              @click="irSiguiente"
            >
              Siguiente
              <ArrowRight :size="16" />
            </BaseButton>
          </div>
          <BaseButton
            v-if="todosContados || stepIdx === totalSteps - 1"
            variant="success"
            class="w-full sm:w-auto"
            :loading="finalizando || guardandoPaso"
            @click="finalizarConteo"
          >
            <CheckCircle2 :size="16" />
            Finalizar conteo
          </BaseButton>
        </template>

        <span
          v-else-if="esSoloLectura"
          class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center"
        >
          <span
            class="inline-flex items-center justify-center gap-1 text-sm text-[var(--text-200)]"
          >
            <Lock :size="14" /> Conteo finalizado
          </span>
          <BaseButton
            variant="secondary"
            class="w-full sm:w-auto"
            :loading="reabriendo"
            @click="reabrirConteo"
          >
            <RotateCcw :size="16" />
            Reabrir
          </BaseButton>
        </span>
      </div>
    </template>
  </BaseModal>
</template>
