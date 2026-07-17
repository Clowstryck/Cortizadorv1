<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const menuAbierto = ref(false)
const esDesktop = ref(window.innerWidth >= 768)
const colapsado = ref(localStorage.getItem('sidebar-colapsado') === '1')

function toggleColapso() {
  colapsado.value = !colapsado.value
  localStorage.setItem('sidebar-colapsado', colapsado.value ? '1' : '0')
}

function actualizarBreakpoint() {
  esDesktop.value = window.innerWidth >= 768
}
onMounted(() => window.addEventListener('resize', actualizarBreakpoint))
onUnmounted(() => window.removeEventListener('resize', actualizarBreakpoint))

const ICONS = {
  dashboard:        '<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
  cotizaciones:     '<rect x="6" y="3" width="12" height="18" rx="1.5"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  'cotizador-nuevo':'<rect x="6" y="3" width="12" height="18" rx="1.5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="12" y1="10" x2="12" y2="16"/>',
  clientes:         '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.8 14.3c2.4.5 4.2 2.6 4.2 5.2"/>',
  servicios:        '<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 8v9l8 4 8-4V8"/><line x1="12" y1="12" x2="12" y2="21"/>',
  empresas:         '<rect x="5" y="4" width="14" height="17"/><rect x="8" y="7" width="2" height="2"/><rect x="14" y="7" width="2" height="2"/><rect x="8" y="12" width="2" height="2"/><rect x="14" y="12" width="2" height="2"/><rect x="10" y="17" width="4" height="4"/>',
  usuarios:         '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="18" cy="17" r="2.4"/><path d="M18 13.8v1.1M18 19.1v1.1M15.5 17h1.1M19.4 17h1.1M16.1 15.1l.8.8M19.1 18.1l.8.8M19.9 15.1l-.8.8M16.9 18.1l-.8.8"/>',
  roles:            '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
}

const navItems = computed(() => [
  { name: 'dashboard',        label: 'Inicio',           to: '/',             permiso: 'reportes.ver' },
  { name: 'cotizaciones',     label: 'Cotizaciones',     to: '/cotizaciones', permiso: 'cotizaciones.ver' },
  { name: 'cotizador-nuevo',  label: 'Nueva Cotizacion', to: '/cotizador',    permiso: 'cotizaciones.crear' },
  { name: 'clientes',         label: 'Clientes',         to: '/clientes',     permiso: 'clientes.ver' },
  { name: 'servicios',        label: 'Servicios',        to: '/servicios',    permiso: 'servicios.ver' },
  { name: 'empresas',         label: 'Empresas',         to: '/empresas',     permiso: 'empresas.ver' },
  { name: 'usuarios',         label: 'Usuarios',         to: '/usuarios',     permiso: 'usuarios.gestionar' },
  { name: 'roles',            label: 'Roles',            to: '/roles',        permiso: 'roles.gestionar' },
].filter((item) => auth.tienePermiso(item.permiso)))

const mostrarLayout = computed(() => route.name !== 'login')

watch(() => route.fullPath, () => {
  menuAbierto.value = false
})

function avatarBg(nombre) {
  const colores = ['#7c3aed','#db2777','#ea580c','#16a34a','#0284c7','#dc2626','#9333ea','#0891b2']
  return colores[(nombre?.charCodeAt(0) || 0) % colores.length]
}

