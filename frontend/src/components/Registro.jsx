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

      {/* Panel izquierdo — identidad UMU */}
      <div className="login-panel-izq">
        <div className="login-izq-contenido">
          <img
            src="/logo-umu.png"
            alt="Universidad de Murcia"
            className="login-logo-umu"
          />

          <div className="login-app-marca" style={{ marginTop: '1rem' }}>
            <svg
              style={{ width: 52, height: 52, color: '#C8311A' }}
              viewBox="0 0 60 60" fill="none" aria-hidden="true"
            >
              <circle cx="30" cy="30" r="7"  fill="currentColor" opacity="0.95"/>
              <circle cx="9"  cy="13" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="51" cy="13" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="9"  cy="47" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="51" cy="47" r="4"  fill="currentColor" opacity="0.72"/>
              <line x1="30" y1="30" x2="9"  y2="13" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="51" y2="13" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="9"  y2="47" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="51" y2="47" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
            </svg>
            <div className="login-nombre-app">
              Ne<span className="login-acento">x</span>um
            </div>
            <div className="login-tagline-izq">Gestión de Recursos Semánticos</div>
          </div>

          <div className="login-separador-izq" />

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-dot" />
              Crea tu cuenta como consultor
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              Acceso a tus ontologías personales
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              Trabajo de Fin de Grado · UMU 2024
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario de registro */}
      <div className="login-panel-der">
        <div className="login-card">

          <h1 className="login-card-titulo">Crear cuenta</h1>
          <p className="login-card-sub">
            Únete a <span>Nexum</span> como consultor
          </p>

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

            <div className="form-row">
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
                <label htmlFor="confirmar">Confirmar *</label>
                <input
                  id="confirmar"
                  name="confirmar"
                  type="password"
                  value={form.confirmar}
                  onChange={handleChange}
                  placeholder="Repetir contraseña"
                  autoComplete="new-password"
                  required
                  disabled={enviando}
                />
              </div>
            </div>

            {error && <div className="error-mensaje">{error}</div>}

            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.4rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}

export default Registro
