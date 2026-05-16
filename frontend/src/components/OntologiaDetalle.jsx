// Página de detalle de una ontología concreta del usuario
// Tabs: Recursos · Grafo · SPARQL · Inferencia
// Todas las consultas se acotan al grafo nombrado de la ontología
// Hugo - TFG Ingeniería Informática

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import cytoscape from 'cytoscape'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TABS = ['recursos', 'grafo', 'sparql', 'inferencia']
const TABS_LABEL = { recursos: 'Recursos', grafo: 'Grafo visual', sparql: 'Consola SPARQL', inferencia: 'Inferencia OWL' }

// ──────────────────────────────────────────────
// Tab: Recursos (lista de sujetos con tipo)
// ──────────────────────────────────────────────

function TabRecursos({ grafoUri }) {
  const [filas, setFilas]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!grafoUri) return
    setCargando(true)
    api.post('/sparql/query', {
      grafoUri,
      consulta: `
        PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX owl:  <http://www.w3.org/2002/07/owl#>

        SELECT DISTINCT ?sujeto ?tipo ?etiqueta
        WHERE {
          ?sujeto rdf:type ?tipo .
          OPTIONAL { ?sujeto rdfs:label ?etiqueta }
          FILTER(isIRI(?sujeto))
          FILTER(!STRSTARTS(STR(?tipo), "http://www.w3.org/"))
          FILTER(!STRSTARTS(STR(?sujeto), "http://www.w3.org/"))
        }
        ORDER BY ?tipo ?sujeto
        LIMIT 500
      `,
    })
      .then(r => setFilas(r.data.results?.bindings || []))
      .catch(e => setError(e.response?.data?.error || 'Error al cargar los recursos'))
      .finally(() => setCargando(false))
  }, [grafoUri])

  if (cargando) return <div className="cargando">Cargando recursos...</div>
  if (error)    return <div className="error-mensaje">{error}</div>
  if (filas.length === 0) return (
    <div className="sin-resultados">
      No se encontraron instancias en esta ontología.<br />
      Puede que la ontología solo defina clases y propiedades, no individuos.
    </div>
  )

  return (
    <div>
      <p className="info-resultado" style={{ marginBottom: '0.8rem' }}>
        {filas.length} recurso(s) encontrado(s)
      </p>
      <div className="tabla-wrapper">
        <table className="tabla-sparql">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>URI / Sujeto</th>
              <th>Etiqueta</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="celda-uri">{f.tipo?.value?.split('#').pop() || f.tipo?.value?.split('/').pop()}</td>
                <td className="celda-uri">{f.sujeto?.value}</td>
                <td className="celda-literal">{f.etiqueta?.value || <span className="valor-nulo">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Tab: Grafo visual (Cytoscape embebido)
// ──────────────────────────────────────────────

function TabGrafo({ grafoUri }) {
  const contenedorRef = useRef(null)
  const cyRef         = useRef(null)
  const [stats, setStats]       = useState({ nodos: 0, aristas: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  const [nodo, setNodo]         = useState(null)

  useEffect(() => {
    if (!grafoUri) return
    let cancelado = false

    api.get('/grafo', { params: { grafoUri } })
      .then(r => {
        if (cancelado) return
        const { elementos } = r.data
        const n = elementos.filter(e => e.group === 'nodes').length
        const a = elementos.filter(e => e.group === 'edges').length
        setStats({ nodos: n, aristas: a })

        if (n === 0) { setCargando(false); return }

        setTimeout(() => {
          if (cancelado || !contenedorRef.current) return
          cyRef.current = cytoscape({
            container: contenedorRef.current,
            elements:  elementos,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': 'data(color)',
                  'label': 'data(label)',
                  'color': '#ffffff',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'font-size': '10px',
                  'font-weight': 'bold',
                  'width': 54, 'height': 54,
                  'text-wrap': 'wrap',
                  'text-max-width': 68,
                  'border-width': 2,
                  'border-color': 'rgba(255,255,255,0.25)',
                },
              },
              {
                selector: 'node:selected',
                style: { 'border-width': 4, 'border-color': '#ffffff' },
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#4a5568',
                  'target-arrow-color': '#4a5568',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  'label': 'data(label)',
                  'font-size': '8px',
                  'color': '#94a3b8',
                  'text-background-color': '#0f111a',
                  'text-background-opacity': 0.8,
                  'text-background-padding': '2px',
                  'text-rotation': 'autorotate',
                },
              },
              {
                selector: 'edge:selected',
                style: { 'line-color': '#818cf8', 'target-arrow-color': '#818cf8', 'width': 3 },
              },
            ],
            layout: {
              name: 'cose',
              idealEdgeLength: 160,
              nodeOverlap: 20,
              fit: true,
              padding: 40,
              randomize: true,
              componentSpacing: 120,
              nodeRepulsion: 450000,
              numIter: 1000,
            },
            wheelSensitivity: 0.3,
            minZoom: 0.15,
            maxZoom: 5,
          })

          cyRef.current.on('tap', 'node', evt => setNodo(evt.target.data()))
          cyRef.current.on('tap', evt => {
            if (evt.target === cyRef.current) setNodo(null)
          })
          setCargando(false)
        }, 80)
      })
      .catch(e => {
        if (!cancelado) {
          setError(e.response?.data?.error || 'Error al cargar el grafo')
          setCargando(false)
        }
      })

    return () => {
      cancelado = true
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null }
    }
  }, [grafoUri])

  let conexiones = []
  if (nodo && cyRef.current) {
    try {
      const nodoCy = cyRef.current.getElementById(nodo.id)
      conexiones = nodoCy.connectedEdges().map(e => ({
        etiqueta: e.data('label'),
        otro: e.source().id() === nodo.id ? e.target().data('label') : e.source().data('label'),
        dir:  e.source().id() === nodo.id ? '→' : '←',
      }))
    } catch (_) {}
  }

  return (
    <div className="detalle-grafo-wrap">
      <div className="grafo-toolbar" style={{ position: 'static', borderBottom: '1px solid var(--border)' }}>
        <span className="grafo-stats">
          {!cargando && !error && `${stats.nodos} nodos · ${stats.aristas} relaciones`}
        </span>
        <button
          className="btn-primary"
          onClick={() => cyRef.current?.fit(undefined, 40)}
          disabled={cargando || !!error || stats.nodos === 0}
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
        >
          Resetear vista
        </button>
      </div>

      <div style={{ display: 'flex', height: '540px', overflow: 'hidden' }}>
        {cargando && <div className="grafo-estado"><p>Cargando grafo...</p></div>}
        {!cargando && error && <div className="grafo-estado"><div className="error-mensaje">{error}</div></div>}
        {!cargando && !error && stats.nodos === 0 && (
          <div className="grafo-estado">
            <p className="sin-resultados">
              No hay instancias para visualizar. La ontología puede contener solo definiciones de clases.
            </p>
          </div>
        )}

        <div
          ref={contenedorRef}
          className="grafo-canvas"
          style={{ display: cargando || error || stats.nodos === 0 ? 'none' : 'block' }}
        />

        {nodo && (
          <aside className="grafo-panel">
            <div className="panel-cabecera">
              <h3>{nodo.label}</h3>
              <button className="panel-cerrar" onClick={() => setNodo(null)}>×</button>
            </div>
            <div className="panel-campo">
              <span className="panel-etiqueta">Tipo</span>
              <span className="badge-tipo" style={{ backgroundColor: nodo.color, color: '#fff', border: 'none' }}>
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
                    <li key={i}><span className="rel-dir">{c.dir}</span> <em>{c.etiqueta}</em>: {c.otro}</li>
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

// ──────────────────────────────────────────────
// Tab: Consola SPARQL acotada al grafo
// ──────────────────────────────────────────────

const EJEMPLO_SPARQL = `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>

SELECT DISTINCT ?clase ?label
WHERE {
  ?clase a owl:Class .
  OPTIONAL { ?clase rdfs:label ?label }
  FILTER(!STRSTARTS(STR(?clase), "http://www.w3.org/"))
}
ORDER BY ?clase`

function TabSparql({ grafoUri }) {
  const { usuario } = useAuth()
  const [consulta, setConsulta]     = useState(EJEMPLO_SPARQL)
  const [resultado, setResultado]   = useState(null)
  const [error, setError]           = useState('')
  const [ejecutando, setEjecutando] = useState(false)
  const [tiempoMs, setTiempoMs]     = useState(null)

  async function ejecutar() {
    if (!consulta.trim()) { setError('La consulta no puede estar vacía'); return }
    setError(''); setResultado(null); setEjecutando(true)
    const t0 = Date.now()
    try {
      const resp = await api.post('/sparql/query', { consulta, grafoUri })
      setResultado(resp.data)
      setTiempoMs(Date.now() - t0)
    } catch (e) {
      setError(e.response?.data?.error || 'Error al ejecutar la consulta')
      setTiempoMs(null)
    } finally {
      setEjecutando(false)
    }
  }

  const bindings  = resultado?.results?.bindings
  const columnas  = bindings?.length > 0 ? Object.keys(bindings[0]) : []

  return (
    <div className="sparql-console" style={{ margin: 0, padding: '1rem 0' }}>
      <div className="aviso-info" style={{ marginBottom: '0.8rem' }}>
        Las consultas se ejecutan sobre el grafo de esta ontología ({grafoUri}).
      </div>

      <textarea
        className="editor-sparql"
        value={consulta}
        onChange={e => setConsulta(e.target.value)}
        rows={12}
        spellCheck={false}
        placeholder="Escribe tu consulta SPARQL..."
      />

      <button className="btn-ejecutar" onClick={ejecutar} disabled={ejecutando}>
        {ejecutando ? 'Ejecutando...' : 'Ejecutar consulta'}
      </button>

      {error && <div className="error-mensaje">{error}</div>}

      {bindings && bindings.length === 0 && (
        <p className="sin-resultados">La consulta no devolvió resultados</p>
      )}

      {bindings && bindings.length > 0 && (
        <div className="resultados-container">
          <p className="info-resultado">{bindings.length} resultado(s) — {tiempoMs}ms</p>
          <div className="tabla-wrapper">
            <table className="tabla-sparql">
              <thead>
                <tr>{columnas.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {bindings.map((fila, i) => (
                  <tr key={i}>
                    {columnas.map(c => (
                      <td key={c} className={`celda-${fila[c]?.type || 'vacio'}`}>
                        {fila[c]?.value ?? <span className="valor-nulo">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Tab: Inferencia OWL simplificada
// ──────────────────────────────────────────────

function TabInferencia({ grafoUri }) {
  const [datos, setDatos]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState('')
  const [uriSeleccionada, setUriSeleccionada] = useState('')
  const [tiposRecurso, setTiposRecurso]       = useState(null)
  const [cargandoTipos, setCargandoTipos]     = useState(false)

  useEffect(() => {
    if (!grafoUri) return
    api.get('/inferencia', { params: { grafoUri } })
      .then(r => setDatos(r.data))
      .catch(e => setError(e.response?.data?.error || 'Error cargando datos de inferencia'))
      .finally(() => setCargando(false))
  }, [grafoUri])

  async function consultarTipos(uri) {
    setUriSeleccionada(uri)
    setCargandoTipos(true)
    setTiposRecurso(null)
    try {
      const r = await api.get('/inferencia/tipos', { params: { uri, grafoUri } })
      setTiposRecurso(r.data)
    } catch {
      setTiposRecurso({ directos: [], inferidos: [], cadenas: {} })
    } finally {
      setCargandoTipos(false)
    }
  }

  // Construir árbol de jerarquía a partir de pares sub/sup
  function construirArbol(jerarquia) {
    const hijos = {}
    const conPadre = new Set()
    for (const { sub, sup } of jerarquia) {
      if (!hijos[sup]) hijos[sup] = []
      if (!hijos[sup].includes(sub)) hijos[sup].push(sub)
      conPadre.add(sub)
    }
    const raices = [...new Set([...Object.keys(hijos), ...jerarquia.map(j => j.sub)])]
      .filter(n => !conPadre.has(n))
    return { hijos, raices }
  }

  function RenderArbol({ nodo, hijos, nivel = 0 }) {
    const [expandido, setExpandido] = useState(nivel < 2)
    const hijos_ = hijos[nodo] || []
    return (
      <li className="arbol-nodo">
        <span
          className={`arbol-clase nivel-${Math.min(nivel, 3)}`}
          onClick={() => hijos_.length > 0 && setExpandido(p => !p)}
          style={{ cursor: hijos_.length > 0 ? 'pointer' : 'default' }}
        >
          {hijos_.length > 0 && <span className="arbol-toggle">{expandido ? '▼' : '▶'}</span>}
          {nodo}
        </span>
        {expandido && hijos_.length > 0 && (
          <ul className="arbol-lista" style={{ paddingLeft: '1.4rem' }}>
            {hijos_.map(h => <RenderArbol key={h} nodo={h} hijos={hijos} nivel={nivel + 1} />)}
          </ul>
        )}
      </li>
    )
  }

  if (cargando) return <div className="cargando">Cargando datos de inferencia...</div>
  if (error)    return <div className="error-mensaje">{error}</div>

  const { hijos, raices } = construirArbol(datos?.jerarquia || [])
  const tieneJerarquia = (datos?.jerarquia?.length || 0) > 0
  const tieneRecursos  = (datos?.recursos?.length || 0) > 0

  return (
    <div className="inf-pagina" style={{ padding: '1rem 0' }}>

      {/* Jerarquía de clases */}
      <div className="inf-seccion">
        <div className="inf-seccion-cabecera">
          <h2 className="inf-seccion-titulo">Jerarquía de clases</h2>
          <span className="inf-badge sparql">rdfs:subClassOf</span>
        </div>
        <p className="inf-desc">
          Árbol de herencia de clases definidas en esta ontología mediante <code>rdfs:subClassOf</code>.
        </p>
        {!tieneJerarquia ? (
          <p className="inf-vacio">
            No se encontraron relaciones <code>rdfs:subClassOf</code> en esta ontología.
          </p>
        ) : (
          <div className="arbol-contenedor">
            <ul className="arbol-lista arbol-raiz">
              {raices.map(r => <RenderArbol key={r} nodo={r} hijos={hijos} nivel={0} />)}
            </ul>
          </div>
        )}
      </div>

      {/* Demo de herencia de tipos */}
      {tieneRecursos && (
        <div className="inf-seccion">
          <div className="inf-seccion-cabecera">
            <h2 className="inf-seccion-titulo">Tipos inferidos de un individuo</h2>
            <span className="inf-badge sparql">rdfs:subClassOf+</span>
          </div>
          <p className="inf-desc">
            Selecciona un individuo para ver sus tipos directos y los que se infieren
            transitivamente a través de <code>rdfs:subClassOf+</code>.
          </p>
          <div className="demo-select-wrap">
            <select
              className="inf-select"
              value={uriSeleccionada}
              onChange={e => consultarTipos(e.target.value)}
            >
              <option value="">— Selecciona un individuo —</option>
              {datos.recursos.map(r => (
                <option key={r.uri} value={r.uri}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {cargandoTipos && <p className="inf-cargando">Consultando tipos...</p>}

          {tiposRecurso && !cargandoTipos && (
            <div className="demo-resultado">
              <div className="tipos-col">
                <p className="tipos-titulo tipos-directos-titulo">
                  Tipos directos <span className="tipos-badge directos">{tiposRecurso.directos.length}</span>
                </p>
                {tiposRecurso.directos.length === 0
                  ? <p className="tipos-vacio">Ninguno</p>
                  : <ul className="tipos-lista">
                      {tiposRecurso.directos.map(t => <li key={t}><span className="tipo-tag tipo-directo">{t}</span></li>)}
                    </ul>
                }
              </div>
              <div className="tipos-col">
                <p className="tipos-titulo tipos-inferidos-titulo">
                  Tipos inferidos <span className="tipos-badge inferidos">{tiposRecurso.inferidos.length}</span>
                </p>
                {tiposRecurso.inferidos.length === 0
                  ? <p className="tipos-vacio">No se infieren más tipos</p>
                  : <ul className="tipos-lista">
                      {tiposRecurso.inferidos.map(t => <li key={t}><span className="tipo-tag tipo-inferido">{t}</span></li>)}
                    </ul>
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Componente principal: OntologiaDetalle
// ──────────────────────────────────────────────

function OntologiaDetalle() {
  const { slug }  = useParams()
  const [ontologia, setOntologia] = useState(null)
  const [error, setError]         = useState('')
  const [tab, setTab]             = useState('recursos')

  useEffect(() => {
    api.get(`/mis-ontologias/${slug}`)
      .then(r => setOntologia(r.data))
      .catch(() => setError('Ontología no encontrada o no tienes acceso a ella.'))
  }, [slug])

  if (error) {
    return (
      <div className="detalle-pagina">
        <div className="error-mensaje">{error}</div>
        <Link to="/mis-ontologias" className="btn-secondary" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Volver a Mis Ontologías
        </Link>
      </div>
    )
  }

  if (!ontologia) return <div className="cargando">Cargando ontología...</div>

  return (
    <div className="detalle-pagina">
      {/* Cabecera */}
      <div className="detalle-header">
        <div className="detalle-breadcrumb">
          <Link to="/mis-ontologias">Mis Ontologías</Link>
          <span className="detalle-sep">/</span>
          <span>{ontologia.nombre}</span>
        </div>
        <div className="detalle-meta">
          <span className="detalle-meta-item">{ontologia.triples.toLocaleString('es-ES')} triples</span>
          <span className="detalle-meta-sep">·</span>
          <span className="detalle-meta-item">{ontologia.formato?.split('/')[1] || ontologia.formato}</span>
          <span className="detalle-meta-sep">·</span>
          <span className="detalle-meta-item" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {ontologia.grafoUri}
          </span>
        </div>
      </div>

      {/* Pestañas */}
      <div className="detalle-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`detalle-tab${tab === t ? ' activo' : ''}`}
            onClick={() => setTab(t)}
          >
            {TABS_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="detalle-contenido">
        {tab === 'recursos'   && <TabRecursos   grafoUri={ontologia.grafoUri} />}
        {tab === 'grafo'      && <TabGrafo       grafoUri={ontologia.grafoUri} />}
        {tab === 'sparql'     && <TabSparql      grafoUri={ontologia.grafoUri} />}
        {tab === 'inferencia' && <TabInferencia  grafoUri={ontologia.grafoUri} />}
      </div>
    </div>
  )
}

export default OntologiaDetalle