function cerrarSesion() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div v-if="mostrarLayout" class="min-h-screen flex flex-col md:flex-row">

    <!-- Topbar móvil -->
    <header class="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-30">
      <span class="text-base font-semibold">Cotizador</span>
      <button
        class="p-1.5 -mr-1.5 text-slate-200 hover:text-white"
        :aria-label="menuAbierto ? 'Cerrar menu' : 'Abrir menu'"
        @click="menuAbierto = !menuAbierto"
      >
        <svg v-if="!menuAbierto" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
        <svg v-else class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
        </svg>
      </button>
    </header>

    <!-- Overlay móvil -->
    <div v-if="menuAbierto" class="fixed inset-0 bg-black/40 z-40 md:hidden" @click="menuAbierto = false" />

    <!-- Sidebar -->
    <aside
      v-if="esDesktop || menuAbierto"
      class="shrink-0 bg-slate-900 text-slate-100 flex flex-col fixed md:static inset-y-0 left-0 z-50 transition-all duration-300"
      :class="esDesktop ? (colapsado ? 'w-14' : 'w-56') : 'w-64'"
    >
      <!-- Header sidebar desktop -->
      <div class="hidden md:flex items-center border-b border-slate-800 h-14 shrink-0 overflow-hidden"
           :class="colapsado ? 'justify-center px-0' : 'justify-between px-4'">
        <span v-if="!colapsado" class="text-base font-semibold whitespace-nowrap">Cotizador</span>
        <button
          class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
          :title="colapsado ? 'Expandir menu' : 'Colapsar menu'"
          @click="toggleColapso"
        >
          <svg v-if="!colapsado" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
          <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="flex items-center rounded-md text-sm font-medium transition-colors group relative"
          :class="[
            colapsado && esDesktop ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 md:py-2',
            route.name === item.name || (item.name === 'cotizaciones' && route.name === 'cotizacion-detalle')
              ? 'bg-slate-700 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          ]"
        >
          <svg
            class="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            v-html="ICONS[item.name]"
          />
          <span v-if="!colapsado || !esDesktop" class="whitespace-nowrap">{{ item.label }}</span>
          <span
            v-if="colapsado && esDesktop"
            class="absolute left-full ml-2 px-2 py-1 rounded bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg"
          >
            {{ item.label }}
          </span>
        </RouterLink>
      </nav>

      <!-- Usuario -->
      <div class="px-4 py-3 border-t border-slate-800 shrink-0" style="background:rgba(0,0,0,0.2);">
        <template v-if="!colapsado || !esDesktop">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                 :style="'background:' + avatarBg(auth.usuario?.nombre || 'U')">
              {{ (auth.usuario?.nombre || 'U').charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-xs truncate text-white">{{ auth.usuario?.nombre }}</p>
              <span class="inline-block font-mono capitalize px-1.5 py-0.5 rounded-full mt-0.5 text-slate-300"
                    style="font-size:9px; background:rgba(255,255,255,0.1);">
                {{ auth.usuario?.rol_nombre }}
              </span>
            </div>
            <button class="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 shrink-0"
                    title="Cerrar sesion" @click="cerrarSesion">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white group relative"
                 :style="'background:' + avatarBg(auth.usuario?.nombre || 'U')">
              {{ (auth.usuario?.nombre || 'U').charAt(0).toUpperCase() }}
              <span class="absolute left-full ml-2 px-2 py-1 rounded bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                {{ auth.usuario?.nombre }}
              </span>
            </div>
            <button class="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 group relative"
                    title="Cerrar sesion" @click="cerrarSesion">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span class="absolute left-full ml-2 px-2 py-1 rounded bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                Cerrar sesion
              </span>
            </button>
          </div>
        </template>
      </div>

      <!-- Portal + Status -->
      <div class="border-t border-slate-800 shrink-0 overflow-hidden"
           :class="colapsado && esDesktop ? 'px-1.5 py-3 flex flex-col items-center gap-2' : 'px-3 py-2'">
        <template v-if="!colapsado || !esDesktop">
          <a
            href="https://10.21.1.100"
            class="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Portal de sistemas
          </a>
          <div class="flex items-center gap-2 px-3 py-2">
            <div class="w-2 h-2 rounded-full shrink-0" style="background:#4ade80; animation:cot-pulse 2s infinite;"></div>
            <span class="text-xs font-mono text-slate-500">Sistema activo</span>
          </div>
        </template>
        <template v-else>
          <a href="https://10.21.1.100"
             class="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 group relative flex"
             title="Portal de sistemas">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="absolute left-full ml-2 px-2 py-1 rounded bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
              Portal de sistemas
            </span>
          </a>
          <div class="w-2 h-2 rounded-full" style="background:#4ade80; animation:cot-pulse 2s infinite;"></div>
        </template>
      </div>
    </aside>

    <main class="flex-1 min-w-0 bg-gray-50 w-full">
      <RouterView />
    </main>
  </div>
  <RouterView v-else />
</template>

<style>
@keyframes cot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
