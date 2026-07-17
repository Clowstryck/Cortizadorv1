<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const resumen = ref(null)
const error = ref('')

function money(v) {
  return Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const maxMes = (porMes) => Math.max(1, ...porMes.map((m) => Number(m.monto)))

async function cargar() {
  try {
    const { data } = await api.get('/reportes/resumen')
    resumen.value = data
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo cargar el dashboard'
  }
}

onMounted(cargar)
</script>

<template>
  <div v-if="resumen" class="p-4 sm:p-6 space-y-6">
    <h1 class="text-xl font-semibold text-slate-900">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <p class="text-xs text-slate-500 uppercase font-medium">Total de cotizaciones</p>
        <p class="text-2xl font-semibold text-slate-900 mt-1">{{ resumen.totales.total_cotizaciones }}</p>
      </div>
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <p class="text-xs text-slate-500 uppercase font-medium">Monto aprobado</p>
        <p class="text-2xl font-semibold text-green-600 mt-1">{{ money(resumen.totales.total_aprobado) }}</p>
      </div>
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <p class="text-xs text-slate-500 uppercase font-medium">Monto total cotizado</p>
        <p class="text-2xl font-semibold text-slate-900 mt-1">{{ money(resumen.totales.total_general) }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">Por estado</h2>
        <ul class="space-y-2">
          <li v-for="e in resumen.porEstado" :key="e.estado" class="flex justify-between text-sm">
            <span class="text-slate-600 capitalize">{{ e.estado }} ({{ e.cantidad }})</span>
            <span class="text-slate-900">{{ money(e.monto) }}</span>
          </li>
          <li v-if="!resumen.porEstado.length" class="text-sm text-slate-400">Sin datos aun</li>
        </ul>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">Por categoria de servicio</h2>
        <ul class="space-y-2">
          <li v-for="c in resumen.porCategoria" :key="c.categoria" class="flex justify-between text-sm">
            <span class="text-slate-600">{{ c.categoria }} ({{ c.lineas }})</span>
            <span class="text-slate-900">{{ money(c.monto) }}</span>
          </li>
          <li v-if="!resumen.porCategoria.length" class="text-sm text-slate-400">Sin datos aun</li>
        </ul>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">Ultimos 12 meses</h2>
        <div class="space-y-2">
          <div v-for="m in resumen.porMes" :key="m.mes" class="flex items-center gap-2 text-sm">
            <span class="w-16 text-slate-500">{{ m.mes }}</span>
            <div class="flex-1 bg-slate-100 rounded h-3">
              <div
                class="bg-slate-900 h-3 rounded"
                :style="{ width: `${(Number(m.monto) / maxMes(resumen.porMes)) * 100}%` }"
              ></div>
            </div>
            <span class="w-24 text-right text-slate-900">{{ money(m.monto) }}</span>
          </div>
          <p v-if="!resumen.porMes.length" class="text-sm text-slate-400">Sin datos aun</p>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">Top clientes</h2>
        <ul class="space-y-2">
          <li v-for="c in resumen.topClientes" :key="c.cliente" class="flex justify-between text-sm">
            <span class="text-slate-600">{{ c.cliente }} ({{ c.cotizaciones }})</span>
            <span class="text-slate-900">{{ money(c.monto) }}</span>
          </li>
          <li v-if="!resumen.topClientes.length" class="text-sm text-slate-400">Sin datos aun</li>
        </ul>
      </div>
    </div>
  </div>
  <p v-else-if="error" class="p-6 text-sm text-red-600">{{ error }}</p>
</template>
