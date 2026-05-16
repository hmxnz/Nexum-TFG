import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function Registro() {
  const [form, setForm]         = useState({ username: '', nombre: '', password: '', confirmar: '' })
  const [error, setError]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setEnviando(true)
    try {
      await api.post('/auth/registro', {
        username: form.username,
        nombre:   form.nombre || undefined,
        password: form.password,
        // Sin token JWT → el backend asignará rol consultor automáticamente
      })
      navigate('/login', { state: { mensajeExito: `Usuario "${form.username}" registrado. Ya puedes iniciar sesión.` } })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>TFG — Ontologías Personales</h1>
        <h2>Crear cuenta</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nombre de usuario *</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Solo letras, números, - y _ (3-30 caracteres)"
              autoComplete="username"
              required
              disabled={enviando}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre completo (opcional)</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Tu nombre real"
              autoComplete="name"
              disabled={enviando}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
              disabled={enviando}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar">Confirmar contraseña *</label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              value={form.confirmar}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              required
              disabled={enviando}
            />
          </div>

          {error && <div className="error-mensaje">{error}</div>}

          <button type="submit" className="btn-primary" disabled={enviando} style={{ width: '100%', marginTop: '0.5rem' }}>
            {enviando ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="login-demo-info" style={{ textAlign: 'center' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Registro
