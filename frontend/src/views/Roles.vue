<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import Modal from '../components/Modal.vue'

const roles = ref([])
const catalogoPermisos = ref([])
const error = ref('')

const mostrarModal = ref(false)
const editando = ref(null)
const form = ref(vacio())
const guardando = ref(false)

function vacio() {
  return { nombre: '', descripcion: '', permisos: [] }
}

const gruposPermisos = computed(() => {
  const grupos = {}
  for (const p of catalogoPermisos.value) {
    if (!grupos[p.grupo]) grupos[p.grupo] = []
    grupos[p.grupo].push(p)
  }
  return grupos
})

async function cargar() {
  try {
    const [rolesRes, catalogoRes] = await Promise.all([
      api.get('/roles'),
      api.get('/roles/permisos-disponibles'),
    ])
    roles.value = rolesRes.data
    catalogoPermisos.value = catalogoRes.data
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudieron cargar los roles'
  }
}

function abrirNuevo() {
  editando.value = null
  form.value = vacio()
  mostrarModal.value = true
}

function abrirEditar(rol) {
  editando.value = rol
  form.value = { nombre: rol.nombre, descripcion: rol.descripcion || '', permisos: [...rol.permisos] }
  mostrarModal.value = true
}

function togglePermiso(clave) {
  const idx = form.value.permisos.indexOf(clave)
  if (idx === -1) {
    form.value.permisos.push(clave)
  } else {
    form.value.permisos.splice(idx, 1)
  }
}

async function guardar() {
  error.value = ''
  guardando.value = true
  try {
    if (editando.value) {
      await api.put(`/roles/${editando.value.id}`, form.value)
    } else {
      await api.post('/roles', form.value)
    }
    mostrarModal.value = false
    await cargar()
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo guardar el rol'
  } finally {
    guardando.value = false
  }
}

async function eliminar(rol) {
  if (!confirm(`¿Eliminar el rol "${rol.nombre}"?`)) return
  try {
    await api.delete(`/roles/${rol.id}`)
    await cargar()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo eliminar el rol')
  }
}

onMounted(cargar)
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Roles y permisos</h1>
        <p class="text-sm text-slate-500 mt-1">Define que puede ver y hacer cada rol dentro del sistema.</p>
      </div>
      <button class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800 shrink-0" @click="abrirNuevo">
        + Nuevo rol
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 mb-3">{{ error }}</p>

    <div class="space-y-3">
      <div v-for="rol in roles" :key="rol.id" class="bg-white rounded-lg border border-slate-200 p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-900">
              {{ rol.nombre }}
              <span v-if="rol.es_sistema" class="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">rol de sistema</span>
            </p>
            <p v-if="rol.descripcion" class="text-xs text-slate-500 mt-0.5">{{ rol.descripcion }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ rol.permisos.length }} permisos · {{ rol.usuarios_asignados }} usuario(s)</p>
          </div>
          <div v-if="!rol.es_sistema" class="space-x-2 shrink-0">
            <button class="text-xs text-slate-500 hover:text-slate-900" @click="abrirEditar(rol)">Editar</button>
            <button class="text-xs text-red-500 hover:text-red-700" @click="eliminar(rol)">Eliminar</button>
          </div>
        </div>
      </div>
      <p v-if="!roles.length" class="text-sm text-slate-400 text-center py-6">No hay roles registrados</p>
    </div>

    <Modal v-if="mostrarModal" :titulo="editando ? 'Editar rol' : 'Nuevo rol'" @close="mostrarModal = false">
      <form class="space-y-3" @submit.prevent="guardar">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input v-model="form.nombre" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
          <input v-model="form.descripcion" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div class="border-t border-slate-200 pt-3">
          <p class="text-xs font-semibold text-slate-500 uppercase mb-2">Permisos</p>
          <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
            <div v-for="(permisos, grupo) in gruposPermisos" :key="grupo">
              <p class="text-xs font-medium text-slate-700 mb-1">{{ grupo }}</p>
              <label v-for="p in permisos" :key="p.clave" class="flex items-center gap-2 text-sm text-slate-600 py-0.5">
                <input
                  type="checkbox"
                  class="rounded border-slate-300"
                  :checked="form.permisos.includes(p.clave)"
                  @change="togglePermiso(p.clave)"
                />
                {{ p.label }}
              </label>
            </div>
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300" @click="mostrarModal = false">
            Cancelar
          </button>
          <button type="submit" :disabled="guardando" class="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
