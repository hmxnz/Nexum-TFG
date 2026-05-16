// Página principal de gestión de ontologías del usuario
// Lista las ontologías propias, permite cargar nuevas y eliminarlas
// Hugo - TFG Ingeniería Informática

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import ModalSubirOntologia from './ModalSubirOntologia'

// Formatear fecha ISO a texto legible
function formatearFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Icono según formato de archivo
function iconoFormato(formato) {
  if (formato?.includes('turtle'))     return '🐢'
  if (formato?.includes('rdf+xml'))    return '📄'
  if (formato?.includes('n-triples'))  return '📋'
  return '📦'
}

function MisOntologias() {
  const [ontologias, setOntologias]       = useState([])
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState('')
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [eliminando, setEliminando]       = useState(null) // slug que está siendo eliminado
  const navigate = useNavigate()

  const cargarOntologias = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const resp = await api.get('/mis-ontologias')
      // Ordenar por fecha descendente (más reciente primero)
      const ordenadas = [...resp.data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      setOntologias(ordenadas)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la lista de ontologías')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarOntologias()
  }, [cargarOntologias])

  async function eliminar(ont, e) {
    e.stopPropagation() // evitar que el clic llegue a la card y navegue

    if (!confirm(`¿Eliminar la ontología "${ont.nombre}"?\nEsta acción borrará todos sus triples de Fuseki y no se puede deshacer.`)) {
      return
    }

    setEliminando(ont.slug)
    try {
      await api.delete(`/mis-ontologias/${ont.slug}`)
      setOntologias(prev => prev.filter(o => o.slug !== ont.slug))
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar la ontología')
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="mis-ont-pagina">
      <div className="mis-ont-header">
        <div>
          <h1 className="mis-ont-titulo">Mis Ontologías</h1>
          <p className="mis-ont-subtitulo">
            Tus ontologías RDF/OWL personales — cada una en su propio grafo nombrado en Fuseki
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModalAbierto(true)}>
          + Nueva ontología
        </button>
      </div>

      {error && <div className="error-mensaje">{error}</div>}

      {cargando && <div className="cargando">Cargando ontologías...</div>}

      {!cargando && !error && ontologias.length === 0 && (
        <div className="mis-ont-vacia">
          <div className="mis-ont-vacia-icono">📂</div>
          <h2>Aún no has cargado ninguna ontología</h2>
          <p>Sube tu primer archivo RDF/OWL para empezar a explorarla.</p>
          <button className="btn-primary" onClick={() => setModalAbierto(true)}>
            Cargar primera ontología
          </button>
        </div>
      )}

      {!cargando && ontologias.length > 0 && (
        <div className="mis-ont-grid">
          {ontologias.map(ont => (
            <div
              key={ont.slug}
              className="mis-ont-card"
              onClick={() => navigate(`/mis-ontologias/${ont.slug}`)}
              title="Ver detalle"
            >
              <div className="mis-ont-card-icono">{iconoFormato(ont.formato)}</div>

              <div className="mis-ont-card-cuerpo">
                <h3 className="mis-ont-card-nombre">{ont.nombre}</h3>

                <div className="mis-ont-card-meta">
                  <span className="mis-ont-badge">{ont.slug}</span>
                  <span className="mis-ont-triples">{ont.triples.toLocaleString('es-ES')} triples</span>
                </div>

                <div className="mis-ont-card-fecha">
                  Cargada el {formatearFecha(ont.fecha)}
                </div>

                <div className="mis-ont-card-uri" title={ont.grafoUri}>
                  {ont.grafoUri}
                </div>
              </div>

              <button
                className="mis-ont-btn-eliminar"
                onClick={(e) => eliminar(ont, e)}
                disabled={eliminando === ont.slug}
                title="Eliminar ontología"
              >
                {eliminando === ont.slug ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalSubirOntologia
          onCerrar={() => setModalAbierto(false)}
          onExito={() => {
            setModalAbierto(false)
            cargarOntologias()
          }}
        />
      )}
    </div>
  )
}

export default MisOntologias
