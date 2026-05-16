import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al montar el componente, comprobar si hay sesión guardada en localStorage
  useEffect(() => {
    const tokenGuardado   = localStorage.getItem('token')
    const usuarioGuardado = localStorage.getItem('usuario')

    if (tokenGuardado && usuarioGuardado) {
      // Verificar que el token sigue siendo válido en el servidor
      api.get('/auth/verificar', {
        headers: { Authorization: `Bearer ${tokenGuardado}` },
      })
        .then(() => {
          setUsuario(JSON.parse(usuarioGuardado))
        })
        .catch((error) => {
          const status = error.response?.status
          if (status === 401 || status === 403) {
            // Token inválido o expirado — limpiar sesión
            console.log('Sesión expirada, vuelve a iniciar sesión')
            localStorage.removeItem('token')
            localStorage.removeItem('usuario')
          } else {
            // Error de red (backend arrancando, timeout...) — conservar la sesión
            // El interceptor de api.js ya redirigirá al login si una petición real falla
            setUsuario(JSON.parse(usuarioGuardado))
          }
        })
        .finally(() => {
          setCargando(false)
        })
    } else {
      setCargando(false)
    }
  }, [])

  async function login(username, password) {
    const respuesta = await api.post('/auth/login', { username, password })
    const { token, usuario: datosUsuario } = respuesta.data

    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(datosUsuario))
    setUsuario(datosUsuario)

    return datosUsuario
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth solo se puede usar dentro de AuthProvider')
  }
  return ctx
}
