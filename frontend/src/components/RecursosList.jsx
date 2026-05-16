import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import ModalSubirOntologia from './ModalSubirOntologia'

// Tipos de recurso disponibles en la ontología
// TODO: esto debería cargarse dinámicamente de Fuseki pero de momento hardcodeado va
const TIPOS_RECURSO = [
  { uri: 'http://tfg.universidad.es/recursos#Recurso',       label: 'Recurso (genérico)' },
  { uri: 'http://tfg.universidad.es/recursos#RecursoDigital', label: 'Recurso Digital' },
  { uri: 'http://tfg.universidad.es/recursos#Documento',     label: 'Documento' },
  { uri: 'http://tfg.universidad.es/recursos#Articulo',      label: 'Artículo Científico' },
  { uri: 'http://tfg.universidad.es/recursos#TesisDoctoral', label: 'Tesis Doctoral' },
  { uri: 'http://tfg.universidad.es/recursos#TFG',           label: 'TFG' },
  { uri: 'http://tfg.universidad.es/recursos#Software',      label: 'Software' },
  { uri: 'http://tfg.universidad.es/recursos#Dataset',       label: 'Dataset' },
]

const FORM_VACIO = {
  uri:         '',
  tipo:        TIPOS_RECURSO[0].uri,
  nombre:      '',
  descripcion: '',
  autor:       '',
}

function RecursosList() {
  const { usuario } = useAuth()

  const [recursos, setRecursos]             = useState([])
  const [cargando, setCargando]             = useState(true)
  const [error, setError]                   = useState('')
  const [busqueda, setBusqueda]             = useState('')
  const [mostrarForm, setMostrarForm]       = useState(false)
  const [formData, setFormData]             = useState(FORM_VACIO)
  const [guardando, setGuardando]           = useState(false)
  const [mostrarModalOntologia, setMostrarModalOntologia] = useState(false)

  useEffect(() => {
    cargarRecursos()
  }, [])

  async function cargarRecursos() {
    setCargando(true)
    setError('')
    try {
      const resp = await api.get('/recursos')
      // Los resultados vienen en formato SPARQL JSON, hay que transformarlos a algo usable
      // TODO: esto podría hacerlo el backend y devolver directamente el array formateado
      const bindings = resp.data.results?.bindings || []
      const lista = bindings.map(b => ({
        uri:         b.recurso?.value    || '',
        tipo:        b.tipo?.value       || '',
        nombre:      b.nombre?.value     || 'Sin nombre',
        descripcion: b.descripcion?.value || '',
        autor:       b.autor?.value      || '',
        fecha:       b.fecha?.value      || '',
      }))
      setRecursos(lista)
    } catch (err) {
      console.error('Error cargando recursos:', err)
      setError('No se pudo conectar con el servidor. ¿Está Fuseki arrancado?')
    } finally {
      setCargando(false)
    }
  }

  async function handleCrear(e) {
    e.preventDefault()

    if (!formData.uri || !formData.nombre) {
      alert('La URI y el nombre son obligatorios') // sí, ya sé que alert es feo, pero funciona
      return
    }

    setGuardando(true)
    try {
      await api.post('/recursos', formData)
      setMostrarForm(false)
      setFormData(FORM_VACIO)
      cargarRecursos() // recargar la lista
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear el recurso')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(uri, nombre) {
    if (!window.confirm(`¿Eliminar el recurso "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }
    try {
      await api.delete(`/recursos/${encodeURIComponent(uri)}`)
      // Actualizar la lista localmente para no hacer otra petición al servidor
      setRecursos(prev => prev.filter(r => r.uri !== uri))
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar el recurso')
    }
  }

  // Filtrar según el texto de búsqueda
  const recursosFiltrados = recursos.filter(r => {
    const texto = busqueda.toLowerCase()
    return (
      r.nombre.toLowerCase().includes(texto) ||
      r.uri.toLowerCase().includes(texto)    ||
      r.descripcion.toLowerCase().includes(texto)
    )
  })

  // Extraer el nombre corto de un tipo URI (la parte después del #)
  function tipoCorto(uri) {
    return uri.includes('#') ? uri.split('#').pop() : uri
  }

  if (cargando) {
    return <div className="cargando">Cargando recursos...</div>
  }

  return (
    <div className="recursos-list">
      <div className="recursos-header">
        <h1>Recursos semánticos</h1>
        {usuario?.rol === 'admin' && (
          <div className="recursos-acciones">
            <button
              className="btn-secondary"
              onClick={() => setMostrarModalOntologia(true)}
            >
              Cargar ontología
            </button>
            <button
              className="btn-primary"
              onClick={() => setMostrarForm(!mostrarForm)}
            >
              {mostrarForm ? 'Cancelar' : '+ Nuevo recurso'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de carga de ontología - solo admin */}
      {mostrarModalOntologia && (
        <ModalSubirOntologia
          onCerrar={() => setMostrarModalOntologia(false)}
          onExito={() => cargarRecursos()}
        />
      )}

      {/* Formulario de creación - solo visible para admin */}
      {mostrarForm && usuario?.rol === 'admin' && (
        <form className="form-nuevo-recurso" onSubmit={handleCrear}>
          <h3>Nuevo recurso</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
              >
                {TIPOS_RECURSO.map(t => (
                  <option key={t.uri} value={t.uri}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 2 }}>
              <label>URI del recurso *</label>
              <input
                type="text"
                value={formData.uri}
                onChange={e => setFormData({ ...formData, uri: e.target.value })}
                placeholder="http://tfg.universidad.es/recursos#MiRecurso"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del recurso"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="form-group">
            <label>Autor</label>
            <input
              type="text"
              value={formData.autor}
              onChange={e => setFormData({ ...formData, autor: e.target.value })}
              placeholder="Nombre del autor"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear recurso'}
          </button>
        </form>
      )}

      {error && <div className="error-mensaje">{error}</div>}

      <div className="buscador">
        <input
          type="text"
          placeholder="Buscar por nombre, URI o descripción..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <p className="conteo">
        {recursosFiltrados.length} de {recursos.length} recursos
        {busqueda && ` (filtrando por "${busqueda}")`}
      </p>

      {recursosFiltrados.length === 0 ? (
        <div className="sin-resultados">
          {busqueda
            ? 'Ningún recurso coincide con la búsqueda'
            : 'No hay recursos en el sistema. El admin puede añadir algunos.'}
        </div>
      ) : (
        <div className="recursos-grid">
          {recursosFiltrados.map((r, i) => (
            <div key={i} className="recurso-card">
              <div className="recurso-card-header">
                <span className="badge-tipo">{tipoCorto(r.tipo)}</span>
                <h3>{r.nombre}</h3>
              </div>

              <p className="recurso-uri" title={r.uri}>
                {r.uri.length > 55 ? r.uri.substring(0, 55) + '…' : r.uri}
              </p>

              {r.descripcion && (
                <p className="recurso-desc">{r.descripcion}</p>
              )}

              <div className="recurso-meta">
                {r.autor && <span>Autor: {r.autor}</span>}
                {r.fecha && <span>Fecha: {r.fecha}</span>}
              </div>

              {usuario?.rol === 'admin' && (
                <button
                  className="btn-eliminar"
                  onClick={() => handleEliminar(r.uri, r.nombre)}
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecursosList
