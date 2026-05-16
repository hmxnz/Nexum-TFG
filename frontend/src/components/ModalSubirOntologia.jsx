// Modal para subir archivos de ontología a Fuseki desde la interfaz web
// El grafo destino se genera automáticamente en el servidor a partir del username
// Acepta: .ttl .rdf .owl .n3 .nt con drag & drop o selector de archivo
// Hugo - TFG Ingeniería Informática

import React, { useState, useRef } from 'react'
import { api } from '../services/api'

const EXTENSIONES_VALIDAS = ['.ttl', '.rdf', '.owl', '.n3', '.nt']
const ACCEPT = EXTENSIONES_VALIDAS.join(',')

export default function ModalSubirOntologia({ onCerrar, onExito }) {
  const [archivo, setArchivo]         = useState(null)
  const [subiendo, setSubiendo]       = useState(false)
  const [resultado, setResultado]     = useState(null)
  const [error, setError]             = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef(null)

  function validarArchivo(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!EXTENSIONES_VALIDAS.includes(ext)) {
      setError(`Formato no permitido: ${ext}. Usa ${EXTENSIONES_VALIDAS.join(', ')}`)
      return false
    }
    setError('')
    return true
  }

  function seleccionar(file) {
    if (file && validarArchivo(file)) {
      setArchivo(file)
      setResultado(null)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setArrastrando(true)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setArrastrando(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setArrastrando(false)
    const file = e.dataTransfer.files[0]
    if (file) seleccionar(file)
  }

  async function handleSubir() {
    if (!archivo || subiendo) return

    setSubiendo(true)
    setError('')
    setResultado(null)

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      const resp = await api.post('/ontologia/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultado(resp.data)
      onExito?.()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al subir el archivo al servidor')
    } finally {
      setSubiendo(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && !subiendo) onCerrar()
  }

  const formatoBytes = bytes => `${(bytes / 1024).toFixed(1)} KB`

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-caja">

        <div className="modal-cabecera">
          <h2 className="modal-titulo">Cargar ontología</h2>
          <button className="modal-cerrar" onClick={onCerrar} disabled={subiendo} title="Cerrar">✕</button>
        </div>

        {/* Zona drag & drop */}
        <div
          className={[
            'drop-zona',
            arrastrando ? 'drop-zona-activa' : '',
            archivo     ? 'drop-zona-con-archivo' : '',
          ].join(' ')}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !subiendo && inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={e => seleccionar(e.target.files[0])}
          />

          {archivo ? (
            <div className="drop-archivo-info">
              <span className="drop-icono-archivo">📄</span>
              <div className="drop-archivo-texto">
                <span className="drop-nombre-archivo">{archivo.name}</span>
                <span className="drop-tamano">{formatoBytes(archivo.size)}</span>
              </div>
              <span className="drop-cambiar">Clic para cambiar</span>
            </div>
          ) : (
            <div className="drop-placeholder">
              <span className="drop-icono">⬆</span>
              <p>Arrastra un archivo aquí o <span className="drop-link">selecciona uno</span></p>
              <p className="drop-formatos">{EXTENSIONES_VALIDAS.join(' · ')}</p>
            </div>
          )}
        </div>

        {/* Nota informativa sobre el grafo destino */}
        <div className="aviso-info" style={{ fontSize: '0.8rem', margin: 0 }}>
          El archivo se guardará en tu grafo personal:<br />
          <code>…/usuario/<em>tu_usuario</em>/ontologia/<em>nombre_archivo</em></code>
        </div>

        {error && <div className="error-mensaje">{error}</div>}

        {resultado && (
          <div className="exito-mensaje modal-exito">
            <strong>Ontología cargada correctamente</strong>
            <div className="modal-stats">
              <div className="modal-stat">
                <span className="modal-stat-num">{resultado.triplesAnadidos}</span>
                <span className="modal-stat-label">triples añadidos</span>
              </div>
              <div className="modal-stat-sep">·</div>
              <div className="modal-stat">
                <span className="modal-stat-num">{resultado.totalTriples}</span>
                <span className="modal-stat-label">total en grafo</span>
              </div>
            </div>
          </div>
        )}

        <div className="modal-acciones">
          <button className="btn-secondary" onClick={onCerrar} disabled={subiendo}>
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          <button className="btn-primary" onClick={handleSubir} disabled={!archivo || subiendo}>
            {subiendo
              ? <><span className="spinner" /> Subiendo...</>
              : 'Subir archivo'
            }
          </button>
        </div>

      </div>
    </div>
  )
}
