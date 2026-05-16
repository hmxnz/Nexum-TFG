import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

export default function AdminPanel() {
  const { usuario }             = useAuth()
  const navigate                = useNavigate()
  const [stats, setStats]       = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  const [operando, setOperando] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [rStats, rUsers] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/usuarios'),
      ])
      setStats(rStats.data)
      setUsuarios(rUsers.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando datos de administración')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (usuario && usuario.rol !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    cargar()
  }, [usuario, navigate, cargar])

  async function cambiarRol(username) {
    setOperando(username)
    setError('')
    try {
      await api.patch(`/admin/usuarios/${username}/rol`)
      await cargar()
    } catch (e) {
      setError(e.response?.data?.error || 'Error cambiando rol')
    } finally {
      setOperando(null)
    }
  }

  async function eliminarUsuario(username, numOntologias) {
    const aviso = numOntologias > 0
      ? `¿Eliminar a "${username}" y sus ${numOntologias} ontología(s)? Esta acción no se puede deshacer.`
      : `¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`
    if (!window.confirm(aviso)) return

    setOperando(username)
    setError('')
    try {
      await api.delete(`/admin/usuarios/${username}`)
      await cargar()
    } catch (e) {
      setError(e.response?.data?.error || 'Error eliminando usuario')
    } finally {
      setOperando(null)
    }
  }

  if (cargando) return <div className="cargando">Cargando panel de administración...</div>

  return (
    <div className="admin-pagina">

      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Panel de administración</h1>
          <p className="admin-subtitulo">Gestión de usuarios y estadísticas del sistema</p>
        </div>
      </div>

      {error && <div className="error-mensaje">{error}</div>}

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-num">{stats.totalUsuarios}</div>
            <div className="admin-stat-label">Usuarios</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-num">{stats.totalOntologias}</div>
            <div className="admin-stat-label">Ontologías</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-num">{stats.totalTriples.toLocaleString('es-ES')}</div>
            <div className="admin-stat-label">Triples totales</div>
          </div>
        </div>
      )}

      <div className="admin-seccion">
        <div className="admin-seccion-header">
          <h2 className="admin-seccion-titulo">Usuarios registrados</h2>
          <button
            className="btn-secondary"
            onClick={cargar}
            style={{ fontSize: '0.82rem', padding: '0.38rem 0.9rem' }}
          >
            Actualizar
          </button>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-sparql admin-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th style={{ textAlign: 'center' }}>Ontologías</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="sin-resultados" style={{ padding: '2rem' }}>
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : usuarios.map(u => (
                <tr key={u.username}>
                  <td>
                    <code>{u.username}</code>
                    {u.username === usuario.username && (
                      <span className="admin-yo-badge">tú</span>
                    )}
                  </td>
                  <td>{u.nombre || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className={`badge-rol ${u.rol}`}>
                      {u.rol === 'admin' ? 'Admin' : 'Consultor'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{u.numOntologias}</td>
                  <td className="admin-td-fecha">
                    {u.creadoEn
                      ? new Date(u.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td>
                    {u.username !== usuario.username ? (
                      <div className="admin-acciones-celda">
                        <button
                          className="admin-btn-rol"
                          onClick={() => cambiarRol(u.username)}
                          disabled={operando === u.username}
                          title={u.rol === 'admin' ? 'Bajar a consultor' : 'Promover a admin'}
                        >
                          {u.rol === 'admin' ? '↓ Consultor' : '↑ Admin'}
                        </button>
                        <button
                          className="admin-btn-eliminar"
                          onClick={() => eliminarUsuario(u.username, u.numOntologias)}
                          disabled={operando === u.username}
                          title="Eliminar usuario y todas sus ontologías"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>cuenta activa</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
