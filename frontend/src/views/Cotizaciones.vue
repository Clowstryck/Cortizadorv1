<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'

const cotizaciones = ref([])
const clientes = ref([])
const empresas = ref([])
const filtroEstado = ref('')
const filtroCliente = ref('')
const filtroEmpresa = ref('')
const filtroMes = ref('')
const filtroAnio = ref('')
const busqueda = ref('')
const error = ref('')

const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada', 'cancelada']

const MESES = [
  { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
]

const anioActual = new Date().getFullYear()
const ANIOS = Array.from({ length: 6 }, (_, i) => anioActual - i)

const colorEstado = {
  borrador: 'bg-slate-100 text-slate-600',
  enviada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  cancelada: 'bg-slate-200 text-slate-500',
}

async function cargar() {
  try {
    const params = {}
    if (filtroEstado.value) params.estado = filtroEstado.value
    if (filtroCliente.value) params.cliente_id = filtroCliente.value
    if (filtroEmpresa.value) params.empresa_id = filtroEmpresa.value
    if (filtroMes.value) params.mes = filtroMes.value
    if (filtroAnio.value) params.anio = filtroAnio.value
    if (busqueda.value) params.q = busqueda.value
    const { data } = await api.get('/cotizaciones', { params })
    cotizaciones.value = data
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al cargar cotizaciones'
  }
}

async function cargarClientes() {
  try {
    const { data } = await api.get('/clientes')
    clientes.value = data
  } catch (err) {
    // Silencioso: el filtro de cliente simplemente no se puebla si falla.
  }
}

async function cargarEmpresas() {
  try {
    const { data } = await api.get('/empresas')
    empresas.value = data
  } catch (err) {
    // Silencioso: el filtro de empresa simplemente no se puebla si falla.
  }
}

function money(v) {
  return Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

onMounted(() => {
  cargar()
  cargarClientes()
  cargarEmpresas()
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h1 class="text-xl font-semibold text-slate-900">Cotizaciones</h1>
      <RouterLink to="/cotizador" class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800">
        + Nueva cotizacion
      </RouterLink>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <select v-model="filtroEstado" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargar">
        <option value="">Todos los estados</option>
        <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
      </select>
      <select v-model="filtroEmpresa" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargar">
        <option value="">Todas las empresas</option>
        <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nombre }}</option>
      </select>
      <select v-model="filtroCliente" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargar">
        <option value="">Todos los clientes</option>
        <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
      <select v-model="filtroMes" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargar">
        <option value="">Todos los meses</option>
        <option v-for="m in MESES" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
      </select>
      <select v-model="filtroAnio" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargar">
        <option value="">Todos los años</option>
        <option v-for="a in ANIOS" :key="a" :value="a">{{ a }}</option>
      </select>
      <input
        v-model="busqueda"
        type="text"
        placeholder="Buscar por folio o cliente..."
        class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        @keyup.enter="cargar"
      />
      <button class="text-sm rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="cargar">
        Buscar
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 mb-3">{{ error }}</p>

    <div class="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th class="px-4 py-2 font-medium">Folio</th>
            <th class="px-4 py-2 font-medium">Empresa</th>
            <th class="px-4 py-2 font-medium">Cliente</th>
            <th class="px-4 py-2 font-medium">Fecha</th>
            <th class="px-4 py-2 font-medium">Vendedor</th>
            <th class="px-4 py-2 font-medium">Estado</th>
            <th class="px-4 py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cot in cotizaciones"
            :key="cot.id"
            class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
            @click="$router.push({ name: 'cotizacion-detalle', params: { id: cot.id } })"
          >
            <td class="px-4 py-2 font-medium text-slate-900">{{ cot.folio }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cot.empresa_nombre }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cot.cliente_nombre }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cot.fecha_emision }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cot.usuario_nombre }}</td>
            <td class="px-4 py-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="colorEstado[cot.estado]">
                {{ cot.estado }}
              </span>
            </td>
            <td class="px-4 py-2 text-right text-slate-900">{{ money(cot.total) }}</td>
          </tr>
          <tr v-if="!cotizaciones.length">
            <td colspan="7" class="px-4 py-6 text-center text-slate-400">No hay cotizaciones registradas</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
