import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* Nodos y aristas para el grafo animado de fondo */
const NODOS = [
  { id: 1,  cx: 120,  cy: 140 },
  { id: 2,  cx: 1300, cy: 160 },
  { id: 3,  cx: 220,  cy: 720 },
  { id: 4,  cx: 1200, cy: 680 },
  { id: 5,  cx: 680,  cy: 80  },
  { id: 6,  cx: 60,   cy: 480 },
  { id: 7,  cx: 1380, cy: 460 },
  { id: 8,  cx: 540,  cy: 800 },
  { id: 9,  cx: 900,  cy: 340 },
  { id: 10, cx: 380,  cy: 300 },
  { id: 11, cx: 780,  cy: 660 },
  { id: 12, cx: 1050, cy: 530 },
]

const ARISTAS = [
  [1, 5], [1, 6], [1, 10],
  [2, 5], [2, 7], [2, 9],
  [3, 6], [3, 8], [3, 10],
  [4, 7], [4, 8], [4, 12],
  [5, 9], [5, 10],
  [6, 10],
  [9, 10], [9, 12], [9, 11],
  [8, 11], [11, 12],
  [2, 12], [7, 12],
]

const nodoMap = Object.fromEntries(NODOS.map(n => [n.id, n]))

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  const { login }    = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const mensajeExito = location.state?.mensajeExito || ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-container">

      {/* ── Panel izquierdo — identidad UMU + grafo animado ── */}
      <div className="login-panel-izq">

        {/* Grafo semántico de fondo */}
        <svg
          className="login-grafo-svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {ARISTAS.map(([a, b], i) => {
            const na = nodoMap[a], nb = nodoMap[b]
            return (
              <line
                key={i}
                className="login-linea"
                x1={na.cx} y1={na.cy}
                x2={nb.cx} y2={nb.cy}
                style={{
                  animationDelay:    `${i * 0.45}s`,
                  animationDuration: `${7 + (i % 6)}s`,
                }}
              />
            )
          })}
          {NODOS.map((n, i) => (
            <g key={n.id}>
              <circle
                className="login-nodo-halo"
                cx={n.cx} cy={n.cy} r="16"
                style={{
                  animationDelay:    `${i * 0.35}s`,
                  animationDuration: `${2.8 + (i % 4) * 0.6}s`,
                }}
              />
              <circle className="login-nodo-punto" cx={n.cx} cy={n.cy} r="4.5" />
            </g>
          ))}
        </svg>

        {/* Contenido sobre el grafo */}
        <div className="login-izq-contenido">
          <img
            src="/logo-umu.png"
            alt="Universidad de Murcia"
            className="login-logo-umu"
          />

          <div className="login-app-marca">
            {/* Icono Nexum */}
            <svg className="login-nexum-icon" viewBox="0 0 60 60" fill="none" aria-hidden="true">
              <circle cx="30" cy="30" r="7"  fill="currentColor" opacity="0.95"/>
              <circle cx="9"  cy="13" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="51" cy="13" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="9"  cy="47" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="51" cy="47" r="4"  fill="currentColor" opacity="0.72"/>
              <circle cx="30" cy="4"  r="3"  fill="currentColor" opacity="0.50"/>
              <circle cx="30" cy="56" r="3"  fill="currentColor" opacity="0.50"/>
              <line x1="30" y1="30" x2="9"  y2="13" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="51" y2="13" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="9"  y2="47" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="51" y2="47" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="30" y2="4"  stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
              <line x1="30" y1="30" x2="30" y2="56" stroke="currentColor" strokeWidth="1.8" opacity="0.50"/>
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
              Ontologías RDF/OWL sobre Apache Jena Fuseki
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              Consola SPARQL con consultas en tiempo real
            </div>
            <div className="login-feature">
              <span className="login-feature-dot" />
              Visualización de grafos y razonamiento OWL
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario de login ── */}
      <div className="login-panel-der">
        <div className="login-card">

          <h1 className="login-card-titulo">Iniciar sesión</h1>
          <p className="login-card-sub">
            Accede a tu espacio en <span>Nexum</span>
          </p>

          {mensajeExito && (
            <div className="exito-mensaje" style={{ marginBottom: '1rem' }}>
              {mensajeExito}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                autoComplete="username"
                required
                disabled={cargando}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                required
                disabled={cargando}
              />
            </div>

            {error && <div className="error-mensaje">{error}</div>}

            <button type="submit" className="btn-primary" disabled={cargando}>
              {cargando
                ? <><span className="spinner" />Entrando...</>
                : 'Entrar'
              }
            </button>
          </form>

          <div className="login-demo-info">
            <p>Usuarios de demo:</p>
            <p><code>admin</code> / <code>admin123</code> — administrador</p>
            <p><code>consultor1</code> / <code>consultor123</code> — consultor</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.4rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Regístrate
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}

export default Login
