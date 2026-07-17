import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  }),
  getters: {
    estaAutenticado: (state) => !!state.token,
    permisos: (state) => state.usuario?.permisos || [],
  },
  actions: {
    tienePermiso(clave) {
      return this.permisos.includes(clave)
    },
    async login(usuario, password) {
      const { data } = await api.post('/auth/login', { usuario, password })
      this.token = data.token
      this.usuario = data.usuario
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
    },
    logout() {
      this.token = null
      this.usuario = null
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    },
  },
})
