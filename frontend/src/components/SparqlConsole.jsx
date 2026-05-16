import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

// Consultas de ejemplo genéricas — funcionan con cualquier ontología
const CONSULTAS_EJEMPLO = [
  {
    nombre: 'Clases de la ontología',
    sparql: `PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?clase ?etiqueta ?superclase
WHERE {
  ?clase a owl:Class .
  OPTIONAL { ?clase rdfs:label ?etiqueta }
  OPTIONAL { ?clase rdfs:subClassOf ?superclase }
  FILTER(!STRSTARTS(STR(?clase), "http://www.w3.org/"))
}
ORDER BY ?clase
LIMIT 50`,
  },
  {
    nombre: 'Todas las instancias',
    sparql: `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?instancia ?tipo ?etiqueta
WHERE {
  ?instancia a ?tipo .
  OPTIONAL { ?instancia rdfs:label ?etiqueta }
  FILTER(isIRI(?instancia))
  FILTER(!STRSTARTS(STR(?tipo), "http://www.w3.org/"))
}
ORDER BY ?tipo
LIMIT 100`,
  },
  {
    nombre: 'Jerarquía de clases',
    sparql: `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?subclase ?superclase
WHERE {
  ?subclase rdfs:subClassOf ?superclase .
  FILTER(!STRSTARTS(STR(?subclase),   "http://www.w3.org/"))
  FILTER(!STRSTARTS(STR(?superclase), "http://www.w3.org/"))
}
ORDER BY ?superclase ?subclase`,
  },
  {
    nombre: 'Propiedades OWL',
    sparql: `PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?propiedad ?tipo ?dominio ?rango
WHERE {
  VALUES ?tipo { owl:ObjectProperty owl:DatatypeProperty owl:AnnotationProperty }
  ?propiedad a ?tipo .
  OPTIONAL { ?propiedad rdfs:domain ?dominio }
  OPTIONAL { ?propiedad rdfs:range  ?rango  }
  FILTER(!STRSTARTS(STR(?propiedad), "http://www.w3.org/"))
}
ORDER BY ?tipo ?propiedad`,
  },
]

function SparqlConsole() {
  const { usuario } = useAuth()

  const [consulta, setConsulta]             = useState(CONSULTAS_EJEMPLO[0].sparql)
  const [resultado, setResultado]           = useState(null)
  const [error, setError]                   = useState('')
  const [ejecutando, setEjecutando]         = useState(false)
  const [tiempoMs, setTiempoMs]             = useState(null)
  const [modoUpdate, setModoUpdate]         = useState(false) // solo para admins

  async function ejecutar() {
    if (!consulta.trim()) {
      setError('La consulta no puede estar vacía')
      return
    }

    setError('')
    setResultado(null)
    setEjecutando(true)

    const t0 = Date.now()

    try {
      let resp
      if (modoUpdate && usuario?.rol === 'admin') {
        resp = await api.post('/sparql/update', { consulta })
        setResultado({ tipo: 'update', mensaje: resp.data.mensaje })
      } else {
        resp = await api.post('/sparql/query', { consulta })
        setResultado({ tipo: 'query', datos: resp.data })
      }

      setTiempoMs(Date.now() - t0)
      console.log('Resultado Fuseki:', resp.data) // debug - lo dejo porque ayuda a ver la estructura

    } catch (err) {
      setError(err.response?.data?.error || 'Error al ejecutar la consulta')
      setTiempoMs(null)
    } finally {
      setEjecutando(false)
    }
  }

  // Renderizar tabla de resultados SPARQL
  // Esta función es un poco larga habría que dividirla pero bueno
  function renderTabla() {
    if (!resultado || resultado.tipo === 'update') return null

    const bindings = resultado.datos?.results?.bindings
    if (!bindings) return null

    if (bindings.length === 0) {
      return <p className="sin-resultados">La consulta no devolvió resultados</p>
    }

    const columnas = Object.keys(bindings[0])

    return (
      <div className="resultados-container">
        <p className="info-resultado">
          {bindings.length} resultado(s)
          {tiempoMs !== null && ` — ${tiempoMs}ms`}
        </p>
        <div className="tabla-wrapper">
          <table className="tabla-sparql">
            <thead>
              <tr>
                {columnas.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {bindings.map((fila, i) => (
                <tr key={i}>
                  {columnas.map(col => (
                    <td key={col} className={`celda-${fila[col]?.type || 'vacio'}`}>
                      {fila[col]?.value ?? <span className="valor-nulo">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="sparql-console">
      <h1>Consola SPARQL</h1>

      <div className="aviso-info">
        {usuario?.rol === 'consultor'
          ? 'Las consultas aquí se ejecutan sobre el dataset global. Para filtrar por una ontología concreta, usa la pestaña SPARQL dentro de cada ontología en Mis Ontologías.'
          : 'Las consultas se ejecutan sobre el dataset global. Para filtrar por grafo nombrado, accede a la pestaña SPARQL dentro de cada ontología.'
        }
      </div>

      <div className="ejemplos-bar">
        <span>Ejemplos:</span>
        {CONSULTAS_EJEMPLO.map((ej, i) => (
          <button
            key={i}
            className="btn-ejemplo"
            onClick={() => { setConsulta(ej.sparql); setResultado(null); setError('') }}
          >
            {ej.nombre}
          </button>
        ))}
      </div>

      {/* Modo update solo para admins */}
      {usuario?.rol === 'admin' && (
        <div className="modo-switch">
          <label>
            <input
              type="checkbox"
              checked={modoUpdate}
              onChange={e => setModoUpdate(e.target.checked)}
            />
            {' '}Modo actualización (INSERT/DELETE)
          </label>
        </div>
      )}

      <textarea
        className="editor-sparql"
        value={consulta}
        onChange={e => setConsulta(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder="Escribe tu consulta SPARQL aquí..."
      />

      <button
        className="btn-ejecutar"
        onClick={ejecutar}
        disabled={ejecutando}
      >
        {ejecutando ? 'Ejecutando...' : (modoUpdate ? 'Ejecutar UPDATE' : 'Ejecutar consulta')}
      </button>

      {error && <div className="error-mensaje">{error}</div>}

      {resultado?.tipo === 'update' && (
        <div className="exito-mensaje">{resultado.mensaje}</div>
      )}

      {renderTabla()}
    </div>
  )
}

export default SparqlConsole
