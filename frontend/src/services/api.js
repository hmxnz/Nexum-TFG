import axios from 'axios'

// Gracias al proxy de vite.config.js, /api se redirige al backend sin CORS
// Esto funciona, no tocar
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 segundos - a veces Fuseki tarda con el razonador OWL
})

// Interceptor para añadir automáticamente el token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de respuestas - si el servidor devuelve 401 o 403, mandar al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      // Sesión expirada o sin permisos - limpiar y redirigir
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
