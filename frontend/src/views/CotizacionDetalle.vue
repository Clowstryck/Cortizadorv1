<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const cotizacion = ref(null)
const error = ref('')
const descargandoPdf = ref(false)
const cambiandoEstado = ref(false)
const comentarioEstado = ref('')
const nuevoEstado = ref('')
const guardandoCliente = ref(false)
const mostrarPreview = ref(false)
const previewUrl = ref(null)
const cargandoPreview = ref(false)

const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada', 'cancelada']
const EDITABLES = ['borrador', 'enviada']

const colorEstado = {
  borrador: 'bg-slate-100 text-slate-600',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  cancelada: 'bg-slate-200 text-slate-500',
}

function money(v) {
  return Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

async function cargar() {
  try {
    const { data } = await api.get(`/cotizaciones/${id}`)
    cotizacion.value = data
    nuevoEstado.value = data.estado
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo cargar la cotizacion'
  }
}

async function descargarPdf() {
  descargandoPdf.value = true
  try {
    const response = await api.get(`/cotizaciones/${id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${cotizacion.value.folio}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('No se pudo generar el PDF')
  } finally {
    descargandoPdf.value = false
  }
}

async function abrirPreview() {
  cargandoPreview.value = true
  try {
    const response = await api.get(`/cotizaciones/${id}/pdf`, { responseType: 'blob' })
    if (previewUrl.value) window.URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    mostrarPreview.value = true
  } catch (err) {
    alert('No se pudo generar la vista previa')
  } finally {
    cargandoPreview.value = false
  }
}

function cerrarPreview() {
  mostrarPreview.value = false
}

async function guardarComoCliente() {
  guardandoCliente.value = true
  try {
    const { data } = await api.post(`/cotizaciones/${id}/guardar-cliente`)
    cotizacion.value = data
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo guardar el cliente')
  } finally {
    guardandoCliente.value = false
  }
}

async function cambiarEstado() {
  if (nuevoEstado.value === cotizacion.value.estado) return
  cambiandoEstado.value = true
  try {
    await api.patch(`/cotizaciones/${id}/estado`, {
      estado: nuevoEstado.value,
      comentario: comentarioEstado.value || null,
    })
    comentarioEstado.value = ''
    await cargar()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo cambiar el estado')
  } finally {
    cambiandoEstado.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div v-if="cotizacion" class="p-4 sm:p-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">{{ cotizacion.folio }}</h1>
        <p class="text-xs text-slate-500 mt-0.5">Emitida por {{ cotizacion.empresa_nombre }}</p>
        <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="colorEstado[cotizacion.estado]">
          {{ cotizacion.estado }}
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="EDITABLES.includes(cotizacion.estado)"
          class="text-sm px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100"
          @click="router.push({ name: 'cotizador-editar', params: { id } })"
        >
          Editar
        </button>
        <button
          :disabled="cargandoPreview"
          class="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          @click="abrirPreview"
        >
          {{ cargandoPreview ? 'Generando...' : 'Vista previa' }}
        </button>
        <button
          :disabled="descargandoPdf"
          class="text-sm px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
          @click="descargarPdf"
        >
          {{ descargandoPdf ? 'Generando...' : 'Descargar PDF' }}
        </button>
      </div>
    </div>

    <h2 v-if="cotizacion.titulo" class="text-base font-semibold text-slate-800 mb-4">{{ cotizacion.titulo }}</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-slate-700">Cliente</h2>
          <span v-if="!cotizacion.cliente_id" class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">sin registrar</span>
        </div>
        <p class="text-sm text-slate-900">{{ cotizacion.cliente_nombre }}</p>
        <p v-if="cotizacion.cliente_empresa" class="text-sm text-slate-500">{{ cotizacion.cliente_empresa }}</p>
        <p v-if="cotizacion.cliente_email" class="text-sm text-slate-500">{{ cotizacion.cliente_email }}</p>
        <p v-if="cotizacion.cliente_telefono" class="text-sm text-slate-500">{{ cotizacion.cliente_telefono }}</p>
        <button
          v-if="!cotizacion.cliente_id"
          :disabled="guardandoCliente"
          class="mt-3 text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
          @click="guardarComoCliente"
        >
          {{ guardandoCliente ? 'Guardando...' : 'Guardar como cliente' }}
        </button>
      </div>
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-2">Detalles</h2>
        <p class="text-sm text-slate-500">Fecha: <span class="text-slate-900">{{ cotizacion.fecha_emision }}</span></p>
        <p class="text-sm text-slate-500">Validez: <span class="text-slate-900">{{ cotizacion.validez_dias }} dias</span></p>
        <p class="text-sm text-slate-500">Vendedor: <span class="text-slate-900">{{ cotizacion.usuario_nombre }}</span></p>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 p-5 mb-4">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Lineas</h2>
      <table class="w-full text-sm">
        <thead class="text-slate-500 text-left">
          <tr>
            <th class="py-1 font-medium">Descripcion</th>
            <th class="py-1 font-medium text-right">Cant.</th>
            <th class="py-1 font-medium text-right">P. Unit.</th>
            <th class="py-1 font-medium text-right">Desc %</th>
            <th class="py-1 font-medium text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cotizacion.items" :key="item.id" class="border-t border-slate-100">
            <td class="py-1.5">{{ item.descripcion }}</td>
            <td class="py-1.5 text-right">{{ item.cantidad }}</td>
            <td class="py-1.5 text-right">{{ money(item.precio_unitario) }}</td>
            <td class="py-1.5 text-right">{{ item.descuento_pct }}%</td>
            <td class="py-1.5 text-right">{{ money(item.subtotal) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 ml-auto max-w-xs">
        <div class="flex justify-between text-sm py-1">
          <span class="text-slate-500">Subtotal</span>
          <span>{{ money(cotizacion.subtotal) }}</span>
        </div>
        <div class="flex justify-between text-sm py-1">
          <span class="text-slate-500">Descuento</span>
          <span>{{ money(cotizacion.descuento_total) }}</span>
        </div>
        <div v-if="cotizacion.aplica_iva" class="flex justify-between text-sm py-1">
          <span class="text-slate-500">IVA</span>
          <span>{{ money(cotizacion.iva) }}</span>
        </div>
        <p v-else class="text-xs text-slate-400 py-1">Esta cotización no incluye IVA</p>
        <div class="flex justify-between text-base font-semibold py-2 border-t border-slate-200 mt-1">
          <span>Total</span>
          <span>{{ money(cotizacion.total) }}</span>
        </div>
      </div>

      <p v-if="cotizacion.notas" class="text-sm text-slate-500 mt-4">
        <span class="font-medium text-slate-700">Notas:</span> {{ cotizacion.notas }}
      </p>
      <p v-if="cotizacion.condiciones_pago" class="text-sm text-slate-500 mt-2">
        <span class="font-medium text-slate-700">Condiciones de pago:</span> {{ cotizacion.condiciones_pago }}
      </p>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 p-5 mb-4">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Cambiar estado</h2>
      <div class="flex flex-wrap gap-2 items-center">
        <select v-model="nuevoEstado" class="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
        </select>
        <input
          v-model="comentarioEstado"
          type="text"
          placeholder="Comentario (opcional)"
          class="flex-1 min-w-[160px] rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          :disabled="cambiandoEstado || nuevoEstado === cotizacion.estado"
          class="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          @click="cambiarEstado"
        >
          Actualizar
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 p-5">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Historial</h2>
      <ul class="space-y-2">
        <li v-for="h in cotizacion.historial" :key="h.id" class="text-sm border-l-2 border-slate-200 pl-3">
          <p class="text-slate-900">
            <span class="font-medium">{{ h.accion }}</span>
            <span v-if="h.estado_anterior || h.estado_nuevo" class="text-slate-500">
              ({{ h.estado_anterior || '—' }} → {{ h.estado_nuevo || '—' }})
            </span>
          </p>
          <p class="text-slate-500 text-xs">{{ h.usuario_nombre || 'Sistema' }} · {{ h.created_at }}</p>
          <p v-if="h.comentario" class="text-slate-600 text-xs mt-0.5">{{ h.comentario }}</p>
        </li>
      </ul>
    </div>
  </div>
  <p v-else-if="error" class="p-6 text-sm text-red-600">{{ error }}</p>

  <div
    v-if="mostrarPreview"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="cerrarPreview"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[92vh] flex flex-col">
      <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
        <h2 class="text-sm font-semibold text-slate-900">Vista previa — {{ cotizacion?.folio }}</h2>
        <div class="flex items-center gap-4">
          <button class="text-sm text-slate-600 hover:text-slate-900" @click="descargarPdf">Descargar</button>
          <button class="text-slate-400 hover:text-slate-600" @click="cerrarPreview">✕</button>
        </div>
      </div>
      <iframe v-if="previewUrl" :src="previewUrl" class="flex-1 w-full rounded-b-lg" title="Vista previa de la cotizacion" />
    </div>
  </div>
</template>
