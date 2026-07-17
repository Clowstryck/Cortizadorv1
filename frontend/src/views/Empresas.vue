<script setup>
import { onMounted, ref } from 'vue'
import api, { API_ORIGIN } from '../services/api'
import Modal from '../components/Modal.vue'

const empresas = ref([])
const error = ref('')

const mostrarModal = ref(false)
const editando = ref(null)
const form = ref(vacio())
const logoFile = ref(null)
const logoPreview = ref(null)
const logoInput = ref(null)
const guardando = ref(false)

function vacio() {
  return {
    nombre: '',
    eslogan: '',
    subeslogan: '',
    direccion: '',
    telefono: '',
    email: '',
    rfc: '',
    condiciones_pago_default: '',
    vigencia_dias_default: 15,
  }
}

function logoUrl(empresa) {
  return empresa?.logo_path ? `${API_ORIGIN}/uploads/${empresa.logo_path}` : null
}

async function cargar() {
  try {
    const { data } = await api.get('/empresas', { params: { incluir_inactivas: 1 } })
    empresas.value = data
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudieron cargar las empresas'
  }
}

function abrirNueva() {
  editando.value = null
  form.value = vacio()
  logoFile.value = null
  logoPreview.value = null
  mostrarModal.value = true
}

function abrirEditar(empresa) {
  editando.value = empresa
  form.value = { ...vacio(), ...empresa }
  logoFile.value = null
  logoPreview.value = null
  mostrarModal.value = true
}

function onLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

async function guardar() {
  error.value = ''
  guardando.value = true
  try {
    const payload = new FormData()
    for (const key of ['nombre', 'eslogan', 'subeslogan', 'direccion', 'telefono', 'email', 'rfc', 'condiciones_pago_default', 'vigencia_dias_default']) {
      payload.append(key, form.value[key] ?? '')
    }
    if (logoFile.value) {
      payload.append('logo', logoFile.value)
    }

    if (editando.value) {
      payload.append('activo', form.value.activo === undefined ? 1 : form.value.activo)
      await api.put(`/empresas/${editando.value.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    } else {
      await api.post('/empresas', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    }
    mostrarModal.value = false
    await cargar()
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo guardar la empresa'
  } finally {
    guardando.value = false
  }
}

async function eliminar(empresa) {
  if (!confirm(`¿Eliminar la empresa "${empresa.nombre}"?`)) return
  try {
    await api.delete(`/empresas/${empresa.id}`)
    await cargar()
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo eliminar la empresa')
  }
}

onMounted(cargar)
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Empresas</h1>
        <p class="text-sm text-slate-500 mt-1">Cada empresa tiene su propio logo y datos — elige con cuál se emite cada cotización.</p>
      </div>
      <button class="bg-slate-900 text-white text-sm rounded-md px-4 py-2 hover:bg-slate-800 shrink-0" @click="abrirNueva">
        + Nueva empresa
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 mb-3">{{ error }}</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="empresa in empresas" :key="empresa.id" class="bg-white rounded-lg border border-slate-200 p-4 flex gap-3">
        <div class="w-16 h-16 shrink-0 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
          <img v-if="logoUrl(empresa)" :src="logoUrl(empresa)" alt="" class="max-w-full max-h-full object-contain" />
          <span v-else class="text-xs text-slate-400">Sin logo</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-900 truncate">
            {{ empresa.nombre }}
            <span v-if="!empresa.activo" class="ml-1 text-xs font-normal text-slate-400">(inactiva)</span>
          </p>
          <p v-if="empresa.eslogan" class="text-xs text-slate-500 truncate">{{ empresa.eslogan }}</p>
          <div class="mt-2 space-x-2">
            <button class="text-xs text-slate-500 hover:text-slate-900" @click="abrirEditar(empresa)">Editar</button>
            <button class="text-xs text-red-500 hover:text-red-700" @click="eliminar(empresa)">Eliminar</button>
          </div>
        </div>
      </div>
      <p v-if="!empresas.length" class="text-sm text-slate-400 col-span-2 py-6 text-center">No hay empresas registradas</p>
    </div>

    <Modal v-if="mostrarModal" :titulo="editando ? 'Editar empresa' : 'Nueva empresa'" @close="mostrarModal = false">
      <form class="space-y-3" @submit.prevent="guardar">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-2">Logo</label>
          <div class="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="relative w-20 h-20 shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <img v-if="logoPreview || logoUrl(editando)" :src="logoPreview || logoUrl(editando)" alt="" class="max-w-full max-h-full object-contain" />
              <span v-else class="text-[10px] text-slate-400 text-center px-1 leading-tight">Sin logo</span>
            </div>
            <div class="flex-1 min-w-0">
              <input
                ref="logoInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                class="hidden"
                @change="onLogoChange"
              />
              <button
                type="button"
                class="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                @click="logoInput.click()"
              >
                {{ logoFile ? 'Cambiar archivo' : 'Elegir logo' }}
              </button>
              <p class="text-xs text-slate-500 mt-1.5 truncate">
                {{ logoFile ? logoFile.name : 'PNG, JPG, WEBP o SVG · máx. 5MB' }}
              </p>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
          <input v-model="form.nombre" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Eslogan</label>
          <input v-model="form.eslogan" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Subtitulo</label>
          <input v-model="form.subeslogan" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
          <input v-model="form.direccion" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
            <input v-model="form.telefono" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input v-model="form.email" type="email" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">RFC</label>
            <input v-model="form.rfc" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Vigencia por defecto (días)</label>
            <input v-model="form.vigencia_dias_default" type="number" min="1" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Condiciones de pago por defecto</label>
          <textarea v-model="form.condiciones_pago_default" rows="2" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"></textarea>
        </div>
        <div v-if="editando" class="flex items-center gap-2">
          <input :checked="!!form.activo" type="checkbox" class="rounded border-slate-300" @change="form.activo = $event.target.checked ? 1 : 0" />
          <label class="text-xs text-slate-600">Empresa activa (disponible para nuevas cotizaciones)</label>
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
