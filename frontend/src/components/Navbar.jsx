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
    return location.pathname === ruta ? 'nav-link activo' : 'nav-link'
  }

  return (
    <nav className="navbar">
      <div className="navbar-marca">
        <Link to="/" className="navbar-marca-link">
          <svg className="navbar-logo" viewBox="0 0 60 60" fill="none" aria-hidden="true">
            <circle cx="30" cy="30" r="14" stroke="currentColor" strokeWidth="1.2" opacity="0.22"/>
            <circle cx="30" cy="30" r="7"  fill="currentColor" opacity="0.95"/>
            <circle cx="9"  cy="13" r="4"  fill="currentColor" opacity="0.70"/>
            <circle cx="51" cy="13" r="4"  fill="currentColor" opacity="0.70"/>
            <circle cx="9"  cy="47" r="4"  fill="currentColor" opacity="0.70"/>
            <circle cx="51" cy="47" r="4"  fill="currentColor" opacity="0.70"/>
            <circle cx="30" cy="4"  r="3"  fill="currentColor" opacity="0.48"/>
            <circle cx="30" cy="56" r="3"  fill="currentColor" opacity="0.48"/>
            <line x1="30" y1="30" x2="9"  y2="13" stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
            <line x1="30" y1="30" x2="51" y2="13" stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
            <line x1="30" y1="30" x2="9"  y2="47" stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
            <line x1="30" y1="30" x2="51" y2="47" stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
            <line x1="30" y1="30" x2="30" y2="4"  stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
            <line x1="30" y1="30" x2="30" y2="56" stroke="currentColor" strokeWidth="1.4" opacity="0.42"/>
          </svg>
          <span className="navbar-nombre">Nexum</span>
        </Link>
      </div>

      <div className="navbar-enlaces">
        <Link to="/" className={claseActiva('/')}>Inicio</Link>
        <Link to="/mis-ontologias" className={location.pathname.startsWith('/mis-ontologias') ? 'nav-link activo' : 'nav-link'}>Mis Ontologías</Link>
        <Link to="/sparql" className={claseActiva('/sparql')}>Consola SPARQL</Link>
        <Link to="/grafo" className={claseActiva('/grafo')}>Grafo</Link>
        <Link to="/inferencia" className={claseActiva('/inferencia')}>Inferencia OWL</Link>
        {usuario?.rol === 'admin' && (
          <Link to="/admin" className={claseActiva('/admin')} style={{ color: 'rgba(255,180,100,0.9)' }}>
            Admin
          </Link>
        )}
      </div>

      <div className="navbar-usuario">
        <button className="btn-tema" onClick={toggleTema} title="Cambiar tema">
          {tema === 'oscuro' ? '☀ Claro' : '🌙 Oscuro'}
        </button>
        <span className={`badge-rol ${usuario?.rol}`}>
          {usuario?.rol === 'admin' ? 'Admin' : 'Consultor'}
        </span>
        <span className="nombre-usuario">{usuario?.nombre || usuario?.username}</span>
        <button className="btn-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}

export default Navbar
