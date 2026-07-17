<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const cotizacionId = computed(() => route.params.id || null)

const clientes = ref([])
const servicios = ref([])
const empresas = ref([])
const error = ref('')
const guardando = ref(false)

const empresaId = ref('')
const clienteId = ref('')
const esClienteOcasional = ref(false)
const clienteOcasional = ref(clienteOcasionalVacio())
const validezDias = ref(15)
const aplicaIva = ref(true)
const titulo = ref('')
const condicionesPago = ref('')
const notas = ref('')
const items = ref([])
const IVA_RATE = 0.16

function clienteOcasionalVacio() {
  return { nombre: '', empresa: '', telefono: '', email: '', direccion: '' }
}

function lineaVacia() {
  return { servicio_id: null, descripcion: '', cantidad: 1, precio_unitario: 0, descuento_pct: 0 }
}

function agregarLinea() {
  items.value.push(lineaVacia())
}

function agregarDesdeServicio(servicioId) {
  const servicio = servicios.value.find((s) => s.id === Number(servicioId))
  if (!servicio) return
  items.value.push({
    servicio_id: servicio.id,
    descripcion: servicio.nombre,
    cantidad: 1,
    precio_unitario: Number(servicio.precio_unitario),
    descuento_pct: 0,
  })
}

function quitarLinea(index) {
  items.value.splice(index, 1)
}

const totales = computed(() => {
  let subtotal = 0
  let descuentoTotal = 0
  for (const item of items.value) {
    const bruto = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
    const descuento = bruto * ((Number(item.descuento_pct) || 0) / 100)
    subtotal += bruto - descuento
    descuentoTotal += descuento
  }
  const iva = aplicaIva.value ? subtotal * IVA_RATE : 0
  const total = subtotal + iva
  return { subtotal, descuentoTotal, iva, total }
})

function money(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function lineaSubtotal(item) {
  const bruto = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0)
  return bruto - bruto * ((Number(item.descuento_pct) || 0) / 100)
}

function aplicarDefaultsEmpresa(id) {
  const empresa = empresas.value.find((e) => e.id === Number(id))
  if (!empresa || cotizacionId.value) return
  validezDias.value = empresa.vigencia_dias_default || 15
  condicionesPago.value = empresa.condiciones_pago_default || ''
}

function onEmpresaChange() {
  aplicarDefaultsEmpresa(empresaId.value)
}

async function cargarCatalogos() {
  const [clientesRes, serviciosRes, empresasRes] = await Promise.all([
    api.get('/clientes'),
    api.get('/servicios'),
    api.get('/empresas'),
  ])
  clientes.value = clientesRes.data
  servicios.value = serviciosRes.data
  empresas.value = empresasRes.data
  if (!cotizacionId.value && empresas.value.length) {
    empresaId.value = empresas.value[0].id
    aplicarDefaultsEmpresa(empresaId.value)
  }
}

async function cargarCotizacionExistente() {
  const { data } = await api.get(`/cotizaciones/${cotizacionId.value}`)
  empresaId.value = data.empresa_id
  if (data.cliente_id) {
    esClienteOcasional.value = false
    clienteId.value = data.cliente_id
  } else {
    esClienteOcasional.value = true
    clienteOcasional.value = {
      nombre: data.cliente_nombre || '',
      empresa: data.cliente_empresa || '',
      telefono: data.cliente_telefono || '',
      email: data.cliente_email || '',
      direccion: data.cliente_direccion || '',
    }
  }
  validezDias.value = data.validez_dias
  aplicaIva.value = !!data.aplica_iva
  titulo.value = data.titulo || ''
  condicionesPago.value = data.condiciones_pago || ''
  notas.value = data.notas || ''
  items.value = data.items.map((item) => ({
    servicio_id: item.servicio_id,
    descripcion: item.descripcion,
    cantidad: Number(item.cantidad),
    precio_unitario: Number(item.precio_unitario),
    descuento_pct: Number(item.descuento_pct),
  }))
}

