import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/clientes', name: 'clientes', component: () => import('../views/Clientes.vue') },
  { path: '/servicios', name: 'servicios', component: () => import('../views/Servicios.vue') },
  { path: '/cotizador', name: 'cotizador-nuevo', component: () => import('../views/Cotizador.vue') },
  { path: '/cotizaciones', name: 'cotizaciones', component: () => import('../views/Cotizaciones.vue') },
  { path: '/cotizaciones/:id', name: 'cotizacion-detalle', component: () => import('../views/CotizacionDetalle.vue') },
  { path: '/cotizaciones/:id/editar', name: 'cotizador-editar', component: () => import('../views/Cotizador.vue') },
  { path: '/empresas', name: 'empresas', component: () => import('../views/Empresas.vue') },
  { path: '/usuarios', name: 'usuarios', component: () => import('../views/Usuarios.vue') },
  { path: '/roles', name: 'roles', component: () => import('../views/Roles.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.estaAutenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.estaAutenticado) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
