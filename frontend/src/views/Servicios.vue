<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import Modal from '../components/Modal.vue'
import { camposPara } from '../utils/categoriaAtributos'

const servicios = ref([])
const categorias = ref([])
const filtroCategoria = ref('')
const busqueda = ref('')
const error = ref('')

const mostrarModal = ref(false)
const editando = ref(null)
const form = ref(vacio())

function vacio() {
  return { categoria_id: '', nombre: '', descripcion: '', precio_unitario: '', unidad: 'pieza', atributos: {} }
}

const categoriaSeleccionada = computed(() => categorias.value.find((c) => c.id === Number(form.value.categoria_id)))
const camposDinamicos = computed(() => camposPara(categoriaSeleccionada.value?.clave))

async function cargarCategorias() {
  const { data } = await api.get('/categorias')
  categorias.value = data
}

async function cargarServicios() {
  try {
    const params = {}
    if (filtroCategoria.value) params.categoria_id = filtroCategoria.value
    if (busqueda.value) params.q = busqueda.value
    const { data } = await api.get('/servicios', { params })
    servicios.value = data
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al cargar servicios'
  }
}

function abrirNuevo() {
  editando.value = null
  form.value = vacio()
  mostrarModal.value = true
}

function abrirEditar(servicio) {
  editando.value = servicio
  form.value = { ...servicio, atributos: servicio.atributos || {} }
  mostrarModal.value = true
}

function onCategoriaChange() {
  form.value.atributos = {}
}

async function guardar() {
  try {
    if (editando.value) {
      await api.put(`/servicios/${editando.value.id}`, form.value)
    } else {
      await api.post('/servicios', form.value)
    }
    mostrarModal.value = false
    await cargarServicios()
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al guardar servicio'
  }
}

async function eliminar(servicio) {
  if (!confirm(`¿Eliminar el servicio "${servicio.nombre}"?`)) return
  try {
    await api.delete(`/servicios/${servicio.id}`)
    await cargarServicios()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo eliminar el servicio')
  }
}

function money(v) {
  return Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

onMounted(async () => {
  await cargarCategorias()
  await cargarServicios()
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h1 class="text-xl font-semibold text-slate-900">Catalogo de servicios</h1>
      <button class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800" @click="abrirNuevo">
        + Nuevo servicio
      </button>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <select v-model="filtroCategoria" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="cargarServicios">
        <option value="">Todas las categorias</option>
        <option v-for="cat in categorias" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
      </select>
      <input
        v-model="busqueda"
        type="text"
        placeholder="Buscar servicio..."
        class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        @keyup.enter="cargarServicios"
      />
      <button class="text-sm rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-100" @click="cargarServicios">
        Buscar
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 mb-3">{{ error }}</p>

    <div class="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th class="px-4 py-2 font-medium">Servicio</th>
            <th class="px-4 py-2 font-medium">Categoria</th>
            <th class="px-4 py-2 font-medium">Precio</th>
            <th class="px-4 py-2 font-medium">Unidad</th>
            <th class="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="servicio in servicios" :key="servicio.id" class="border-t border-slate-100">
            <td class="px-4 py-2 text-slate-900">
              {{ servicio.nombre }}
              <span v-if="!servicio.activo" class="ml-2 text-xs text-slate-400">(inactivo)</span>
            </td>
            <td class="px-4 py-2 text-slate-600">{{ servicio.categoria_nombre }}</td>
            <td class="px-4 py-2 text-slate-600">{{ money(servicio.precio_unitario) }}</td>
            <td class="px-4 py-2 text-slate-600">{{ servicio.unidad }}</td>
            <td class="px-4 py-2 text-right space-x-2">
              <button class="text-slate-500 hover:text-slate-900" @click="abrirEditar(servicio)">Editar</button>
              <button class="text-red-500 hover:text-red-700" @click="eliminar(servicio)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!servicios.length">
            <td colspan="5" class="px-4 py-6 text-center text-slate-400">No hay servicios registrados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="mostrarModal" :titulo="editando ? 'Editar servicio' : 'Nuevo servicio'" @close="mostrarModal = false">
      <form class="space-y-3" @submit.prevent="guardar">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Categoria *</label>
          <select v-model="form.categoria_id" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" @change="onCategoriaChange">
            <option value="" disabled>Selecciona una categoria</option>
            <option v-for="cat in categorias" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input v-model="form.nombre" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Descripcion</label>
          <textarea v-model="form.descripcion" rows="2" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Precio unitario *</label>
            <input v-model="form.precio_unitario" type="number" step="0.01" min="0" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Unidad</label>
            <input v-model="form.unidad" placeholder="pieza, metro, licencia..." class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div v-if="camposDinamicos.length" class="border-t border-slate-200 pt-3 space-y-3">
          <p class="text-xs font-semibold text-slate-500 uppercase">Atributos de {{ categoriaSeleccionada?.nombre }}</p>
          <div v-for="campo in camposDinamicos" :key="campo.key">
            <label class="block text-xs font-medium text-slate-600 mb-1">{{ campo.label }}</label>
            <input
              v-if="campo.type !== 'checkbox'"
              v-model="form.atributos[campo.key]"
              :type="campo.type"
              :placeholder="campo.placeholder"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input v-else v-model="form.atributos[campo.key]" type="checkbox" class="rounded border-slate-300" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300" @click="mostrarModal = false">
            Cancelar
          </button>
          <button type="submit" class="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