async function guardar() {
  error.value = ''
  if (!empresaId.value) {
    error.value = 'Selecciona una empresa'
    return
  }
  if (esClienteOcasional.value) {
    if (!clienteOcasional.value.nombre) {
      error.value = 'Escribe el nombre del cliente'
      return
    }
  } else if (!clienteId.value) {
    error.value = 'Selecciona un cliente'
    return
  }
  if (!items.value.length) {
    error.value = 'Agrega al menos una linea a la cotizacion'
    return
  }

  guardando.value = true
  try {
    const payload = {
      empresa_id: empresaId.value,
      validez_dias: validezDias.value,
      aplica_iva: aplicaIva.value,
      titulo: titulo.value,
      condiciones_pago: condicionesPago.value,
      notas: notas.value,
      items: items.value,
      ...(esClienteOcasional.value
        ? { cliente_nuevo: clienteOcasional.value }
        : { cliente_id: clienteId.value }),
    }
    let data
    if (cotizacionId.value) {
      ;({ data } = await api.put(`/cotizaciones/${cotizacionId.value}`, payload))
    } else {
      ;({ data } = await api.post('/cotizaciones', payload))
    }
    router.push({ name: 'cotizacion-detalle', params: { id: data.id } })
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo guardar la cotizacion'
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  await cargarCatalogos()
  if (cotizacionId.value) {
    await cargarCotizacionExistente()
  } else {
    agregarLinea()
  }
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl">
    <h1 class="text-xl font-semibold text-slate-900 mb-6">
      {{ cotizacionId ? 'Editar cotizacion' : 'Nueva cotizacion' }}
    </h1>

    <div class="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
    <div class="min-w-0">

    <div class="bg-white rounded-lg border border-slate-200 p-5 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Empresa que emite *</label>
          <select v-model="empresaId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" @change="onEmpresaChange">
            <option value="" disabled>Selecciona una empresa</option>
            <option v-for="e in empresas" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Validez (dias)</label>
          <input v-model="validezDias" type="number" min="1" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <label class="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input :checked="aplicaIva" type="checkbox" class="rounded border-slate-300" @change="aplicaIva = $event.target.checked" />
        Aplicar IVA a esta cotización
      </label>

      <div class="mt-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <label class="block text-xs font-medium text-slate-600">Cliente *</label>
          <div class="flex text-xs rounded-md border border-slate-300 overflow-hidden w-full sm:w-auto">
            <button
              type="button"
              class="flex-1 sm:flex-none px-3 py-1.5"
              :class="!esClienteOcasional ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'"
              @click="esClienteOcasional = false"
            >
              Cliente registrado
            </button>
            <button
              type="button"
              class="flex-1 sm:flex-none px-3 py-1.5 border-l border-slate-300"
              :class="esClienteOcasional ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'"
              @click="esClienteOcasional = true"
            >
              Cliente sin registrar
            </button>
          </div>
        </div>

        <select v-if="!esClienteOcasional" v-model="clienteId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="" disabled>Selecciona un cliente</option>
          <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.empresa ? `(${c.empresa})` : '' }}</option>
        </select>

        <div v-else class="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50">
          <p class="text-xs text-slate-500">
            Captura los datos del cliente directo en la cotizacion. Podras guardarlo como cliente registrado despues.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input v-model="clienteOcasional.nombre" placeholder="Nombre *" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input v-model="clienteOcasional.empresa" placeholder="Empresa" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input v-model="clienteOcasional.telefono" placeholder="Telefono" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input v-model="clienteOcasional.email" type="email" placeholder="Email" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input v-model="clienteOcasional.direccion" placeholder="Direccion" class="sm:col-span-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div class="mt-4">
        <label class="block text-xs font-medium text-slate-600 mb-1">Título (aparece en el PDF, ej. "Sistema de CCTV — 4 cámaras")</label>
        <input v-model="titulo" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div class="mt-4">
        <label class="block text-xs font-medium text-slate-600 mb-1">Notas y observaciones</label>
        <textarea v-model="notas" rows="2" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="mt-4">
        <label class="block text-xs font-medium text-slate-600 mb-1">Condiciones de pago</label>
        <textarea v-model="condicionesPago" rows="2" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"></textarea>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 p-5 mb-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 class="text-sm font-semibold text-slate-700">Lineas de la cotizacion</h2>
        <div class="flex flex-col sm:flex-row gap-2">
          <select
            class="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-full sm:w-auto"
            @change="(e) => { agregarDesdeServicio(e.target.value); e.target.value = '' }"
          >
            <option value="" disabled selected>Agregar del catalogo...</option>
            <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.categoria_nombre }} · {{ s.nombre }}</option>
          </select>
          <button type="button" class="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 w-full sm:w-auto" @click="agregarLinea">
            + Linea personalizada
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-slate-500 text-left">
            <tr>
              <th class="py-1 font-medium">Descripcion</th>
              <th class="py-1 font-medium w-20">Cant.</th>
              <th class="py-1 font-medium w-28">P. Unit.</th>
              <th class="py-1 font-medium w-20">Desc %</th>
              <th class="py-1 font-medium w-28 text-right">Subtotal</th>
              <th class="py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index" class="border-t border-slate-100">
              <td class="py-1.5 pr-2">
                <input v-model="item.descripcion" class="w-full rounded-md border border-slate-300 px-2 py-1" />
              </td>
              <td class="py-1.5 pr-2">
                <input v-model="item.cantidad" type="number" min="0" step="0.01" class="w-full rounded-md border border-slate-300 px-2 py-1" />
              </td>
              <td class="py-1.5 pr-2">
                <input v-model="item.precio_unitario" type="number" min="0" step="0.01" class="w-full rounded-md border border-slate-300 px-2 py-1" />
              </td>
              <td class="py-1.5 pr-2">
                <input v-model="item.descuento_pct" type="number" min="0" max="100" step="1" class="w-full rounded-md border border-slate-300 px-2 py-1" />
              </td>
              <td class="py-1.5 text-right text-slate-700">{{ money(lineaSubtotal(item)) }}</td>
              <td class="py-1.5 text-right">
                <button type="button" class="text-red-500 hover:text-red-700" @click="quitarLinea(index)">✕</button>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="6" class="py-6 text-center text-slate-400">Agrega al menos una linea</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    </div>

    <aside class="mt-4 lg:mt-0 lg:sticky lg:top-6 space-y-4">
      <div class="bg-white rounded-lg border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">Resumen</h2>
        <div class="flex justify-between text-sm py-1">
          <span class="text-slate-500">Subtotal</span>
          <span class="text-slate-900">{{ money(totales.subtotal) }}</span>
        </div>
        <div class="flex justify-between text-sm py-1">
          <span class="text-slate-500">Descuento</span>
          <span class="text-slate-900">{{ money(totales.descuentoTotal) }}</span>
        </div>
        <div v-if="aplicaIva" class="flex justify-between text-sm py-1">
          <span class="text-slate-500">IVA (16%)</span>
          <span class="text-slate-900">{{ money(totales.iva) }}</span>
        </div>
        <p v-else class="text-xs text-slate-400 py-1">Esta cotización no incluye IVA</p>
        <div class="flex justify-between text-base font-semibold py-2 border-t border-slate-200 mt-1">
          <span>Total</span>
          <span>{{ money(totales.total) }}</span>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
        <button
          type="button"
          :disabled="guardando"
          class="w-full text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          @click="guardar"
        >
          {{ guardando ? 'Guardando...' : 'Guardar cotizacion' }}
        </button>
        <button type="button" class="w-full text-sm px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100" @click="router.back()">
          Cancelar
        </button>
      </div>
    </aside>
    </div>
  </div>
</template>
