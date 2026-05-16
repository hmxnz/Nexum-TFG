// Página de demostración de inferencia OWL
// Muestra jerarquía de clases, demo interactiva de tipos inferidos,
// propiedades inversas y propiedades simétricas

import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../services/api'

// ----- Árbol de jerarquía -----

// Construye un mapa de padre → hijos a partir del array de relaciones subClassOf
function construirArbol(jerarquia) {
  const hijos = {}     // padre → [hijos]
  const tieneParent = new Set()

  for (const { sub, sup } of jerarquia) {
    if (!hijos[sup]) hijos[sup] = []
    if (!hijos[sup].includes(sub)) hijos[sup].push(sub)
    tieneParent.add(sub)
  }

  // Raíces = nodos que aparecen como sup pero no como sub
  const todasClases = new Set([
    ...jerarquia.map(r => r.sub),
    ...jerarquia.map(r => r.sup),
  ])
  const raices = [...todasClases].filter(c => !tieneParent.has(c))

  return { hijos, raices }
}

function NodoArbol({ nombre, hijos, nivel = 0 }) {
  const [expandido, setExpandido] = useState(true)
  const tieneHijos = hijos[nombre] && hijos[nombre].length > 0

  return (
    <li className="arbol-nodo" style={{ paddingLeft: nivel === 0 ? 0 : '1.4rem' }}>
      <span
        className={`arbol-clase nivel-${Math.min(nivel, 3)}`}
        onClick={() => tieneHijos && setExpandido(e => !e)}
        style={{ cursor: tieneHijos ? 'pointer' : 'default' }}
      >
        {tieneHijos && (
          <span className="arbol-toggle">{expandido ? '▾' : '▸'}</span>
        )}
        <span className="arbol-nombre">{nombre}</span>
      </span>

      {tieneHijos && expandido && (
        <ul className="arbol-lista">
          {hijos[nombre].map(hijo => (
            <NodoArbol key={hijo} nombre={hijo} hijos={hijos} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

function ArbolJerarquia({ jerarquia }) {
  if (!jerarquia || jerarquia.length === 0) {
    return <p className="inf-vacio">Sin datos de jerarquía.</p>
  }

  const { hijos, raices } = construirArbol(jerarquia)

  return (
    <ul className="arbol-lista arbol-raiz">
      {raices.map(r => (
        <NodoArbol key={r} nombre={r} hijos={hijos} nivel={0} />
      ))}
    </ul>
  )
}

// ----- Demo interactiva de tipos -----

function DemoTipos({ recursos }) {
  const [uriSeleccionada, setUriSeleccionada] = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function consultarTipos(uri) {
    if (!uri) return
    setCargando(true)
    setError('')
    setResultado(null)
    try {
      const resp = await api.get('/inferencia/tipos', {
        params: { uri },
      })
      setResultado(resp.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Error consultando tipos')
    } finally {
      setCargando(false)
    }
  }

  function handleSelect(e) {
    const uri = e.target.value
    setUriSeleccionada(uri)
    consultarTipos(uri)
  }

  return (
    <div className="demo-tipos">
      <div className="demo-select-wrap">
        <label className="inf-label" htmlFor="select-recurso">
          Selecciona un recurso:
        </label>
        <select
          id="select-recurso"
          className="inf-select"
          value={uriSeleccionada}
          onChange={handleSelect}
        >
          <option value="">— elige un recurso —</option>
          {recursos.map(r => (
            <option key={r.uri} value={r.uri}>{r.nombre}</option>
          ))}
        </select>
      </div>

      {cargando && <p className="inf-cargando">Consultando Fuseki...</p>}
      {error   && <p className="error-mensaje">{error}</p>}

      {resultado && (
        <div className="demo-resultado">
          <div className="tipos-col">
            <h4 className="tipos-titulo tipos-directos-titulo">
              Tipos directos
              <span className="tipos-badge directos">{resultado.directos.length}</span>
            </h4>
            <p className="tipos-explicacion">
              Declarados explícitamente con <code>rdf:type</code>
            </p>
            <ul className="tipos-lista">
              {resultado.directos.map(t => (
                <li key={t} className="tipo-tag tipo-directo">{t}</li>
              ))}
            </ul>
          </div>

          <div className="tipos-col">
            <h4 className="tipos-titulo tipos-inferidos-titulo">
              Tipos inferidos
              <span className="tipos-badge inferidos">{resultado.inferidos.length}</span>
            </h4>
            <p className="tipos-explicacion">
              Obtenidos via <code>rdfs:subClassOf+</code>
            </p>
            <ul className="tipos-lista">
              {resultado.inferidos.length > 0
                ? resultado.inferidos.map(t => (
                    <li key={t} className="tipo-tag tipo-inferido">{t}</li>
                  ))
                : <li className="tipos-vacio">No hay superclases adicionales</li>
              }
            </ul>
          </div>

          {Object.keys(resultado.cadenas).length > 0 && (
            <div className="tipos-col tipos-col-cadena">
              <h4 className="tipos-titulo">Cadena de herencia</h4>
              <p className="tipos-explicacion">
                Cómo se llega a cada tipo inferido
              </p>
              {Object.entries(resultado.cadenas).map(([directo, inferidos]) => (
                <div key={directo} className="cadena-herencia">
                  <span className="cadena-directo">{directo}</span>
                  {inferidos.map((inf, i) => (
                    <React.Fragment key={inf}>
                      <span className="cadena-flecha">→</span>
                      <span className="cadena-inferido">{inf}</span>
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ----- Tabla de relaciones -----

function TablaRelaciones({ relaciones, encabezadoOrigen, encabezadoDestino, vacio }) {
  if (!relaciones || relaciones.length === 0) {
    return (
      <div className="inf-sin-resultados">
        <span className="inf-sin-icono">∅</span>
        <p>{vacio}</p>
      </div>
    )
  }

  return (
    <table className="inf-tabla">
      <thead>
        <tr>
          <th>{encabezadoOrigen}</th>
          <th className="inf-propiedad-col">propiedad</th>
          <th>{encabezadoDestino}</th>
        </tr>
      </thead>
      <tbody>
        {relaciones.map((r, i) => (
          <tr key={i}>
            <td>{r.nombreOrigen || r.origen}</td>
            <td className="inf-propiedad">{encabezadoOrigen === 'Origen (cita)' ? 'cita →' : 'esCitadoPor →'}</td>
            <td>{r.nombreDestino || r.destino}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaRelSimetrica({ relaciones, etiqueta, vacio }) {
  if (!relaciones || relaciones.length === 0) {
    return (
      <div className="inf-sin-resultados">
        <span className="inf-sin-icono">∅</span>
        <p>{vacio}</p>
      </div>
    )
  }

  return (
    <table className="inf-tabla">
      <thead>
        <tr>
          <th>Recurso A</th>
          <th className="inf-propiedad-col">propiedad</th>
          <th>Recurso B</th>
        </tr>
      </thead>
      <tbody>
        {relaciones.map((r, i) => (
          <tr key={i}>
            <td>{r.a}</td>
            <td className="inf-propiedad">{etiqueta}</td>
            <td>{r.b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ----- Componente principal -----

export default function InferenciaOWL() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const resp = await api.get('/inferencia')
      setDatos(resp.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando datos de inferencia')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  if (cargando) return <div className="cargando">Cargando datos de inferencia...</div>

  if (error) {
    return (
      <div className="inf-pagina">
        <div className="error-mensaje">{error}</div>
      </div>
    )
  }

  return (
    <div className="inf-pagina">
      <div className="inf-cabecera">
        <h1 className="inf-titulo">Inferencia OWL — Global</h1>
        <p className="inf-subtitulo">
          Exploración semántica del dataset global: jerarquía de clases OWL, tipos inferidos
          por herencia y propiedades inversas/simétricas. Para analizar una ontología concreta,
          usa la pestaña <strong>Inferencia OWL</strong> dentro de cada ontología en Mis Ontologías.
        </p>
      </div>

      {/* Sección 1: Jerarquía de clases */}
      <section className="inf-seccion">
        <div className="inf-seccion-cabecera">
          <h2 className="inf-seccion-titulo">Jerarquía de clases</h2>
          <span className="inf-badge owl">owl:Class · rdfs:subClassOf</span>
        </div>
        <p className="inf-desc">
          El árbol muestra las relaciones <code>rdfs:subClassOf</code> definidas en la ontología.
          Cada clase hereda las propiedades de sus superclases. Haz clic en una clase para
          expandir o colapsar sus subclases.
        </p>
        <div className="arbol-contenedor">
          <ArbolJerarquia jerarquia={datos?.jerarquia} />
        </div>
      </section>

      {/* Sección 2: Demo interactiva */}
      <section className="inf-seccion">
        <div className="inf-seccion-cabecera">
          <h2 className="inf-seccion-titulo">Demostración de herencia de tipos</h2>
          <span className="inf-badge sparql">SPARQL · rdfs:subClassOf+</span>
        </div>
        <p className="inf-desc">
          Selecciona un recurso para ver sus tipos directos (declarados con <code>rdf:type</code>)
          y los tipos inferidos que se obtienen recorriendo la cadena <code>rdfs:subClassOf+</code>.
          Esto funciona sin un razonador OWL completo gracias a los property paths de SPARQL 1.1.
        </p>
        <DemoTipos recursos={datos?.recursos || []} />
      </section>

      {/* Sección 3: Propiedades inversas */}
      <section className="inf-seccion">
        <div className="inf-seccion-cabecera">
          <h2 className="inf-seccion-titulo">Propiedad inversa: cita / esCitadoPor</h2>
          <span className="inf-badge owl">owl:inverseOf</span>
        </div>
        <p className="inf-desc">
          En la ontología, <code>recursos:esCitadoPor</code> está declarada como
          la inversa de <code>recursos:cita</code> usando <code>owl:inverseOf</code>.
          Sin un razonador OWL activo, solo existen los triples <em>cita</em> que se
          insertaron explícitamente. Los triples <em>esCitadoPor</em> deberían inferirse
          automáticamente, pero Fuseki TDB2 sin razonador no lo hace.
        </p>

        <div className="inf-comparativa">
          <div className="inf-comp-bloque inf-comp-ok">
            <div className="inf-comp-header">
              <span className="inf-comp-icon">✓</span>
              <h3>Con triples explícitos: <code>cita</code></h3>
            </div>
            <p className="inf-comp-desc">
              Estos triples están en el dataset porque fueron cargados directamente.
            </p>
            <TablaRelaciones
              relaciones={datos?.propInversa?.conCita}
              encabezadoOrigen="Origen (cita)"
              encabezadoDestino="Destino"
              vacio="No hay relaciones cita en el dataset."
            />
          </div>

          <div className="inf-comp-bloque inf-comp-ko">
            <div className="inf-comp-header">
              <span className="inf-comp-icon">✗</span>
              <h3>Sin razonador: <code>esCitadoPor</code></h3>
            </div>
            <p className="inf-comp-desc">
              Esta consulta devuelve vacío porque Fuseki TDB2 no infiere automáticamente
              la propiedad inversa sin un razonador OWL activo.
            </p>
            <TablaRelaciones
              relaciones={datos?.propInversa?.conEsCitadoPor}
              encabezadoOrigen="Origen"
              encabezadoDestino="Destino (esCitadoPor)"
              vacio="Sin razonador OWL → resultado vacío (como se espera)"
            />
          </div>
        </div>
      </section>

      {/* Sección 4: Propiedad simétrica */}
      <section className="inf-seccion">
        <div className="inf-seccion-cabecera">
          <h2 className="inf-seccion-titulo">Propiedad simétrica: estaRelacionadoCon</h2>
          <span className="inf-badge owl">owl:SymmetricProperty</span>
        </div>
        <p className="inf-desc">
          La propiedad <code>recursos:estaRelacionadoCon</code> está declarada como
          <code> owl:SymmetricProperty</code>: si A está relacionado con B, entonces B
          está relacionado con A. Sin un razonador OWL, solo funcionan los triples
          declarados explícitamente. La consulta que busca ambas direcciones a la vez
          devuelve vacío si los inversos no están cargados en el dataset.
        </p>

        <div className="inf-comparativa">
          <div className="inf-comp-bloque inf-comp-ok">
            <div className="inf-comp-header">
              <span className="inf-comp-icon">✓</span>
              <h3>Dirección declarada explícitamente</h3>
            </div>
            <p className="inf-comp-desc">
              Triples <code>estaRelacionadoCon</code> tal como están en el dataset.
            </p>
            <TablaRelSimetrica
              relaciones={datos?.propSimetrica?.directa}
              etiqueta="estaRelacionadoCon →"
              vacio="No hay relaciones estaRelacionadoCon en el dataset."
            />
          </div>

          <div className="inf-comp-bloque inf-comp-ko">
            <div className="inf-comp-header">
              <span className="inf-comp-icon">✗</span>
              <h3>Ambas direcciones simultáneamente (sin razonador)</h3>
            </div>
            <p className="inf-comp-desc">
              Esta consulta exige que existan triples en las dos direcciones.
              Con un razonador OWL los resultados serían idénticos al bloque anterior.
            </p>
            <TablaRelSimetrica
              relaciones={datos?.propSimetrica?.inversa}
              etiqueta="↔ estaRelacionadoCon"
              vacio="Sin razonador OWL → resultado vacío (como se espera)"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
