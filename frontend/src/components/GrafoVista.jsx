// Página de visualización del grafo de recursos semánticos
// Usa Cytoscape.js para renderizar el grafo interactivo

import React, { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { api } from '../services/api'

// Leyenda visual - tiene que coincidir con COLORES_TIPO en backend/src/routes/grafo.js
// si se añade un tipo nuevo hay que actualizarlo en los dos sitios
const LEYENDA = [
  { tipo: 'Artículo',      color: '#3b82f6' },
  { tipo: 'TFG',           color: '#22c55e' },
  { tipo: 'Software',      color: '#f97316' },
  { tipo: 'Dataset',       color: '#eab308' },
  { tipo: 'Autor',         color: '#a855f7' },
  { tipo: 'Área Temática', color: '#ef4444' },
  { tipo: 'Tesis',         color: '#06b6d4' },
  { tipo: 'Otros',         color: '#94a3b8' },
]

function GrafoVista() {
  const contenedorRef   = useRef(null)
  const cyRef           = useRef(null)   // instancia de cytoscape - esto funciona, no tocar

  const [nodo, setNodo]             = useState(null)   // nodo seleccionado para el panel
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState('')
  const [stats, setStats]           = useState({ nodos: 0, aristas: 0 })

  useEffect(() => {
    inicializar()

    // limpiar la instancia de cytoscape al salir de la página - importante
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  async function inicializar() {
    try {
      const resp = await api.get('/grafo')
      const { elementos } = resp.data

      const numNodos   = elementos.filter(e => e.group === 'nodes').length
      const numAristas = elementos.filter(e => e.group === 'edges').length
      setStats({ nodos: numNodos, aristas: numAristas })

      if (numNodos === 0) {
        setCargando(false)
        return
      }

      // Pequeño timeout para que el div del canvas tenga dimensiones reales antes de que
      // cytoscape intente renderizar. Sin esto a veces el canvas queda en blanco.
      // No sé muy bien por qué pero si quito el setTimeout se rompe todo
      setTimeout(() => {
        cyRef.current = cytoscape({
          container: contenedorRef.current,
          elements:  elementos,

          style: [
            {
              selector: 'node',
              style: {
                'background-color':  'data(color)',
                'label':             'data(label)',
                'color':             '#ffffff',
                'text-valign':       'center',
                'text-halign':       'center',
                'font-size':         '10px',
                'font-weight':       'bold',
                'width':             58,
                'height':            58,
                'text-wrap':         'wrap',
                'text-max-width':    72,
                'border-width':      2,
                'border-color':      'rgba(255,255,255,0.25)',
                'transition-property': 'border-width border-color',
                'transition-duration': '0.15s',
              },
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 4,
                'border-color': '#ffffff',
              },
            },
            {
              selector: 'edge',
              style: {
                'width':                   2,
                'line-color':              '#4a5568',
                'target-arrow-color':      '#4a5568',
                'target-arrow-shape':      'triangle',
                'curve-style':             'bezier',
                'label':                   'data(label)',
                'font-size':               '8px',
                'color':                   '#94a3b8',
                'text-background-color':   '#0f111a',
                'text-background-opacity': 0.8,
                'text-background-padding': '2px',
                'text-rotation':           'autorotate',
              },
            },
            {
              selector: 'edge:selected',
              style: {
                'line-color':         '#818cf8',
                'target-arrow-color': '#818cf8',
                'width':              3,
              },
            },
          ],

          // Layout cose - viene incluido en cytoscape, no necesita extensión
          // tarda un poco en calcular pero el resultado es bastante bueno
          layout: {
            name:             'cose',
            idealEdgeLength:  160,
            nodeOverlap:      20,
            refresh:          20,
            fit:              true,
            padding:          40,
            randomize:        true,
            componentSpacing: 120,
            nodeRepulsion:    450000,
            edgeElasticity:   100,
            nestingFactor:    5,
            gravity:          80,
            numIter:          1000,
            initialTemp:      200,
            coolingFactor:    0.95,
            minTemp:          1.0,
          },

          wheelSensitivity: 0.3,
          minZoom:          0.15,
          maxZoom:          5,
        })

        // Tap en nodo → abrir panel de detalles
        cyRef.current.on('tap', 'node', (evt) => {
          setNodo(evt.target.data())
        })

        // Tap en el fondo vacío → cerrar panel
        cyRef.current.on('tap', (evt) => {
          if (evt.target === cyRef.current) {
            setNodo(null)
          }
        })

        setCargando(false)
      }, 80)

    } catch (err) {
      console.error('[GRAFO] Error cargando:', err)
      setError(err.response?.data?.error || 'Error al cargar el grafo. ¿Hay datos en Fuseki?')
      setCargando(false)
    }
  }

  function resetearVista() {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 40)
    }
  }

  // Calcular las relaciones del nodo seleccionado para mostrarlas en el panel
  // esto tiene que ejecutarse con cyRef ya inicializado
  let conexiones = []
  if (nodo && cyRef.current) {
    try {
      const nodoCy = cyRef.current.getElementById(nodo.id)
      conexiones = nodoCy.connectedEdges().map(e => ({
        etiqueta:  e.data('label'),
        otro:      e.source().id() === nodo.id
                     ? e.target().data('label')
                     : e.source().data('label'),
        dir:       e.source().id() === nodo.id ? '→' : '←',
      }))
    } catch (e) {
      // a veces falla si el grafo está re-renderizando, no es crítico
      console.log('no se pudieron calcular conexiones:', e)
    }
  }

  return (
    <div className="grafo-pagina">

      {/* Barra superior con título, leyenda y botón de reset */}
      <div className="grafo-toolbar">
        <div className="grafo-toolbar-izq">
          <h1>Grafo global</h1>
          {!cargando && !error && (
            <span className="grafo-stats">
              {stats.nodos} nodos · {stats.aristas} relaciones
            </span>
          )}
        </div>

        <div className="grafo-toolbar-der">
          <div className="grafo-leyenda">
            {LEYENDA.map(({ tipo, color }) => (
              <span key={tipo} className="leyenda-item">
                <span className="leyenda-punto" style={{ backgroundColor: color }} />
                {tipo}
              </span>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={resetearVista}
            disabled={cargando || !!error || stats.nodos === 0}
            style={{ padding: '0.38rem 0.9rem', fontSize: '0.83rem', flexShrink: 0 }}
          >
            Resetear vista
          </button>
        </div>
      </div>

      {/* Cuerpo: canvas del grafo + panel lateral de detalles */}
      <div className="grafo-cuerpo">

        {/* Mensajes de estado */}
        {cargando && (
          <div className="grafo-estado">
            <p>Cargando grafo...</p>
          </div>
        )}
        {!cargando && error && (
          <div className="grafo-estado">
            <div className="error-mensaje" style={{ maxWidth: 500 }}>{error}</div>
          </div>
        )}
        {!cargando && !error && stats.nodos === 0 && (
          <div className="grafo-estado">
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🕸</p>
              <p className="sin-resultados" style={{ marginBottom: '0.6rem' }}>
                No hay datos en el grafo global.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                El grafo visual por ontología está disponible dentro de cada ontología
                en <strong>Mis Ontologías → pestaña Grafo visual</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Canvas de Cytoscape - siempre en el DOM para que la ref funcione */}
        <div
          ref={contenedorRef}
          className="grafo-canvas"
          style={{ display: cargando || error || stats.nodos === 0 ? 'none' : 'block' }}
        />

        {/* Panel lateral de detalles del nodo seleccionado */}
        {nodo && (
          <aside className="grafo-panel">
            <div className="panel-cabecera">
              <h3>{nodo.label}</h3>
              <button
                className="panel-cerrar"
                onClick={() => setNodo(null)}
                title="Cerrar panel"
              >
                ×
              </button>
            </div>

            <div className="panel-campo">
              <span className="panel-etiqueta">Tipo</span>
              <span
                className="badge-tipo"
                style={{ backgroundColor: nodo.color, color: '#fff', border: 'none' }}
              >
                {nodo.tipo}
              </span>
            </div>

            {nodo.descripcion && (
              <div className="panel-campo">
                <span className="panel-etiqueta">Descripción</span>
                <p className="panel-valor">{nodo.descripcion}</p>
              </div>
            )}

            <div className="panel-campo">
              <span className="panel-etiqueta">URI</span>
              <p className="panel-valor panel-uri">{nodo.id}</p>
            </div>

            {conexiones.length > 0 && (
              <div className="panel-campo">
                <span className="panel-etiqueta">Relaciones ({conexiones.length})</span>
                <ul className="panel-relaciones">
                  {conexiones.map((c, i) => (
                    <li key={i}>
                      <span className="rel-dir">{c.dir}</span>
                      <em>{c.etiqueta}</em>
                      {': '}
                      <span>{c.otro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default GrafoVista
