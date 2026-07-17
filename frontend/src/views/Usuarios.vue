<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import Modal from '../components/Modal.vue'

const usuarios = ref([])
const roles = ref([])
const error = ref('')

const mostrarModal = ref(false)
const editando = ref(null)
const form = ref(vacio())
const guardando = ref(false)

function vacio() {
  return { nombre: '', usuario: '', email: '', telefono: '', password: '', rol_id: '', activo: 1 }
}

async function cargar() {
  try {
    const [usuariosRes, rolesRes] = await Promise.all([
      api.get('/usuarios'),
      api.get('/roles'),
    ])
    usuarios.value = usuariosRes.data
    roles.value = rolesRes.data
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudieron cargar los usuarios'
  }
}

function abrirNuevo() {
  editando.value = null
  form.value = vacio()
  if (roles.value.length) form.value.rol_id = roles.value.find((r) => r.nombre === 'Ventas')?.id || roles.value[0].id
  mostrarModal.value = true
}

function abrirEditar(usuario) {
  editando.value = usuario
  form.value = { nombre: usuario.nombre, usuario: usuario.usuario, email: usuario.email || '', telefono: usuario.telefono || '', password: '', rol_id: usuario.rol_id, activo: usuario.activo }
  mostrarModal.value = true
}

async function guardar() {
  error.value = ''
  guardando.value = true
  try {
    const payload = { ...form.value }
    if (editando.value && !payload.password) delete payload.password

    if (editando.value) {
      await api.put(`/usuarios/${editando.value.id}`, payload)
    } else {
      if (!payload.password) {
        error.value = 'La contraseña es requerida'
        guardando.value = false
        return
      }
      await api.post('/usuarios', payload)
    }
    mostrarModal.value = false
    await cargar()
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo guardar el usuario'
  } finally {
    guardando.value = false
  }
}

async function desactivar(usuario) {
  if (!confirm(`¿Desactivar al usuario "${usuario.nombre}"? No podra iniciar sesion.`)) return
  try {
    await api.delete(`/usuarios/${usuario.id}`)
    await cargar()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo desactivar el usuario')
  }
}

onMounted(cargar)
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-6">
      <h1 class="text-xl font-semibold text-slate-900">Usuarios</h1>
      <button class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800" @click="abrirNuevo">
        + Nuevo usuario
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 mb-3">{{ error }}</p>

    <div class="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th class="px-4 py-2 font-medium">Nombre</th>
            <th class="px-4 py-2 font-medium">Usuario</th>
            <th class="px-4 py-2 font-medium">Rol</th>
            <th class="px-4 py-2 font-medium">Estado</th>
            <th class="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="usuario in usuarios" :key="usuario.id" class="border-t border-slate-100">
            <td class="px-4 py-2 text-slate-900">{{ usuario.nombre }}</td>
            <td class="px-4 py-2 text-slate-600 font-mono text-xs">{{ usuario.usuario }}</td>
            <td class="px-4 py-2 text-slate-600">{{ usuario.rol_nombre }}</td>
            <td class="px-4 py-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="usuario.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
                {{ usuario.activo ? 'activo' : 'inactivo' }}
              </span>
            </td>
            <td class="px-4 py-2 text-right space-x-2">
              <button class="text-slate-500 hover:text-slate-900" @click="abrirEditar(usuario)">Editar</button>
              <button v-if="usuario.activo" class="text-red-500 hover:text-red-700" @click="desactivar(usuario)">Desactivar</button>
            </td>
          </tr>
          <tr v-if="!usuarios.length">
            <td colspan="5" class="px-4 py-6 text-center text-slate-400">No hay usuarios registrados</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="mostrarModal" :titulo="editando ? 'Editar usuario' : 'Nuevo usuario'" @close="mostrarModal = false">
      <form class="space-y-3" @submit.prevent="guardar">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input v-model="form.nombre" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Usuario * <span class="text-slate-400 font-normal">(para iniciar sesión)</span></label>
          <input v-model="form.usuario" required :disabled="!!editando" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
          <input v-model="form.telefono" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
          <select v-model="form.rol_id" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="" disabled>Selecciona un rol</option>
            <option v-for="rol in roles" :key="rol.id" :value="rol.id">{{ rol.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">
            {{ editando ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *' }}
          </label>
          <input v-model="form.password" type="password" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div v-if="editando" class="flex items-center gap-2">
          <input :checked="!!form.activo" type="checkbox" class="rounded border-slate-300" @change="form.activo = $event.target.checked ? 1 : 0" />
          <label class="text-xs text-slate-600">Usuario activo</label>
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
