import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/TemaContext'

function Navbar() {
  const { usuario, logout } = useAuth()
  const { tema, toggleTema }  = useTema()
  const navigate  = useNavigate()
  const location  = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function claseActiva(ruta) {
    return location.pathname === ruta ? 'sidebar-link activo' : 'sidebar-link'
  }

  /* Iniciales para el avatar */
  const iniciales = (() => {
    const nombre = usuario?.nombre || usuario?.username || ''
    const partes  = nombre.trim().split(' ')
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
    return nombre.slice(0, 2).toUpperCase()
  })()

  return (
    <nav className="sidebar">

      {/* ── Cabecera con logo UMU ── */}
      <div className="sidebar-header">
        <img
          src="/logo-umu.png"
          alt="Universidad de Murcia"
          className="sidebar-umu-logo"
        />
        <Link to="/" className="sidebar-app-link">
          <svg className="sidebar-nexum-icon" viewBox="0 0 60 60" fill="none" aria-hidden="true">
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
          <div>
            <div className="sidebar-nombre">Nexum</div>
            <div className="sidebar-sub">Recursos Semánticos</div>
          </div>
        </Link>
      </div>

      {/* ── Navegación ── */}
      <div className="sidebar-nav">
        <div className="sidebar-nav-label">Navegación</div>

        <Link to="/" className={claseActiva('/')}>
          <span className="sidebar-link-icon">⌂</span>
          Inicio
        </Link>

        <Link
          to="/mis-ontologias"
          className={location.pathname.startsWith('/mis-ontologias') ? 'sidebar-link activo' : 'sidebar-link'}
        >
          <span className="sidebar-link-icon">📚</span>
          Mis Ontologías
        </Link>

        <Link to="/sparql" className={claseActiva('/sparql')}>
          <span className="sidebar-link-icon">⌨</span>
          Consola SPARQL
        </Link>

        <Link to="/grafo" className={claseActiva('/grafo')}>
          <span className="sidebar-link-icon">🕸</span>
          Grafo Visual
        </Link>

        <Link to="/inferencia" className={claseActiva('/inferencia')}>
          <span className="sidebar-link-icon">🧠</span>
          Inferencia OWL
        </Link>

        <Link to="/recursos" className={claseActiva('/recursos')}>
          <span className="sidebar-link-icon">🗂</span>
          Recursos
        </Link>

        {usuario?.rol === 'admin' && (
          <>
            <div className="sidebar-nav-label" style={{ marginTop: '0.6rem' }}>Administración</div>
            <Link to="/admin" className={claseActiva('/admin') + ' sidebar-link-admin'}>
              <span className="sidebar-link-icon">⚙</span>
              Panel Admin
            </Link>
          </>
        )}
      </div>

      {/* ── Pie con usuario ── */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{iniciales}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{usuario?.nombre || usuario?.username}</div>
            <div className="sidebar-user-role">
              {usuario?.rol === 'admin' ? 'Administrador' : 'Consultor'}
            </div>
          </div>
        </div>
        <div className="sidebar-btns">
          <button className="btn-tema" onClick={toggleTema} title="Cambiar tema">
            {tema === 'oscuro' ? '☀ Claro' : '🌙 Oscuro'}
          </button>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            ⏻ Salir
          </button>
        </div>
      </div>

    </nav>
  )
}

export default Navbar
