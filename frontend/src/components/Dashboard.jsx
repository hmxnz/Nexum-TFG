import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

const ACCESOS = [
  {
    to:    '/mis-ontologias',
    icono: '📚',
    titulo: 'Mis Ontologías',
    desc:  'Carga, explora y gestiona tus archivos RDF/OWL',
    color: '#818cf8',
  },
  {
    to:    '/sparql',
    icono: '⌨',
    titulo: 'Consola SPARQL',
    desc:  'Ejecuta consultas sobre tus grafos nombrados',
    color: '#60a5fa',
  },
  {
    to:    '/grafo',
    icono: '🕸',
    titulo: 'Grafo Visual',
    desc:  'Explora conexiones entre nodos de forma interactiva',
    color: '#f97316',
  },
  {
    to:    '/inferencia',
    icono: '🧠',
    titulo: 'Inferencia OWL',
    desc:  'Jerarquías de clases y razonamiento semántico',
    color: '#a855f7',
  },
]

const ACCESO_ADMIN = {
  to:    '/admin',
  icono: '⚙',
  titulo: 'Administración',
  desc:  'Gestiona usuarios y consulta estadísticas globales',
  color: '#f59e0b',
}

function Dashboard() {
  const { usuario } = useAuth()

  const [misStats, setMisStats]     = useState({ ontologias: null, triples: null })
  const [adminStats, setAdminStats] = useState(null)
  const [cargando, setCargando]     = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const promesas = [api.get('/mis-ontologias')]
        if (usuario?.rol === 'admin') promesas.push(api.get('/admin/stats'))

        const resultados = await Promise.all(promesas)

        const onts = resultados[0].data
        setMisStats({
          ontologias: onts.length,
          triples:    onts.reduce((acc, o) => acc + (o.triples || 0), 0),
        })

        if (usuario?.rol === 'admin' && resultados[1]) {
          setAdminStats(resultados[1].data)
        }
      } catch {
        setMisStats({ ontologias: 0, triples: 0 })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [usuario])

  const accesos = usuario?.rol === 'admin' ? [...ACCESOS, ACCESO_ADMIN] : ACCESOS
  const sinOntologias = !cargando && misStats.ontologias === 0

  return (
    <div className="dashboard">

      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-texto">
          <h1 className="dash-hero-titulo">
            Bienvenido, {usuario?.nombre || usuario?.username}
          </h1>
          <p className="dash-hero-sub">
            Nexum — gestión personal de ontologías RDF/OWL sobre Apache Jena Fuseki
          </p>
        </div>
        <span className={`badge-rol ${usuario?.rol}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
          {usuario?.rol === 'admin' ? 'Administrador' : 'Consultor'}
        </span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Mis ontologías</h3>
          <p className="stat-numero">
            {cargando ? <span className="stat-cargando">…</span> : misStats.ontologias}
          </p>
        </div>

        <div className="stat-card">
          <h3>Mis triples</h3>
          <p className="stat-numero">
            {cargando
              ? <span className="stat-cargando">…</span>
              : (misStats.triples ?? 0).toLocaleString('es-ES')
            }
          </p>
        </div>

        {usuario?.rol === 'admin' && (
          <>
            <div className="stat-card">
              <h3>Usuarios totales</h3>
              <p className="stat-numero">
                {adminStats ? adminStats.totalUsuarios : <span className="stat-cargando">…</span>}
              </p>
            </div>
            <div className="stat-card">
              <h3>Triples globales</h3>
              <p className="stat-numero">
                {adminStats
                  ? adminStats.totalTriples.toLocaleString('es-ES')
                  : <span className="stat-cargando">…</span>
                }
              </p>
            </div>
          </>
        )}
      </div>

      {/* CTA si no hay ontologías */}
      {sinOntologias && (
        <div className="dash-cta">
          <div className="dash-cta-icono">📂</div>
          <div className="dash-cta-texto">
            <h2>Carga tu primera ontología</h2>
            <p>Sube un archivo RDF, Turtle, OWL o N-Triples y empieza a explorar tus datos semánticos.</p>
          </div>
          <Link to="/mis-ontologias" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Ir a Mis Ontologías
          </Link>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="dashboard-accesos">
        <h2>Acceso rápido</h2>
        <div className="accesos-grid">
          {accesos.map(a => (
            <Link key={a.to} to={a.to} className="acceso-card">
              <div className="acceso-card-icono" style={{ color: a.color }}>{a.icono}</div>
              <div>
                <h3 style={{ color: a.color }}>{a.titulo}</h3>
                <p>{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Dashboard
