<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import Modal from '../components/Modal.vue'

const clientes = ref([])
const busqueda = ref('')
const cargando = ref(false)
const error = ref('')

const mostrarModal = ref(false)
const editando = ref(null)
const form = ref(vacio())

function vacio() {
  return { nombre: '', empresa: '', rfc: '', telefono: '', email: '', direccion: '', notas: '' }
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/clientes', { params: busqueda.value ? { q: busqueda.value } : {} })
    clientes.value = data
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al cargar clientes'
  } finally {
    cargando.value = false
  }
}

function abrirNuevo() {
  editando.value = null
  form.value = vacio()
  mostrarModal.value = true
}

function abrirEditar(cliente) {
  editando.value = cliente
  form.value = { ...cliente }
  mostrarModal.value = true
}

async function guardar() {
  try {
    if (editando.value) {
      await api.put(`/clientes/${editando.value.id}`, form.value)
    } else {
      await api.post('/clientes', form.value)
    }
    mostrarModal.value = false
    await cargar()
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al guardar cliente'
  }
}

async function eliminar(cliente) {
  if (!confirm(`¿Eliminar al cliente "${cliente.nombre}"?`)) return
  try {
    await api.delete(`/clientes/${cliente.id}`)
    await cargar()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo eliminar el cliente')
  }
}

onMounted(cargar)
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h1 class="text-xl font-semibold text-slate-900">Clientes</h1>
      <button class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800" @click="abrirNuevo">
        + Nuevo cliente
      </button>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="busqueda"
        type="text"
        placeholder="Buscar por nombre, empresa o email..."
        class="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            <th class="px-4 py-2 font-medium">Nombre</th>
            <th class="px-4 py-2 font-medium">Empresa</th>
            <th class="px-4 py-2 font-medium">Telefono</th>
            <th class="px-4 py-2 font-medium">Email</th>
            <th class="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cliente in clientes" :key="cliente.id" class="border-t border-slate-100">
            <td class="px-4 py-2 text-slate-900">{{ cliente.nombre }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cliente.empresa || '-' }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cliente.telefono || '-' }}</td>
            <td class="px-4 py-2 text-slate-600">{{ cliente.email || '-' }}</td>
            <td class="px-4 py-2 text-right space-x-2">
              <button class="text-slate-500 hover:text-slate-900" @click="abrirEditar(cliente)">Editar</button>
              <button class="text-red-500 hover:text-red-700" @click="eliminar(cliente)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!cargando && !clientes.length">
            <td colspan="5" class="px-4 py-6 text-center text-slate-400">No hay clientes registrados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="mostrarModal" :titulo="editando ? 'Editar cliente' : 'Nuevo cliente'" @close="mostrarModal = false">
      <form class="space-y-3" @submit.prevent="guardar">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input v-model="form.nombre" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
          <input v-model="form.empresa" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">RFC</label>
            <input v-model="form.rfc" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Telefono</label>
            <input v-model="form.telefono" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Direccion</label>
          <input v-model="form.direccion" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Notas</label>
          <textarea v-model="form.notas" rows="2" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"></textarea>
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
